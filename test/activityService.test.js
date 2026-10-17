import { describe, it } from "node:test";
import assert from "node:assert";
import {
  addToWatchlist,
  ensureUserProfile,
  recordLogin,
  recordMovieInteraction,
  recordRating,
  recordRecommendationSession,
  recordReview,
  recordSearch,
  removeFromWatchlist,
  syncRatingsAndReviews,
  syncWatchlistWithFirestore,
  toCompactMovie,
} from "../src/services/activityService.js";
import { genreName, personalizeMovies, scoreMovie } from "../src/utils/aiTaste.js";

describe("CineAI Activity & Preference System Tests", () => {
  it("toCompactMovie should correctly normalize and compact movie objects", () => {
    const rawMovie = {
      id: 550,
      title: "Fight Club",
      overview: "An insomniac office worker...",
      poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
      backdrop_path: "/hZkgoQYus5vegHoetLkCJzb17zJ.jpg",
      vote_average: 8.433,
      release_date: "1999-10-15",
      genre_ids: [18, 53, 35],
      extra_unneeded_heavy_field: "this should not be included if stripped",
    };

    const compact = toCompactMovie(rawMovie);

    assert.strictEqual(compact.id, 550);
    assert.strictEqual(compact.title, "Fight Club");
    assert.strictEqual(compact.vote_average, 8.433);
    assert.deepStrictEqual(compact.genre_ids, [18, 53, 35]);
    assert.strictEqual(compact.extra_unneeded_heavy_field, undefined);
  });

  it("toCompactMovie handles null, undefined, or missing fields safely", () => {
    assert.strictEqual(toCompactMovie(null), null);
    assert.strictEqual(toCompactMovie(undefined), null);

    const partial = toCompactMovie({ id: 101 });
    assert.strictEqual(partial.id, 101);
    assert.strictEqual(partial.title, "Untitled");
    assert.strictEqual(partial.poster_path, "");
    assert.deepStrictEqual(partial.genre_ids, []);
  });

  it("genreName maps IDs correctly according to TMDB standard genres", () => {
    assert.strictEqual(genreName(28), "Action");
    assert.strictEqual(genreName(27), "Horror");
    assert.strictEqual(genreName(878), "Sci-Fi");
    assert.strictEqual(genreName(35), "Comedy");
    assert.strictEqual(genreName(99999), "Discovery");
  });

  it("scoreMovie calculates deterministic match score between 42% and 98%", () => {
    const movieA = { id: 1, vote_average: 8.5, popularity: 120, genre_ids: [28, 878] };
    const movieB = { id: 2, vote_average: 4.1, popularity: 10, genre_ids: [999] };

    const scoreA = scoreMovie(movieA);
    const scoreB = scoreMovie(movieB);

    assert(scoreA >= 42 && scoreA <= 98, `Score ${scoreA} out of bounds`);
    assert(scoreB >= 42 && scoreB <= 98, `Score ${scoreB} out of bounds`);
    assert(scoreA > scoreB, `Higher rated movie should have higher match score (${scoreA} > ${scoreB})`);
  });

  it("personalizeMovies sorts deterministically and dedupes items", () => {
    const list = [
      { id: 2, vote_average: 4.0, genre_ids: [] },
      { id: 1, vote_average: 9.0, genre_ids: [28] },
      { id: 2, vote_average: 4.0, genre_ids: [] }, // duplicate
    ];

    const sorted = personalizeMovies(list);
    assert.strictEqual(sorted.length, 2, "Duplicate movie should be filtered");
    assert.strictEqual(sorted[0].id, 1, "Top scored movie should be first");
  });

  it("unauthenticated / guest users are handled safely without throwing errors", async () => {
    // Calling all activity methods with null user must be non-blocking and safe
    await assert.doesNotReject(async () => {
      await ensureUserProfile(null);
      await recordLogin(null);
      await recordSearch(null, { query: "Inception" });
      await recordMovieInteraction(null, { id: 550, title: "Fight Club" }, "details_open");
      await recordRecommendationSession(null, { recommendationType: "mood_picks" });
      await addToWatchlist(null, { id: 550 });
      await removeFromWatchlist(null, 550);
      await recordRating(null, 550, 5);
      await recordReview(null, 550, "Great film");
      const watchlist = await syncWatchlistWithFirestore(null, [{ id: 550 }]);
      assert.deepStrictEqual(watchlist, [{ id: 550 }]);
      const feedback = await syncRatingsAndReviews(null);
      assert.deepStrictEqual(feedback, { ratings: {}, reviews: {} });
    });
  });

  it("recordSearch ignores empty and whitespace-only queries", async () => {
    const mockUser = { uid: "test-user-123" };
    await assert.doesNotReject(async () => {
      await recordSearch(mockUser, { query: "" });
      await recordSearch(mockUser, { query: "   " });
      await recordSearch(mockUser, { query: "a" }); // less than 2 characters
      await recordSearch(mockUser, null);
    });
  });

  it("compact movie handles movie objects with array of genre objects", () => {
    const movieWithObjectGenres = {
      id: 299536,
      title: "Avengers: Infinity War",
      genres: [
        { id: 12, name: "Adventure" },
        { id: 28, name: "Action" },
        { id: 878, name: "Science Fiction" },
      ],
      vote_average: 8.3,
    };

    const compact = toCompactMovie(movieWithObjectGenres);
    assert.deepStrictEqual(compact.genre_ids, [12, 28, 878]);
    assert.strictEqual(compact.title, "Avengers: Infinity War");
  });
});
