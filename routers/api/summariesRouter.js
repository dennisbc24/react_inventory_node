const express = require("express");
const router = express.Router();


const { getSummaries, getSummaryByMonth, getSummariesByDay } = require('../../controllers/summaries.controllers')

router.get("/", getSummaries)
router.get("/summaryByMonth", getSummaryByMonth);
router.get("/summaryByDay", getSummariesByDay);

module.exports = router;
