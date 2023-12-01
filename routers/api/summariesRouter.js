const express = require("express");
const router = express.Router();


const { getSummaries, getSummaryByMonth } = require('../../controllers/summaries.controllers')

router.get("/", getSummaries)
router.get("/summaryByMonth", getSummaryByMonth);

module.exports = router;
