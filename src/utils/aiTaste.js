// 🎯 CINEAI LOCAL AI MEMORY ENGINE

const STORAGE_KEY = "cineai_user_taste";

// get stored taste
export const getTaste = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : {
    genres: {},
    searches: [],
    clicks: []
  };
};

// save taste
const saveTaste = (data) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

// 🎬 track search
export const trackSearch = (query) => {
  if (!query) return;

  const taste = getTaste();
  taste.searches.push(query);

  saveTaste(taste);
};

// ❤️ track movie click
export const trackMovieClick = (movie) => {
  if (!movie) return;

  const taste = getTaste();
  taste.clicks.push(movie.title);

  // store genre preference
  if (movie.genre_ids) {
    movie.genre_ids.forEach(id => {
      taste.genres[id] = (taste.genres[id] || 0) + 1;
    });
  }

  saveTaste(taste);
};

// 🧠 get fav genres
export const getFavGenres = () => {
  const taste = getTaste();
  const sorted = Object.entries(taste.genres)
    .sort((a,b) => b[1]-a[1])
    .map(g => g[0]);

  return sorted.slice(0,3); // top 3 fav genres
};
