const express = require("express");
const router = express.Router();


const { postExistence, getExistenceJoin, postExistence_Vendings, getInventaryByBranch, getInventaryByProductName, UpdateExistenceCount } = require('../../controllers/existence.controllers')

router.post("/", postExistence)
router.get("/", getExistenceJoin)
router.patch("/vendings", postExistence_Vendings)
router.patch("/count", UpdateExistenceCount)
router.get("/inventary", getInventaryByBranch)
router.get("/byName", getInventaryByProductName)

module.exports = router;