const express = require("express");
const router = express.Router();


const { postEntries  } = require('../../controllers/entries.controllers')

router.post("/", postEntries)


module.exports = router;