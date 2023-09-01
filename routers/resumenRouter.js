const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.render('resumen')
});

module.exports = router;