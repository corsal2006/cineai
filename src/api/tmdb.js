import axios from "axios";
import {
  FALLBACK_MOVIES,
  getFallbackByCategory,
  getFallbackByGenre,
  getFallbackMovieDetails,
  searchFallbackMovies,
} from "./tmdbFallback.js";

const getApiKey = () => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env?.VITE_TMDB_KEY) {
      return import.meta.env.VITE_TMDB_KEY.trim();
    }
  } catch {
    // ignore
  }
  try {
    if (typeof globalThis !== "undefined" && globalThis.process?.env?.VITE_TMDB_KEY) {
      return globalThis.process.env.VITE_TMDB_KEY.trim();
    }
  } catch {
    // ignore
  }
  return "";
};
const TMDB = "https://api.themoviedb.org/3";
const USE_PROXY = !import.meta.env.DEV;

export const IMG = "https://image.tmdb.org/t/p/original";
export const POSTER = "https://image.tmdb.org/t/p/w500";
export const PROFILE = "https://image.tmdb.org/t/p/w185";

const client = axios.create({
  baseURL: TMDB,
  timeout: 8000,
});

const proxyClient = axios.create({
  baseURL: "/api/tmdb",
  timeout: 10000,
  params: {
    language: "en-US",
  },
});

const movieOnly = (items = []) =>
  (items || []).filter((item) => item && item.id && (item.title || item.name));

const request = async (path, params = {}) => {
  if (USE_PROXY) {
    try {
      const response = await proxyClient.get("", {
        params: {
          path,
          ...params,
        },
      });
      if (response?.data) return response.data;
    } catch (error) {
      console.warn("TMDB proxy failed; falling back to direct request", error);
    }
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }

  try {
    const response = await client.get(path, {
      params: {
        api_key: apiKey,
        language: "en-US",
        ...params,
      },
    });
    return response.data;
  } catch (err) {
    console.warn(`TMDB request to ${path} failed:`, err.message);
    return null;
  }
};

export const imageUrl = (path, size = "original") => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

export const getTrending = async () => {
  const data = await request("/trending/movie/week");
  const results = movieOnly(data?.results);
  return results.length ? results : getFallbackByCategory("trending");
};

export const getPopular = async () => {
  const data = await request("/movie/popular", { page: 1, region: "US" });
  const results = movieOnly(data?.results);
  return results.length ? results : getFallbackByCategory("popular");
};

export const getTopRated = async () => {
  const data = await request("/movie/top_rated", { page: 1, region: "US" });
  const results = movieOnly(data?.results);
  return results.length ? results : getFallbackByCategory("topRated");
};

export const getAction = async () => {
  const results = await getDiscoverByGenre(28);
  return results.length ? results : getFallbackByGenre(28);
};

export const getHorror = async () => {
  const results = await getDiscoverByGenre(27);
  return results.length ? results : getFallbackByGenre(27);
};

export const getScifi = async () => {
  const results = await getDiscoverByGenre(878);
  return results.length ? results : getFallbackByGenre(878);
};

export const getComedy = async () => {
  const results = await getDiscoverByGenre(35);
  return results.length ? results : getFallbackByGenre(35);
};

export const getBollywood = async () => {
  const data = await request("/discover/movie", {
    sort_by: "popularity.desc",
    with_original_language: "hi",
    "vote_count.gte": 80,
  });
  const results = movieOnly(data?.results);
  return results.length ? results : getFallbackByCategory("bollywood");
};

export const getAnime = async () => {
  const data = await request("/discover/movie", {
    sort_by: "popularity.desc",
    with_genres: 16,
    with_keywords: "210024|287501",
  });
  const results = movieOnly(data?.results);
  return results.length ? results : getFallbackByCategory("anime");
};

export const getDiscoverByGenre = async (genreId, extra = {}) => {
  const data = await request("/discover/movie", {
    sort_by: "popularity.desc",
    include_adult: false,
    "vote_count.gte": 100,
    with_genres: genreId,
    ...extra,
  });
  const results = movieOnly(data?.results);
  return results.length ? results : getFallbackByGenre(genreId);
};

