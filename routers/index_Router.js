const express = require("express");

//importamos los endpoints:
const homeRouter = require("./homeRouter");
const resumenRouter = require("./resumenRouter");
const createProduct_frontend = require("./createProduct");
const updateProduct_frontend = require("./updateProductFrontend");
const salesById_frontend = require("./salesByIdFrontend");
const gastos_frontend = require("./gastosRouter");
const gastosByDate_frontend = require("./gastosByDateFrontend");
const summaries_frontend = require("./summariesFrontend");
const existence_frontend = require("./existenceRouter");

//API
const apiVentas = require("./api/ventasRouter");
const apiProducts = require("./api/productsRouter");
const apiBox = require("./api/boxRouter");
const apiSummaries = require("./api/summariesRouter");
const apiBranches = require('./api/branchesRouter')
const apiUsers = require('./api/usersRouter')
const apiExistence = require('./api/existenceRouter')

//get url temmplates
const publicPath = __dirname.replace("routers", "public");

function routerApi(app) {
  const router = express.Router();
  app.set("views", `${publicPath}/templates`);
  app.engine("html", require("ejs").renderFile);
  app.set("view engine", "html");
  app.use(express.static(publicPath));
  
  app.use("/", homeRouter);
  app.use("/nuevo_producto", createProduct_frontend);
  app.use("/actualizar_producto", updateProduct_frontend);
  app.use("/ventas_por_fecha", salesById_frontend);
  app.use("/gastos_por_fecha", gastosByDate_frontend);
  app.use("/gastos", gastos_frontend);
  app.use("/resumen", resumenRouter);
  app.use("/summaries", summaries_frontend);
  app.use("/existence", existence_frontend)

  app.use("/api/v1", router);
    router.use("/ventas", apiVentas);
    router.use("/products", apiProducts);
    router.use("/box", apiBox);
    router.use("/summaries", apiSummaries);
    router.use("/branches", apiBranches);
    router.use("/users", apiUsers);
    router.use("/existence", apiExistence);
}

module.exports = routerApi;
