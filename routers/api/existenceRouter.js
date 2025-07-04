const express = require("express");
const router = express.Router();


const {getInventaryInStock, postExistence, getExistenceJoin, postExistence_Vendings, getInventaryByBranch, getInventaryByProductName, UpdateExistenceCount, getInShortSupply } = require('../../controllers/existence.controllers')

router.post("/", postExistence)
router.get("/", getExistenceJoin)
router.get("/shortSupply", getInShortSupply)
router.patch("/vendings", postExistence_Vendings)
router.patch("/count", UpdateExistenceCount)
router.get("/inventary", getInventaryByBranch)
router.get("/byName", getInventaryByProductName)
router.get("/inStock", getInventaryInStock)

module.exports = router;