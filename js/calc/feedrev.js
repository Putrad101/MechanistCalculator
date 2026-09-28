import {
  panel, field, fieldRow, select, segmented, section, notice, convertField,
} from '../ui.js';
import * as units from '../units.js';
import * as F from './formulas.js';
import { CUSTOM, matOptions, toolTypeOptions, matAdvisory, presetFor } from './matfield.js';

export default panel({
  id: 'feedrev',
  title: 'Feed per Revolution (FPR)',
  short: 'FPR',
  order: 3,
  keywords: 'fpr ipr feed per revolution feed per tooth tooth load ipm',
  blurb: 'The FPR calculator. Works both directions: table feed to per-rev feed, or per-rev feed to table feed.',

  defaultState: {
    mode: 'toPerRev',
    matId: CUSTOM,
    toolType: 'carbide',
    rpm: '800',
    flutes: '2',
    feed: '80',
    feedUnit: 'in',
    ipt: '0.0500',
    iptUnit: 'in',
  },

  body(state) {
    const forward = state.mode === 'toPerRev';
    const rows = [
      segmented({
        label: 'Direction',
        name: 'mode',
        value: state.mode,
        options: [
          { value: 'toPerRev', label: 'Table feed to FPR' },
          { value: 'toTable', label: 'FPR to table feed' },
        ],
      }),
      fieldRow(
        field({ label: 'Spindle speed', name: 'rpm', value: state.rpm, unit: 'rpm', dim: 'rpm', step: 100 }),
        field({ label: 'Flutes', name: 'flutes', value: state.flutes, step: 1 }),
      ),
    ];

    if (forward) {
      rows.push(fieldRow(
        field({ label: 'Table feed', name: 'feed', value: state.feed, unit: state.feedUnit, dim: 'perMin' }),
        select({
          label: 'Feed unit', name: 'feedUnit', value: state.feedUnit,
          options: [{ value: 'in', label: 'IPM' }, { value: 'mm', label: 'mm/min' }],
        }),
      ));
      rows.push(notice('The feed dial on a Haas, and the feed override on most lathes, is per revolution. The G-code feed word is table feed. They are not the same number.', 'info'));
    } else {
      rows.push(fieldRow(
        field({ label: 'Feed per revolution', name: 'ipt', value: state.ipt, unit: state.iptUnit, dim: 'perRev' }),
        select({
          label: 'FPR unit', name: 'iptUnit', value: state.iptUnit,
          options: [{ value: 'in', label: 'IPR' }, { value: 'mm', label: 'mm/rev' }],
        }),
      ));
    }

    rows.push(section('Optional: compare against the material table', [
      fieldRow(
        select({ label: 'Material preset', name: 'matId', value: state.matId, options: matOptions(state.matId) }),
        select({ label: 'Tooling', name: 'toolType', value: state.toolType, options: toolTypeOptions() }),
      ),
    ].join('')));

    return rows.join('');
  },

  onChange(state, key, root) {
    if (key === 'mode') return true;
    if (key === 'feedUnit') convertField(root, 'feed', 'perMin', state.feedUnit);
    if (key === 'iptUnit') convertField(root, 'ipt', 'perRev', state.iptUnit);
    return false;
  },

  compute(state) {
    const rpm = units.parseValue(state.rpm);
    const flutes = units.parseValue(state.flutes);
    if (!Number.isFinite(rpm) || rpm <= 0) return { results: [], error: 'Enter a spindle speed.' };
    if (!Number.isFinite(flutes) || flutes < 1) return { results: [], error: 'Flute count must be 1 or more.' };

    const forward = state.mode === 'toPerRev';
    let perRevMm;
    let feedMm;
    let iptMm;

    if (forward) {
      const feedUnit = state.feed__unit || state.feedUnit;
      feedMm = units.toCanonical(state.feed__num, feedUnit, 'perMin');
      if (!Number.isFinite(feedMm) || feedMm <= 0) return { results: [], error: 'Enter a table feed.' };
      perRevMm = feedMm / rpm;
      iptMm = F.toothLoadFromFeed(rpm, feedMm, flutes);
    } else {
      const iptUnit = state.ipt__unit || state.iptUnit;
      perRevMm = units.toCanonical(state.ipt__num, iptUnit, 'perRev');
      if (!Number.isFinite(perRevMm) || perRevMm <= 0) return { results: [], error: 'Enter a feed per revolution.' };
      feedMm = F.feedFromToothLoad(rpm, perRevMm, flutes);
      iptMm = perRevMm / flutes;
    }

    const results = [
      { label: 'Feed per revolution', dim: 'perRev', value: perRevMm, hint: 'The FPR number. This is what the feed dial shows.' },
      { label: 'Table feed', dim: 'perMin', value: feedMm, hint: 'What goes in the F word in G-code.' },
      { label: 'Feed per tooth', dim: 'perTooth', value: iptMm, hint: 'Per tooth per tooth. Divide by flutes to get IPR, multiply by flutes to get IPM.' },
    ];

    const notes = [
      'FPR = table feed &divide; rpm.  Tooth load = FPR &divide; flutes.  Table feed = FPR &times; rpm.',
      'One more way to say it: IPR = IPM &divide; RPM. Three flutes at 0.002 IPR is 0.006 IPT.',
    ];
    const warnings = [matAdvisory(state.matId)].filter(Boolean);

    const preset = presetFor(state.matId, state.toolType);
    if (preset) {
      const iptImp = units.fromCanonical(iptMm, 'in', 'perTooth');
      const pct = (iptImp / preset.ipt) * 100;
      notes.push(`Material table IPT is ${units.fmt(preset.ipt, 5)} in/tooth. Yours is ${units.fmt(iptImp, 5)}, which is ${units.fmt(pct, 0)}% of the preset.`);
      if (pct > 175) warnings.push('You are well above the preset chip load. Expect edge break on anything harder than aluminium or brass, and watch the deflection.');
      if (pct < 45) warnings.push('That chip load is low enough that the tool will likely rub rather than cut. Raise it or accept a longer cut.');
    }

    return { results, notes, warnings };
  },
});
