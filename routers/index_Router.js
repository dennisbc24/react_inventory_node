const express = require("express");

//importamos los endpoints:
const resumenRouter = require("./resumenRouter");


//API
const apiVentas = require("./api/ventasRouter");
const apiProducts = require("./api/productsRouter");
const apiBox = require("./api/boxRouter");
const apiSummaries = require("./api/summariesRouter");
const apiBranches = require('./api/branchesRouter')
const apiUsers = require('./api/usersRouter')
const apiExistence = require('./api/existenceRouter')
const apiTransactions = require('./api/transactionsRouter')
const apiEntries = require('./api/entriesRouter')
const apiSuppliers = require('./api/suppliersRouter')
const apiAuth = require('./api/authRouter')


//get url temmplates
const publicPath = __dirname.replace("routers", "public");

function routerApi(app) {
  const router = express.Router();
  app.set("views", `${publicPath}/templates`);
  app.engine("html", require("ejs").renderFile);
  app.set("view engine", "html");
  app.use(express.static(publicPath));
  
 
  app.use("/resumen", resumenRouter);
  

  app.use("/api/v1", router);
    router.use("/ventas", apiVentas);
    router.use("/products", apiProducts);
    router.use("/box", apiBox);
    router.use("/summaries", apiSummaries);
    router.use("/branches", apiBranches);
    router.use("/users", apiUsers);
    router.use("/existence", apiExistence);
    router.use("/transactions", apiTransactions);
    router.use("/entries", apiEntries);
    router.use("/suppliers", apiSuppliers);
    router.use("/auth", apiAuth);
}

module.exports = routerApi;