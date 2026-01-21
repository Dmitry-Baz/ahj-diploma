// client/src/index.js
import "./styles/main.css";
import { fetchMessages, sendMessage, uploadFile, API_BASE } from "./api.js";

const app = document.getElementById("app");
let allMessages = [];
let lastTimestamp = Infinity;
let isLoading = false;
let hasMore = true;

// Работа с избранным
function getFavorites() {
  try {
    return new Set(JSON.parse(localStorage.getItem("favorites") || "[]"));
  } catch {
    return new Set();
  }
}

function isFavorite(id) {
  return getFavorites().has(id);
}

function toggleFavorite(msg) {
  const favorites = getFavorites();
  if (favorites.has(msg.id)) {
    favorites.delete(msg.id);
  } else {
    favorites.add(msg.id);
  }
  localStorage.setItem("favorites", JSON.stringify(Array.from(favorites)));
  renderChat(allMessages);
}

function createMessageElement(msg) {
  const el = document.createElement("div");
  el.className = `message message--${msg.type}`;
  el.style.padding = "10px 0";
  el.style.borderBottom = "1px solid #eee";
  el.style.display = "flex";
  el.style.alignItems = "flex-start";

  // Кнопка "избранное"
  const starBtn = document.createElement("button");
  starBtn.textContent = isFavorite(msg.id) ? "⭐" : "☆";
  starBtn.style.background = "none";
  starBtn.style.border = "none";
  starBtn.style.cursor = "pointer";
  starBtn.style.marginRight = "8px";
  starBtn.onclick = () => toggleFavorite(msg);
  el.appendChild(starBtn);

  // Контент
  const contentEl = document.createElement("div");
  contentEl.style.flex = "1";

  if (msg.type === "link") {
    contentEl.innerHTML = `<a href="${msg.content}" target="_blank" rel="noopener">${msg.content}</a>`;
  } else if (msg.type === "image") {
    contentEl.innerHTML = `
      <img src="${
        msg.content
      }" alt="Изображение" style="max-width: 300px; max-height: 300px; display: block;" />
      <button class="download-btn" data-url="${msg.content}" data-filename="${
      msg.filename || "image.jpg"
    }" style="margin-top: 5px;">↓ Скачать</button>
    `;
  } else if (msg.type === "video") {
    contentEl.innerHTML = `
      <video controls src="${msg.content}" style="width: 300px;"></video>
      <button class="download-btn" data-url="${msg.content}" data-filename="${
      msg.filename || "video.mp4"
    }" style="margin-top: 5px;">↓ Скачать</button>
    `;
  } else if (msg.type === "audio") {
    contentEl.innerHTML = `
      <audio controls src="${msg.content}"></audio>
      <button class="download-btn" data-url="${msg.content}" data-filename="${
      msg.filename || "audio.mp3"
    }" style="margin-top: 5px;">↓ Скачать</button>
    `;
  } else if (msg.type === "file") {
    contentEl.innerHTML = `
      📄 ${msg.filename || "Файл"}
      <button class="download-btn" data-url="${msg.content}" data-filename="${
      msg.filename || "file"
    }" style="margin-left: 10px;">↓ Скачать</button>
    `;
  } else {
    contentEl.textContent = msg.content;
  }

  el.appendChild(contentEl);
  return el;
}

function renderChat(messagesToShow) {
  const chat = document.getElementById("chat");
  if (!chat) return;

  chat.innerHTML = "";
  if (messagesToShow.length === 0) {
    chat.innerHTML = "<p>Сообщений нет</p>";
    return;
  }

  messagesToShow.forEach((msg) => {
    chat.appendChild(createMessageElement(msg));
  });
  chat.scrollTop = chat.scrollHeight;
}

