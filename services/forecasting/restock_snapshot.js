const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { promisify } = require("node:util");
const moment = require("moment-timezone");

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

const LIMA_TZ = "America/Lima";
// Fuera de git: services/forecasting/artifacts/ está ignorado, así que el
// snapshot sobrevive a reinicios y despliegues sin ensuciar el repo.
const DEFAULT_PERSIST_PATH = path.join(__dirname, "artifacts", "restock_snapshot.json.gz");

function msUntilNextRun(hour = 9, minute = 0, now = moment()) {
  const current = moment(now).tz(LIMA_TZ);
  let next = current.clone().hour(hour).minute(minute).second(0).millisecond(0);
  if (!next.isAfter(current)) next = next.add(1, "day");
  return next.diff(current);
}

function todayInLima(now = moment()) {
  return moment(now).tz(LIMA_TZ).format("YYYY-MM-DD");
}

// Mantiene un único snapshot de reposición en memoria. El cálculo pesado corre
// una sola vez al día (por defecto 09:00 Lima, con jitter) y los requests sólo
// derivan el plan a partir de él. El snapshot se persiste en disco para que un
// reinicio no provoque un cold start pesado.
class RestockSnapshotStore {
  constructor(options = {}) {
    this.refreshHour = Number(options.refreshHour ?? process.env.FORECASTING_SNAPSHOT_HOUR ?? 9);
    this.refreshMinute = Number(options.refreshMinute ?? process.env.FORECASTING_SNAPSHOT_MINUTE ?? 0);
    // Jitter: evita chocar siempre con la misma ventana de backups u otros jobs.
    this.jitterMinutes = Number(
      options.jitterMinutes ?? process.env.FORECASTING_SNAPSHOT_JITTER_MINUTES ?? 15
    );
    this.persistPath =
      options.persistPath === undefined
        ? process.env.FORECASTING_SNAPSHOT_PATH || DEFAULT_PERSIST_PATH
        : options.persistPath;
    this.persistEnabled =
      options.persist !== false &&
      Boolean(this.persistPath) &&
      process.env.FORECASTING_SNAPSHOT_PERSIST !== "false";
    this.logger = options.logger || console;
    this.snapshot = null;
    this.inflight = null;
    this.timer = null;
    this.lastError = null;
    this.builder = null;
    this.started = false;
  }

  get() {
    return this.snapshot;
  }

  set(snapshot) {
    this.snapshot = snapshot || null;
  }

  ageMs(now = Date.now()) {
    return this.snapshot ? Math.max(0, now - this.snapshot.builtAt) : null;
  }

  isRefreshing() {
    return Boolean(this.inflight);
  }

  async refresh(builder = this.builder) {
    if (!builder) throw new Error("RestockSnapshotStore sin builder");
    // Single-flight: una sola ejecución pesada a la vez, sin importar cuántos
    // requests o disparadores la pidan.
    if (this.inflight) return this.inflight;
    this.inflight = (async () => {
      const started = Date.now();
      try {
        const snapshot = await builder();
        this.snapshot = snapshot;
        this.lastError = null;
        this.logger.log(
          `[forecasting] snapshot de reposición listo en ${Date.now() - started} ms ` +
            `(as_of=${snapshot.asOfDate}, horizonte=${snapshot.horizon})`
        );
        await this._persist(snapshot);
        return snapshot;
      } catch (error) {
        this.lastError = error;
        this.logger.error(`[forecasting] no se pudo refrescar el snapshot: ${error.message}`);
        throw error;
      } finally {
        this.inflight = null;
      }
    })();
    return this.inflight;
  }

