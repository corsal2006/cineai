import React, { useEffect, useMemo, useState } from "react";
import { FaBookmark, FaChevronDown, FaFire, FaPlay, FaPlus, FaSearch, FaSignInAlt, FaSignOutAlt, FaUserCircle, FaUsers } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import "../styles/home.css";
import MovieRow from "../components/MovieRow";
import MovieModal from "../components/MovieModal";
import AiPopup from "../components/AiPopup";
import RoomModal from "../components/RoomModal";
import { auth } from "../firebase";
import {
  MOODS,
  getAction,
  getAnime,
  getBollywood,
  getComedy,
  getHorror,
  getMoodMovies,
  getPopular,
  getScifi,
  getTopRated,
  getTrending,
  getTrendingPrediction,
  imageUrl,
  searchMovies,
} from "../api/tmdb";
import {
  GENRES,
  getFavGenreIds,
  getRatings,
  getReviews,
  getTaste,
  getWatchlist,
  personalizeMovies,
  saveRating,
  saveReview,
  scoreMovie,
  toggleWatchlist,
  trackMood,
  trackMovieClick,
  trackSearch,
} from "../utils/aiTaste";

const emptyRows = {
  trending: [],
  popular: [],
  topRated: [],
  predicted: [],
  action: [],
  horror: [],
  scifi: [],
  comedy: [],
  bollywood: [],
  anime: [],
};

