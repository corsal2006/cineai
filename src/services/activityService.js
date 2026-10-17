import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, firestore } from "../firebase.js";
import { GENRES, genreName } from "../utils/aiTaste.js";

// In-memory deduplication caches to prevent duplicate writes during React re-renders
const recentSearches = new Map();
const recentInteractions = new Map();
const recentRecommendations = new Map();

/**
 * Removes undefined fields from objects before sending to Firestore
 */
const cleanData = (obj) => {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(cleanData).filter((v) => v !== undefined);

  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = cleanData(value);
    }
  }
  return cleaned;
};

/**
 * Validates the currently authenticated Firebase user.
 * Avoids trusting client-supplied foreign UIDs.
 */
const getValidUser = (providedUser) => {
  const current = auth.currentUser;
  if (current) return current;
  if (providedUser && providedUser.uid) return providedUser;
  return null;
};

/**
 * Extracts compact movie fields safe for Firestore document size limits
 */
export const toCompactMovie = (movie) => {
  if (!movie || typeof movie !== "object") return null;
  const genreIds =
    movie.genre_ids ||
    (Array.isArray(movie.genres) ? movie.genres.map((g) => (typeof g === "object" ? g.id : g)) : []);

  return cleanData({
    id: movie.id,
    title: movie.title || movie.name || "Untitled",
    poster_path: movie.poster_path || "",
    backdrop_path: movie.backdrop_path || "",
    vote_average: typeof movie.vote_average === "number" ? movie.vote_average : null,
    release_date: movie.release_date || movie.first_air_date || "",
    genre_ids: Array.isArray(genreIds) ? genreIds.slice(0, 5) : [],
  });
};

/**
 * Ensures user profile exists in Firestore and updates login timestamps.
 * Uses setDoc with merge: true so profile preferences are never wiped.
 */
