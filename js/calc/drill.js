import {
  panel, field, fieldRow, select, section, dataTable, notice, convertField,
} from '../ui.js';
import * as units from '../units.js';
import * as F from './formulas.js';
import * as T from '../tables.js';

const ANGLES = ['118', '135', '140', '117', '90', '60', '47.5'];

export default panel({
  id: 'drill',
  title: 'Drill Depth & Sizes',
  short: 'Drill',
  order: 5,
  keywords: 'drill drill depth point angle blind hole twist drill number letter fractional size',
  blurb: 'Point geometry, how deep the drill actually has to go, and which stock drill is nearest.',

  defaultState: {
    dia: '10',
    diaUnit: 'mm',
    angle: '118',
    customAngle: '130',
    depth: '20',
    depthUnit: 'mm',
    clearance: '0.5',
    clearanceUnit: 'mm',
    pitch: '25',
    pitchUnit: 'mm',
    countLength: '200',
  },

  body(state) {
    const du = state.diaUnit;
    const du2 = state.depthUnit;
    return [
      section('Drill', [
        fieldRow(
          field({ label: 'Drill diameter', name: 'dia', value: state.dia, unit: du, dim: 'length' }),
          select({
            label: 'Diameter unit', name: 'diaUnit', value: du,
            options: [{ value: 'in', label: 'inch' }, { value: 'mm', label: 'mm' }],
          }),
          select({
            label: 'Point angle', name: 'angle', value: state.angle,
            options: [...ANGLES.map((a) => ({ value: a, label: `${a}°` })), { value: 'custom', label: 'custom' }],
          }),
        ),
        fieldRow(
          field({ label: 'Finished depth needed', name: 'depth', value: state.depth, unit: du2, dim: 'length' }),
          select({
            label: 'Depth unit', name: 'depthUnit', value: du2,
            options: [{ value: 'in', label: 'inch' }, { value: 'mm', label: 'mm' }],
          }),
          field({ label: 'Chip clearance extra', name: 'clearance', value: state.clearance, unit: state.clearanceUnit, dim: 'length', hint: 'Add this to the full depth so the point breaks through cleanly.' }),
        ),
        state.angle === 'custom'
          ? fieldRow(
            field({ label: 'Custom point angle', name: 'customAngle', value: state.customAngle, suffix: '°', step: 1 }),
            notice('The full angle at the tip, not the half angle. Most twist drills are 118°, 135° or 140°.', 'info'),
          )
          : '',
      ].join('')),

      section('Hole layout', fieldRow(
        field({ label: 'Hole pitch', name: 'pitch', value: state.pitch, unit: state.pitchUnit, dim: 'length' }),
        field({ label: 'Over this length', name: 'countLength', value: state.countLength, unit: state.pitchUnit, dim: 'length' }),
      ) + notice('Hole count is a length divided by pitch, rounded down, plus one. The last hole in a row always starts a new pitch, so the count is not a round number.', 'info')),
    ].join('');
  },

  onChange(state, key, root) {
    if (key === 'diaUnit') convertField(root, 'dia', 'length', state.diaUnit);
    if (key === 'depthUnit') {
      convertField(root, 'depth', 'length', state.depthUnit);
      convertField(root, 'clearance', 'length', state.depthUnit);
    }
    if (key === 'pitchUnit') {
      convertField(root, 'pitch', 'length', state.pitchUnit);
      convertField(root, 'countLength', 'length', state.pitchUnit);
    }
    if (key === 'angle') return true;
  },

  compute(state) {
    const diaMm = state.dia__mm;
    if (!Number.isFinite(diaMm) || diaMm <= 0) return { results: [], error: 'Enter a drill diameter.' };

    let angle = state.angle === 'custom' ? units.parseValue(state.customAngle) : units.parseValue(state.angle);
    if (!Number.isFinite(angle) || angle <= 0 || angle >= 180) angle = 118;
    const point = F.drillPointLength(diaMm, angle);
    const depthMm = state.depth__mm;
    const clr = units.toCanonical(units.parseValue(state.clearance), state.clearanceUnit, 'length');
    const full = Number.isFinite(depthMm) && depthMm > 0 ? F.fullDepth(depthMm, point) : NaN;

    const results = [
      { label: 'Drill diameter', dim: 'length', value: diaMm },
      { label: `Point length at ${units.fmt(angle, 1)}°`, dim: 'length', value: point, hint: 'The cone on the end of the twist drill.' },
      { label: 'Full depth to command', dim: 'length', value: full, hint: 'Finished depth plus the point, so the point breaks out.' },
      { label: 'Depth including clearance', dim: 'length', value: full + (Number.isFinite(clr) ? clr : 0), hint: 'What I would actually type in the Z word.' },
    ];

    const layout = [];
    const pitchMm = state.pitch__mm;
    const spanMm = state.countLength__mm;
    if (Number.isFinite(pitchMm) && pitchMm > 0 && Number.isFinite(spanMm) && spanMm > 0) {
      const n = F.holeCountByPitch(spanMm, pitchMm);
      const first = (spanMm - (n - 1) * pitchMm) / 2;
      const usableDia = diaMm + pitchMm;
      const spanTotal = (n - 1) * pitchMm + diaMm;
      results.push({ label: 'Holes at that pitch', dim: 'ratio', value: n });
      results.push({ label: 'Centre to centre of the two end holes', dim: 'length', value: (n - 1) * pitchMm });
      results.push({ label: 'Edge to edge of the whole row', dim: 'length', value: spanTotal });
      layout.push(`Centre of the first hole sits ${units.lengthTriple(Math.max(0, first))} in from each end, so the row is symmetric.`);
      if (pitchMm < usableDia * 1.2) {
        layout.push(`<strong class="warn-inline">Hole to hole web is only ${units.lengthTriple(pitchMm - diaMm)}. That is thin for steel and it will deflect a small drill. Aim for pitch &ge; ${units.fmt(usableDia, 2)} mm.</strong>`);
      }
    }

    const near = T.nearestDrills(units.fromCanonical(diaMm, 'in', 'length'), 7);
    const rows = near.map((d) => ({
      cells: [
        d.label,
        units.fmt(d.inch, 4),
        units.fmt(d.mm, 3),
        d.diff < 5e-6 ? 'exact' : `off by ${units.fmt(units.fromCanonical(units.toCanonical(d.diff, 'in', 'length'), 'mm', 'length'), 4)} mm`,
      ],
      cls: d.diff < 5e-6 ? 'is-here' : '',
    }));

    const notes = [
      'Point length = (D &divide; 2) &divide; tan(point angle &divide; 2). A 118&deg; point on a 10 mm drill is 3.00 mm long.',
      'A 118&deg; point is roughly 0.3 &times; diameter. 135&deg; is 0.21 &times; and is what most indexable drills and carbide drills use.',
      'Command the full depth plus the point, or the point will not break through and you will burr the bottom of the hole.',
    ];

    const warnings = [];
    if (diaMm > 12.7 && angle < 100) warnings.push('A narrow point on a big drill makes a lot of walking and heat. Most shops move to 118 or 135 above about half an inch.');
    if (angle === 135) notes.push('135&deg; is the standard on most indexable and carbide drills, and on some SFC/SPC specialty bits.');

    return {
      results,
      notes: [...notes, ...layout],
      warnings,
      extra: section('Nearest stock sizes', dataTable(
        [
          { label: 'Size' },
          { label: 'Inch', numeric: true },
          { label: 'mm', numeric: true },
          { label: 'Match' },
        ],
        rows,
        { dense: true },
      )),
    };
  },
});
