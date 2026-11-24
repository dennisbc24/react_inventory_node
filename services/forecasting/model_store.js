const fs = require("fs");
const path = require("path");
const { FEATURE_NAMES } = require("./features");
const { GradientBoostedRegressor } = require("./gbm");

// ---------------------------------------------------------------------------
// Artefacto del modelo GBM preentrenado (patrón sofa: entrenar offline con
// scripts/train_forecasting_model.js y aquí sólo leer + inferir).
//
// El archivo se genera en el deploy (o a mano con `npm run train-forecasting`)
// y se guarda fuera de git. Si no existe o está corrupto, el servicio cae al
// entrenamiento en caliente de siempre.
// ---------------------------------------------------------------------------

const SCHEMA_VERSION = 1;
const DEFAULT_PATH = path.join(__dirname, "artifacts", "gbm_quantiles.json");

let cache = { mtimeMs: 0, file: null, artifact: null };

function modelPath() {
  return process.env.FORECASTING_MODEL_PATH
    ? path.resolve(process.env.FORECASTING_MODEL_PATH)
    : DEFAULT_PATH;
}

function parseArtifact(raw, file, mtimeMs) {
  if (!raw || raw.schema_version !== SCHEMA_VERSION) {
    throw new Error(`schema_version no soportado (${raw && raw.schema_version})`);
  }
  if (!Array.isArray(raw.feature_names) || raw.feature_names.length !== FEATURE_NAMES.length) {
    throw new Error("feature_names incompatibles con la versión actual del código");
  }
  if (raw.feature_names.some((name, index) => name !== FEATURE_NAMES[index])) {
    throw new Error("orden de feature_names distinto al esperado");
  }
  return {
    trained_at: raw.trained_at || null,
    as_of_date: raw.as_of_date || null,
    model_config: raw.model_config || null,
    p50: GradientBoostedRegressor.fromJSON(raw.p50),
    p80: GradientBoostedRegressor.fromJSON(raw.p80),
    file,
    mtimeMs,
  };
}

function loadArtifact() {
  const file = modelPath();
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  if (cache.artifact && cache.file === file && cache.mtimeMs === stat.mtimeMs) {
    return cache.artifact;
  }
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const artifact = parseArtifact(raw, file, stat.mtimeMs);
  cache = { mtimeMs: stat.mtimeMs, file, artifact };
  return artifact;
}

// Devuelve { p50, p80, ...meta } o null. Nunca lanza: un artefacto roto no
// debe tumbar el endpoint, sólo forzar el entrenamiento en caliente.
function loadModels() {
  try {
    return loadArtifact();
  } catch (error) {
    console.warn(`[forecasting] Modelo preentrenado ignorado: ${error.message}`);
    return null;
  }
}

// Estado del artefacto para diagnóstico: si no está disponible, el cálculo
// entrena el GBM en caliente y se vuelve mucho más lento.
function artifactStatus() {
  const file = modelPath();
  try {
    const stat = fs.statSync(file);
    const artifact = loadArtifact();
    return {
      available: Boolean(artifact),
      file,
      size_bytes: stat.size,
      modified_at: new Date(stat.mtimeMs).toISOString(),
      age_seconds: Math.round((Date.now() - stat.mtimeMs) / 1000),
      trained_at: artifact ? artifact.trained_at : null,
      as_of_date: artifact ? artifact.as_of_date : null,
      error: artifact ? null : "artefacto inválido",
    };
  } catch (error) {
    return {
      available: false,
      file,
      error: error.code === "ENOENT" ? "no existe" : error.message,
    };
  }
}

function saveArtifact({ p50, p80, asOfDate = null, modelConfig = null }) {
  if (!p50 || !p80) throw new Error("Se requieren los modelos p50 y p80 para guardar el artefacto");
  const payload = {
    schema_version: SCHEMA_VERSION,
    trained_at: new Date().toISOString(),
    as_of_date: asOfDate,
    feature_names: FEATURE_NAMES,
    model_config: modelConfig,
    p50: p50.toJSON(),
    p80: p80.toJSON(),
  };
  const file = modelPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload), "utf8");
  fs.renameSync(tmp, file);
  cache = { mtimeMs: 0, file: null, artifact: null };
  return file;
}

module.exports = { SCHEMA_VERSION, artifactStatus, modelPath, loadArtifact, loadModels, saveArtifact };