export const ensureUserProfile = async (user, providerId = null) => {
  const activeUser = getValidUser(user);
  if (!activeUser || !activeUser.uid) return null;

  try {
    const userRef = doc(firestore, "users", activeUser.uid);
    const snap = await getDoc(userRef);

    const provider =
      providerId ||
      activeUser.providerData?.[0]?.providerId ||
      (activeUser.isAnonymous ? "anonymous" : "password");

    const baseData = {
      uid: activeUser.uid,
      displayName: activeUser.displayName || activeUser.email?.split("@")[0] || "Member",
      email: activeUser.email || null,
      photoURL: activeUser.photoURL || null,
      provider,
      lastLoginAt: serverTimestamp(),
      lastActiveAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (!snap.exists()) {
      await setDoc(userRef, {
        ...baseData,
        createdAt: serverTimestamp(),
        totalSearches: 0,
        totalMoviesViewed: 0,
        totalRecommendations: 0,
        favoriteGenres: [],
      });
    } else {
      await setDoc(userRef, cleanData(baseData), { merge: true });
    }

    return activeUser.uid;
  } catch (error) {
    console.warn("ensureUserProfile non-blocking notice:", error.message);
    return null;
  }
};

/**
 * Records a user login event
 */
export const recordLogin = async (user, providerId = null) => {
  const activeUser = getValidUser(user);
  if (!activeUser || !activeUser.uid) return;

  try {
    await ensureUserProfile(activeUser, providerId);

    const activityRef = doc(collection(firestore, "users", activeUser.uid, "activity"));
    await setDoc(
      activityRef,
      cleanData({
        eventType: "login",
        timestamp: serverTimestamp(),
        source: "auth_panel",
        metadata: {
          provider: providerId || activeUser.providerData?.[0]?.providerId || "unknown",
        },
      })
    );
  } catch (error) {
    console.warn("recordLogin notice:", error.message);
  }
};

/**
 * Records a search event in searchHistory and activity
 */
export const recordSearch = async (user, searchData) => {
  const activeUser = getValidUser(user);
  if (!activeUser || !activeUser.uid) return;

  const rawQuery = searchData?.query;
  const cleanQuery = rawQuery?.trim();
  if (!cleanQuery || cleanQuery.length < 2) return;

  const cacheKey = `${activeUser.uid}_${cleanQuery.toLowerCase()}`;
  const lastTime = recentSearches.get(cacheKey) || 0;
  if (Date.now() - lastTime < 3500) {
    // Avoid duplicate event from rapid re-renders
    return;
  }
  recentSearches.set(cacheKey, Date.now());

  try {
    const searchRef = doc(collection(firestore, "users", activeUser.uid, "searchHistory"));
    const activityRef = doc(collection(firestore, "users", activeUser.uid, "activity"));
    const userRef = doc(firestore, "users", activeUser.uid);

    const payload = cleanData({
      query: cleanQuery,
      normalizedQuery: cleanQuery.toLowerCase(),
      timestamp: serverTimestamp(),
      resultCount: typeof searchData.resultCount === "number" ? searchData.resultCount : 0,
      selectedMovieId: searchData.selectedMovieId || null,
      searchType: searchData.searchType || "movie",
      source: searchData.source || "search",
    });

    await Promise.all([
      setDoc(searchRef, payload),
      setDoc(
        activityRef,
        cleanData({
          eventType: "search",
          timestamp: serverTimestamp(),
          query: cleanQuery,
          searchType: searchData.searchType || "movie",
          source: searchData.source || "search",
          metadata: {
            resultCount: payload.resultCount,
            searchId: searchRef.id,
          },
        })
      ),
      setDoc(
        userRef,
        {
          totalSearches: increment(1),
          lastActiveAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ),
    ]);
  } catch (error) {
    console.warn("recordSearch notice:", error.message);
  }
};

/**
 * Records a movie interaction (card click, details open, trailer played, etc.)
 */
export const recordMovieInteraction = async (user, movieData, action = "details_open", source = "home") => {
  const activeUser = getValidUser(user);
  if (!activeUser || !activeUser.uid || !movieData?.id) return;

  const cacheKey = `${activeUser.uid}_${movieData.id}_${action}`;
  const lastTime = recentInteractions.get(cacheKey) || 0;
  if (Date.now() - lastTime < 2000) {
    // Deduplicate rapid repeat clicks / re-renders
    return;
  }
  recentInteractions.set(cacheKey, Date.now());

  const genres =
    movieData.genres?.map((g) => (typeof g === "object" ? g.name : genreName(g))) ||
    movieData.genre_ids?.map(genreName) ||
    [];

  try {
    const interactionRef = doc(collection(firestore, "users", activeUser.uid, "movieInteractions"));
    const activityRef = doc(collection(firestore, "users", activeUser.uid, "activity"));
    const userRef = doc(firestore, "users", activeUser.uid);

    const interactionPayload = cleanData({
      movieId: Number(movieData.id),
      movieTitle: movieData.title || movieData.name || "Untitled",
      posterPath: movieData.poster_path || "",
      genres: Array.isArray(genres) ? genres.slice(0, 4) : [],
      action,
      source: source || "home",
      timestamp: serverTimestamp(),
    });

    const isViewAction = action === "details_open" || action === "card_click";

    await Promise.all([
      setDoc(interactionRef, interactionPayload),
      setDoc(
        activityRef,
        cleanData({
          eventType: action,
          timestamp: serverTimestamp(),
          movieId: Number(movieData.id),
          movieTitle: movieData.title || movieData.name || "Untitled",
          posterPath: movieData.poster_path || "",
          genres: interactionPayload.genres,
          source: source || "home",
          metadata: {
            interactionId: interactionRef.id,
            action,
          },
        })
      ),
      setDoc(
        userRef,
        cleanData({
          lastActiveAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          ...(isViewAction ? { totalMoviesViewed: increment(1) } : {}),
        }),
        { merge: true }
      ),
    ]);

    // Asynchronously update deterministic preference signals
    updateUserPreferences(activeUser);
  } catch (error) {
    console.warn("recordMovieInteraction notice:", error.message);
  }
};

/**
 * Records a recommendation session with compact movie details
 */
export const recordRecommendationSession = async (user, recommendationData) => {
  const activeUser = getValidUser(user);
  if (!activeUser || !activeUser.uid) return;

  const recType = recommendationData?.recommendationType || "general";
  const source = recommendationData?.source || "recommendation";
  const cacheKey = `${activeUser.uid}_${recType}_${source}`;
  const lastTime = recentRecommendations.get(cacheKey) || 0;
  if (Date.now() - lastTime < 4000) {
    return;
  }
  recentRecommendations.set(cacheKey, Date.now());

  const rawMovies = Array.isArray(recommendationData.recommendedMovies)
    ? recommendationData.recommendedMovies
    : [];
  const compactMovies = rawMovies.map(toCompactMovie).filter(Boolean).slice(0, 20);

  const sessionId =
    recommendationData.recommendationSessionId ||
    `rec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  try {
    const recRef = doc(collection(firestore, "users", activeUser.uid, "recommendationHistory"));
    const activityRef = doc(collection(firestore, "users", activeUser.uid, "activity"));
    const userRef = doc(firestore, "users", activeUser.uid);

    const recPayload = cleanData({
      recommendationSessionId: sessionId,
      timestamp: serverTimestamp(),
      recommendationType: recType,
      inputQuery: recommendationData.inputQuery || null,
      inputMovieId: recommendationData.inputMovieId ? Number(recommendationData.inputMovieId) : null,
      inputGenres: recommendationData.inputGenres || null,
      recommendedMovies: compactMovies,
      source,
      algorithmVersion: recommendationData.algorithmVersion || "1.0-discovery",
    });

    await Promise.all([
      setDoc(recRef, recPayload),
      setDoc(
        activityRef,
        cleanData({
          eventType: "recommendation",
          timestamp: serverTimestamp(),
          source,
          recommendationSessionId: sessionId,
          metadata: {
            recommendationType: recType,
            count: compactMovies.length,
          },
        })
      ),
      setDoc(
        userRef,
        {
          totalRecommendations: increment(1),
          lastActiveAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ),
    ]);
  } catch (error) {
    console.warn("recordRecommendationSession notice:", error.message);
  }
};

/**
 * Synchronizes user watchlist between Firestore and local state
 */
export const syncWatchlistWithFirestore = async (user, localWatchlist = []) => {
  const activeUser = getValidUser(user);
  if (!activeUser || !activeUser.uid) return localWatchlist;

  try {
    const watchlistCol = collection(firestore, "users", activeUser.uid, "watchlist");
    const snapshot = await getDocs(query(watchlistCol, orderBy("addedAt", "desc"), limit(60)));

    const firestoreMovies = [];
    snapshot.forEach((d) => {
      const data = d.data();
      firestoreMovies.push({
        id: Number(data.movieId || data.id || d.id),
        title: data.title || "Untitled",
        poster_path: data.poster_path || "",
        backdrop_path: data.backdrop_path || "",
        overview: data.overview || "",
        vote_average: data.vote_average || 0,
        release_date: data.release_date || "",
        genre_ids: data.genre_ids || [],
      });
    });

    // If local has items not in Firestore (e.g. added before login), migrate them cleanly
    const missingInFirestore = localWatchlist.filter(
      (local) => local?.id && !firestoreMovies.some((remote) => remote.id === local.id)
    );

    for (const movie of missingInFirestore) {
      await addToWatchlist(activeUser, movie);
      firestoreMovies.unshift(movie);
    }

    return firestoreMovies;
  } catch (error) {
    console.warn("syncWatchlistWithFirestore notice:", error.message);
    return localWatchlist;
  }
};

/**
 * Adds a movie to the user's Firestore watchlist
 */
export const addToWatchlist = async (user, movie) => {
  const activeUser = getValidUser(user);
  if (!activeUser || !activeUser.uid || !movie?.id) return;

  try {
    const compact = toCompactMovie(movie);
    const watchDoc = doc(firestore, "users", activeUser.uid, "watchlist", String(movie.id));

    await setDoc(
      watchDoc,
      cleanData({
        ...compact,
        movieId: Number(movie.id),
        overview: movie.overview || "",
        addedAt: serverTimestamp(),
      })
    );

    await recordMovieInteraction(activeUser, movie, "watchlist_add", "watchlist");
  } catch (error) {
    console.warn("addToWatchlist notice:", error.message);
  }
};

/**
 * Removes a movie from the user's Firestore watchlist
 */
export const removeFromWatchlist = async (user, movieId, movie = null) => {
  const activeUser = getValidUser(user);
  if (!activeUser || !activeUser.uid || !movieId) return;

  try {
    const watchDoc = doc(firestore, "users", activeUser.uid, "watchlist", String(movieId));
    await deleteDoc(watchDoc);

    await recordMovieInteraction(activeUser, movie || { id: movieId }, "watchlist_remove", "watchlist");
  } catch (error) {
    console.warn("removeFromWatchlist notice:", error.message);
  }
};

/**
 * Records a user movie rating
 */
export const recordRating = async (user, movieId, rating, movie = null) => {
  const activeUser = getValidUser(user);
  if (!activeUser || !activeUser.uid || !movieId) return;

  try {
    const ratingDoc = doc(firestore, "users", activeUser.uid, "ratings", String(movieId));
    await setDoc(
      ratingDoc,
      cleanData({
        movieId: Number(movieId),
        rating: Number(rating),
        movieTitle: movie?.title || movie?.name || "Untitled",
        updatedAt: serverTimestamp(),
      })
    );

    await recordMovieInteraction(activeUser, movie || { id: movieId }, "rate", "movie_modal");
  } catch (error) {
    console.warn("recordRating notice:", error.message);
  }
};

/**
 * Records a user movie review
 */
export const recordReview = async (user, movieId, reviewText, movie = null) => {
  const activeUser = getValidUser(user);
  if (!activeUser || !activeUser.uid || !movieId) return;

  try {
    const reviewDoc = doc(firestore, "users", activeUser.uid, "reviews", String(movieId));
    await setDoc(
      reviewDoc,
      cleanData({
        movieId: Number(movieId),
        review: String(reviewText).trim(),
        movieTitle: movie?.title || movie?.name || "Untitled",
        updatedAt: serverTimestamp(),
      })
    );

    await recordMovieInteraction(activeUser, movie || { id: movieId }, "review", "movie_modal");
  } catch (error) {
    console.warn("recordReview notice:", error.message);
  }
};

/**
 * Syncs user ratings & reviews from Firestore
 */
export const syncRatingsAndReviews = async (user) => {
  const activeUser = getValidUser(user);
  if (!activeUser || !activeUser.uid) return { ratings: {}, reviews: {} };

  try {
    const ratingsCol = collection(firestore, "users", activeUser.uid, "ratings");
    const reviewsCol = collection(firestore, "users", activeUser.uid, "reviews");

    const [ratingsSnap, reviewsSnap] = await Promise.all([getDocs(ratingsCol), getDocs(reviewsCol)]);

    const ratings = {};
    ratingsSnap.forEach((d) => {
      const data = d.data();
      if (typeof data.rating === "number") ratings[d.id] = data.rating;
    });

    const reviews = {};
    reviewsSnap.forEach((d) => {
      const data = d.data();
      if (data.review) reviews[d.id] = data.review;
    });

    return { ratings, reviews };
  } catch (error) {
    console.warn("syncRatingsAndReviews notice:", error.message);
    return { ratings: {}, reviews: {} };
  }
};

/**
 * Deterministically computes favorite genres and preferences based on user interactions
 */
export const updateUserPreferences = async (user) => {
  const activeUser = getValidUser(user);
  if (!activeUser || !activeUser.uid) return;

  try {
    // Read recent interactions to determine real favorite genres
    const interactionsCol = collection(firestore, "users", activeUser.uid, "movieInteractions");
    const snap = await getDocs(query(interactionsCol, orderBy("timestamp", "desc"), limit(40)));

    const genreCounts = {};
    snap.forEach((d) => {
      const data = d.data();
      if (Array.isArray(data.genres)) {
        data.genres.forEach((name) => {
          if (name && typeof name === "string") {
            genreCounts[name] = (genreCounts[name] || 0) + 1;
          }
        });
      }
    });

    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
      .slice(0, 5);

    if (topGenres.length > 0) {
      const userRef = doc(firestore, "users", activeUser.uid);
      await updateDoc(userRef, {
        favoriteGenres: topGenres,
        lastActiveAt: serverTimestamp(),
      });
    }
  } catch (error) {
    // Non-blocking preference recalculation
    console.warn("updateUserPreferences notice:", error.message);
  }
};
