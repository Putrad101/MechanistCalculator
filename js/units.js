export const MM_PER_IN = 25.4;
export const MM_PER_FT = 304.8;

export const LENGTH_UNITS = {
  mm:   { label: 'mm',   f: 1,      full: 'millimetres' },
  cm:   { label: 'cm',   f: 10,     full: 'centimetres' },
  m:    { label: 'm',    f: 1000,   full: 'metres' },
  in:   { label: 'in',   f: 25.4,   full: 'inches' },
  ft:   { label: 'ft',   f: 304.8,  full: 'feet' },
  thou: { label: 'thou', f: 0.0254, full: 'thousandths' },
};

export const AREA_UNITS = {
  mm2: { label: 'mm²', f: 1 },
  cm2: { label: 'cm²', f: 100 },
  m2:  { label: 'm²',  f: 1e6 },
  in2: { label: 'in²', f: 645.16 },
  ft2: { label: 'ft²', f: 92903.04 },
};

export const VOLUME_UNITS = {
  mm3: { label: 'mm³', f: 1 },
  cm3: { label: 'cm³', f: 1000 },
  m3:  { label: 'm³',  f: 1e9 },
  in3: { label: 'in³', f: 16387.064 },
};

export const DIM_TABLES = {
  length: LENGTH_UNITS, perMin: LENGTH_UNITS, perRev: LENGTH_UNITS,
  perTooth: LENGTH_UNITS, speed: LENGTH_UNITS, area: AREA_UNITS, volume: VOLUME_UNITS,
  count: { each: { label: 'edges', f: 1 } },
};

export const DIMS = {
  length:   { src: 'mm',  imp: 'in',  si: 'mm',  impLabel: 'in',       siLabel: 'mm',       impDp: 4, siDp: 3, fraction: true },
  perMin:   { src: 'mm',  imp: 'in',  si: 'mm',  impLabel: 'IPM',      siLabel: 'mm/min',   impDp: 4, siDp: 2 },
  perRev:   { src: 'mm',  imp: 'in',  si: 'mm',  impLabel: 'in/rev',   siLabel: 'mm/rev',   impDp: 5, siDp: 4 },
  perTooth: { src: 'mm',  imp: 'in',  si: 'mm',  impLabel: 'in/tooth', siLabel: 'mm/tooth', impDp: 5, siDp: 4 },
  speed:    { src: 'mm',  imp: 'ft',  si: 'm',   impLabel: 'SFM',      siLabel: 'm/min',    impDp: 1, siDp: 1 },
  rpm:      { src: null,  imp: null,  si: null,  impLabel: 'rpm',      siLabel: 'rpm',      impDp: 0, siDp: 0 },
  count:    { src: 'each', imp: 'each', si: 'each', impLabel: 'edges',   siLabel: 'edges',    impDp: 0, siDp: 0 },
  area:     { src: 'mm2', imp: 'in2', si: 'mm2', impLabel: 'in²',      siLabel: 'mm²',      impDp: 4, siDp: 2 },
  volume:   { src: 'mm3', imp: 'in3', si: 'mm3', impLabel: 'in³',      siLabel: 'mm³',      impDp: 4, siDp: 2 },
  angle:    { src: 'deg', imp: null,  si: null,  impLabel: '°',        siLabel: '°',        impDp: 2, siDp: 2 },
  time:     { src: 's',  imp: null,  si: null,  impLabel: 's',        siLabel: 's',        impDp: 2, siDp: 2 },
  ratio:    { src: null,  imp: null,  si: null,  impLabel: '',         siLabel: '',         impDp: 2, siDp: 2 },
  power:    { src: 'W',  imp: 'hp', si: 'W',   impLabel: 'hp', siLabel: 'W',       impDp: 3, siDp: 1 },
  kw:       { src: 'kW', imp: null, si: 'kW', impLabel: 'kW', siLabel: 'kW',      impDp: 3, siDp: 3 },
  ratio_pct:{ src: null, imp: null, si: null, impLabel: '%',  siLabel: '%',        impDp: 1, siDp: 1 },
};

export const DIMENSIONS = Object.keys(DIMS);
export const IMPERIAL_UNITS = ['in', 'ft', 'thou'];
export const METRIC_UNITS = ['mm', 'cm', 'm'];

const POWER_UNITS = { W: { label: 'W', f: 1 }, hp: { label: 'hp', f: 745.7 } };
DIM_TABLES.power = POWER_UNITS;

const KW_UNITS = { kW: { label: 'kW', f: 1 } };
DIM_TABLES.kw = KW_UNITS;

export const convert = (value, from, to, dim = 'length') => {
  const table = DIM_TABLES[dim];
  if (!table || !table[from] || !table[to]) return NaN;
  return Number(value) * table[from].f / table[to].f;
};

