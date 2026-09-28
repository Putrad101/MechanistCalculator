import { qs, qsa, h, setPref, pref, emitGlobalChange, onGlobalChange, copyText, field, select, section, notice, fieldRow, segmented } from './ui.js';
import * as store from './store.js';
import * as units from './units.js';
import { CALCULATORS, byId, search } from './registry.js';
import { openMaterials } from './materialsui.js';

const mounted = new Map();
let current = null;

// Keep in step with VERSION in sw.js.
const BUILD_ID = 'mechcalc-v3';

const navList = qs('#nav-list');
const calcHost = qs('#calc-host');
const searchInput = qs('#search');

const renderNav = (list) => {
  navList.innerHTML = list
    .map((c) => `<li><button type="button" class="nav-item${c.id === current ? ' is-active' : ''}" data-calc="${c.id}">
      <span class="nav-short">${units.escapeHtml(c.short)}</span>
      <span class="nav-title">${units.escapeHtml(c.title)}</span>
    </button></li>`)
    .join('');
};

const show = (id, push = true) => {
  const calc = byId(id) || CALCULATORS[0];
  if (!mounted.has(calc.id)) {
    const holder = h('<div class="calc-slot"></div>');
    holder.dataset.slot = calc.id;
    calcHost.appendChild(holder);
    mounted.set(calc.id, calc.mount(holder));
  }
  for (const slot of qsa('.calc-slot', calcHost)) {
    slot.hidden = slot.dataset.slot !== calc.id;
  }
  current = calc.id;
  store.setPref('lastCalc', calc.id);
  renderNav(CALCULATORS);
  qs('#view-title').textContent = calc.title;
  qs('#view-blurb').textContent = calc.blurb || '';
  if (push) history.replaceState(null, '', `#${calc.id}`);
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  requestWakeLock();
};

const mountAll = () => {
  const wanted = new URLSearchParams(location.search).get('calc');
  const start = (wanted && byId(wanted)) || pref('lastCalc') || CALCULATORS[0].id;
  show(CALCULATORS.some((c) => c.id === start) ? start : CALCULATORS[0].id, false);
  if (location.hash && byId(location.hash.slice(1))) show(location.hash.slice(1), false);
};

const unitToggle = () => {
  const cur = pref('unitSystem');
  setPref('unitSystem', cur === 'in' ? 'mm' : 'in');
  syncToggles();
};

const syncToggles = () => {
  const sys = pref('unitSystem');
  document.documentElement.dataset.units = sys;
  const main = qs('#unit-main');
  if (main) {
    main.textContent = sys === 'in' ? 'Inch first' : 'Metric first';
    main.setAttribute('aria-pressed', String(sys !== 'in'));
  }
  const mBtn = qs('#machine-btn');
  if (mBtn) mBtn.textContent = String(pref('machine')).toUpperCase();
};

const openSettings = () => {
  const sheet = qs('#settings');
  sheet.hidden = false;
  qs('#settings-close').focus();
  renderSettingsBody();
  stampBuild();
  checkForUpdate();
  qs('#settings-scrim').hidden = false;
};

const closeSettings = () => {
  qs('#settings').hidden = true;
  qs('#settings-scrim').hidden = true;
};

