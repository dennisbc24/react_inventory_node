const express = require("express");
const router = express.Router();


const { postExistence } = require('../../controllers/existence.controllers')

router.post("/", postExistence)

module.exports = router;