export const toCanonical = (value, unit, dim = 'length') => convert(value, unit, DIMS[dim].src, dim);
export const fromCanonical = (value, unit, dim = 'length') => convert(value, DIMS[dim].src, unit, dim);

export const unitLabel = (unit, dim = 'length') => {
  const table = DIM_TABLES[dim];
  return (table && table[unit] && table[unit].label) || unit || '';
};

export const round = (value, dp = 3) => {
  if (value == null || !Number.isFinite(value)) return NaN;
  const r = Number(`${Math.round(Number(`${value}e${dp}`))}e-${dp}`);
  return Object.is(r, -0) ? 0 : r;
};

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const gcd = (a, b) => {
  a = Math.abs(Math.trunc(a));
  b = Math.abs(Math.trunc(b));
  while (b) { const t = a % b; a = b; b = t; }
  return a || 1;
};

const UNIT_SUFFIX = /[\u2033\u2032"']?\s*(millimet(?:re|er)s?|centimet(?:re|er)s?|inches|inch|in|mm|cm|m|ft|thou|mils?|degrees?|deg|rev|rpm)\.?$/i;
const INCH_MARK = /^([-+]?[\d\s./+-]+?)\s*[\u2033\u2032"']+$/;

export const parseValue = (raw) => {
  if (typeof raw === 'number') return raw;
  if (raw == null) return NaN;
  let s = String(raw).trim();
  if (!s) return NaN;
  s = s.replace(INCH_MARK, '$1').trim();
  s = s.replace(UNIT_SUFFIX, '').trim();
  let sign = 1;
  if (s[0] === '-') { sign = -1; s = s.slice(1).trim(); }
  else if (s[0] === '+') { s = s.slice(1).trim(); }
  let m = s.match(/^(\d+)\s*(?:-|\s)\s*(\d+)\s*\/\s*(\d+)$/);
  if (m) return sign * (Number(m[1]) + Number(m[2]) / Number(m[3]));
  m = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (m) {
    const den = Number(m[2]);
    if (den === 0) return NaN;
    return sign * (Number(m[1]) / den);
  }
  const n = Number(s);
  return Number.isFinite(n) ? sign * n : NaN;
};

export const exactFraction = (value, maxDen = 64) => {
  if (!Number.isFinite(value) || value === 0) return null;
  const sign = value < 0 ? -1 : 1;
  const v = Math.abs(value);
  const tol = Math.max(1e-12, v * 1e-9);
  for (let den = 1; den <= maxDen; den++) {
    const num = Math.round(v * den);
    if (num === 0) continue;
    if (Math.abs(v - num / den) < tol) {
      const g = gcd(num, den);
      return { sign, num: num / g, den: den / g, exact: true };
    }
  }
  return null;
};

export const SHOP_DENOMINATORS = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128];

export const nearestFraction = (value, maxDen = 64, denoms = null) => {
  if (!Number.isFinite(value)) return null;
  const sign = value < 0 ? -1 : 1;
  const v = Math.abs(value);
  if (v === 0) return { sign: 0, num: 0, den: 1, exact: true, error: 0 };
  const list = denoms && denoms.length ? denoms : Array.from({ length: maxDen }, (_, i) => i + 1);
  let best = null;
  for (const den of list) {
    if (den > maxDen) continue;
    const num = Math.round(v * den);
    if (num === 0) continue;
    const error = Math.abs(v - num / den);
    if (!best || error < best.error - 1e-15) best = { num, den, error };
    if (error <= v * 1e-9) break;
  }
  if (!best) return null;
  const g = gcd(best.num, best.den);
  return { sign, num: best.num / g, den: best.den / g, exact: best.error <= v * 1e-9, error: best.error };
};

export const formatFraction = (f, opts = {}) => {
  if (!f || f.num == null) return null;
  if (f.num === 0) return '0';
  const sign = f.sign < 0 ? '-' : '';
  if (f.den === 1) return `${sign}${f.num}`;
  if (opts.mixed && f.num > f.den) {
    const whole = Math.floor(f.num / f.den);
    return `${sign}${whole}-${f.num % f.den}/${f.den}`;
  }
  return `${sign}${f.num}/${f.den}`;
};

export const fractionFor = (value, opts = {}) => {
  const maxDen = opts.maxDen ?? 64;
  const f = exactFraction(value, maxDen);
  if (f) return f;
  const n = nearestFraction(value, maxDen, opts.denoms);
  if (!n || (opts.allowApprox ?? true) === false) return null;
  if (opts.tolerance != null && n.error > opts.tolerance) return null;
  return n;
};

export const escapeHtml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Group the thousands in the whole string and the decimal part gets a separator
// in it too, because the decimal point is a non-word character the lookahead
// happily walks across: 0.00280 came out as "0.00,280" and 1.1765 as "1.1,765".
// Only the integer side is ever meant to be grouped.
const groupDigits = (s) => {
  const dot = s.indexOf('.');
  if (dot === -1) return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const int = s.slice(0, dot);
  const frac = s.slice(dot);
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + frac;
};

export const fmt = (value, dp = 3) => {
  if (value == null || !Number.isFinite(value)) return '—';
  const r = round(value, dp);
  if (r === 0 && value !== 0) {
    const needed = Math.min(8, Math.max(dp + 1, Math.ceil(-Math.log10(Math.abs(value))) + 1));
    const r2 = round(value, needed);
    if (r2 !== 0) return `~${r2}`;
  }
  return groupDigits(r.toFixed(dp));
};

const impText = (impValue, dim, opts) => {
  const d = DIMS[dim];
  const showFraction = opts.fraction ?? d.fraction;
  const dp = opts.impDp ?? d.impDp;
  if (showFraction && dim === 'length' && impValue > 0) {
    const cap = opts.fracDen ?? 64;
    const denoms = SHOP_DENOMINATORS.filter((d) => d <= cap);
    const tol = Math.max(Math.abs(impValue) * 0.002, 1 / 2048);
    const f = fractionFor(impValue, { maxDen: cap, denoms, tolerance: tol });
    if (f) {
      const ft = formatFraction(f, { mixed: opts.mixedFraction });
      if (f.exact) return dp > 0 ? `${ft}″ (${round(impValue, dp)})` : ft;
      return `≈${ft}″ (${round(impValue, dp)})`;
    }
  }
  return fmt(impValue, dp);
};

export const singleHtml = (canonical, dim, opts = {}) => {
  const d = DIMS[dim];
  if (!d) return '';
  const label = opts.label ?? d.siLabel;
  const value = dim === 'rpm' || dim === 'ratio' || dim === 'angle' || dim === 'time'
    ? canonical
    : fromCanonical(canonical, d.si, dim);
  const dp = opts.dp ?? (dim === 'rpm' ? 0 : d.siDp);
  const text = (dim === 'rpm' || dim === 'ratio') ? fmt(value, dp) : impText(value, dim, { ...opts, dp });
  return `<span class="uv"><span class="v">${escapeHtml(text)}</span>${label ? `<span class="u">${escapeHtml(label)}</span>` : ''}</span>`;
};

export const dualHtml = (canonical, dim, opts = {}) => {
  const d = DIMS[dim];
  if (!d) return '';
  if (d.imp == null) return singleHtml(canonical, dim, opts);
  if (!Number.isFinite(canonical)) {
    return `<span class="dual"><span class="uv is-empty"><span class="v">—</span><span class="u">${escapeHtml(d.impLabel)}</span></span><span class="vs">|</span><span class="uv is-empty"><span class="v">—</span><span class="u">${escapeHtml(d.siLabel)}</span></span></span>`;
  }
  const impV = fromCanonical(canonical, d.imp, dim);
  const siV = fromCanonical(canonical, d.si, dim);
  const primary = opts.primary || 'si';
  const impHtml = `<span class="uv u-imp${primary === 'imp' ? ' is-primary' : ''}"><span class="v">${escapeHtml(impText(impV, dim, opts))}</span><span class="u">${escapeHtml(opts.impLabel ?? d.impLabel)}</span></span>`;
  const siHtml = `<span class="uv u-si${primary === 'si' ? ' is-primary' : ''}"><span class="v">${escapeHtml(fmt(siV, opts.dp ?? d.siDp))}</span><span class="u">${escapeHtml(opts.siLabel ?? d.siLabel)}</span></span>`;
  const order = primary === 'imp' ? [impHtml, siHtml] : [siHtml, impHtml];
  return `<span class="dual">${order[0]}<span class="vs">|</span>${order[1]}</span>`;
};

export const lengthTriple = (canonical, opts = {}) => {
  const impV = fromCanonical(canonical, 'in', 'length');
  const f = fractionFor(impV, { maxDen: opts.fracDen ?? 64 });
  const ft = f ? formatFraction(f, { mixed: opts.mixedFraction }) : null;
  const mark = f && !f.exact ? '≈' : '';
  return `${mark}${ft ? ft + '″ ' : ''}(${round(impV, opts.impDp ?? 4)}) = ${round(canonical, opts.siDp ?? 3)} mm`;
};

export const FRACTION_DENOMINATORS = [2, 4, 8, 16, 32, 64];

export const commonFractions = (maxDen = 64, maxNum = 128) => {
  const out = [];
  for (let den = 1; den <= maxDen; den++) {
    for (let num = 1; num <= maxNum * den; num++) {
      if (gcd(num, den) !== 1) continue;
      out.push({ num, den, value: num / den, text: formatFraction({ sign: 1, num, den }) });
      if (out.length > 4000) return out;
    }
  }
  return out;
};
