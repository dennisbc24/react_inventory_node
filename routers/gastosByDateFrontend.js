const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.render('gastos_table')
});

module.exports = router;