const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.render('updateProduct')
});

module.exports = router;