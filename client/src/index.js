// client/src/index.js
import "./styles/main.css";
import { fetchMessages, sendMessage } from "./api.js";

const app = document.getElementById("app");

// Показать сообщения
async function renderMessages() {
  try {
    const messages = await fetchMessages();
    app.innerHTML = `
      <h1>Бот-органайзер</h1>
      <div id="chat"></div>
      <form id="message-form">
        <input type="text" id="message-input" placeholder="Введите сообщение..." required />
        <button type="submit">Отправить</button>
      </form>
    `;

    const chat = document.getElementById("chat");
    messages.forEach((msg) => {
      const el = document.createElement("div");
      el.className = "message";
      if (msg.type === "link") {
        el.innerHTML = `<a href="${msg.content}" target="_blank" rel="noopener">${msg.content}</a>`;
      } else {
        el.textContent = msg.content;
      }
      chat.appendChild(el);
    });

    // Обработка отправки
    document
      .getElementById("message-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = document.getElementById("message-input");
        await sendMessage(input.value);
        input.value = "";
        renderMessages(); // обновить чат
      });
  } catch (err) {
    app.innerHTML = `<p style="color:red">Ошибка: ${err.message}</p>`;
  }
}

renderMessages();
