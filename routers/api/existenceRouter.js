const express = require("express");
const router = express.Router();


const { postExistence, getExistenceJoin, postExistence_Vendings, getInventaryByBranch } = require('../../controllers/existence.controllers')

router.post("/", postExistence)
router.get("/", getExistenceJoin)
router.patch("/vendings", postExistence_Vendings)
router.get("/inventary", getInventaryByBranch)

module.exports = router;