export const MOODS = [
  {
    id: "happy",
    label: "Happy",
    description: "Bright, funny, easy to watch",
    params: { with_genres: "35,10751", sort_by: "popularity.desc" },
  },
  {
    id: "sad",
    label: "Sad",
    description: "Emotional dramas and cathartic stories",
    params: { with_genres: "18,10749", sort_by: "vote_average.desc", "vote_count.gte": 500 },
  },
  {
    id: "motivational",
    label: "Motivational",
    description: "Comebacks, ambition, and high-stakes wins",
    params: { with_genres: "18,36", sort_by: "popularity.desc", with_keywords: "9715|18035|210024" },
  },
  {
    id: "sci-fi",
    label: "Sci-Fi Mood",
    description: "Big ideas, space, and mind-bending worlds",
    params: { with_genres: "878", sort_by: "popularity.desc" },
  },
  {
    id: "late-night",
    label: "Late-night Thriller",
    description: "Tense, dark, and impossible to pause",
    params: { with_genres: "53,9648", sort_by: "popularity.desc", "vote_count.gte": 150 },
  },
];

export const getMoodMovies = async (moodId) => {
  const mood = MOODS.find((item) => item.id === moodId) || MOODS[0];
  const data = await request("/discover/movie", {
    include_adult: false,
    page: 1,
    ...mood.params,
  });
  const results = movieOnly(data?.results);
  if (results.length) return results;

  if (moodId === "happy") return getFallbackByGenre(35);
  if (moodId === "sci-fi") return getFallbackByGenre(878);
  if (moodId === "late-night") return getFallbackByGenre(53);
  if (moodId === "sad") return getFallbackByGenre(18);
  return FALLBACK_MOVIES.slice(0, 15);
};

export const searchMovies = async (query) => {
  if (!query?.trim()) return [];
  const data = await request("/search/movie", {
    query,
    include_adult: false,
    page: 1,
  });
  const results = movieOnly(data?.results);
  return results.length ? results : searchFallbackMovies(query);
};

export const getMovieDetails = async (id) => {
  if (!id) return null;
  const data = await request(`/movie/${id}`, {
    append_to_response: "videos,credits,similar,recommendations",
  });
  return data?.id ? data : getFallbackMovieDetails(id);
};

export const getTrailer = async (id) => {
  const data = await request(`/movie/${id}/videos`);
  const videos = data?.results || [];
  if (videos.length) return videos;
  return getFallbackMovieDetails(id)?.videos?.results || [];
};

export const getMovieVideos = getTrailer;

export const getCast = async (id) => {
  const data = await request(`/movie/${id}/credits`);
  const cast = data?.cast || [];
  if (cast.length) return cast;
  return getFallbackMovieDetails(id)?.credits?.cast || [];
};

export const getSimilar = async (id) => {
  const data = await request(`/movie/${id}/similar`);
  const results = movieOnly(data?.results);
  if (results.length) return results;
  return getFallbackMovieDetails(id)?.similar?.results || [];
};

export const getRecommendations = async (id) => {
  const data = await request(`/movie/${id}/recommendations`);
  const results = movieOnly(data?.results);
  if (results.length) return results;
  return getFallbackMovieDetails(id)?.recommendations?.results || [];
};

export const getTrendingPrediction = async () => {
  const [popular, trending] = await Promise.all([getPopular(), getTrending()]);
  const combined = [...popular, ...trending];
  const list = combined.length ? combined : FALLBACK_MOVIES;

  return [...list]
    .filter((movie, index, arr) => arr.findIndex((item) => item.id === movie.id) === index)
    .sort((a, b) => {
      const aMomentum = (a.popularity || 0) + (a.vote_count || 0) / 100 + (a.vote_average || 0) * 8;
      const bMomentum = (b.popularity || 0) + (b.vote_count || 0) / 100 + (b.vote_average || 0) * 8;
      return bMomentum - aMomentum;
    })
    .slice(0, 20);
};

export const pickTrailer = (videos = []) =>
  videos.find((video) => video.site === "YouTube" && video.type === "Trailer") ||
  videos.find((video) => video.site === "YouTube" && video.type === "Teaser") ||
  videos.find((video) => video.site === "YouTube") || {
    key: "YoHD9XEInc0",
    site: "YouTube",
    type: "Trailer",
  };
