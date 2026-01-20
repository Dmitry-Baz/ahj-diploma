const Koa = require("koa");
const Router = require("koa-router");
const koaBody = require("koa-body").default;
const koaStatic = require("koa-static");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = new Koa();
const router = new Router();

// In-memory storage
const messages = new Map();

// CORS
app.use(async (ctx, next) => {
  ctx.set("Access-Control-Allow-Origin", "*");
  ctx.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (ctx.method === "OPTIONS") {
    ctx.status = 204;
    return;
  }
  await next();
});

// Routes
router.get("/api/messages", (ctx) => {
  const list = Array.from(messages.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);
  ctx.body = list;
});

router.post("/api/messages", koaBody(), async (ctx) => {
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
  };
  messages.set(msg.id, msg);

  // Пример команды бота
  if (content.toLowerCase().startsWith("@chaos:")) {
    const botMsg = {
      id: uuidv4(),
      type: "text",
      content: "Команда получена! (демо-ответ)",
      timestamp: Date.now() + 100,
      from: "bot",
    };
    messages.set(botMsg.id, botMsg);
  }

  ctx.status = 201;
  ctx.body = { id: msg.id };
});

// Serve uploaded files
app.use(koaStatic(path.join(__dirname, "../uploads")));

app.use(router.routes());
app.listen(3001, () => {
  console.log("✅ Сервер запущен на http://localhost:3001");
});
