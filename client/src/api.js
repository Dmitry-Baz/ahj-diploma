// client/src/api.js

export const API_BASE =
  process.env.NODE_ENV === "production"
    ? "https://ahj-diploma-server-zbn4.onrender.com"
    : "http://localhost:3001";

export async function fetchMessages() {
  const res = await fetch(`${API_BASE}/api/messages`);
  if (!res.ok) throw new Error("Не удалось загрузить сообщения");
  return res.json();
}

export async function sendMessage(content) {
  const res = await fetch(`${API_BASE}/api/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error("Не удалось отправить сообщение");
  return res.json();
}

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/files`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Не удалось загрузить файл");

  const data = await res.json();
  // Преобразуем относительный URL в полный
  if (data.url && data.url.startsWith("/uploads/")) {
    data.url = `${API_BASE}${data.url}`;
  }
  return data;
}
