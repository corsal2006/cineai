const STORAGE_KEY = "cineai_user_taste";
const WATCHLIST_KEY = "cineai_watchlist";
const RATINGS_KEY = "cineai_ratings";
const REVIEWS_KEY = "cineai_reviews";

export const GENRES = {
  12: "Adventure",
  14: "Fantasy",
  16: "Animation",
  18: "Drama",
  27: "Horror",
  28: "Action",
  35: "Comedy",
  36: "History",
  53: "Thriller",
  80: "Crime",
  878: "Sci-Fi",
  9648: "Mystery",
  10402: "Music",
  10749: "Romance",
  10751: "Family",
  10752: "War",
};

const read = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const getTaste = () =>
  read(STORAGE_KEY, {
    genres: {},
    searches: [],
    clicks: [],
    moods: {},
    lastUpdated: Date.now(),
  });

const saveTaste = (taste) => write(STORAGE_KEY, { ...taste, lastUpdated: Date.now() });

export const genreName = (id) => GENRES[id] || "Discovery";

export const normalizeMovie = (movie) => ({
  id: movie.id,
  title: movie.title || movie.name,
  poster_path: movie.poster_path,
  backdrop_path: movie.backdrop_path,
  overview: movie.overview,
  vote_average: movie.vote_average,
  release_date: movie.release_date || movie.first_air_date,
  genre_ids: movie.genre_ids || movie.genres?.map((genre) => genre.id) || [],
});

export const trackSearch = (query) => {
  const cleaned = query?.trim();
  if (!cleaned) return;

  const taste = getTaste();
  taste.searches = [cleaned, ...taste.searches.filter((item) => item !== cleaned)].slice(0, 20);
  saveTaste(taste);
};

export const trackMovieClick = (movie) => {
  if (!movie) return;

  const taste = getTaste();
  const normalized = normalizeMovie(movie);
  taste.clicks = [normalized, ...taste.clicks.filter((item) => item.id !== normalized.id)].slice(0, 40);

  normalized.genre_ids.forEach((id) => {
    taste.genres[id] = (taste.genres[id] || 0) + 1;
  });

  saveTaste(taste);
};

export const trackMood = (moodId) => {
  if (!moodId) return;

  const taste = getTaste();
  taste.moods[moodId] = (taste.moods[moodId] || 0) + 1;
  saveTaste(taste);
};

export const getFavGenreIds = () => {
  const taste = getTaste();
  return Object.entries(taste.genres)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => Number(id))
    .slice(0, 4);
};

export const getFavGenres = () => getFavGenreIds().map(genreName);

export const scoreMovie = (movie) => {
  const taste = getTaste();
  const ids = movie?.genre_ids || movie?.genres?.map((genre) => genre.id) || [];
  const genreScore = ids.reduce((total, id) => total + (taste.genres[id] || 0), 0);
  const ratingScore = Math.round((movie?.vote_average || 0) * 5);
  const popularityScore = Math.min(25, Math.round((movie?.popularity || 0) / 20));
  const learnedScore = Math.min(35, genreScore * 7);
  return Math.max(42, Math.min(98, 42 + ratingScore + popularityScore + learnedScore));
};

export const personalizeMovies = (movies = []) => {
  const unique = movies.filter((movie, index, list) => list.findIndex((item) => item.id === movie.id) === index);
  return [...unique].sort((a, b) => scoreMovie(b) - scoreMovie(a));
};

export const getWatchlist = () => read(WATCHLIST_KEY, []);

export const isInWatchlist = (movieId) => getWatchlist().some((movie) => movie.id === movieId);

export const toggleWatchlist = (movie) => {
  const current = getWatchlist();
  const exists = current.some((item) => item.id === movie.id);
  const next = exists
    ? current.filter((item) => item.id !== movie.id)
    : [normalizeMovie(movie), ...current].slice(0, 60);

  write(WATCHLIST_KEY, next);
  return next;
};

export const getRatings = () => read(RATINGS_KEY, {});

export const saveRating = (movieId, rating) => {
  const ratings = getRatings();
  ratings[movieId] = rating;
  write(RATINGS_KEY, ratings);
  return ratings;
};

export const getReviews = () => read(REVIEWS_KEY, {});

export const saveReview = (movieId, review) => {
  const reviews = getReviews();
  reviews[movieId] = review;
  write(REVIEWS_KEY, reviews);
  return reviews;
};
