import {
  panel, field, fieldRow, select, section, notice, convertField,
} from '../ui.js';
import * as units from '../units.js';
import * as F from './formulas.js';
import { CUSTOM, matOptions, toolTypeOptions, applyPreset, matAdvisory, presetFor } from './matfield.js';

export default panel({
  id: 'rpm',
  title: 'Spindle Speed (RPM)',
  short: 'RPM',
  order: 1,
  keywords: 'rpm spindle speed sfm surface speed cutting speed vc revolutions per minute',
  blurb: 'Cutting speed to spindle speed, or the reverse. Pick a material preset to load starting values.',

  defaultState: {
    matId: CUSTOM,
    toolType: 'carbide',
    dia: '0.5',
    diaUnit: 'in',
    vc: '100',
    vcUnit: 'in',
    machineMax: '4000',
    flutes: '2',
    partDia: '2',
    partDiaUnit: 'in',
  },

  body(state) {
    return [
      section('Material and tooling', [
        fieldRow(
          select({ label: 'Material preset', name: 'matId', value: state.matId, options: matOptions(state.matId) }),
          select({ label: 'Tooling', name: 'toolType', value: state.toolType, options: toolTypeOptions() }),
        ),
        fieldRow(
          field({ label: 'Tool diameter', name: 'dia', value: state.dia, unit: state.diaUnit, dim: 'length' }),
          select({
            label: 'Diameter unit', name: 'diaUnit', value: state.diaUnit,
            options: [{ value: 'in', label: 'inch' }, { value: 'mm', label: 'mm' }],
          }),
        ),
        fieldRow(
          field({ label: 'Cutting speed', name: 'vc', value: state.vc, unit: state.vcUnit, dim: 'speed' }),
          select({
            label: 'Speed unit', name: 'vcUnit', value: state.vcUnit,
            options: [{ value: 'in', label: 'SFM' }, { value: 'm', label: 'm/min' }],
          }),
        ),
      ].join('')),
      section('Feed per revolution (carbide)', [
        `<p class="hint-text">Feed per rev is set by chip load and the number of edges, not by surface speed. `
        + `Pick a material preset to use its IPT, otherwise the chip load is scaled from the tool diameter. `
        + `The part diameter is only used to report the surface speed at the workpiece.</p>`,
        fieldRow(
          field({ label: 'Number of cutting edges / flutes', name: 'flutes', value: state.flutes, unit: 'each', dim: 'count', step: 1 }),
        ),
        fieldRow(
          field({ label: 'Part diameter', name: 'partDia', value: state.partDia, unit: state.partDiaUnit, dim: 'length' }),
          select({
            label: 'Part unit', name: 'partDiaUnit', value: state.partDiaUnit,
            options: [{ value: 'in', label: 'inch' }, { value: 'mm', label: 'mm' }],
          }),
        ),
      ].join('')),
      section('Machine limit (optional)', fieldRow(
        field({ label: 'Max spindle speed', name: 'machineMax', value: state.machineMax, unit: 'rpm', dim: 'rpm', step: 100 }),
      ) + notice('Only used as a sanity check. On a manual machine you are limited by the pulley steps you actually have, not by this number.', 'info')),
    ].join('');
  },

  onChange(state, key, root) {
    if (key === 'matId' || key === 'toolType') applyPreset(root, state, [['vc', state.vcUnit, 'speed']]);
    if (key === 'diaUnit') convertField(root, 'dia', 'length', state.diaUnit);
    if (key === 'vcUnit') convertField(root, 'vc', 'speed', state.vcUnit);
    if (key === 'partDiaUnit') convertField(root, 'partDia', 'length', state.partDiaUnit);
  },

  compute(state) {
    const diaMm = state.dia__mm;
    const vcUnit = state.vc__unit || state.vcUnit;
    const vcMmMin = units.toCanonical(state.vc__num, vcUnit, 'speed');
    const rpm = F.rpmFromCuttingSpeedMM(vcMmMin, diaMm);

    if (!Number.isFinite(rpm) || rpm <= 0) {
      return { results: [], error: 'Enter a tool diameter and a cutting speed.' };
    }

    const maxRpm = units.parseValue(state.machineMax);
    const warnings = [];
    if (Number.isFinite(maxRpm) && maxRpm > 0 && rpm > maxRpm) {
      warnings.push(`Calculated speed is above your ${units.fmt(maxRpm, 0)} rpm machine limit. On a manual machine pick the closest pulley step you can actually reach.`);
    }
    if (rpm < 50) {
      warnings.push('That is a very low rpm. Double-check the cutting speed and the tool diameter before trusting it.');
    }
    if (diaMm > 25.4) {
      warnings.push('Tool over 1 in diameter. Below about 10 mm / 0.4 in, most manuals want you to dial the cutting speed back for deflection and rub.');
    }

    const preset = presetFor(state.matId, state.toolType);
    const presetNote = preset
      ? `Loaded from the material table: ${units.fmt(preset.sfm, 1)} SFM / ${units.fmt(preset.ipt, 5)} IPT. Edit the cutting speed above if you want to run something else.`
      : 'No material preset selected, so the cutting speed above is whatever you typed in.';

    // Feed per revolution. Chip load comes from the material table when a preset
    // is loaded, otherwise from the carbide-by-diameter rule.
    const flutes = Math.max(1, Math.round(units.parseValue(state.flutes) || 1));
    const fzMm = preset ? preset.ipt * F.MM_PER_IN : F.chipLoadFromToolDia(diaMm);
    const fprMm = F.feedPerRevolution(fzMm, flutes);
    const feedMmMin = F.feedFromToothLoad(rpm, fzMm, flutes);
    const feedNote = preset
      ? `Chip load ${units.fmt(preset.ipt, 5)} in/tooth from the material table, so ${units.fmt(fzMm * flutes / F.MM_PER_IN, 5)} in/rev at ${units.fmt(flutes, 0)} edge(s).`
      : `No material preset, so chip load is estimated at ${units.fmt(fzMm / F.MM_PER_IN, 5)} in/tooth from the ${units.fmt(diaMm / F.MM_PER_IN, 3)} in tool diameter. Set a material preset to use the table value instead.`;

    // Surface speed at the workpiece, which is what SFM normally refers to on a
    // lathe. It is reported here only; it does not set the feed.
    const partDiaMm = units.toCanonical(units.parseValue(state.partDia), state.partDia__unit || state.partDiaUnit, 'length');
    const results = [
      { label: 'Spindle speed', dim: 'rpm', value: rpm },
      { label: 'Cutting speed', dim: 'speed', value: F.cuttingSpeedMMFromRpm(rpm, diaMm) },
      { label: 'Feed per revolution', dim: 'perRev', value: fprMm },
      { label: 'Resulting feed', dim: 'perMin', value: feedMmMin },
    ];
    if (Number.isFinite(partDiaMm) && partDiaMm > 0) {
      results.push({ label: 'Speed at the part', dim: 'speed', value: F.cuttingSpeedMMFromRpm(rpm, partDiaMm) });
    }

    return {
      results,
      notes: [
        'n = 1000 &times; Vc / (&pi; &times; D), with Vc in m/min and D in mm.',
        'FPR = chip load &times; edges. FPR does not follow from SFM; the two are set independently. Once the speed is known, IPM = FPR &times; RPM.',
        'Flute count does not change the surface speed. It only changes how much feed you need to hold that speed.',
        presetNote,
        feedNote,
      ],
      warnings: [matAdvisory(state.matId), ...warnings].filter(Boolean),
    };
  },
});
