const express = require("express");
const router = express.Router();
const { checkRole } = require('../../middlewares/auth.handler')


const { getSummaries, getSummaryByMonth, getSummariesByDay, getSalesRange } = require('../../controllers/summaries.controllers')

router.get("/", checkRole(['admin']), getSummaries)
router.get("/summaryByMonth", checkRole(['admin']), getSummaryByMonth);
router.get("/summaryByDay", getSummariesByDay);
router.get("/salesRange", getSalesRange);

module.exports = router;
