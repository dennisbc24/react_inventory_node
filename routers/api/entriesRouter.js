const express = require("express");
const router = express.Router();


const { postEntries ,getEntriesJoin } = require('../../controllers/entries.controllers')

router.post("/", postEntries)
router.get("/", getEntriesJoin)


module.exports = router;