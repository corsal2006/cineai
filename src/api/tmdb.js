import axios from "axios";

const API = import.meta.env.VITE_TMDB_KEY;
export const IMG = "https://image.tmdb.org/t/p/original";


/* ========= GENRES ========= */

export const getTrending = async () => {
  const r = await axios.get(
    `https://api.themoviedb.org/3/trending/movie/week?api_key=${API}`
  );
  return r.data.results;
};

export const getAction = async () => {
  const r = await axios.get(
    `https://api.themoviedb.org/3/discover/movie?api_key=${API}&with_genres=28`
  );
  return r.data.results;
};

export const getHorror = async () => {
  const r = await axios.get(
    `https://api.themoviedb.org/3/discover/movie?api_key=${API}&with_genres=27`
  );
  return r.data.results;
};

export const getScifi = async () => {
  const r = await axios.get(
    `https://api.themoviedb.org/3/discover/movie?api_key=${API}&with_genres=878`
  );
  return r.data.results;
};

export const getComedy = async () => {
  const r = await axios.get(
    `https://api.themoviedb.org/3/discover/movie?api_key=${API}&with_genres=35`
  );
  return r.data.results;
};

export const getBollywood = async () => {
  const r = await axios.get(
    `https://api.themoviedb.org/3/discover/movie?api_key=${API}&with_original_language=hi`
  );
  return r.data.results;
};

export const getAnime = async () => {
  const r = await axios.get(
    `https://api.themoviedb.org/3/discover/tv?api_key=${API}&with_genres=16`
  );
  return r.data.results;
};

/* ========= SEARCH ========= */
export const searchMovies = async (q) => {
  if (!q) return [];
  const r = await axios.get(
    `https://api.themoviedb.org/3/search/movie?api_key=${API}&query=${q}`
  );
  return r.data.results;
};

/* ========= TRAILER ========= */
export const getTrailer = async (id) => {
  const r = await axios.get(
    `https://api.themoviedb.org/3/movie/${id}/videos?api_key=${API}`
  );
  return r.data.results;
};

/* ========= CAST ========= */
export const getCast = async (id) => {
  const r = await axios.get(
    `https://api.themoviedb.org/3/movie/${id}/credits?api_key=${API}`
  );
  return r.data.cast;
};

/* ========= SIMILAR ========= */
export const getSimilar = async (id) => {
  const r = await axios.get(
    `https://api.themoviedb.org/3/movie/${id}/similar?api_key=${API}`
  );
  return r.data.results;
};
export const getMovieVideos = async (id)=>{
  const r = await fetch(
   `https://api.themoviedb.org/3/movie/${id}/videos?api_key=${API}`
  );
  const d = await r.json();
  return d.results;
};
