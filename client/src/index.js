// client/src/index.js
import "./styles/main.css";
import { fetchMessages, sendMessage, uploadFile, API_BASE } from "./api.js";

const app = document.getElementById("app");
let allMessages = [];
let lastTimestamp = Infinity;
let isLoading = false;
let hasMore = true;
let currentFilter = "all"; // all, image, video, audio, file

// Стили для фильтров
const style = document.createElement("style");
style.textContent = `
  .filter-btn {
    padding: 6px 12px;
    border: 1px solid #ccc;
    background: #f8f9fa;
    cursor: pointer;
    border-radius: 4px;
    font-size: 14px;
  }
  .filter-btn.active {
    background: #007bff;
    color: white;
    border-color: #007bff;
  }
`;
document.head.appendChild(style);

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

// Работа с закреплённым сообщением
function getPinnedMessage() {
  try {
    return JSON.parse(localStorage.getItem("pinnedMessage"));
  } catch {
    return null;
  }
}

function setPinnedMessage(msg) {
  localStorage.setItem("pinnedMessage", JSON.stringify(msg));
}

function clearPinnedMessage() {
  localStorage.removeItem("pinnedMessage");
}

function togglePin(msg) {
  const current = getPinnedMessage();
  if (current && current.id === msg.id) {
    clearPinnedMessage();
  } else {
    setPinnedMessage(msg);
  }
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

  // Кнопка "закрепить"
  const isPinned = getPinnedMessage()?.id === msg.id;
  const pinBtn = document.createElement("button");
  pinBtn.textContent = "📌";
  pinBtn.title = isPinned ? "Открепить" : "Закрепить";
  pinBtn.style.background = "none";
  pinBtn.style.border = "none";
  pinBtn.style.cursor = "pointer";
  pinBtn.style.marginRight = "8px";
  pinBtn.style.color = isPinned ? "#007bff" : "#ccc";
  pinBtn.onclick = () => togglePin(msg);
  el.appendChild(pinBtn);

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
  const pinnedContainer = document.getElementById("pinned-container");
  if (!chat || !pinnedContainer) return;

  // Обработка закреплённого сообщения
  const pinned = getPinnedMessage();
  if (pinned) {
    // Проверяем, проходит ли оно фильтры и поиск
    let showPinned = true;
    if (currentFilter !== "all" && pinned.type !== currentFilter) {
      showPinned = false;
    }
    const searchInput = document.getElementById("search-input");
    const query = searchInput?.value.trim().toLowerCase() || "";
    if (
      query &&
      !(
        (pinned.content && pinned.content.toLowerCase().includes(query)) ||
        (pinned.filename && pinned.filename.toLowerCase().includes(query))
      )
    ) {
      showPinned = false;
    }

    if (showPinned) {
      pinnedContainer.style.display = "block";
      pinnedContainer.innerHTML = "";
      const pinnedEl = createMessageElement(pinned);
      const pinnedLabel = document.createElement("div");
      pinnedLabel.textContent = "📌 Закреплено";
      pinnedLabel.style.fontSize = "0.9em";
      pinnedLabel.style.color = "#007bff";
      pinnedLabel.style.marginBottom = "4px";
      pinnedEl.insertBefore(pinnedLabel, pinnedEl.firstChild);
      pinnedEl.style.backgroundColor = "#f0f8ff";
      pinnedEl.style.padding = "12px";
      pinnedContainer.appendChild(pinnedEl);
    } else {
      pinnedContainer.style.display = "none";
    }
  } else {
    pinnedContainer.style.display = "none";
  }

  // Обработка остальных сообщений
  let filteredByType = messagesToShow;
  if (currentFilter !== "all") {
    filteredByType = messagesToShow.filter((msg) => msg.type === currentFilter);
  }

  const searchInput = document.getElementById("search-input");
  const query = searchInput?.value.trim().toLowerCase() || "";
  if (query) {
    filteredByType = filteredByType.filter((msg) => {
      if (msg.content && msg.content.toLowerCase().includes(query)) return true;
      if (msg.filename && msg.filename.toLowerCase().includes(query))
        return true;
      return false;
    });
  }

  // Убираем закреплённое из основного списка
  const nonPinned = filteredByType.filter(
    (msg) => !pinned || msg.id !== pinned.id
  );

  chat.innerHTML = "";
  if (nonPinned.length === 0 && !pinned) {
    chat.innerHTML = "<p>Сообщений нет</p>";
    return;
  }

  nonPinned.forEach((msg) => {
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
        <div id="pinned-container" style="margin-bottom: 10px; display: none;"></div>
        <div style="margin-bottom: 10px;">
          <input type="text" id="search-input" placeholder="Поиск по сообщениям..." 
                 style="width: 100%; padding: 8px; box-sizing: border-box;" />
        </div>
        <div style="margin-bottom: 10px; display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="filter-btn active" data-type="all">Все</button>
          <button class="filter-btn" data-type="image">🖼️ Изображения</button>
          <button class="filter-btn" data-type="video">🎥 Видео</button>
          <button class="filter-btn" data-type="audio">🎵 Аудио</button>
          <button class="filter-btn" data-type="file">📂 Файлы</button>
        </div>
        <div id="chat" style="height: 320px; overflow-y: auto; border: 1px solid #ddd; padding: 10px;"></div>
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
            allMessages.push(fileMsg);
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
      renderChat(allMessages);
    });
  }

  // Фильтры
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.type;
      renderChat(allMessages);
    });
  });
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
