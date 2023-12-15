const { Pool } = require("pg");
const { postExistence } = require("./existence.controllers");

const moment = require("moment-timezone");
// Configura moment.js para utilizar la zona horaria de Lima (America/Lima)
//moment.tz.setDefault('America/Lima');
// Crea un objeto moment con la hora actual en Lima
//const fechaActual = moment();

const config = require("../config/config");

//const { description } = require("../schemas/ventas.schema");

const pool = new Pool({
  user: config.config.dbUser,
  host: config.config.dbHost,
  database: config.config.dbName,
  password: config.config.dbPassword,
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  },
});

const getSales = async (req, res) => {
  const response = await pool.query(
    "SELECT * FROM sales ORDER BY date DESC, hour DESC LIMIT 5"
  );
  res.json(response.rows);
};

const getSalesByDate = async (req, res) => {
  const date = req.query.date;
  const response = await pool.query(
    "SELECT * FROM public.sales WHERE date = $1 ORDER BY hour DESC",
    [date]
  );
  res.json(response.rows);
};

const getSalesByMonth = async (req, res) => {
  try {
    const month = req.query.month;
    const year = req.query.year;
    console.log(month, year);
    const response = await pool.query(
      "SELECT branch, EXTRACT(MONTH FROM date) AS mes, SUM(revenue) AS suma_revenue FROM public.sales WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2 GROUP BY branch, EXTRACT(MONTH FROM date) ORDER BY branch, mes;",
      [year, month]
    );
    res.json(response.rows);
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const postSales = async (req, res, next) => {
  const { branch, date, amount, product, p_total, p_unit, revenue } = req.body;

  const fechaActual = moment(); // Crea un objeto moment con la hora actual en Lima
  moment.tz.setDefault("America/Lima");
  const horaActual = fechaActual.format("HH:mm:ss"); // Formatea la hora
  console.log(req.body);
  const response = await pool.query(
    "INSERT INTO sales (branch, date, amount, product, p_total, p_unit, revenue, hour) VALUES($1, $2, $3, $4, $5, $6, $7, $8)",
    [branch, date, amount, product, p_total, p_unit, revenue, horaActual]
  );
  console.log(response);

  res.send("sale created");
  console.log(req.body);
  res.send(req.body);
};

const postVendings = async (req, res, next) => {
  const {
    date,
    amount,
    p_total,
    p_unit,
    revenue,
    customer,
    fk_id_product,
    fk_id_user,
    fk_id_branch,
  } = req.body;

  // Crea un objeto moment con la hora actual en Lima

  const fechaActual = moment(); // Crea un objeto moment con la hora actual en Lima
  moment.tz.setDefault("America/Lima");
  const horaActual = fechaActual.format("HH:mm:ss"); // Formatea la hora

  if (customer == "") {
    const response = await pool.query(
      "INSERT INTO sales (date, amount, p_unit, p_total,revenue,hour,fk_product, fk_id_user, fk_id_branch) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      [
        date,
        amount,
        p_unit,
        p_total,
        revenue,
        horaActual,
        fk_id_product,
        fk_id_user,
        fk_id_branch,
      ]
    );
    console.log(response);
  } else {
    const response = await pool.query(
      "INSERT INTO sales (date, amount, p_unit, p_total,revenue,hour,customer, fk_product, fk_id_user, fk_id_branch) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
      [
        date,
        amount,
        p_unit,
        p_total,
        revenue,
        horaActual,
        customer,
        fk_id_product,
        fk_id_user,
        fk_id_branch,
      ]
    );
    console.log(response);
  }

  console.log(req.body);
  res.send("sale created");
};

module.exports = {
  getSales,
  getSalesByDate,
  postSales,
  getSalesByMonth,
  postVendings,
};
