import { qs, h, section, field, fieldRow, select, notice, downloadText } from './ui.js';
import * as units from './units.js';
import * as mat from './materials.js';

let host = null;

export const openMaterials = () => {
  if (!host) {
    host = h(`<div class="overlay" id="mat-overlay" hidden>
  <div class="overlay-scrim" data-close></div>
  <div class="sheet sheet-wide" role="dialog" aria-modal="true" aria-label="Materials">
    <header class="sheet-head">
      <h2>Materials</h2>
      <button type="button" class="btn btn-ghost" data-close>Close</button>
    </header>
    <div class="sheet-body">
      <div class="mat-list">
        <div class="mat-filter">
          <input type="search" id="mat-search" placeholder="Search materials" autocomplete="off">
          <button type="button" class="btn btn-primary" data-act="new">Add</button>
        </div>
        <div class="mat-tools">
          <button type="button" class="btn btn-sm" data-act="export">Export JSON</button>
          <button type="button" class="btn btn-sm" data-act="import">Import JSON</button>
          <button type="button" class="btn btn-sm" data-act="reset">Reset to defaults</button>
        </div>
        <div id="mat-results"></div>
      </div>
      <div class="mat-editor" id="mat-editor"></div>
    </div>
  </div>
</div>`);
    document.body.appendChild(host);
    host.addEventListener('input', (ev) => {
      if (ev.target.id === 'mat-search') {
        filter = ev.target.value;
        renderResults();
      }
    });
    host.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-close]')) close();
      if (ev.target.closest('[data-act]')) doAction(ev.target.closest('[data-act]').dataset.act, ev.target.closest('[data-act]'));
    });
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') close(); });
  }
  const box = qs('#mat-search', host);
  if (box) box.value = filter;
  host.hidden = false;
  renderResults();
  renderEditor(null);
};

export const closeMaterials = () => { if (host) host.hidden = true; };
const close = closeMaterials;

let filter = '';
let editing = null;

const renderResults = () => {
  const list = qs('#mat-results', host);
  if (!list) return;
  const q = filter.trim().toLowerCase();
  const items = q ? mat.searchMaterials(q) : mat.listMaterials();
  const groups = mat.materialsByGroup(items);

  list.innerHTML = `
    ${groups.map((g) => `
      <h4 class="mat-group">${units.escapeHtml(g.name)}</h4>
      <ul class="mat-items">${g.items.map((m) => `
        <li class="mat-item${editing === m.id ? ' is-editing' : ''}">
          <button type="button" class="mat-open" data-act="edit" data-id="${units.escapeHtml(m.id)}">
            <span class="mat-name">${units.escapeHtml(m.name)}</span>
            <span class="mat-meta">${m.verified === false ? '<em class="unverified">unverified</em> ' : ''}carbide ${units.fmt(m.tools.carbide ? m.tools.carbide.sfm : 0, 0)} SFM</span>
          </button>
        </li>`).join('')}</ul>
    `).join('')}
    ${items.length === 0 ? '<p class="hint-text">Nothing matched that search.</p>' : ''}`;
};

const renderList = renderResults;

const sfField = (m, tool, key) => {
  const t = m.tools[tool.id];
  return `<div class="mat-tool">
    <div class="mat-tool-head">
      <strong>${units.escapeHtml(tool.label)}</strong>
      <span class="mat-tool-hint">${units.escapeHtml(tool.hint)}</span>
    </div>
    <div class="row">
      ${field({ label: 'SFM', name: `${key}_${tool.id}_sfm`, value: t ? units.fmt(t.sfm, 1) : '', step: 5 })}
      ${field({ label: 'IPT', name: `${key}_${tool.id}_ipt`, value: t ? units.fmt(t.ipt, 5) : '', step: 0.0002 })}
    </div>
  </div>`;
};

