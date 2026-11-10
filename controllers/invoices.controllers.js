const { InvoicesService } = require("../services/invoices_service");

const service = new InvoicesService();

const handleError = (res, error) => {
  console.error("Invoices error:", error);
  res.status(error.status || 500).json({ message: error.message || "Error interno del servidor" });
};

const getInvoices = async (req, res) => {
  try {
    const response = await service.findAll({ year: req.query.year, month: req.query.month });
    res.json(response);
  } catch (error) {
    handleError(res, error);
  }
};

const getInvoicesSummary = async (req, res) => {
  try {
    const response = await service.summary({ year: req.query.year, month: req.query.month });
    res.json(response);
  } catch (error) {
    handleError(res, error);
  }
};

const postInvoice = async (req, res) => {
  try {
    const fk_user = req.user ? req.user.sub : undefined;
    const response = await service.create(req.body, fk_user);
    res.status(201).json(response);
  } catch (error) {
    handleError(res, error);
  }
};

const putInvoice = async (req, res) => {
  try {
    const response = await service.update(req.params.id, req.body);
    res.json(response);
  } catch (error) {
    handleError(res, error);
  }
};

const deleteInvoice = async (req, res) => {
  try {
    const response = await service.remove(req.params.id);
    res.json(response);
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  getInvoices,
  getInvoicesSummary,
  postInvoice,
  putInvoice,
  deleteInvoice,
};
