const express = require("express");
const router = express.Router();
const { checkRole } = require("../../middlewares/auth.handler");

const {
  getDemandForecasts,
  getRestockPlan,
  getRiskBreakdown,
  postRestockPlan,
  getRestockSnapshotStatus,
} = require("../../controllers/forecasting.controllers");

const allRoles = ["admin", "seller", "viewer"];

router.get("/demand", checkRole(allRoles), getDemandForecasts);
router.get("/restock/status", checkRole(allRoles), getRestockSnapshotStatus);
router.get("/restock", checkRole(allRoles), getRestockPlan);
router.post("/restock", checkRole(allRoles), postRestockPlan);
router.get("/risk", checkRole(allRoles), getRiskBreakdown);

module.exports = router;
