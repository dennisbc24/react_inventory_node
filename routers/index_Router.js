const express = require("express");

//importamos los endpoints:
const homeRouter = require("./homeRouter");
const resumenRouter = require("./resumenRouter");
const createProduct_frontend = require("./createProduct");
const updateProduct_frontend = require("./updateProductFrontend");
const salesById_frontend = require("./salesByIdFrontend");
const gastos_frontend = require("./gastosRouter");
const gastosByDate_frontend = require("./gastosByDateFrontend");

const apiVentas = require("./api/ventasRouter");
const apiProducts = require("./api/productsRouter");
const apiBox = require("./api/boxRouter");
const publicPath = __dirname.replace("routers", "public");

function routerApi(app) {
  const router = express.Router();
  app.set("views", `${publicPath}/templates`);
  app.engine("html", require("ejs").renderFile);
  app.set("view engine", "html");
  app.use(express.static(publicPath));
  console.log(`${publicPath}/templates`);
  app.use("/", homeRouter);
  app.use("/nuevo_producto", createProduct_frontend);
  app.use("/actualizar_producto", updateProduct_frontend);
  app.use("/ventas_por_fecha", salesById_frontend);
  app.use("/gastos_por_fecha", gastosByDate_frontend);
  app.use("/gastos", gastos_frontend);
  app.use("/resumen", resumenRouter);
  app.use("/api/v1", router);
    router.use("/ventas", apiVentas);
    router.use("/products", apiProducts);
    router.use("/box", apiBox);
}

module.exports = routerApi;
