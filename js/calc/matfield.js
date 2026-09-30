import * as mat from '../materials.js';
import * as units from '../units.js';
import { setField, notice } from '../ui.js';

export const CUSTOM = 'custom';

export const matOptions = (value) => [
  { value: CUSTOM, label: '— custom / manual —' },
  ...mat.listMaterials().map((m) => ({ value: m.id, label: m.name })),
];

export const toolTypeOptions = () => mat.TOOL_TYPES.map((t) => ({ value: t.id, label: t.label }));

export const presetFor = (matId, toolType) => (matId && matId !== CUSTOM ? mat.getToolFor(matId, toolType) : null);

// Turning feed band in in/rev, or null. Null is meaningful: it means there is no
// defensible band for that material and tooling, so the page asks rather than
// guesses.
export const turnFeedPreset = (matId, toolType) => (
  matId && matId !== CUSTOM ? mat.turnFeedFor(matId, toolType) : null
);

// Midpoint of a band, as a starting feed per rev in in/rev.
export const turnFeedStart = (band) => (band && band.length === 2 ? (band[0] + band[1]) / 2 : NaN);

export const currentMaterial = (matId) => (matId && matId !== CUSTOM ? mat.getMaterial(matId) : null);

export const applyPreset = (root, state, targets) => {
  if (state.matId === CUSTOM) return false;
  const t = presetFor(state.matId, state.toolType);
  if (!t) return false;
  for (const [name, unit, dim] of targets) {
    const canon = dim === 'speed'
      ? t.sfm * 0.3048 * 1000
      : units.toCanonical(t.ipt, 'in', dim);
    setField(root, name, units.round(units.fromCanonical(canon, unit, dim), 6), unit, dim);
  }
  return true;
};

// Seeds a feed per rev box from the material's turning band, at the midpoint of
// the range. The band is only a starting point, so the page says so next to it
// rather than presenting it as the answer.
export const applyTurnFeed = (root, state) => {
  const band = turnFeedPreset(state.matId, state.toolType);
  if (!band) return false;
  const start = turnFeedStart(band);
  const shown = units.fromCanonical(units.toCanonical(start, 'in', 'perRev'), state.iprUnit, 'perRev');
  setField(root, 'ipr', units.round(shown, 6), state.iprUnit, 'perRev');
  return true;
};

export const matAdvisory = (matId) => {
  const m = currentMaterial(matId);
  if (!m) return '';
  if (m.verified === false) {
    return notice(`<strong>${units.escapeHtml(m.name)}:</strong> these are starting values only, not a verified recommendation. ${units.escapeHtml(m.notes || '')}`, 'warn');
  }
  return notice(`<strong>${units.escapeHtml(m.name)}:</strong> ${units.escapeHtml(m.notes || '')}`, 'info');
};

export const noToolData = (matId) => {
  const m = currentMaterial(matId);
  if (!m) return '';
  if (!presetFor(matId, 'carbide') && !presetFor(matId, 'coated') && !presetFor(matId, 'hss')) {
    return notice(`No tooling data for ${units.escapeHtml(m.name)}. Enter values manually.`, 'warn');
  }
  return '';
};

export const kcFor = (matId) => {
  const m = currentMaterial(matId);
  return m && Number.isFinite(m.kc) ? m.kc : NaN;
};
