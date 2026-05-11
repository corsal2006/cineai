import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_KEY,
  dangerouslyAllowBrowser: true,
});

export const askGroq = async (userMsg) => {
  try {
    const cleaned = userMsg.toLowerCase().trim();
    const greetings = ["hi", "hello", "hey", "yo", "hii"];

    if (greetings.includes(cleaned)) {
      return [
        "Hey, I am CineAI.",
        "",
        "Tell me your mood, a movie you like, or who you are watching with.",
        "I can suggest thrillers, comfort movies, sci-fi, comedy, or group-watch picks.",
      ].join("\n");
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `
You are CineAI, a stylish movie recommendation assistant for a Netflix-like app.

Rules:
- Give a confident answer.
- Recommend at most 5 movies.
- Include year, genre, rating signal, and one short reason.
- Keep formatting clean and compact.
- Avoid spoilers.
`,
        },
        {
          role: "user",
          content: userMsg,
        },
      ],
      temperature: 0.85,
      max_tokens: 700,
    });

    return completion.choices[0].message.content;
  } catch (err) {
    console.error(err);
    return "CineAI could not reach the AI model right now. Try a mood button or search a movie instead.";
  }
};
