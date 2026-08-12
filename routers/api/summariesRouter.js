const express = require("express");
const router = express.Router();
const { checkRole } = require('../../middlewares/auth.handler')


const { getSummaries, getSummaryByMonth, getSummariesByDay } = require('../../controllers/summaries.controllers')

router.get("/", checkRole(['admin']), getSummaries)
router.get("/summaryByMonth", checkRole(['admin']), getSummaryByMonth);
router.get("/summaryByDay", getSummariesByDay);

module.exports = router;
