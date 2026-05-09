import { askGroq } from "../api/groq";

export async function groupRecommend(users){
  if(!users || users.length===0) return "No users in room yet";

  const names = users.map(u=>u.name).join(", ");

  const prompt = `
We are a group of friends watching movies together.

Users: ${names}

Suggest 5 movies perfect for group watching.
Mix fun, thriller, action, mind blowing.

Only give movie names list.
`;

  const res = await askGroq(prompt);
  return res;
}
