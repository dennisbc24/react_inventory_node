const express = require("express");
const router = express.Router();
const { checkRole } = require("../../middlewares/auth.handler");

const {
  getInvoices,
  getInvoicesSummary,
  postInvoice,
  putInvoice,
  deleteInvoice,
} = require("../../controllers/invoices.controllers");

router.get("/", checkRole(["admin"]), getInvoices);
router.get("/summary", checkRole(["admin"]), getInvoicesSummary);
router.post("/", checkRole(["admin"]), postInvoice);
router.put("/:id", checkRole(["admin"]), putInvoice);
router.delete("/:id", checkRole(["admin"]), deleteInvoice);

module.exports = router;
