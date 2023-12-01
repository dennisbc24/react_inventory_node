const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.render('summaries')
});

module.exports = router;