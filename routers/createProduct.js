const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.render('nuevo_producto')
});

module.exports = router;