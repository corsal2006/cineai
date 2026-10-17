import Groq from "groq-sdk";
import { FALLBACK_MOVIES } from "./tmdbFallback.js";

const CANDIDATE_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "llama-3.3-70b-versatile",
];

const SYSTEM_PROMPT = `You are CineAI, an elite, stylish movie recommendation assistant for a Netflix-like streaming app.

Rules:
- Give a confident, well-curated answer.
- Recommend at most 5 movies matching the user's mood or request.
- Include release year, genre, and a compelling 1-line reason why it fits.
- Keep formatting clean, scannable, and compact.
- Avoid spoilers completely.`;

const getApiKey = () => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env?.VITE_GROQ_KEY) {
      return import.meta.env.VITE_GROQ_KEY.trim();
    }
  } catch {
    // ignore
  }
  try {
    if (typeof globalThis !== "undefined" && globalThis.process?.env?.VITE_GROQ_KEY) {
      return globalThis.process.env.VITE_GROQ_KEY.trim();
    }
  } catch {
    // ignore
  }
  return "";
};

const getSmartFallback = (query = "") => {
  const q = query.toLowerCase();
  let filtered = FALLBACK_MOVIES;

  if (q.includes("scifi") || q.includes("sci-fi") || q.includes("space") || q.includes("future")) {
    filtered = FALLBACK_MOVIES.filter((m) => m.genre_ids?.includes(878));
  } else if (q.includes("thrill") || q.includes("dark") || q.includes("mystery") || q.includes("crime")) {
    filtered = FALLBACK_MOVIES.filter((m) => m.genre_ids?.includes(53) || m.genre_ids?.includes(9648));
  } else if (q.includes("action") || q.includes("fight") || q.includes("superhero")) {
    filtered = FALLBACK_MOVIES.filter((m) => m.genre_ids?.includes(28));
  } else if (q.includes("comedy") || q.includes("funny") || q.includes("laugh") || q.includes("comfort")) {
    filtered = FALLBACK_MOVIES.filter((m) => m.genre_ids?.includes(35));
  } else if (q.includes("horror") || q.includes("scary") || q.includes("spooky")) {
    filtered = FALLBACK_MOVIES.filter((m) => m.genre_ids?.includes(27));
  } else if (q.includes("drama") || q.includes("emotional") || q.includes("sad")) {
    filtered = FALLBACK_MOVIES.filter((m) => m.genre_ids?.includes(18));
  }

  const selection = (filtered.length ? filtered : FALLBACK_MOVIES).slice(0, 5);

  const lines = selection.map(
    (m, index) =>
      `${index + 1}. **${m.title}** (${m.release_date?.slice(0, 4) || "Popular"}) — ${m.overview?.slice(0, 110)}...`
  );

  return [
    "Here are top-tier recommendations for your mood:",
    "",
    ...lines,
    "",
    "Tap any movie title or search it on CineAI to start watching!",
  ].join("\n");
};

export const askGroq = async (userMsg) => {
  if (!userMsg || !userMsg.trim()) {
    return "What kind of movie or mood are you in the mood for?";
  }

  const cleaned = userMsg.toLowerCase().trim();
  const greetings = ["hi", "hello", "hey", "yo", "hii", "help"];

  if (greetings.includes(cleaned)) {
    return [
      "Hey, I am CineAI.",
      "",
      "Tell me your mood, a movie you like, or who you are watching with.",
      "I can suggest thrillers, comfort movies, sci-fi, comedy, or group-watch picks.",
    ].join("\n");
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return getSmartFallback(userMsg);
  }

  // Attempt chat completions across active models
  for (const model of CANDIDATE_MODELS) {
    try {
      // Direct fetch is fast and immune to browser environment/bundle limitations
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMsg },
          ],
          temperature: 0.8,
          max_tokens: 600,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content && content.trim()) {
          return content.trim();
        }
      }
    } catch (fetchErr) {
      console.warn(`Groq fetch failed on model ${model}:`, fetchErr.message);
    }
  }

  // Secondary attempt with Groq SDK
  try {
    const groq = new Groq({
      apiKey,
      dangerouslyAllowBrowser: true,
    });

    const completion = await groq.chat.completions.create({
      model: CANDIDATE_MODELS[0],
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      temperature: 0.8,
      max_tokens: 600,
    });

    const sdkContent = completion.choices?.[0]?.message?.content;
    if (sdkContent && sdkContent.trim()) {
      return sdkContent.trim();
    }
  } catch (sdkErr) {
    console.warn("Groq SDK fallback attempt failed:", sdkErr.message);
  }

  return getSmartFallback(userMsg);
};

