const express = require("express");

//importamos los endpoints:
const homeRouter = require("./homeRouter");
const resumenRouter = require("./resumenRouter");
const apiVentas = require("./api/ventasRouter");
const apiProducts = require("./api/productsRouter");
const publicPath = __dirname.replace("routers", "public");

function routerApi(app) {
  const router = express.Router();
  app.set("views", `${publicPath}/templates`);
  app.engine("html", require("ejs").renderFile);
  app.set("view engine", "html");
  app.use(express.static(publicPath));
  console.log(`${publicPath}/templates`);
  app.use("/", homeRouter);
  app.use("/resumen", resumenRouter);
  app.use("/api/v1", router);
  router.use("/ventas", apiVentas);
  router.use("/products", apiProducts);
}

module.exports = routerApi;



