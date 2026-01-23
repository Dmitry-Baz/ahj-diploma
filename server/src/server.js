// server/src/server.js
const Koa = require("koa");
const Router = require("koa-router");
const koaBody = require("koa-body").default;
const koaStatic = require("koa-static");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs"); // ← для readdirSync
const fsp = require("fs").promises; // ← для async операций
const send = require("koa-send");

const app = new Koa();
const router = new Router();

// In-memory storage
const messages = new Map();

// Демо-сообщения
if (messages.size === 0) {
  messages.set("1", {
    id: "1",
    type: "text",
    content: "Привет! Это демо-сообщение.",
    timestamp: Date.now() - 60000,
    filename: null,
  });
  messages.set("2", {
    id: "2",
    type: "link",
    content: "https://example.com",
    timestamp: Date.now() - 30000,
    filename: null,
  });
}

// Единый middleware для тела запроса
app.use(
  koaBody({
    multipart: true,
    json: true,
    formidable: {
      maxFileSize: 10 * 1024 * 1024, // 10 МБ
    },
  })
);

// CORS
app.use(async (ctx, next) => {
  ctx.set("Access-Control-Allow-Origin", "*");
  ctx.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  ctx.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (ctx.method === "OPTIONS") {
    ctx.status = 204;
    return;
  }
  await next();
});

// Статика: отдача файлов из uploads/
const uploadsPath = path.join(__dirname, "..", "uploads");
console.log("📁 Отдаю файлы из:", uploadsPath);
try {
  console.log("📄 Файлы в папке:", fs.readdirSync(uploadsPath));
} catch (err) {
  console.error("❌ Не удалось прочитать папку uploads:", err.message);
}
console.log("📁 [DEBUG] __dirname:", __dirname);
console.log("📁 [DEBUG] process.cwd():", process.cwd());
console.log("📁 [DEBUG] uploadsPath:", uploadsPath);
console.log(
  "📁 [DEBUG] Файл test.txt существует:",
  fs.existsSync(path.join(uploadsPath, "test.txt"))
);
// app.use(koaStatic(uploadsPath));

// === Маршруты ===

// Отдача файлов из /uploads
// router.get('/uploads/:filename', async (ctx) => {
//   try {
//     await send(ctx, ctx.params.filename, { 
//       root: path.resolve(__dirname, '../uploads')
//     });
//   } catch (err) {
//     if (err.status === 404) {
//       ctx.status = 404;
//       ctx.body = 'Файл не найден';
//     } else {
//       throw err;
//     }
//   }
// });
router.get("/uploads/:filename", async (ctx) => {
  try {
    const filename = ctx.params.filename;
    // Принудительное скачивание
    ctx.set("Content-Disposition", `attachment; filename="${filename}"`);
    await send(ctx, filename, {
      root: path.resolve(__dirname, "../uploads"),
    });
  } catch (err) {
    if (err.status === 404) {
      ctx.status = 404;
      ctx.body = "Файл не найден";
    } else {
      throw err;
    }
  }
});

// Получить сообщения с пагинацией
router.get("/api/messages", (ctx) => {
  const { before, limit = '10' } = ctx.query;
  // const limitNum = Math.min(50, parseInt(limit, 10) || 10);
  const beforeTs = before ? parseInt(before, 10) : Infinity;

  const list = Array.from(messages.values())
    .filter(msg => msg.timestamp < beforeTs)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  ctx.body = list;
});

// Отправить текстовое сообщение
router.post("/api/messages", async (ctx) => {
  const { content } = ctx.request.body;
  if (!content) {
    ctx.status = 400;
    return;
  }

  const msg = {
    id: uuidv4(),
    type:
      content.startsWith("http://") || content.startsWith("https://")
        ? "link"
        : "text",
    content,
    timestamp: Date.now(),
    filename: null,
  };
  messages.set(msg.id, msg);

  // Команды бота
  if (content.toLowerCase().startsWith("@chaos:")) {
    const cmd = content.toLowerCase().replace("@chaos:", "").trim();
    let responseText = "Команда не распознана.";
    if (cmd.includes("погода")) responseText = "Сегодня солнечно!";
    else if (cmd.includes("время"))
      responseText = `Текущее время: ${new Date().toLocaleTimeString()}`;
    else if (cmd.includes("привет")) responseText = "Здравствуйте!";
    else if (cmd.includes("цитата"))
      responseText =
        "Жизнь — это то, что с тобой происходит, пока ты строишь планы.";
    else if (cmd.includes("настроение")) responseText = "Отличное!";

    const botMsg = {
      id: uuidv4(),
      type: "text",
      content: responseText,
      timestamp: Date.now() + 100,
      filename: null,
    };
    messages.set(botMsg.id, botMsg);
  }

  ctx.status = 201;
  ctx.body = { id: msg.id };
});

// Загрузка файла
router.post("/api/files", async (ctx) => {
  try {
    const file = ctx.request.files?.file;
    if (!file) {
      ctx.status = 400;
      ctx.body = { error: "Файл не найден" };
      return;
    }

    const { originalFilename, filepath, mimetype } = file;
    const ext = originalFilename
      ? path.extname(originalFilename).toLowerCase()
      : "";
    const id = uuidv4();
    const filename = `${id}${ext}`;
    const dest = path.join(__dirname, "..", "uploads", filename);

    // Убедимся, что папка uploads существует
    const uploadsDir = path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Копируем, а не переименовываем (чтобы избежать EXDEV)
    await fsp.copyFile(filepath, dest);
    await fsp.unlink(filepath); // удаляем временный файл

    // Определяем тип
    let type = "file";
    if (mimetype.startsWith("image/")) type = "image";
    else if (mimetype.startsWith("video/")) type = "video";
    else if (mimetype.startsWith("audio/")) type = "audio";

    const msg = {
      id: uuidv4(),
      type,
      content: `/uploads/${filename}`,
      timestamp: Date.now(),
      filename: originalFilename || filename,
    };
    messages.set(msg.id, msg);

    ctx.status = 201;
    ctx.body = { url: `/uploads/${filename}`, type, filename: msg.filename };
  } catch (err) {
    console.error("Upload error:", err);
    ctx.status = 500;
    ctx.body = { error: "Ошибка загрузки: " + err.message };
  }
});

// Подключаем маршруты
app.use(router.routes());

// Запуск сервера
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
});
