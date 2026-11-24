const { ForecastingService } = require("../services/forecasting/forecasting_service");

const service = new ForecastingService();

function handleError(res, error) {
  console.error("Forecasting error:", error);
  res.status(error.status || 500).json({ message: error.message || "Error interno del servidor" });
}

const getDemandForecasts = async (req, res) => {
  try {
    const response = await service.getDemandForecasts(req.query);
    res.json(response);
  } catch (error) {
    handleError(res, error);
  }
};

const getRestockPlan = async (req, res) => {
  try {
    const response = await service.getRestockPlan(req.query);
    res.json(response);
  } catch (error) {
    handleError(res, error);
  }
};

const postRestockPlan = async (req, res) => {
  try {
    const response = await service.getRestockPlan(req.body);
    res.json(response);
  } catch (error) {
    handleError(res, error);
  }
};

const getRiskBreakdown = async (req, res) => {
  try {
    const response = await service.getRiskBreakdown(req.query);
    res.json(response);
  } catch (error) {
    handleError(res, error);
  }
};

const getRestockSnapshotStatus = (req, res) => {
  res.json(service.getRestockSnapshotStatus());
};

module.exports = {
  service,
  getDemandForecasts,
  getRestockPlan,
  getRiskBreakdown,
  postRestockPlan,
  getRestockSnapshotStatus,
};
