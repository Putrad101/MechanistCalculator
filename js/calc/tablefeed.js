import {
  panel, field, fieldRow, select, section, notice, dataTable, convertField,
} from '../ui.js';
import * as units from '../units.js';
import * as F from './formulas.js';
import { CUSTOM, matOptions, toolTypeOptions, applyPreset, matAdvisory, presetFor } from './matfield.js';

const nearestSpeeds = (rpm) => {
  const cands = new Set([rpm]);
  for (const step of [10, 25, 50, 100, 250, 500, 1000]) {
    cands.add(Math.round(rpm / step) * step);
  }
  return Array.from(cands)
    .filter((n) => n > 0)
    .sort((a, b) => a - b)
    .map((n) => ({ rpm: n, d: Math.abs(n - rpm) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 5)
    .sort((a, b) => a.rpm - b.rpm);
};

export default panel({
  id: 'tablefeed',
  title: 'Table Feed (IPM / mm-min)',
  short: 'Table Feed',
  order: 2,
  keywords: 'table feed ipm feed rate rpm flutes chip load per tooth vf',
  blurb: 'Spindle speed and chip load to actual table feed. Remember this is table feed, not cutting speed.',

  defaultState: {
    matId: CUSTOM,
    toolType: 'carbide',
    rpm: '8000',
    flutes: '2',
    ipt: '0.0030',
    iptUnit: 'in',
  },

  body(state) {
    return [
      section('Material and tooling', [
        fieldRow(
          select({ label: 'Material preset', name: 'matId', value: state.matId, options: matOptions(state.matId) }),
          select({ label: 'Tooling', name: 'toolType', value: state.toolType, options: toolTypeOptions() }),
        ),
        fieldRow(
          field({ label: 'Chip load (IPT)', name: 'ipt', value: state.ipt, unit: state.iptUnit, dim: 'perTooth' }),
          select({
            label: 'Chip load unit', name: 'iptUnit', value: state.iptUnit,
            options: [{ value: 'in', label: 'in/tooth' }, { value: 'mm', label: 'mm/tooth' }],
          }),
        ),
      ].join('')),
      section('Machine', [
        fieldRow(
          field({ label: 'Spindle speed', name: 'rpm', value: state.rpm, unit: 'rpm', dim: 'rpm', step: 100 }),
          field({ label: 'Flutes', name: 'flutes', value: state.flutes, step: 1 }),
        ),
      ].join('')),
    ].join('');
  },

  onChange(state, key, root) {
    if (key === 'matId' || key === 'toolType') applyPreset(root, state, [['ipt', state.iptUnit, 'perTooth']]);
    if (key === 'iptUnit') convertField(root, 'ipt', 'perTooth', state.iptUnit);
  },

  compute(state) {
    const rpm = units.parseValue(state.rpm);
    const flutes = units.parseValue(state.flutes);
    const iptUnit = state.ipt__unit || state.iptUnit;
    const fzMm = units.toCanonical(state.ipt__num, iptUnit, 'perTooth');

    if (!Number.isFinite(rpm) || rpm <= 0) return { results: [], error: 'Enter a spindle speed.' };
    if (!Number.isFinite(flutes) || flutes < 1) return { results: [], error: 'Flute count must be 1 or more.' };
    if (!Number.isFinite(fzMm) || fzMm <= 0) return { results: [], error: 'Enter a chip load.' };

    const feedMm = F.feedFromToothLoad(rpm, fzMm, flutes);
    const feedImp = units.fromCanonical(feedMm, 'in', 'perMin');

    const rows = nearestSpeeds(rpm).map((c) => {
      const f = F.feedFromToothLoad(c.rpm, fzMm, flutes);
      return {
        cells: [
          units.fmt(c.rpm, 0),
          units.fmt(units.fromCanonical(f, 'in', 'perMin'), 1),
          units.fmt(units.fromCanonical(f, 'mm', 'perMin'), 0),
        ],
        cls: Math.abs(c.rpm - rpm) < 0.5 ? 'is-here' : '',
      };
    });

    const warnings = [matAdvisory(state.matId)].filter(Boolean);
    if (flutes > 4) {
      warnings.push('More than four flutes is unusual for a roughing cutter. Double-check the chip load; heavy feed on a many-flute tool deflects badly.');
    }

    const preset = presetFor(state.matId, state.toolType);
    const iptImp = units.fromCanonical(fzMm, 'in', 'perTooth');
    const presetNote = preset
      ? `Material table IPT for this combo is ${units.fmt(preset.ipt, 5)} in/tooth, so you are at ${units.fmt((iptImp / preset.ipt) * 100, 0)}% of the preset.`
      : '';

    return {
      results: [
        { label: 'Table feed', dim: 'perMin', value: feedMm, hint: 'IPM on top, mm/min below. This is how fast the table moves.' },
        { label: 'Feed per revolution', dim: 'perRev', value: fzMm * flutes, hint: 'IPR. This is the number most manual machines dial in.' },
        { label: 'Chip load per tooth', dim: 'perTooth', value: fzMm },
      ],
      notes: [
        'VF = rpm &times; chip load &times; flutes. For a 3 mm endmill at 12 000 rpm with 0.02 mm per tooth in 2 flutes that is 480 mm/min.',
        'If you set feed by hand on the machine dial, it is almost always quoted as feed per revolution. Multiply by rpm to get table feed.',
        presetNote,
      ].filter(Boolean),
      warnings,
      extra: section('Feeds at speeds you can actually reach', dataTable(
        [
          { label: 'Spindle rpm', numeric: true },
          { label: 'Feed (IPM)', numeric: true },
          { label: 'Feed (mm/min)', numeric: true },
        ],
        rows,
        { dense: true },
      )),
    };
  },
});
