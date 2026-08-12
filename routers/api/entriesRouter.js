const express = require("express");
const router = express.Router();
const { checkRole } = require('../../middlewares/auth.handler')


const { postEntries ,getEntriesJoin } = require('../../controllers/entries.controllers')

router.post("/", checkRole(['admin']), postEntries)
router.get("/", getEntriesJoin)


module.exports = router;