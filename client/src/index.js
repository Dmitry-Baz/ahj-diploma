// client/src/index.js
import "./styles/main.css";
import { fetchMessages, sendMessage, uploadFile, API_BASE } from "./api.js";

const app = document.getElementById("app");

async function renderMessages() {
  try {
    let messages = await fetchMessages();

    // Преобразуем все относительные пути в полные
    messages = messages.map((msg) => {
      if (msg.content && msg.content.startsWith("/uploads/")) {
        return { ...msg, content: `${API_BASE}${msg.content}` };
      }
      return msg;
    });

    app.innerHTML = `
      <h1>Бот-органайзер</h1>
      <div id="chat"></div>
      <div id="input-area" style="margin-top: 20px;">
        <div id="file-upload" style="margin-bottom: 10px;">
          <button id="upload-btn">📎 Загрузить файл</button>
          <div id="drop-zone" style="border: 2px dashed #ccc; padding: 10px; margin-top: 5px; text-align: center;">
            Или перетащите файл сюда
          </div>
        </div>
        <form id="message-form">
          <input type="text" id="message-input" placeholder="Введите сообщение..." style="width: 70%; padding: 8px;" />
          <button type="submit" style="padding: 8px 16px;">Отправить</button>
        </form>
      </div>
    `;

    // --- Отображение сообщений ---
    const chat = document.getElementById("chat");
    messages.forEach((msg) => {
      const el = document.createElement("div");
      el.className = `message message--${msg.type}`;
      el.style.padding = "10px 0";
      el.style.borderBottom = "1px solid #eee";

      if (msg.type === "link") {
        el.innerHTML = `<a href="${msg.content}" target="_blank" rel="noopener">${msg.content}</a>`;
      } else if (msg.type === "image") {
        el.innerHTML = `
          <img src="${
            msg.content
          }" alt="Изображение" style="max-width: 300px; max-height: 300px; display: block;" />
          <button class="download-btn" data-url="${
            msg.content
          }" data-filename="${
          msg.filename || "image.jpg"
        }" style="margin-top: 5px;">↓ Скачать</button>
        `;
      } else if (msg.type === "video") {
        el.innerHTML = `
          <video controls src="${msg.content}" style="width: 300px;"></video>
          <button class="download-btn" data-url="${
            msg.content
          }" data-filename="${
          msg.filename || "video.mp4"
        }" style="margin-top: 5px;">↓ Скачать</button>
        `;
      } else if (msg.type === "audio") {
        el.innerHTML = `
          <audio controls src="${msg.content}"></audio>
          <button class="download-btn" data-url="${
            msg.content
          }" data-filename="${
          msg.filename || "audio.mp3"
        }" style="margin-top: 5px;">↓ Скачать</button>
        `;
      } else if (msg.type === "file") {
        el.innerHTML = `
          📄 ${msg.filename || "Файл"}
          <button class="download-btn" data-url="${
            msg.content
          }" data-filename="${
          msg.filename || "file"
        }" style="margin-left: 10px;">↓ Скачать</button>
        `;
      } else {
        el.textContent = msg.content;
      }

      chat.appendChild(el);
    });

    // --- Обработка скачивания ---
    document.querySelectorAll(".download-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const url = e.target.dataset.url;
        const filename = e.target.dataset.filename;
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
    });

    // --- Отправка текста ---
    document
      .getElementById("message-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = document.getElementById("message-input");
        const text = input.value.trim();
        if (text) {
          await sendMessage(text);
          input.value = "";
          renderMessages();
        }
      });

    // --- Загрузка через кнопку ---
    document.getElementById("upload-btn").addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          await uploadFile(file);
          renderMessages();
        }
      };
      input.click();
    });

    // --- Drag & Drop ---
    const dropZone = document.getElementById("drop-zone");
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.style.borderColor = "#007bff";
    });
    dropZone.addEventListener("dragleave", () => {
      dropZone.style.borderColor = "#ccc";
    });
    dropZone.addEventListener("drop", async (e) => {
      e.preventDefault();
      dropZone.style.borderColor = "#ccc";
      const file = e.dataTransfer.files[0];
      if (file) {
        await uploadFile(file);
        renderMessages();
      }
    });
  } catch (err) {
    app.innerHTML = `<p style="color:red">Ошибка: ${err.message}</p>`;
  }
}

renderMessages();
