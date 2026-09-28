const NS = 'mechcalc';
const SCHEMA_VERSION = 1;

const probe = () => {
  try {
    const k = '__mechcalc_probe__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return window.localStorage;
  } catch (err) {
    return null;
  }
};

const memory = new Map();

const backing = (() => {
  const ls = probe();
  if (!ls) {
    return {
      volatile: true,
      get: (k) => (memory.has(k) ? memory.get(k) : null),
      set: (k, v) => { memory.set(k, v); },
      del: (k) => { memory.delete(k); },
      keys: () => Array.from(memory.keys()),
    };
  }
  return {
    volatile: false,
    get: (k) => ls.getItem(k),
    set: (k, v) => { ls.setItem(k, v); },
    del: (k) => { ls.removeItem(k); },
    keys: () => Object.keys(ls).filter((k) => k.startsWith(`${NS}:`)),
  };
})();

export const isVolatile = () => backing.volatile;

const full = (key) => `${NS}:${key}`;

const timers = new Map();
const pending = new Map();

export const load = (key, fallback = null) => {
  try {
    const raw = backing.get(full(key));
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
};

export const saveNow = (key, value) => {
  try {
    backing.set(full(key), JSON.stringify(value));
    return true;
  } catch (err) {
    return false;
  }
};

export const save = (key, value, delay = 220) => {
  if (timers.has(key)) clearTimeout(timers.get(key));
  pending.set(key, value);
  timers.set(key, setTimeout(() => {
    timers.delete(key);
    saveNow(key, pending.get(key));
    pending.delete(key);
  }, delay));
  return true;
};

export const flush = () => {
  for (const [key, timer] of timers) {
    clearTimeout(timer);
    if (pending.has(key)) saveNow(key, pending.get(key));
  }
  timers.clear();
  pending.clear();
};

if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

export const remove = (key) => {
  if (timers.has(key)) { clearTimeout(timers.get(key)); timers.delete(key); }
  pending.delete(key);
  backing.del(full(key));
  if (key === 'prefs') prefsCache = null;
};

export const meta = () => load('meta', null) || { version: SCHEMA_VERSION };

export const ensureSchema = () => {
  const current = meta();
  if (current.version !== SCHEMA_VERSION) {
    remove('materials');
    saveNow('meta', { version: SCHEMA_VERSION, migratedAt: new Date().toISOString() });
    return false;
  }
  return true;
};

export const PREF_DEFAULTS = {
  unitSystem: 'in',
  fractionDen: 64,
  precisionBoost: 0,
  machine: 'haas',
  showWakeLock: true,
  theme: 'dark',
  lastCalc: 'rpm',
  lastBcd: 100,
  lastHoles: 6,
};

let prefsCache = null;

const readPrefs = () => {
  if (prefsCache == null) prefsCache = load('prefs', {}) || {};
  return prefsCache;
};

export const getPref = (name) => {
  const all = readPrefs();
  return all[name] === undefined ? PREF_DEFAULTS[name] : all[name];
};

export const getAllPrefs = () => ({ ...PREF_DEFAULTS, ...readPrefs() });

export const setPref = (name, value) => {
  readPrefs()[name] = value;
  return save('prefs', prefsCache);
};

export const calcStateKey = (calcId) => `calc:${calcId}`;

export const loadCalcState = (calcId) => load(calcStateKey(calcId), {}) || {};

export const saveCalcState = (calcId, state) => save(calcStateKey(calcId), state);

export const clearAll = () => {
  flush();
  for (const k of backing.keys()) backing.del(k);
  memory.clear();
  prefsCache = null;
};

export const listCalcStates = () => backing.keys()
  .filter((k) => k.startsWith(`${NS}:calc:`))
  .map((k) => k.slice(`${NS}:calc:`.length));
