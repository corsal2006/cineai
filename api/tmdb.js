/* global process */

const TMDB_BASE = "https://api.themoviedb.org/3";
const REQUEST_TIMEOUT = 9000;

const cleanPath = (value) => {
  if (!value || typeof value !== "string") return null;

  const path = value.startsWith("/") ? value : `/${value}`;
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("..")) return null;

  return path;
};

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const key = process.env.TMDB_API_KEY || process.env.VITE_TMDB_KEY;
  const url = new URL(request.url, `https://${request.headers.host || "cine-ai"}`);
  const path = cleanPath(url.searchParams.get("path"));

  if (!key) {
    response.status(500).json({ error: "TMDB key is not configured on Vercel" });
    return;
  }

  if (!path) {
    response.status(400).json({ error: "Missing TMDB path" });
    return;
  }

  const tmdbUrl = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.forEach((value, name) => {
    if (name !== "path" && name !== "api_key") {
      tmdbUrl.searchParams.set(name, value);
    }
  });
  tmdbUrl.searchParams.set("api_key", key);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const tmdbResponse = await fetch(tmdbUrl, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    const body = await tmdbResponse.text();

    response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=86400");
    response.setHeader("Content-Type", tmdbResponse.headers.get("content-type") || "application/json");
    response.status(tmdbResponse.status).send(body);
  } catch {
    response.status(504).json({ error: "TMDB request timed out" });
  } finally {
    clearTimeout(timer);
  }
}
