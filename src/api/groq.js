import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_KEY,
  dangerouslyAllowBrowser: true,
});

export const askGroq = async (userMsg) => {
  try {

    // 🎯 If user just greets
    const greetings = ["hi","hello","hey","yo","hii"];
    if (greetings.includes(userMsg.toLowerCase().trim())) {
      return `👋 Hey there! I'm CineAI

Tell me what you feel like watching:

🎬 "Mind bending movies"
😂 "Comedy like Hangover"
👻 "Horror movies"
🚀 "Sci-fi like Interstellar"

I'll give you perfect recommendations 😎`;
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `
You are CineAI — a stylish Netflix-like movie AI.

RULES:
- Friendly
- Cool
- Make response attractive
- Use emojis
- Give max 5 movies
- Format properly

FORMAT:

🎬 Movie Name (Year)
⭐ Rating
🎭 Genre
🔥 Why watch (1 line)

Keep clean spacing.
`,
        },
        {
          role: "user",
          content: userMsg,
        },
      ],
      temperature: 0.9,
      max_tokens: 800,
    });

    return completion.choices[0].message.content;

  } catch (err) {
    console.log(err);
    return "⚠️ AI not responding. Try again.";
  }
};
