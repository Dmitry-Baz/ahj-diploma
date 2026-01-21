// client/src/api.js???

const API_BASE =
  process.env.NODE_ENV === "production"
    ? "https://ahj-diploma-server-zbn4.onrender.com"
    : "http://localhost:3001";

export const fetchMessages = async () => {
  const res = await fetch(`${API_BASE}/api/messages`);
  if (!res.ok) throw new Error("Не удалось загрузить сообщения");
  return res.json();
};

export const sendMessage = async (content) => {
  const res = await fetch(`${API_BASE}/api/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error("Не удалось отправить сообщение");
  return res.json();
};
