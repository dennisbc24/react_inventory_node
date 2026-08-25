const express = require("express");
const { authJwt } = require('../middlewares/auth.handler')


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
const apiShoppingList = require('./api/shoppingListRouter')
const apiCategories = require('./api/categoriesRouter')
const apiPublic = require('./api/publicRouter')


function routerApi(app) {
  const router = express.Router();

  app.use("/api/v1/auth", apiAuth);
  // Rutas públicas de solo lectura para cocinamejor.store (sin duplicar BD)
  app.use("/api/v1/public", apiPublic);
  app.use("/api/v1", authJwt, router);
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
    router.use("/categories", apiCategories);
    router.use("/shoppingList", apiShoppingList);
}

module.exports = routerApi;