  // Lectura sincrónica sólo al arrancar: si el archivo está corrupto o falta se
  // ignora y el servicio sigue con un cold start normal.
  loadFromDisk() {
    if (!this.persistEnabled) return null;
    try {
      const raw = fs.readFileSync(this.persistPath);
      const parsed = JSON.parse(zlib.gunzipSync(raw).toString("utf8"));
      if (!parsed || !parsed.asOfDate || !Array.isArray(parsed.forecasts)) return null;
      this.snapshot = parsed;
      this.logger.log(
        `[forecasting] snapshot restaurado desde disco (as_of=${parsed.asOfDate}, ` +
          `construido=${new Date(parsed.builtAt).toISOString()})`
      );
      return parsed;
    } catch (error) {
      if (error.code !== "ENOENT") {
        this.logger.error(`[forecasting] no se pudo leer el snapshot persistido: ${error.message}`);
      }
      return null;
    }
  }

  async _persist(snapshot) {
    if (!this.persistEnabled) return;
    try {
      await fs.promises.mkdir(path.dirname(this.persistPath), { recursive: true });
      const payload = await gzip(JSON.stringify(snapshot));
      const tmpPath = `${this.persistPath}.${process.pid}.tmp`;
      await fs.promises.writeFile(tmpPath, payload);
      // rename atómico: nunca queda un snapshot a medio escribir.
      await fs.promises.rename(tmpPath, this.persistPath);
    } catch (error) {
      this.logger.error(`[forecasting] no se pudo persistir el snapshot: ${error.message}`);
    }
  }

  start(builder) {
    if (builder) this.builder = builder;
    if (!this.builder) throw new Error("RestockSnapshotStore.start requiere un builder");
    if (this.started) return;
    this.started = true;

    this.loadFromDisk();
    // Si ya hay snapshot de hoy (por ejemplo tras un reinicio) no se recalcula.
    this._catchUp();
    this._scheduleNext();
  }

  _pastRefreshTime(now = moment()) {
    const current = moment(now).tz(LIMA_TZ);
    return (
      current.hour() > this.refreshHour ||
      (current.hour() === this.refreshHour && current.minute() >= this.refreshMinute)
    );
  }

  _catchUp() {
    if (this.isRefreshing()) return;
    // Cold start real (sin snapshot en memoria ni en disco): calcular ahora.
    if (!this.snapshot) {
      this.refresh(this.builder).catch(() => {});
      return;
    }
    // Snapshot viejo y ya pasó la hora objetivo: recuperar una vez al día.
    const today = todayInLima();
    if (this.snapshot.asOfDate !== today && this._pastRefreshTime()) {
      this.refresh(this.builder).catch(() => {});
    }
  }

  _scheduleNext() {
    const jitterMs =
      this.jitterMinutes > 0
        ? Math.floor(Math.random() * this.jitterMinutes * 60 * 1000)
        : 0;
    const delay = msUntilNextRun(this.refreshHour, this.refreshMinute) + jitterMs;
    this.timer = setTimeout(async () => {
      this.timer = null;
      const today = todayInLima();
      const hasToday = this.snapshot && this.snapshot.asOfDate === today;
      if (!hasToday && !this.isRefreshing()) {
        await this.refresh(this.builder).catch(() => {});
      }
      this._scheduleNext();
    }, delay);
    if (this.timer.unref) this.timer.unref();
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.started = false;
  }

  status() {
    const snapshot = this.snapshot;
    return {
      ready: Boolean(snapshot),
      refreshing: this.isRefreshing(),
      as_of_date: snapshot ? snapshot.asOfDate : null,
      built_at: snapshot ? new Date(snapshot.builtAt).toISOString() : null,
      age_seconds: snapshot ? Math.round(this.ageMs() / 1000) : null,
      coverage_max_days: snapshot ? snapshot.coverageMaxDays : null,
      history_days: snapshot ? snapshot.historyDays : null,
      refresh_hour_lima: this.refreshHour,
      refresh_minute_lima: this.refreshMinute,
      jitter_minutes: this.jitterMinutes,
      persisted: this.persistEnabled,
      persist_path: this.persistEnabled ? this.persistPath : null,
      last_error: this.lastError ? this.lastError.message : null,
    };
  }
}

module.exports = { RestockSnapshotStore, msUntilNextRun, todayInLima, LIMA_TZ };