const renderSettingsBody = () => {
  const body = qs('#settings-body');
  const mats = store.load('materials', null);
  body.innerHTML = [
    section('Display', [
      fieldRow(segmented({
        label: 'Which unit leads',
        name: 'unitSystem',
        value: pref('unitSystem'),
        options: [
          { value: 'in', label: 'Imperial first' },
          { value: 'mm', label: 'Metric first' },
        ],
      })),
      fieldRow(segmented({
        label: 'Theme',
        name: 'theme',
        value: pref('theme'),
        options: [
          { value: 'dark', label: 'Dark' },
          { value: 'light', label: 'Light' },
        ],
      })),
      fieldRow(select({
        label: 'Fraction step shown',
        name: 'fractionDen',
        value: String(pref('fractionDen')),
        options: [
          { value: '8', label: '1/8 in steps' },
          { value: '16', label: '1/16 in steps' },
          { value: '32', label: '1/32 in steps' },
          { value: '64', label: '1/64 in steps' },
        ],
      })),
      notice('Every result shows both units no matter what you pick here. This only decides which one is bolded and which unit the fields default to.', 'info'),
    ].join('')),

    section('Default machine', [
      fieldRow(segmented({
        label: 'Used for G-code',
        name: 'machine',
        value: pref('machine'),
        options: [
          { value: 'haas', label: 'Haas' },
          { value: 'okuma', label: 'Okuma' },
          { value: 'fanuc', label: 'Fanuc' },
        ],
      })),
    ].join('')),

    section('Materials', [
      `<p class="hint-text">${mats ? `${mats.length} materials stored on this device.` : 'Using the built-in material list, not saved yet.'}</p>`,
      `<div class="btn-row">
        <button type="button" class="btn" data-act="open-materials">Manage materials</button>
        <button type="button" class="btn" data-act="export-mats">Export JSON</button>
        <button type="button" class="btn" data-act="import-mats">Import JSON</button>
      </div>`,
    ].join('')),

    section('Screen', [
      fieldRow(segmented({
        label: 'Keep the screen awake',
        name: 'showWakeLock',
        value: pref('showWakeLock') ? 'yes' : 'no',
        options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }],
      })),
      notice('Uses the Wake Lock API when your browser supports it, so the screen does not sleep while you are reading numbers on the machine.', 'info'),
    ].join('')),

    section('Data', [
      `<div class="btn-row">
        <button type="button" class="btn" data-act="reset-mats">Reset materials</button>
        <button type="button" class="btn btn-danger" data-act="wipe">Erase everything</button>
      </div>`,
      notice('Your materials and each calculator\'s last inputs are stored only in this browser on this device. Nothing is uploaded anywhere.', 'warn'),
    ].join('')),

    section('About', `
      <p class="hint-text">Cutting data in here is a starting point, not a promise. The bronze SAE 660 and SAE 955 rows in particular are unverified guesses and are marked as such. Always prove a material on a scrap piece before you commit a real part.</p>
      <p class="hint-text">Add a calculator by dropping one file into <code>js/calc/</code> and adding one import line to <code>js/registry.js</code>.</p>
      <p class="hint-text">Build <strong id="build-stamp">checking&hellip;</strong> &middot; <button type="button" class="btn btn-sm" data-act="reload">Check for a newer build</button></p>
    `),
  ].join('');
};

// The build stamp is the fastest way to settle "am I looking at the current
// version or a cached one" without asking anyone to clear site data. The
// service worker serves this file from the network when it can, so a new number
// here means a new build actually reached this device.
const stampBuild = () => {
  const el = qs('#build-stamp');
  if (!el) return;
  const done = () => { el.textContent = navigator.serviceWorker?.controller ? `served by the offline cache, build ${BUILD_ID}` : `not installed as an app, build ${BUILD_ID}`; };
  if (navigator.serviceWorker?.controller) done();
  else navigator.serviceWorker?.ready.then(done).catch(() => { el.textContent = `offline cache unavailable, build ${BUILD_ID}`; });
};

const checkForUpdate = async (manual = false) => {
  const el = qs('#build-stamp');
  if (el) el.textContent = 'checking...';
  try {
    const fresh = await caches.open('mechcalc-v3');
    const hit = await fresh.match('./sw.js', { ignoreSearch: true });
    const reg = await navigator.serviceWorker?.getRegistration();
    await reg?.update();
    if (manual) alert('Checked for a newer build. If the number above did not change, you already have the latest.');
    stampBuild();
    if (!hit) return;
  } catch {
    if (el) el.textContent = `could not reach the server, build ${BUILD_ID} is the one on disk`;
  }
};

let wakeLock = null;
const requestWakeLock = async () => {
  if (!pref('showWakeLock') || !('wakeLock' in navigator)) return;
  if (wakeLock && !wakeLock.released) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (err) { wakeLock = null; }
};

const setOnline = () => {
  const el = qs('#net-state');
  el.textContent = navigator.onLine ? 'Online' : 'Offline, using cached copy';
  el.classList.toggle('is-offline', !navigator.onLine);
};

