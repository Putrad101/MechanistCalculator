import {
  panel, field, fieldRow, select, section, notice, convertField, segmented,
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
  blurb: 'Cutting speed to spindle speed, or the reverse. On a lathe you set the speed from the part diameter, on a mill from the tool diameter.',

  defaultState: {
    // Lathe is the default because the common case is a workpiece: in turning the
    // cutting speed belongs to the part, not to the insert.
    mode: 'lathe',
    matId: CUSTOM,
    toolType: 'carbide',
    dia: '0.5',
    diaUnit: 'in',
    // 250 SFM is ordinary for carbide in mild steel, so the page opens on
    // numbers that mean something rather than a placeholder.
    vc: '250',
    vcUnit: 'ft',
    machineMax: '4000',
    // Only used in mill mode, where the cutter is sized on its own diameter and
    // the workpiece speed is worth knowing separately.
    partDia: '',
    partDiaUnit: 'in',
  },

  body(state) {
    const lathe = state.mode !== 'mill';
    const diaLabel = lathe ? 'Part diameter' : 'Tool diameter';

    const sections = [
      section('Material and tooling', [
        fieldRow(
          segmented({
            label: 'Machine type',
            name: 'mode',
            value: state.mode,
            options: [{ value: 'lathe', label: 'Lathe' }, { value: 'mill', label: 'Mill' }],
          }),
        ),
        notice(lathe
          ? 'Lathe: the cutting speed belongs to the workpiece, so the diameter below is the part you are turning.'
          : 'Mill: the cutting speed belongs to the cutter, so the diameter below is the tool. The workpiece speed is reported separately.', 'info'),
        fieldRow(
          select({ label: 'Material preset', name: 'matId', value: state.matId, options: matOptions(state.matId) }),
          select({ label: 'Tooling', name: 'toolType', value: state.toolType, options: toolTypeOptions() }),
        ),
        fieldRow(
          field({ label: diaLabel, name: 'dia', value: state.dia, unit: state.diaUnit, dim: 'length' }),
          select({
            label: 'Diameter unit', name: 'diaUnit', value: state.diaUnit,
            options: [{ value: 'in', label: 'inch' }, { value: 'mm', label: 'mm' }],
          }),
        ),
        fieldRow(
          field({ label: 'Cutting speed', name: 'vc', value: state.vc, unit: state.vcUnit, dim: 'speed' }),
          select({
            label: 'Speed unit', name: 'vcUnit', value: state.vcUnit,
            // 'ft' is the SFM unit, and it is the one the speed dimension
            // reports in. This used to offer 'in' under an SFM label, so typing
            // 250 into a box that said SFM was read as 250 in/min, which is
            // 20.8 SFM. 'in' stays in the list, honestly labelled, because saved
            // state may already be holding it.
            options: [{ value: 'ft', label: 'SFM' }, { value: 'm', label: 'm/min' }, { value: 'in', label: 'in/min' }],
          }),
        ),
      ].join('')),
    ];

    if (!lathe) {
      sections.push(section('Workpiece', [
        fieldRow(
          field({ label: 'Workpiece diameter', name: 'partDia', value: state.partDia, unit: state.partDiaUnit, dim: 'length' }),
          select({
            label: 'Workpiece unit', name: 'partDiaUnit', value: state.partDiaUnit,
            options: [{ value: 'in', label: 'inch' }, { value: 'mm', label: 'mm' }],
          }),
        ),
        notice('Only used to report the surface speed at the workpiece, which is a different number from the cutter&rsquo;s cutting speed.', 'info'),
      ]));
    }

    sections.push(section('Machine limit (optional)', fieldRow(
      field({ label: 'Max spindle speed', name: 'machineMax', value: state.machineMax, unit: 'rpm', dim: 'rpm', step: 100 }),
    ) + notice('Only used as a sanity check. On a manual machine you are limited by the pulley steps you actually have, not by this number.', 'info')));

    return sections.join('');
  },

  onChange(state, key, root) {
    // Re-render so the diameter label and the workpiece field follow the machine
    // type.
    if (key === 'mode') return true;
    if (key === 'matId' || key === 'toolType') applyPreset(root, state, [['vc', state.vcUnit, 'speed']]);
    if (key === 'diaUnit') convertField(root, 'dia', 'length', state.diaUnit);
    if (key === 'vcUnit') convertField(root, 'vc', 'speed', state.vcUnit);
    if (key === 'partDiaUnit') convertField(root, 'partDia', 'length', state.partDiaUnit);
    return false;
  },

  compute(state) {
    const lathe = state.mode !== 'mill';
    const diaMm = state.dia__mm;
    const vcUnit = state.vc__unit || state.vcUnit;
    const vcMmMin = units.toCanonical(state.vc__num, vcUnit, 'speed');
    const rpm = F.rpmFromCuttingSpeedMM(vcMmMin, diaMm);

    if (!Number.isFinite(rpm) || rpm <= 0) {
      return { results: [], error: `Enter a ${lathe ? 'part' : 'tool'} diameter and a cutting speed.` };
    }

    const maxRpm = units.parseValue(state.machineMax);
    const warnings = [];
    if (Number.isFinite(maxRpm) && maxRpm > 0 && rpm > maxRpm) {
      warnings.push(`Calculated speed is above your ${units.fmt(maxRpm, 0)} rpm machine limit. On a manual machine pick the closest pulley step you can actually reach.`);
    }
    if (rpm < 50) {
      warnings.push('That is a very low rpm. Double-check the cutting speed and the diameter before trusting it.');
    }
    if (!lathe && diaMm < 10) {
      warnings.push('Small tool diameter. Below about 10 mm / 0.4 in, most manuals want you to dial the cutting speed back for deflection and rub, so treat this rpm as a ceiling rather than a target.');
    }

    const preset = presetFor(state.matId, state.toolType);
    const presetNote = preset
      ? `Loaded from the material table: ${units.fmt(preset.sfm, 1)} SFM. Edit the cutting speed above if you want to run something else.`
      : 'No material preset selected, so the cutting speed above is whatever you typed in.';

    const results = [
      { label: 'Spindle speed', dim: 'rpm', value: rpm },
      { label: 'Cutting speed', dim: 'speed', value: F.cuttingSpeedMMFromRpm(rpm, diaMm) },
    ];
    // On a lathe the working diameter is the one already used above, so a
    // separate workpiece speed would just repeat the cutting speed. In a mill
    // the cutter and the workpiece are different diameters, so it is worth
    // reporting.
    if (!lathe) {
      const partDiaMm = units.toCanonical(units.parseValue(state.partDia), state.partDia__unit || state.partDiaUnit, 'length');
      if (Number.isFinite(partDiaMm) && partDiaMm > 0) {
        results.push({ label: 'Speed at the workpiece', dim: 'speed', value: F.cuttingSpeedMMFromRpm(rpm, partDiaMm) });
      }
    }

    return {
      results,
      notes: [
        lathe
          ? 'n = 1000 &times; Vc / (&pi; &times; D), with Vc in m/min and D the part diameter in mm. In turning the cutting speed is the speed of the workpiece.'
          : 'n = 1000 &times; Vc / (&pi; &times; D), with Vc in m/min and D the cutter diameter in mm. In milling the cutting speed is the speed of the cutting edge.',
        'This page is speed only. Surface speed does not tell you a feed, and no feed here is derived from one. Feed per revolution comes from the insert and the workpiece, and is worked out on the Table Feed page.',
        presetNote,
      ],
      warnings: [matAdvisory(state.matId), ...warnings].filter(Boolean),
    };
  },
});
