const { pool } = require("../config/db");

const getSupliers = async (req, res) => {
  const response = await pool.query("SELECT * FROM suppliers ORDER BY name ASC");

  res.json(response.rows);
};

const postSupplier = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Nombre requerido" });
    }
    const response = await pool.query(
      "INSERT INTO suppliers (name) VALUES ($1) RETURNING id_supplier",
      [name.trim()]
    );
    res.json(`Proveedor ${response.rows[0].id_supplier} creado correctamente`);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error al crear proveedor" });
  }
};

const patchSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Nombre requerido" });
    }
    await pool.query("UPDATE suppliers SET name = $1 WHERE id_supplier = $2", [
      name.trim(),
      id,
    ]);
    res.json("Proveedor actualizado correctamente");
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error al actualizar proveedor" });
  }
};

module.exports = { getSupliers, postSupplier, patchSupplier };