const wireShell = () => {
  qs('#unit-main').addEventListener('click', unitToggle);
  qs('#settings-open').addEventListener('click', openSettings);
  qs('#settings-close').addEventListener('click', closeSettings);
  qs('#settings-scrim').addEventListener('click', closeSettings);
  qs('#materials-open').addEventListener('click', () => { closeSettings(); openMaterials(); });
  qs('#machine-btn').addEventListener('click', openSettings);

  searchInput.addEventListener('input', () => {
    const list = search(searchInput.value);
    renderNav(list);
    if (list.length === 0) {
      navList.innerHTML = '<li class="nav-empty">No calculator matches that.</li>';
    }
  });
  searchInput.addEventListener('change', () => { searchInput.value = ''; renderNav(CALCULATORS); });
  searchInput.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter') return;
    const first = qs('.nav-item', navList);
    if (first) { show(first.dataset.calc); searchInput.value = ''; renderNav(CALCULATORS); searchInput.blur(); }
  });

  navList.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.nav-item');
    if (btn) show(btn.dataset.calc);
  });

  document.addEventListener('change', (ev) => {
    const sel = ev.target.closest('#settings-body select[data-f]');
    if (!sel) return;
    setPref(sel.dataset.f, sel.dataset.f === 'fractionDen' ? Number(sel.value) : sel.value);
    emitGlobalChange();
  });

  document.addEventListener('click', (ev) => {
    const seg = ev.target.closest('#settings-body .seg');
    if (seg) {
      const name = seg.dataset.f;
      const value = name === 'showWakeLock' ? seg.dataset.value === 'yes' : seg.dataset.value;
      setPref(name, name === 'fractionDen' ? Number(seg.dataset.value) : value);
      if (name === 'theme') document.documentElement.dataset.theme = seg.dataset.value;
      if (name === 'showWakeLock') { if (!value) { if (wakeLock) { wakeLock.release(); wakeLock = null; } } else requestWakeLock(); }
      syncToggles();
      return;
    }
    const act = ev.target.closest('#settings-body [data-act]');
    if (act) doAction(act.dataset.act);
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') { closeSettings(); }
    if (ev.key === '/' && document.activeElement !== searchInput && !/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName)) {
      ev.preventDefault();
      searchInput.focus();
    }
  });

  window.addEventListener('online', () => { setOnline(); requestWakeLock(); });
  window.addEventListener('offline', setOnline);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') requestWakeLock(); });
};

const doAction = async (act) => {
  const mats = await import('./materials.js');
  if (act === 'reload') { checkForUpdate(true); return; }
  if (act === 'open-materials') { closeSettings(); openMaterials(); return; }
  if (act === 'export-mats') {
    const { downloadText } = await import('./ui.js');
    downloadText(mats.exportJson(), mats.exportFileName());
    return;
  }
  if (act === 'import-mats') {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        const n = mats.importJson(await file.text(), 'merge');
        renderSettingsBody();
        emitGlobalChange();
        alert(`Imported. You now have ${n.length} materials.`);
      } catch (err) {
        alert(`Could not import that file: ${err.message}`);
      }
    });
    input.click();
    return;
  }
  if (act === 'reset-mats') {
    if (!confirm('Put the built-in material list back? Any materials you added or edited will be lost.')) return;
    mats.resetMaterials();
    renderSettingsBody();
    emitGlobalChange();
    return;
  }
  if (act === 'wipe') {
    if (!confirm('Erase every calculator input and all materials on this device? This cannot be undone.')) return;
    store.clearAll();
    location.reload();
  }
};

const boot = () => {
  store.ensureSchema();
  document.documentElement.dataset.theme = pref('theme');
  wireShell();
  syncToggles();
  setOnline();
  mountAll();
  onGlobalChange(syncToggles);

  const params = new URLSearchParams(location.search);
  if (params.get('selftest') === '1') {
    import('./selftest.js')
      .then((m) => m.runInto(document.body))
      .catch((err) => {
        document.body.innerHTML = `<div class="selftest"><h1>Self test</h1><p class="st-summary is-fail">Could not run: ${units.escapeHtml(err && err.stack || err)}</p></div>`;
      });
  }
};

const registerSw = () => {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol === 'file:') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
};

boot();
registerSw();
