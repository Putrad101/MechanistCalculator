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
      section('Machine limit (optional)', fieldRow(
        field({ label: 'Max spindle speed', name: 'machineMax', value: state.machineMax, unit: 'rpm', dim: 'rpm', step: 100 }),
      ) + notice('Only used as a sanity check. On a manual machine you are limited by the pulley steps you actually have, not by this number.', 'info')),
    ].join('');
  },

  onChange(state, key, root) {
    if (key === 'matId' || key === 'toolType') applyPreset(root, state, [['vc', state.vcUnit, 'speed']]);
    if (key === 'diaUnit') convertField(root, 'dia', 'length', state.diaUnit);
    if (key === 'vcUnit') convertField(root, 'vc', 'speed', state.vcUnit);
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

    return {
      results: [
        { label: 'Spindle speed', dim: 'rpm', value: rpm },
        { label: 'Cutting speed', dim: 'speed', value: F.cuttingSpeedMMFromRpm(rpm, diaMm) },
      ],
      notes: [
        'n = 1000 &times; Vc / (&pi; &times; D), with Vc in m/min and D in mm.',
        'Flute count does not change the surface speed. It only changes how much feed you need to hold that speed.',
        presetNote,
      ],
      warnings: [matAdvisory(state.matId), ...warnings].filter(Boolean),
    };
  },
});
