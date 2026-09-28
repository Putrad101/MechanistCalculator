import * as units from './units.js';
import * as store from './store.js';

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export const h = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};

const globalListeners = new Set();

export const onGlobalChange = (fn) => { globalListeners.add(fn); return () => globalListeners.delete(fn); };
export const emitGlobalChange = () => { for (const fn of globalListeners) fn(); };

export const pref = (name) => store.getPref(name);
export const setPref = (name, value) => { store.setPref(name, value); emitGlobalChange(); };

export const unitOptions = (selected, opts = {}) => {
  const list = opts.units || ['mm', 'in'];
  return list
    .map((u) => `<option value="${u}"${u === selected ? ' selected' : ''}>${units.unitLabel(u, opts.dim || 'length')}</option>`)
    .join('');
};

let uid = 0;
const nextId = (p) => `${p}-${(uid += 1).toString(36)}`;

export const field = (o) => {
  const id = nextId(`f${o.name || 'x'}`);
  const unit = o.unit ?? '';
  const stepAttr = o.step != null ? ` step="${o.step}"` : ' step="any"';
  const canStep = Boolean(unit) || o.step != null;
  const down = canStep ? `<button type="button" class="step" data-step="-1" data-for="${id}" aria-label="decrease ${units.escapeHtml(o.label)}">&minus;</button>` : '';
  const up = canStep ? `<button type="button" class="step" data-step="1" data-for="${id}" aria-label="increase ${units.escapeHtml(o.label)}">+</button>` : '';
  return `
<label class="field" for="${id}">
  <span class="field-label">${units.escapeHtml(o.label)}${o.hint ? `<em class="hint" title="${units.escapeHtml(o.hint)}">?</em>` : ''}</span>
  <span class="field-body${canStep ? '' : ' is-plain'}">
    ${down}
    <input id="${id}" name="${o.name}" type="text" inputmode="${o.inputmode || (canStep ? 'decimal' : 'text')}" autocomplete="off"
      data-f="${o.name}"${o.unit ? ` data-unit="${o.unit}"` : ''}${o.dim ? ` data-dim="${o.dim}"` : ''}
      value="${units.escapeHtml(o.value ?? '')}"${stepAttr}${o.placeholder ? ` placeholder="${units.escapeHtml(o.placeholder)}"` : ''}>
    ${up}
    ${unit ? `<span class="field-unit">${units.escapeHtml(units.unitLabel(unit, o.dim || 'length'))}</span>` : ''}
  </span>
  ${o.suffix ? `<span class="field-suffix">${units.escapeHtml(o.suffix)}</span>` : ''}
</label>`;
};

export const fieldRow = (...html) => `<div class="row">${html.join('')}</div>`;

export const select = (o) => {
  const id = nextId(`s${o.name || 'x'}`);
  const options = o.options
    .map((opt) => {
      const val = typeof opt === 'string' ? opt : opt.value;
      const label = typeof opt === 'string' ? opt : opt.label;
      return `<option value="${units.escapeHtml(val)}"${val === o.value ? ' selected' : ''}>${units.escapeHtml(label)}</option>`;
    })
    .join('');
  return `
<label class="field field-select" for="${id}">
  <span class="field-label">${units.escapeHtml(o.label)}${o.hint ? `<em class="hint" title="${units.escapeHtml(o.hint)}">?</em>` : ''}</span>
  <span class="field-body">
    <select id="${id}" name="${o.name}" data-f="${o.name}">${options}</select>
  </span>
  ${o.suffix ? `<span class="field-suffix">${units.escapeHtml(o.suffix)}</span>` : ''}
</label>`;
};

export const segmented = (o) => {
  const name = o.name;
  const items = o.options
    .map((opt) => {
      const val = typeof opt === 'string' ? opt : opt.value;
      const label = typeof opt === 'string' ? opt : opt.label;
      return `<button type="button" class="seg${val === o.value ? ' is-active' : ''}" data-f="${name}" data-value="${units.escapeHtml(val)}">${units.escapeHtml(label)}</button>`;
    })
    .join('');
  return `<div class="seg-group" role="group" aria-label="${units.escapeHtml(o.label)}"><span class="field-label">${units.escapeHtml(o.label)}</span><div class="segs">${items}</div></div>`;
};