async function loadInitialMessages() {
  if (isLoading) return;
  isLoading = true;

  try {
    if (!document.getElementById("chat")) {
      app.innerHTML = `
        <h1>Бот-органайзер</h1>
        <div style="margin-bottom: 10px;">
          <input type="text" id="search-input" placeholder="Поиск по сообщениям..." 
                 style="width: 100%; padding: 8px; box-sizing: border-box;" />
        </div>
        <div id="chat" style="height: 380px; overflow-y: auto; border: 1px solid #ddd; padding: 10px;"></div>
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
    }

    const params = new URLSearchParams();
    if (lastTimestamp !== Infinity) {
      params.append("before", lastTimestamp);
    }
    params.append("limit", "10");
    const url = `${API_BASE}/api/messages?${params.toString()}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("Ошибка загрузки");
    let messages = await res.json();

    messages = messages.map((msg) => {
      if (msg.content && msg.content.startsWith("/uploads/")) {
        return { ...msg, content: `${API_BASE}${msg.content}` };
      }
      return msg;
    });

    const chat = document.getElementById("chat");
    if (chat) {
      if (messages.length === 0) {
        chat.innerHTML = "<p>Сообщений нет</p>";
        hasMore = false;
      } else {
        allMessages = [...messages];
        renderChat(messages);
        lastTimestamp = messages[0].timestamp;
        hasMore = messages.length >= 10;
      }
    }
  } catch (err) {
    console.error(err);
    if (!document.getElementById("chat")) {
      app.innerHTML = `<p style="color:red">Ошибка: ${err.message}</p>`;
    }
  } finally {
    isLoading = false;
  }
}

function setupEventListeners() {
  document.querySelectorAll(".download-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const url = e.target.dataset.url;
      window.open(url, "_blank");
    });
  });

  const form = document.getElementById("message-form");
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const input = document.getElementById("message-input");
      const text = input.value.trim();
      if (text) {
        try {
          await sendMessage(text);
          const newMsg = {
            id: Date.now().toString(),
            type:
              text.startsWith("http://") || text.startsWith("https://")
                ? "link"
                : "text",
            content: text,
            timestamp: Date.now(),
            filename: null,
          };
          allMessages.push(newMsg);
          renderChat(allMessages);
          input.value = "";
        } catch (err) {
          alert("Не удалось отправить сообщение");
        }
      }
    };
  }

  const uploadBtn = document.getElementById("upload-btn");
  if (uploadBtn) {
    uploadBtn.onclick = () => {
      const input = document.createElement("input");
      input.type = "file";
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            const data = await uploadFile(file);
            const fileMsg = {
              id: Date.now().toString(),
              type: data.type,
              content: data.url,
              timestamp: Date.now(),
              filename: data.filename,
            };
            allMessages.push(fileMsg); // ← исправлено: было newMsg
            renderChat(allMessages);
          } catch (err) {
            alert("Не удалось загрузить файл");
          }
        }
      };
      input.click();
    };
  }

  const dropZone = document.getElementById("drop-zone");
  if (dropZone) {
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
        try {
          const data = await uploadFile(file);
          const fileMsg = {
            id: Date.now().toString(),
            type: data.type,
            content: data.url,
            timestamp: Date.now(),
            filename: data.filename,
          };
          allMessages.push(fileMsg);
          renderChat(allMessages);
        } catch (err) {
          alert("Не удалось загрузить файл");
        }
      }
    });
  }

  const chat = document.getElementById("chat");
  if (chat) {
    chat.addEventListener("scroll", () => {
      if (
        chat.scrollHeight > chat.clientHeight &&
        chat.scrollTop <= 10 &&
        hasMore &&
        !isLoading
      ) {
        loadOlderMessages();
      }
    });
  }

  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const query = searchInput.value.trim().toLowerCase();
      if (query === "") {
        renderChat(allMessages);
      } else {
        const filtered = allMessages.filter((msg) => {
          if (msg.content && msg.content.toLowerCase().includes(query))
            return true;
          if (msg.filename && msg.filename.toLowerCase().includes(query))
            return true;
          return false;
        });
        renderChat(filtered);
      }
    });
  }
}

async function loadOlderMessages() {
  if (isLoading) return;
  isLoading = true;

  try {
    const params = new URLSearchParams();
    params.append("before", lastTimestamp);
    params.append("limit", "10");
    const url = `${API_BASE}/api/messages?${params.toString()}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("Ошибка загрузки");
    let messages = await res.json();

    messages = messages.map((msg) => {
      if (msg.content && msg.content.startsWith("/uploads/")) {
        return { ...msg, content: `${API_BASE}${msg.content}` };
      }
      return msg;
    });

    const chat = document.getElementById("chat");
    if (chat && messages.length > 0) {
      allMessages = [...messages, ...allMessages];
      renderChat(allMessages);
      lastTimestamp = messages[messages.length - 1].timestamp;
      hasMore = messages.length >= 10;
    } else {
      hasMore = false;
    }
  } catch (err) {
    console.error("❌ Ошибка подгрузки:", err);
  } finally {
    isLoading = false;
  }
}

loadInitialMessages().then(() => {
  setupEventListeners();
});
