import {
  panel, field, fieldRow, select, section, notice, segmented, dataTable, convertField,
} from '../ui.js';
import * as units from '../units.js';
import * as F from './formulas.js';
import * as mat from '../materials.js';
import {
  CUSTOM, matOptions, toolTypeOptions, applyPreset, applyTurnFeed, matAdvisory, presetFor,
  turnFeedPreset, turnFeedStart,
} from './matfield.js';

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
  keywords: 'table feed ipm feed rate rpm flutes chip load per tooth vf turning ipr in per rev lathe',
  blurb: 'Spindle speed and chip load to actual table feed, or feed per rev on a lathe. Remember this is table feed, not cutting speed.',

  defaultState: {
    op: 'milling',
    matId: CUSTOM,
    toolType: 'carbide',
    rpm: '8000',
    flutes: '2',
    ipt: '0.0030',
    iptUnit: 'in',
    // A lathe has no flutes, so the turning side is driven by feed per rev and
    // never by a chip load per tooth.
    ipr: '0.0050',
    iprUnit: 'in',
  },

  body(state) {
    const turning = state.op === 'turning';

    const feedRow = turning
      ? fieldRow(
        field({ label: 'Feed per revolution', name: 'ipr', value: state.ipr, unit: state.iprUnit, dim: 'perRev' }),
        select({
          label: 'Feed per rev unit', name: 'iprUnit', value: state.iprUnit,
          options: [{ value: 'in', label: 'in/rev' }, { value: 'mm', label: 'mm/rev' }],
        }),
      )
      : fieldRow(
        field({ label: 'Chip load (IPT)', name: 'ipt', value: state.ipt, unit: state.iptUnit, dim: 'perTooth' }),
        select({
          label: 'Chip load unit', name: 'iptUnit', value: state.iptUnit,
          options: [{ value: 'in', label: 'in/tooth' }, { value: 'mm', label: 'mm/tooth' }],
        }),
      );

    const machineRow = turning
      ? fieldRow(
        field({ label: 'Spindle speed', name: 'rpm', value: state.rpm, unit: 'rpm', dim: 'rpm', step: 100 }),
        notice('A lathe has no flutes, so there is no chip load per tooth. The feed per rev comes from the insert and the workpiece.', 'info'),
      )
      : fieldRow(
        field({ label: 'Spindle speed', name: 'rpm', value: state.rpm, unit: 'rpm', dim: 'rpm', step: 100 }),
        field({ label: 'Flutes', name: 'flutes', value: state.flutes, step: 1 }),
      );

    return [
      section('Operation', [
        fieldRow(
          segmented({
            label: 'Type',
            name: 'op',
            value: state.op,
            options: [{ value: 'milling', label: 'Milling' }, { value: 'turning', label: 'Turning' }],
          }),
        ),
        fieldRow(
          select({ label: 'Material preset', name: 'matId', value: state.matId, options: matOptions(state.matId) }),
          select({ label: 'Tooling', name: 'toolType', value: state.toolType, options: toolTypeOptions() }),
        ),
        feedRow,
      ].join('')),
      section('Machine', machineRow),
    ].join('');
  },

  onChange(state, key, root) {
    if (key === 'op') return true;
    if (key === 'matId' || key === 'toolType') {
      if (state.op === 'turning') applyTurnFeed(root, state);
      else applyPreset(root, state, [['ipt', state.iptUnit, 'perTooth']]);
    }
    if (key === 'iptUnit') convertField(root, 'ipt', 'perTooth', state.iptUnit);
    if (key === 'iprUnit') convertField(root, 'ipr', 'perRev', state.iprUnit);
    return false;
  },

  compute(state) {
    const turning = state.op === 'turning';
    const rpm = units.parseValue(state.rpm);
    if (!Number.isFinite(rpm) || rpm <= 0) return { results: [], error: 'Enter a spindle speed.' };

    const band = turnFeedPreset(state.matId, state.toolType);
    const warnings = [matAdvisory(state.matId)].filter(Boolean);
    const results = [];
    const notes = [];

    // Feed per minute at a given rpm. In turning the input is a feed per rev, in
    // milling it is a chip load per tooth times the flutes.
    let feedAt = null;

    if (turning) {
      const iprUnit = state.ipr__unit || state.iprUnit;
      const iprMm = units.toCanonical(state.ipr__num, iprUnit, 'perRev');
      if (!Number.isFinite(iprMm) || iprMm <= 0) {
        return {
          results: [],
          error: 'Enter a feed per revolution. On a lathe there is no chip load to fall back on, so nothing is invented here.',
          warnings: band ? [notice(mat.TURN_FEED_NOTE, 'warn'), ...warnings] : warnings,
        };
      }
      feedAt = (r) => r * iprMm;
      const feedMm = feedAt(rpm);

      results.push({ label: 'Table feed', dim: 'perMin', value: feedMm, hint: 'IPM on top, mm/min below. This is how fast the table moves.' });
      results.push({ label: 'Feed per revolution', dim: 'perRev', value: iprMm, hint: 'IPR. This is the number most manual lathes dial in.' });

      if (band) {
        const lo = band[0];
        const hi = band[1];
        const iprImp = units.fromCanonical(iprMm, 'in', 'perRev');
        results.push({
          label: 'Material starting band',
          dim: 'perRev',
          value: units.toCanonical(lo, 'in', 'perRev'),
          hint: `${units.fmt(lo, 4)} to ${units.fmt(hi, 4)} in/rev is the material level band for ${state.toolType}. Midpoint ${units.fmt(turnFeedStart(band), 4)} is what the material button seeds.`,
        });
        if (iprImp < lo || iprImp > hi) {
          warnings.push(`Your ${units.fmt(iprImp, 4)} in/rev is outside the ${units.fmt(lo, 4)} to ${units.fmt(hi, 4)} in/rev material band. Fine if your insert box says so, otherwise ease off.`);
        }
        warnings.push(mat.TURN_FEED_NOTE);
      }

      notes.push(
        'IPM = IPR &times; RPM. On a lathe the feed per rev comes from the insert and the workpiece. It does not follow from the surface speed.',
        'If a source quotes you a chip load per tooth for turning, it is quoting a per rev figure in disguise. There are no flutes on a lathe.',
      );
    } else {
      const flutes = units.parseValue(state.flutes);
      const iptUnit = state.ipt__unit || state.iptUnit;
      const fzMm = units.toCanonical(state.ipt__num, iptUnit, 'perTooth');
      if (!Number.isFinite(flutes) || flutes < 1) return { results: [], error: 'Flute count must be 1 or more.' };
      if (!Number.isFinite(fzMm) || fzMm <= 0) return { results: [], error: 'Enter a chip load.' };

      feedAt = (r) => F.feedFromToothLoad(r, fzMm, flutes);

      results.push({ label: 'Table feed', dim: 'perMin', value: feedAt(rpm), hint: 'IPM on top, mm/min below. This is how fast the table moves.' });
      results.push({ label: 'Feed per revolution', dim: 'perRev', value: fzMm * flutes, hint: 'IPR. This is the number most manual machines dial in.' });
      results.push({ label: 'Chip load per tooth', dim: 'perTooth', value: fzMm });

      notes.push(
        'VF = rpm &times; chip load &times; flutes. For a 3 mm endmill at 12 000 rpm with 0.02 mm per tooth in 2 flutes that is 480 mm/min.',
        'If you set feed by hand on the machine dial, it is almost always quoted as feed per revolution. Multiply by rpm to get table feed.',
      );
      if (flutes > 4) {
        warnings.push('More than four flutes is unusual for a roughing cutter. Double-check the chip load; heavy feed on a many-flute tool deflects badly.');
      }
      const preset = presetFor(state.matId, state.toolType);
      if (preset) {
        const iptImp = units.fromCanonical(fzMm, 'in', 'perTooth');
        notes.push(`Material table IPT for this combo is ${units.fmt(preset.ipt, 5)} in/tooth, so you are at ${units.fmt((iptImp / preset.ipt) * 100, 0)}% of the preset.`);
      }
    }

    const rows = nearestSpeeds(rpm).map((c) => {
      const f = feedAt(c.rpm);
      return {
        cells: [
          units.fmt(c.rpm, 0),
          units.fmt(units.fromCanonical(f, 'in', 'perMin'), 1),
          units.fmt(units.fromCanonical(f, 'mm', 'perMin'), 0),
        ],
        cls: Math.abs(c.rpm - rpm) < 0.5 ? 'is-here' : '',
      };
    });

    return {
      results,
      notes,
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
