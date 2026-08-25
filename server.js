const express = require("express");
const fileUpload = require('express-fileupload');
const cors = require('cors');
const path = require('path');

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

app.listen(port, () => {
  console.log("empezando el server puerto " + port);
});