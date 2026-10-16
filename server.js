const express = require("express");
const fileUpload = require('express-fileupload');
const cors = require('cors');
const path = require('path');

// no tumbar el proceso por errores no capturados
process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err);
});
process.on("unhandledRejection", (err) => {
  console.error("unhandledRejection:", err);
});

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:4000",
  "http://localhost:8080",
  "https://inventario.cocinamejor.store",
  "https://inventario.elwayardo.com",
  "https://cocinamejor.store",
  "https://www.cocinamejor.store",
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS: " + origin));
  },
  credentials: true,
}));

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: './uploads',
    debug: false,
  })
);

require('./utils/auth')

const port = 3000;

app.use(express.static("dist"));

const routerApi = require("./routers/index_Router");

routerApi(app);

app.get(/^\/(?!api|uploads).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// health check simple sin auth
app.get("/api/health", async (req, res) => {
  const { checkDb } = require("./config/db");
  const ok = await checkDb(2500);
  res.status(ok ? 200 : 503).json({ db: ok ? "up" : "down" });
});

// handler final: responde JSON en vez de HTML/crash
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || "Error interno del servidor" });
});

app.listen(port, () => {
  console.log("empezando el server puerto " + port);
});