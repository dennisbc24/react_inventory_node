const moment = require("moment-timezone");
const { pool } = require("../config/db");
const { addDays } = require("../services/forecasting/calendar");
const { buildSeriesCollection } = require("../services/forecasting/features");
const { trainModels } = require("../services/forecasting/demand_forecaster");
const { ForecastingRepository } = require("../services/forecasting/forecasting_repository");
const { saveArtifact } = require("../services/forecasting/model_store");

// ---------------------------------------------------------------------------
// Entrena el GBM global de forecasting y lo guarda como artefacto JSON.
// El endpoint /forecasting/restock lo carga y sólo infiere (patrón sofa).
//
// Uso:
//   npm run train-forecasting
//   node scripts/train_forecasting_model.js --history-days 730 --as-of 2026-11-21
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next === undefined || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

function numberArg(args, name, fallback) {
  if (args[name] === undefined) return fallback;
  const value = Number(args[name]);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`--${name} debe ser un número positivo`);
  return value;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const asOfDate = String(args["as-of"] || moment().tz("America/Lima").format("YYYY-MM-DD"));
  const historyDays = numberArg(args, "history-days", 730);
  const from = addDays(asOfDate, -(historyDays - 1));
  const model = {};
  if (args.estimators !== undefined) model.nEstimators = numberArg(args, "estimators", 40);
  if (args["learning-rate"] !== undefined) model.learningRate = numberArg(args, "learning-rate", 0.08);

  console.log(`[forecasting] Cargando dataset ${from} .. ${asOfDate} (${historyDays} días)`);
  const started = Date.now();
  const repository = new ForecastingRepository();
  const dataset = await repository.loadDataset({ branchId: null, skuId: null, from, to: asOfDate });
  const seriesList = buildSeriesCollection(dataset, {
    from,
    to: asOfDate,
    defaultLeadTimeMin: 4,
    defaultLeadTimeMax: 7,
  });
  console.log(`[forecasting] series=${seriesList.length} ventas=${dataset.sales.length}`);

  const { p50, p80, meta } = trainModels(seriesList, {
    testDays: numberArg(args, "test-days", 28),
    warmupDays: numberArg(args, "warmup-days", 28),
    maxTrainingRows: numberArg(args, "max-training-rows", 60000),
    model,
  });
  const file = saveArtifact({ p50, p80, asOfDate, modelConfig: meta.model_config });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `[forecasting] Modelo guardado en ${file} ` +
      `(filas=${meta.train_rows}, cutoff=${meta.cutoff_date}, ${seconds}s)`
  );
}

main()
  .catch((error) => {
    console.error(`[forecasting] Error entrenando el modelo: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