export const section = (title, bodyHtml, opts = {}) => `
<section class="panel-section${opts.collapsible ? ' is-collapsible' : ''}">
  ${title ? `<h3 class="section-title">${units.escapeHtml(title)}</h3>` : ''}
  <div class="section-body">${bodyHtml}</div>
</section>`;

export const resultRow = (o) => {
  const primary = o.primary || (pref('unitSystem') === 'in' ? 'imp' : 'si');
  let valueHtml;
  if (o.text != null) {
    valueHtml = `<span class="uv is-text"><span class="v">${units.escapeHtml(o.text)}</span>${o.unit ? `<span class="u">${units.escapeHtml(o.unit)}</span>` : ''}</span>`;
  } else if (o.dim) {
    valueHtml = units.dualHtml(o.value, o.dim, {
      primary,
      fraction: o.fraction,
      fracDen: pref('fractionDen'),
      dp: o.dp,
      impDp: o.impDp,
    });
  } else {
    valueHtml = units.singleHtml(o.value, 'ratio', { label: o.unit, dp: o.dp });
  }
  return `
<div class="res-row${o.flag ? ` is-${o.flag}` : ''}">
  <div class="res-label">${units.escapeHtml(o.label)}</div>
  <div class="res-val">${valueHtml}</div>
</div>
${o.hint ? `<div class="res-hint">${o.hint}</div>` : ''}`;
};

export const results = (items) => `<div class="results">${items.filter(Boolean).map(resultRow).join('')}</div>`;

export const notice = (text, kind = 'info') => `<p class="notice is-${kind}">${text}</p>`;

export const notes = (list) => (list && list.length
  ? `<ul class="notes">${list.map((n) => `<li>${n}</li>`).join('')}</ul>`
  : '');

export const readout = (text) => `<div class="readout">${units.escapeHtml(text)}</div>`;

export const codeBlock = (text, id) => `
<div class="code-wrap">
  <div class="code-head">
    <span class="code-label">${units.escapeHtml(id || 'G-code')}</span>
    <span class="code-actions">
      <button type="button" class="btn btn-sm" data-copy="${id || ''}" data-copytext="${units.escapeHtml(text)}">Copy</button>
      <button type="button" class="btn btn-sm" data-dl="${id || ''}" data-dltext="${units.escapeHtml(text)}" data-dlname="${units.escapeHtml((id || 'program').toLowerCase().replace(/[^a-z0-9]+/g, '-'))}.nc">Download .nc</button>
    </span>
  </div>
  <pre class="code" id="code-${id}">${units.escapeHtml(text)}</pre>
</div>`;

