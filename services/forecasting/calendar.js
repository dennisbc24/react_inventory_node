const MS_PER_DAY = 86400000;

const DEFAULT_PEAK_WINDOWS = [
  { start: "07-20", end: "07-31", tag: "fiestas_patrias" },
  { start: "12-01", end: "12-25", tag: "navidad" },
];

const holidayCache = new Map();
const peakWindowCache = new Map();

function pad(value) {
  return String(value).padStart(2, "0");
}

function parseDateKey(key) {
  const [year, month, day] = String(key).slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateKey(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function addDays(key, days) {
  const date = parseDateKey(key);
  date.setUTCDate(date.getUTCDate() + Number(days));
  return formatDateKey(date);
}

function diffDays(start, end) {
  return Math.round((parseDateKey(end) - parseDateKey(start)) / MS_PER_DAY);
}

function eachDate(start, end) {
  const result = [];
  const total = diffDays(start, end);
  for (let index = 0; index <= total; index += 1) result.push(addDays(start, index));
  return result;
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isoWeek(date) {
  const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  return Math.ceil(((value - yearStart) / MS_PER_DAY + 1) / 7);
}

function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function nthWeekdayOfMonth(year, month, weekday, nth) {
  const date = new Date(Date.UTC(year, month - 1, 1));
  const offset = (7 + weekday - date.getUTCDay()) % 7;
  date.setUTCDate(1 + offset + (nth - 1) * 7);
  return date;
}

function holidaySet(year, extraHolidays = []) {
  const cacheKey = `${year}|${[...extraHolidays].map((key) => String(key).slice(0, 10)).sort().join(",")}`;
  if (holidayCache.has(cacheKey)) return holidayCache.get(cacheKey);
  const holidays = new Set();
  const add = (key) => holidays.add(key);
  add(`${year}-01-01`);
  add(`${year}-05-01`);
  add(`${year}-06-29`);
  add(`${year}-07-28`);
  add(`${year}-07-29`);
  add(`${year}-08-30`);
  add(`${year}-10-08`);
  add(`${year}-11-01`);
  add(`${year}-12-08`);
  add(`${year}-12-25`);
  const easter = formatDateKey(easterSunday(year));
  add(addDays(easter, -3));
  add(addDays(easter, -2));
  for (const key of extraHolidays) holidays.add(String(key).slice(0, 10));
  holidayCache.set(cacheKey, holidays);
  return holidays;
}

function peakWindowsForYear(year) {
  if (peakWindowCache.has(year)) return peakWindowCache.get(year);
  const windows = [...DEFAULT_PEAK_WINDOWS];
  const mothersDay = formatDateKey(nthWeekdayOfMonth(year, 5, 0, 2));
  windows.push({
    start: addDays(mothersDay, -7).slice(5),
    end: addDays(mothersDay, 7).slice(5),
    tag: "dia_madre",
  });
  const fathersDay = formatDateKey(nthWeekdayOfMonth(year, 6, 0, 3));
  windows.push({
    start: addDays(fathersDay, -7).slice(5),
    end: addDays(fathersDay, 7).slice(5),
    tag: "dia_padre",
  });
  peakWindowCache.set(year, windows);
  return windows;
}

function calendarFeatures(dateKey, options = {}) {
  const key = String(dateKey).slice(0, 10);
  const date = parseDateKey(key);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const dow = date.getUTCDay();
  const weekOfYear = isoWeek(date);
  const dayOfYear = diffDays(`${year}-01-01`, key) + 1;
  const monthDays = daysInMonth(year, month);
  const holidays = holidaySet(year, options.extraHolidays || []);
  const peakWindows = options.peakWindows || peakWindowsForYear(year);
  const monthDay = key.slice(5);
  const peak = peakWindows.find((window) => monthDay >= window.start && monthDay <= window.end);
  const isPayCycle = day === 1 || (day >= 14 && day <= 16) || day >= monthDays - 2;
  const daysToPayday = Math.min(Math.abs(day - 15), Math.abs(day - monthDays), day === 1 ? 0 : 999);
  return {
    date: key,
    year,
    month,
    day_of_month: day,
    day_of_year: dayOfYear,
    dow,
    week_of_year: weekOfYear,
    is_weekend: dow === 0 || dow === 6 ? 1 : 0,
    is_holiday: holidays.has(key) ? 1 : 0,
    is_pay_cycle: isPayCycle ? 1 : 0,
    days_to_payday: daysToPayday,
    is_peak_season: peak ? 1 : 0,
    peak_tag: peak ? peak.tag : null,
    is_month_start: day === 1 ? 1 : 0,
    is_month_end: day === monthDays ? 1 : 0,
    sin_doy: Math.sin((2 * Math.PI * dayOfYear) / 365.25),
    cos_doy: Math.cos((2 * Math.PI * dayOfYear) / 365.25),
    sin_dow: Math.sin((2 * Math.PI * dow) / 7),
    cos_dow: Math.cos((2 * Math.PI * dow) / 7),
    sin_woy: Math.sin((2 * Math.PI * weekOfYear) / 52.18),
    cos_woy: Math.cos((2 * Math.PI * weekOfYear) / 52.18),
  };
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function safeRatio(value, baseline) {
  if (!Number.isFinite(value) || !Number.isFinite(baseline) || baseline <= 0) return 1;
  return value / baseline;
}

function seasonalityProfile(rows) {
  const usable = rows.filter((row) => Number.isFinite(row.units));
  const overall = mean(usable.map((row) => row.units));
  const dow = Array.from({ length: 7 }, () => []);
  const month = Array.from({ length: 12 }, () => []);
  const pay = [];
  const nonPay = [];
  const holiday = [];
  const nonHoliday = [];
  for (const row of usable) {
    const features = calendarFeatures(row.date);
    dow[features.dow].push(row.units);
    month[features.month - 1].push(row.units);
    (features.is_pay_cycle ? pay : nonPay).push(row.units);
    (features.is_holiday ? holiday : nonHoliday).push(row.units);
  }
  return {
    overall_mean: overall,
    dow_factors: dow.map((values) => safeRatio(mean(values), overall)),
    month_factors: month.map((values) => safeRatio(mean(values), overall)),
    pay_cycle_lift: safeRatio(mean(pay), mean(nonPay)),
    holiday_lift: safeRatio(mean(holiday), mean(nonHoliday)),
    pay_cycle_mean: mean(pay),
    holiday_mean: mean(holiday),
  };
}

function yearOverYearFactor(rows, lookbackDays = 30) {
  const sorted = [...rows].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (sorted.length < 365) return 1;
  const recent = sorted.slice(-lookbackDays);
  const previous = sorted.slice(-lookbackDays - 365, -365);
  if (!previous.length) return 1;
  const recentMean = mean(recent.map((row) => row.units));
  const previousMean = mean(previous.map((row) => row.units));
  if (previousMean <= 0) return 1;
  return Math.max(0.5, Math.min(2, recentMean / previousMean));
}

module.exports = {
  MS_PER_DAY,
  addDays,
  calendarFeatures,
  daysInMonth,
  diffDays,
  eachDate,
  easterSunday,
  formatDateKey,
  holidaySet,
  isoWeek,
  parseDateKey,
  peakWindowsForYear,
  seasonalityProfile,
  yearOverYearFactor,
};
