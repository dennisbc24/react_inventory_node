const fs = require("fs");
const path = require("path");
const { pool } = require("../config/db");

const run = async () => {
  const requested = process.argv.slice(2);
  const files = (requested.length ? requested : fs.readdirSync(__dirname))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  let failed = false;
  for (const file of files) {
    const filePath = path.join(__dirname, path.basename(file));
    try {
      await pool.query(fs.readFileSync(filePath, "utf8"));
      console.log(`OK ${path.basename(file)}`);
    } catch (error) {
      failed = true;
      console.error(`ERROR ${path.basename(file)}: ${error.message}`);
    }
  }

  await pool.end();
  process.exitCode = failed ? 1 : 0;
};

run();