const roomCode = () => String(Math.floor(100000 + Math.random() * 900000));

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [guest, setGuest] = useState(false);
  const [rows, setRows] = useState(emptyRows);
  const [loading, setLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMood, setSelectedMood] = useState("happy");
  const [moodMovies, setMoodMovies] = useState([]);
  const [moodLoading, setMoodLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [roomOpen, setRoomOpen] = useState(false);
  const [roomSeed, setRoomSeed] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [apiNotice, setApiNotice] = useState("");
  const [watchlist, setWatchlist] = useState(() => getWatchlist());
  const [ratings, setRatings] = useState(() => getRatings());
  const [reviews, setReviews] = useState(() => getReviews());
  const [tasteVersion, setTasteVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const params = new URLSearchParams(window.location.search);
      const queryGuest = params.get("guest") === "1";

      if (queryGuest && !localStorage.getItem("cine_guest_session")) {
        localStorage.setItem("cine_guest_session", "true");
        localStorage.setItem("cine_user", "Guest Demo");
      }

      const hasGuest = localStorage.getItem("cine_guest_session") === "true" || queryGuest;

      if (!firebaseUser && !hasGuest) {
        navigate("/");
        return;
      }

      setUser(firebaseUser);
      setGuest(hasGuest && !firebaseUser);
    });

    return unsubscribe;
  }, [navigate]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const safe = async (loader, label) => {
        try {
          return await loader();
        } catch (error) {
          console.error(`TMDB ${label} failed`, error);
          return [];
        }
      };

      try {
        const [trending, popular, topRated, predicted, action, horror, scifi, comedy, bollywood, anime, firstMood] =
          await Promise.all([
            safe(getTrending, "trending"),
            safe(getPopular, "popular"),
            safe(getTopRated, "top rated"),
            safe(getTrendingPrediction, "prediction"),
            safe(getAction, "action"),
            safe(getHorror, "horror"),
            safe(getScifi, "sci-fi"),
            safe(getComedy, "comedy"),
            safe(getBollywood, "bollywood"),
            safe(getAnime, "anime"),
            safe(() => getMoodMovies("happy"), "mood"),
          ]);

        setRows({ trending, popular, topRated, predicted, action, horror, scifi, comedy, bollywood, anime });
        setMoodMovies(firstMood);
        setApiNotice(
          [trending, popular, topRated, predicted, action, horror, scifi, comedy, bollywood, anime, firstMood].flat().length
            ? ""
            : "Movie data is not available yet. Check the Vercel VITE_TMDB_KEY value and refresh."
        );
      } catch (error) {
        console.error(error);
        setApiNotice("Movie data is not available yet. Check the Vercel VITE_TMDB_KEY value and refresh.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIndex((index) => (index + 1) % Math.max(rows.trending.length, 1));
    }, 6500);

    return () => clearInterval(timer);
  }, [rows.trending.length]);

  useEffect(() => {
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) {
      setSearchResults([]);
      return undefined;
    }

    const timer = setTimeout(async () => {
      trackSearch(cleanQuery);
      setTasteVersion((value) => value + 1);
      setSearchResults(await searchMovies(cleanQuery));
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const allMovies = useMemo(() => Object.values(rows).flat(), [rows]);
  const personalized = useMemo(() => {
    if (tasteVersion < 0) return [];
    return personalizeMovies(allMovies).slice(0, 20);
  }, [allMovies, tasteVersion]);
  const heroMovie = rows.trending[heroIndex] || rows.popular[0] || personalized[0];
  const displayName = user?.displayName || user?.email?.split("@")[0] || localStorage.getItem("cine_user") || "Guest";
  const favGenreIds = getFavGenreIds();
  const taste = getTaste();
  const heatmap = favGenreIds.map((id) => ({ id, label: GENRES[id], count: taste.genres[id] || 0 }));
  const watchlistMatches = personalizeMovies(watchlist).slice(0, 18);

  const openMovie = (movie) => {
    trackMovieClick(movie);
    setTasteVersion((value) => value + 1);
    setModal(movie);
  };

  const updateWatchlist = (movie) => {
    setWatchlist(toggleWatchlist(movie));
  };

  const updateRating = (movieId, value) => {
    setRatings(saveRating(movieId, value));
  };

  const updateReview = (movieId, value) => {
    setReviews(saveReview(movieId, value));
  };

  const selectMood = async (moodId) => {
    setSelectedMood(moodId);
    setMoodLoading(true);
    trackMood(moodId);
    setTasteVersion((value) => value + 1);

    try {
      const movies = await getMoodMovies(moodId);
      setMoodMovies(personalizeMovies(movies));
    } catch (error) {
      console.error(error);
    } finally {
      setMoodLoading(false);
    }
  };

  const startRoom = (movie = null) => {
    setRoomSeed(movie);
    setRoomOpen(true);
  };

  const createRoom = (name) => {
    const id = roomCode();
    localStorage.setItem("cine_user", name);
    const movieParam = roomSeed?.id ? `?movie=${roomSeed.id}` : "";
    navigate(`/watch/${id}${movieParam}`);
  };

  const joinRoom = (id, name) => {
    localStorage.setItem("cine_user", name);
    navigate(`/watch/${id}`);
  };

  const logout = async () => {
    if (user) await signOut(auth);
    localStorage.removeItem("cine_guest_session");
    navigate("/");
  };

  return (
    <main className="home-page">
      <nav className="home-nav">
        <button type="button" className="brand-mark" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          CINE<span>AI</span>
        </button>
        <div className="nav-links">
          <a href="#moods">Moods</a>
          <a href="#taste">Taste</a>
          <button type="button" onClick={() => startRoom()}>
            <FaUsers />
            Room
          </button>
        </div>
        <label className="nav-search">
          <FaSearch />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search movies, moods, genres..."
          />
        </label>
        {guest && (
          <button type="button" className="guest-signin-button" onClick={() => navigate("/")}>
            <FaSignInAlt />
            Sign in
          </button>
        )}
        <div className={`profile-menu ${profileOpen ? "open" : ""}`}>
          <button type="button" className="profile-trigger" onClick={() => setProfileOpen((value) => !value)} aria-expanded={profileOpen}>
            <span className="avatar-badge">
              <FaUserCircle />
            </span>
            <span className="profile-copy">
              <small>{guest ? "Guest profile" : "CineAI profile"}</small>
              <strong>{displayName}</strong>
            </span>
            <FaChevronDown className="chevron" />
          </button>

          {profileOpen && (
            <div className="profile-dropdown">
              <div className="profile-card-top">
                <span className="avatar-large">
                  <FaUserCircle />
                </span>
                <div>
                  <strong>{displayName}</strong>
                  <p>{guest ? "Browsing as guest" : user?.email || "Signed in member"}</p>
                </div>
              </div>
              <button type="button" onClick={() => { setProfileOpen(false); window.location.hash = "taste"; }}>
                <FaBookmark />
                Watchlist · {watchlist.length}
              </button>
              <button type="button" onClick={() => { setProfileOpen(false); startRoom(); }}>
                <FaUsers />
                Create watch room
              </button>
              {guest && (
                <button type="button" onClick={() => navigate("/")}>
                  <FaUserCircle />
                  Sign in to save profile
                </button>
              )}
              <button type="button" className="danger" onClick={logout}>
                <FaSignOutAlt />
                {guest ? "Exit guest mode" : "Sign out"}
              </button>
            </div>
          )}
        </div>
      </nav>

      {loading && (
        <section className="loading-hero">
          <div />
          <span>Loading CineAI...</span>
        </section>
      )}

      {!loading && heroMovie && (
        <section className="hero-banner" style={{ backgroundImage: `url(${imageUrl(heroMovie.backdrop_path, "original")})` }}>
          <div className="hero-shadow" />
          <div className="hero-content">
            <p className="hero-kicker"><FaFire /> AI featured pick</p>
            <h1>{heroMovie.title || heroMovie.name}</h1>
            <p>{heroMovie.overview}</p>
            <div className="hero-meta">
              <span>{scoreMovie(heroMovie)}% match</span>
              <span>{(heroMovie.release_date || "").slice(0, 4) || "Featured"}</span>
              <span>{heroMovie.vote_average?.toFixed(1) || "New"}</span>
            </div>
            <div className="hero-buttons">
              <button type="button" className="primary-action" onClick={() => openMovie(heroMovie)}>
                <FaPlay />
                Trailer and details
              </button>
              <button type="button" onClick={() => updateWatchlist(heroMovie)}>
                <FaPlus />
                Watchlist
              </button>
              <button type="button" onClick={() => startRoom(heroMovie)}>
                <FaUsers />
                Start room
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="content-shell">
        {apiNotice && (
          <section className="api-notice">
            <div>
              <strong>TMDB connection needs attention</strong>
              <p>{apiNotice}</p>
            </div>
            <button type="button" onClick={() => window.location.reload()}>
              Retry
            </button>
          </section>
        )}

        {searchResults.length > 0 && (
          <MovieRow
            title="Smart search results"
            subtitle={`Matched for "${query.trim()}"`}
            movies={searchResults}
            onClick={openMovie}
            onQuickAdd={updateWatchlist}
            variant="wide"
          />
        )}

        <section className="mood-lab" id="moods">
          <div className="section-heading">
            <div>
              <p>Mood recommendation engine</p>
              <h2>Pick the feeling. CineAI builds the row.</h2>
            </div>
            {moodLoading && <span>Refreshing mood row...</span>}
          </div>
          <div className="mood-buttons">
            {MOODS.map((mood) => (
              <button
                type="button"
                key={mood.id}
                className={selectedMood === mood.id ? "active" : ""}
                onClick={() => selectMood(mood.id)}
              >
                <strong>{mood.label}</strong>
                <span>{mood.description}</span>
              </button>
            ))}
          </div>
        </section>

        <MovieRow
          title={`${MOODS.find((mood) => mood.id === selectedMood)?.label || "Mood"} picks`}
          movies={moodMovies}
          onClick={openMovie}
          onQuickAdd={updateWatchlist}
          variant="wide"
        />

        <section className="taste-console" id="taste">
          <div className="section-heading">
            <div>
              <p>Personalized homepage</p>
              <h2>Watch behavior learning</h2>
            </div>
            <span>{taste.clicks.length + taste.searches.length} signals learned</span>
          </div>
          <div className="taste-grid">
            <div className="taste-tile">
              <strong>{personalized[0] ? `${scoreMovie(personalized[0])}%` : "0%"}</strong>
              <span>Top AI match</span>
            </div>
            <div className="taste-tile">
              <strong>{watchlist.length}</strong>
              <span>Watchlist titles</span>
            </div>
            <div className="heatmap">
              {(heatmap.length ? heatmap : [{ id: "new", label: "Start browsing", count: 1 }]).map((item) => (
                <div key={item.id}>
                  <span>{item.label}</span>
                  <div>
                    <i style={{ width: `${Math.min(100, 24 + item.count * 18)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <MovieRow
          title="Because of your taste"
          subtitle="Collaborative-style scoring blended with genre and rating similarity"
          movies={personalized}
          onClick={openMovie}
          onQuickAdd={updateWatchlist}
          variant="poster"
        />

        {watchlistMatches.length > 0 && (
          <MovieRow
            title="Your watchlist"
            movies={watchlistMatches}
            onClick={openMovie}
            onQuickAdd={updateWatchlist}
            variant="poster"
          />
        )}

        <MovieRow title="Trending prediction" movies={rows.predicted} onClick={openMovie} onQuickAdd={updateWatchlist} variant="wide" />
        <MovieRow title="Trending now" movies={rows.trending} onClick={openMovie} onQuickAdd={updateWatchlist} variant="poster" />
        <MovieRow title="Top rated" movies={rows.topRated} onClick={openMovie} onQuickAdd={updateWatchlist} variant="poster" />
        <MovieRow title="Action" movies={rows.action} onClick={openMovie} onQuickAdd={updateWatchlist} variant="poster" />
        <MovieRow title="Horror" movies={rows.horror} onClick={openMovie} onQuickAdd={updateWatchlist} variant="poster" />
        <MovieRow title="Sci-Fi" movies={rows.scifi} onClick={openMovie} onQuickAdd={updateWatchlist} variant="poster" />
        <MovieRow title="Comedy" movies={rows.comedy} onClick={openMovie} onQuickAdd={updateWatchlist} variant="poster" />
        <MovieRow title="Bollywood" movies={rows.bollywood} onClick={openMovie} onQuickAdd={updateWatchlist} variant="poster" />
        <MovieRow title="Anime movies" movies={rows.anime} onClick={openMovie} onQuickAdd={updateWatchlist} variant="poster" />
      </div>

      <AiPopup />

      {modal && (
        <MovieModal
          movie={modal}
          close={() => setModal(null)}
          onOpenMovie={openMovie}
          onToggleWatchlist={updateWatchlist}
          inWatchlist={watchlist.some((movie) => movie.id === modal.id)}
          rating={ratings[modal.id] || 0}
          review={reviews[modal.id] || ""}
          onRate={updateRating}
          onReview={updateReview}
          onStartRoom={startRoom}
          matchScore={scoreMovie(modal)}
        />
      )}

      {roomOpen && (
        <RoomModal
          close={() => setRoomOpen(false)}
          movie={roomSeed}
          currentName={displayName}
          onCreate={createRoom}
          onJoin={joinRoom}
        />
      )}
    </main>
  );
}
