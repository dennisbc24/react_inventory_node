const express = require("express");
const router = express.Router();


const { getSummaries } = require('../../controllers/summaries.controllers')

router.get("/", getSummaries)

module.exports = router;