const renderEditor = (m) => {
  const el = qs('#mat-editor', host);
  editing = m ? m.id : null;
  if (!m) {
    el.innerHTML = `<div class="mat-empty">
      <h3>Pick a material</h3>
      <p>Tap one on the left to edit its speeds, or use Add to create your own. Everything is stored on this device only.</p>
    </div>`;
    return;
  }
  const isNew = !m.id;
  el.innerHTML = `
    <div class="mat-editor-head">
      <h3>${isNew ? 'New material' : units.escapeHtml(m.name)}</h3>
      ${!isNew ? `<div class="btn-row">
        <button type="button" class="btn btn-sm" data-act="duplicate" data-id="${units.escapeHtml(m.id)}">Duplicate</button>
        <button type="button" class="btn btn-sm btn-danger" data-act="delete" data-id="${units.escapeHtml(m.id)}">Delete</button>
      </div>` : ''}
    </div>
    ${notice(m.verified === false
      ? '<strong>This one is unverified.</strong> The numbers below are a starting guess, not a tested recommendation. Mark it verified once you have proved it on a real cut.'
      : 'Edits are saved the moment you leave a field.', m.verified === false ? 'warn' : 'info')}
    <div class="row">
      ${field({ label: 'Name', name: 'name', value: m.name })}
    </div>
    <div class="row">
      ${select({ label: 'Group', name: 'group', value: m.group, options: mat.MATERIAL_GROUPS })}
      ${field({ label: 'Specific cutting force kc (N/mm2)', name: 'kc', value: units.fmt(m.kc, 0), step: 50, hint: 'Used for the horsepower figure in the MRR calculator.' })}
    </div>
    <div class="mat-tools-grid">${mat.TOOL_TYPES.map((t) => sfField(m, t, 't')).join('')}</div>
    <div class="row">
      ${field({ label: 'Notes', name: 'notes', value: m.notes })}
    </div>
    <div class="row">
      <button type="button" class="btn btn-primary" data-act="save">Save</button>
      ${!isNew ? `<button type="button" class="btn" data-act="verified" data-id="${units.escapeHtml(m.id)}">${m.verified === false ? 'Mark as verified' : 'Mark as unverified'}</button>` : ''}
    </div>`;
  wireEditor(m);
};

const wireEditor = (m) => {
  const el = qs('#mat-editor', host);
  el.oninput = (ev) => {
    const name = ev.target.dataset && ev.target.dataset.f;
    if (!name) return;
    schedule(m, name, ev.target.value);
  };
};

let pending = null;
const schedule = (m, name, value) => {
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    saveFromForm(m);
  }, 400);
};

const saveFromForm = (m) => {
  const el = qs('#mat-editor', host);
  const get = (n) => {
    const input = el.querySelector(`[data-f="${CSS.escape(n)}"]`);
    return input ? input.value : '';
  };
  const tools = {};
  for (const t of mat.TOOL_TYPES) {
    const sfm = units.parseValue(get(`t_${t.id}_sfm`));
    const ipt = units.parseValue(get(`t_${t.id}_ipt`));
    tools[t.id] = Number.isFinite(sfm) && Number.isFinite(ipt) && sfm > 0 && ipt > 0 ? { sfm, ipt } : null;
  }
  const draft = {
    ...m,
    name: get('name') || 'Untitled material',
    group: get('group') || 'Other',
    kc: units.parseValue(get('kc')) || 1500,
    tools,
    notes: get('notes') || '',
  };
  mat.upsertMaterial(draft);
  renderList();
};

const doAction = async (act, node) => {
  if (act === 'new') { renderEditor({ id: '', name: '', group: 'Other', kc: 1500, verified: true, notes: '', tools: {} }); return; }
  if (act === 'edit') { renderEditor(mat.getMaterial(node.dataset.id)); return; }
  if (act === 'duplicate') { const m = mat.duplicateMaterial(node.dataset.id); renderList(); renderEditor(m); return; }
  if (act === 'delete') {
    if (!confirm(`Delete ${mat.getMaterial(node.dataset.id).name}?`)) return;
    mat.deleteMaterial(node.dataset.id);
    renderList();
    renderEditor(null);
    return;
  }
  if (act === 'verified') {
    const m = mat.getMaterial(node.dataset.id);
    mat.upsertMaterial({ ...m, verified: m.verified === false });
    renderList();
    renderEditor(mat.getMaterial(node.dataset.id));
    return;
  }
  if (act === 'save') { renderList(); return; }
  if (act === 'export') { downloadText(mat.exportJson(), mat.exportFileName()); return; }
  if (act === 'import') {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        const n = mat.importJson(await file.text(), 'merge');
        renderList();
        renderEditor(null);
        alert(`Imported. You now have ${n.length} materials.`);
      } catch (err) {
        alert(`Could not import that file: ${err.message}`);
      }
    });
    input.click();
    return;
  }
  if (act === 'reset') {
    if (!confirm('Restore the built-in material list? Your own materials and edits will be lost.')) return;
    mat.resetMaterials();
    renderList();
    renderEditor(null);
  }
};