export const dataTable = (headers, rows, opts = {}) => `
<div class="table-wrap">
  <table class="data${opts.dense ? ' is-dense' : ''}">
    <thead><tr>${headers.map((h2) => `<th${h2.numeric ? ' class="num"' : ''}>${units.escapeHtml(h2.label ?? h2)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr${r.cls ? ` class="${r.cls}"` : ''}>${(r.cells ?? r).map((c, i) => `<td${headers[i] && headers[i].numeric ? ' class="num"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
</div>`;

export const parseFields = (root, state) => {
  const out = {};
  for (const input of qsa('[data-f]', root)) {
    const name = input.dataset.f;
    if (input.classList.contains('seg')) {
      if (input.classList.contains('is-active')) out[name] = input.dataset.value;
      continue;
    }
    if (input.tagName === 'SELECT') { out[name] = input.value; continue; }
    const raw = input.value;
    out[name] = raw;
    if (input.dataset.unit) {
      const num = units.parseValue(raw);
      out[`${name}__num`] = Number.isFinite(num) ? num : NaN;
      out[`${name}__mm`] = Number.isFinite(num)
        ? units.toCanonical(num, input.dataset.unit, input.dataset.dim || 'length')
        : NaN;
      out[`${name}__unit`] = input.dataset.unit;
    } else if (input.dataset.dim || /^-?[\d.]+$/.test(String(raw).trim())) {
      const num = units.parseValue(raw);
      if (Number.isFinite(num)) out[`${name}__num`] = num;
    }
  }
  for (const k of Object.keys(state)) if (out[k] === undefined) out[k] = state[k];
  return out;
};

export const applyState = (root, state) => {
  for (const input of qsa('[data-f]', root)) {
    const name = input.dataset.f;
    if (state[name] === undefined) continue;
    if (input.classList.contains('seg')) input.classList.toggle('is-active', state[name] === input.dataset.value);
    else input.value = state[name];
  }
};

const STEP_BY_UNIT = {
  in: 0.001, ft: 0.01, mm: 0.05, cm: 0.05, m: 0.001, thou: 0.1,
  hp: 0.5, W: 50, rpm: 10, deg: 1, s: 1,
};

const STEP_BY_DIM = {
  length: { in: 0.001, mm: 0.05, cm: 0.05, m: 0.001, thou: 0.1, ft: 0.01 },
  speed: { in: 5, ft: 5, m: 0.5, mm: 0.5, cm: 0.05 },
  perMin: { in: 0.1, mm: 1, cm: 0.1, m: 0.1, ft: 0.01 },
  perRev: { in: 0.0001, mm: 0.001 },
  perTooth: { in: 0.0001, mm: 0.001 },
  rpm: { rpm: 10 },
  angle: { deg: 1 },
  time: { s: 1 },
  power: { hp: 0.5, W: 50 },
};

const stepFor = (input) => {
  const unit = input.dataset.unit;
  const dim = input.dataset.dim;
  const forced = Number(input.getAttribute('step'));
  if (Number.isFinite(forced) && forced > 0 && !input.hasAttribute('data-auto-step')) return forced;
  if (unit && dim && STEP_BY_DIM[dim] && STEP_BY_DIM[dim][unit]) return STEP_BY_DIM[dim][unit];
  if (unit && STEP_BY_UNIT[unit]) return STEP_BY_UNIT[unit];
  return Number.isFinite(forced) && forced > 0 ? forced : 1;
};

export const wirePanel = (root, handlers) => {
  const persist = (key) => {
    let st = parseFields(root, handlers.state);
    handlers.state = st;
    if (key != null && handlers.onChange && handlers.onChange(st, key, root) === true) {
      handlers.renderBody();
      if (handlers.onStructure) handlers.onStructure(st, root);
      st = parseFields(root, st);
      handlers.state = st;
    }
    store.saveCalcState(handlers.id, stripDerived(st));
    handlers.renderResults();
  };

  root.addEventListener('input', (ev) => {
    const el2 = ev.target;
    if (el2.matches('[data-f]')) persist(el2.dataset.f);
  });

  root.addEventListener('change', (ev) => {
    const el2 = ev.target;
    if (el2.matches('select[data-f]')) persist(el2.dataset.f);
  });

  root.addEventListener('click', (ev) => {
    const seg = ev.target.closest('.seg');
    if (seg) {
      const name = seg.dataset.f;
      for (const s of qsa(`.seg[data-f="${CSS.escape(name)}"]`, root)) s.classList.remove('is-active');
      seg.classList.add('is-active');
      handlers.state[name] = seg.dataset.value;
      persist(name);
      return;
    }
    const stepBtn = ev.target.closest('.step');
    if (stepBtn) {
      const input = document.getElementById(stepBtn.dataset.for);
      if (!input) return;
      const dir = Number(stepBtn.dataset.step);
      const inc = stepFor(input);
      const cur = units.parseValue(input.value);
      const base = Number.isFinite(cur) ? cur : 0;
      const scale = Math.max(1, Math.round(base / inc));
      const next = Math.max(0, (scale + dir) * inc);
      input.value = String(units.round(next, 6));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    const setter = ev.target.closest('[data-set]');
    if (setter) {
      const name = setter.dataset.set;
      const targetUnit = setter.dataset.setunit;
      if (targetUnit) {
        const sel = getField(root, `${name}Unit`);
        if (sel && sel.value !== targetUnit) {
          sel.value = targetUnit;
          sel.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      setField(root, name, setter.dataset.setvalue, setter.dataset.setdim || 'in', 'length');
      return;
    }
    const copy = ev.target.closest('[data-copy]');
    if (copy) { copyText(copy.dataset.copytext || ''); flash(copy, 'Copied'); return; }
    const dl = ev.target.closest('[data-dl]');
    if (dl) { downloadText(dl.dataset.dltext || '', dl.dataset.dlname || 'program.nc'); flash(dl, 'Saved'); return; }
    if (handlers.onClick) handlers.onClick(ev, handlers.state, root);
  });

  persist();
};

const stripDerived = (state) => {
  const out = {};
  for (const [k, v] of Object.entries(state)) {
    if (k.endsWith('__num') || k.endsWith('__mm') || k.endsWith('__unit')) continue;
    out[k] = v;
  }
  return out;
};

export const getField = (root, name) => qs(`[data-f="${CSS.escape(name)}"]`, root);

export const setField = (root, name, value, unit, dim) => {
  const input = getField(root, name);
  if (!input) return null;
  if (unit) input.dataset.unit = unit;
  if (dim) input.dataset.dim = dim;
  input.value = value == null ? '' : String(value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return input;
};

export const convertField = (root, name, dim, newUnit) => {
  const input = getField(root, name);
  if (!input) return null;
  const oldUnit = input.dataset.unit;
  const raw = units.parseValue(input.value);
  if (oldUnit && newUnit && oldUnit !== newUnit && Number.isFinite(raw)) {
    const canon = units.toCanonical(raw, oldUnit, dim);
    const next = units.fromCanonical(canon, newUnit, dim);
    input.value = String(units.round(next, 6));
  }
  input.dataset.unit = newUnit;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return input;
};

const flash = (btn, text) => {
  const old = btn.textContent;
  btn.textContent = text;
  setTimeout(() => { btn.textContent = old; }, 1100);
};

export const copyText = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (err) {
    return false;
  }
};

export const downloadText = (text, filename) => {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

export const panel = (def) => {
  const mount = (host) => {
    let state = { ...def.defaultState, ...store.loadCalcState(def.id) };
    const root = h(`<div class="calc" data-calc="${def.id}">
  <div class="calc-body"></div>
  <div class="calc-results"></div>
</div>`);

    const bodyEl = qs('.calc-body', root);
    const resultsEl = qs('.calc-results', root);

    const render = () => {
      bodyEl.innerHTML = typeof def.body === 'function' ? def.body(state, root) : def.body;
      if (def.onStructure) def.onStructure(state, root);
    };

    const renderResults = () => {
      let out;
      try {
        out = def.compute(state, root);
      } catch (err) {
        out = { results: [], error: (err && err.message) || String(err) };
      }
      if (out && out.html) {
        resultsEl.innerHTML = out.html;
        return;
      }
      const parts = [];
      if (out && out.results && out.results.length) parts.push(results(out.results));
      if (out && out.readout) parts.push(readout(out.readout));
      if (out && out.notes && out.notes.length) parts.push(notes(out.notes));
      if (out && out.warnings && out.warnings.length) {
        for (const w of out.warnings) parts.push(notice(w, 'warn'));
      }
      if (out && out.extra) parts.push(out.extra);
      if (out && out.error) parts.push(notice(`Could not calculate: ${units.escapeHtml(out.error)}`, 'warn'));
      resultsEl.innerHTML = parts.join('');
    };

    render();

    const handlers = {
      id: def.id,
      get state() { return state; },
      set state(next) { state = next; },
      resultsEl,
      renderBody: render,
      renderResults,
      onChange: (st, key) => def.onChange ? def.onChange(st, key, root) : false,
    };

    wirePanel(root, handlers);
    const instance = { root, get state() { return state; }, render, renderResults, handlers };

    const unsub = onGlobalChange(() => {
      state = parseFields(root, state);
      render();
      renderResults();
    });
    root.addEventListener('calc:teardown', unsub);

    host.appendChild(root);
    return instance;
  };

  return { ...def, mount };
};
