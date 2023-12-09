const express = require("express");
const router = express.Router();


const { postExistence, getExistenceJoin } = require('../../controllers/existence.controllers')

router.post("/", postExistence)
router.get("/", getExistenceJoin)

module.exports = router;