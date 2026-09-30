import {
  panel, field, fieldRow, select, segmented, section, dataTable, codeBlock, notice, convertField,
} from '../ui.js';
import * as units from '../units.js';
import * as F from './formulas.js';
import * as gcode from '../gcode.js';

export default panel({
  id: 'boltcircle',
  title: 'Bolt Circle / Hole Pattern',
  short: 'Bolt Circle',
  order: 4,
  keywords: 'bolt circle bcd pcd hole pattern hole circle gcode drill cycle haas okuma fanuc',
  blurb: 'Bolt circle coordinates, chord maths, and a ready canned-drill program for Haas, Okuma or generic Fanuc.',

  defaultState: {
    mode: 'fromPcd',
    pcd: '100',
    pcdUnit: 'mm',
    chord: '50',
    chordUnit: 'mm',
    holes: '6',
    apart: '1',
    startAngle: '0',
    direction: 'ccw',
    drillDia: '6.5',
    drillUnit: 'mm',
    depth: '20',
    rPlane: '2',
    feed: '150',
    peck: 'peck',
    peckDepth: '4',
    machine: 'haas',
    progMode: 'radius',
    tool: '1',
    toolOffset: '1',
    safeZ: '5',
    spindle: '1200',
    showTable: 'yes',
  },

  body(state) {
    const machines = gcode.MACHINE_LIST.map((m) => ({ value: m.id, label: m.label, hint: m.detail }));
    return [
      section('Pattern', [
        segmented({
          label: 'Given',
          name: 'mode',
          value: state.mode,
          options: [
            { value: 'fromPcd', label: 'Bolt circle diameter' },
            { value: 'fromChord', label: 'Hole spacing (chord)' },
          ],
        }),
        state.mode === 'fromPcd'
          ? fieldRow(
            field({ label: 'Bolt circle diameter', name: 'pcd', value: state.pcd, unit: state.pcdUnit, dim: 'length' }),
            select({
              label: 'Length unit', name: 'pcdUnit', value: state.pcdUnit,
              options: [{ value: 'in', label: 'inch' }, { value: 'mm', label: 'mm' }],
            }),
          )
          : fieldRow(
            field({ label: 'Chord between holes', name: 'chord', value: state.chord, unit: state.pcdUnit, dim: 'length' }),
            select({
              label: 'Length unit', name: 'pcdUnit', value: state.pcdUnit,
              options: [{ value: 'in', label: 'inch' }, { value: 'mm', label: 'mm' }],
            }),
            field({ label: 'Holes apart', name: 'apart', value: state.apart, step: 1, hint: '1 = neighbouring holes, 2 = skip one, and so on.' }),
          ),
        fieldRow(
          field({ label: 'Number of holes', name: 'holes', value: state.holes, step: 1 }),
          field({ label: 'Start angle', name: 'startAngle', value: state.startAngle, unit: '°', dim: 'angle', step: 1 }),
          select({
            label: 'Direction', name: 'direction', value: state.direction,
            options: [{ value: 'ccw', label: 'Counter-clockwise' }, { value: 'cw', label: 'Clockwise' }],
          }),
        ),
      ].join('')),

      section('Drilling', [
        fieldRow(
          field({ label: 'Drill diameter', name: 'drillDia', value: state.drillDia, unit: state.drillUnit, dim: 'length' }),
          select({
            label: 'Length unit', name: 'drillUnit', value: state.drillUnit,
            options: [{ value: 'in', label: 'inch' }, { value: 'mm', label: 'mm' }],
          }),
        ),
        fieldRow(
          field({ label: 'Full depth to drill', name: 'depth', value: state.depth, unit: state.drillUnit, dim: 'length' }),
          field({ label: 'R plane (retract)', name: 'rPlane', value: state.rPlane, unit: state.drillUnit, dim: 'length' }),
          field({ label: 'Feed', name: 'feed', value: state.feed, unit: state.drillUnit, dim: 'perMin' }),
        ),
        select({
          label: 'Cycle', name: 'peck', value: state.peck,
          options: [
            { value: 'plain', label: 'G81 Gantry / simple drill' },
            { value: 'peck', label: 'G83 Deep peck' },
          ],
        }) + (state.peck === 'peck'
          ? fieldRow(field({ label: 'Peck depth (Q)', name: 'peckDepth', value: state.peckDepth, unit: state.drillUnit, dim: 'length' }))
          : ''),
      ].join('')),

      section('Machine and program style', [
        fieldRow(
          select({ label: 'Machine', name: 'machine', value: state.machine, options: machines }),
          select({
            label: 'X/Y programming', name: 'progMode', value: state.progMode,
            options: gcode.PROGRAM_MODES.map((m) => ({ value: m.id, label: m.label })),
          }),
        ),
        fieldRow(
          field({ label: 'Tool number', name: 'tool', value: state.tool, step: 1 }),
          field({ label: 'Length offset H', name: 'toolOffset', value: state.toolOffset, step: 1 }),
          field({ label: 'Safe Z', name: 'safeZ', value: state.safeZ, unit: state.drillUnit, dim: 'length' }),
          field({ label: 'Spindle rpm', name: 'spindle', value: state.spindle, step: 100 }),
        ),
        notice('Coordinates are hole CENTRES, not edges. Put your actual tool diameter in the tool offset table, not in this program.', 'warn'),
      ].join('')),
    ].join('');
  },

  onChange(state, key, root) {
    if (key === 'mode') {
      if (state.mode === 'fromChord') convertField(root, 'chord', 'length', state.pcdUnit);
      return true;
    }
    if (key === 'pcdUnit') {
      convertField(root, 'pcd', 'length', state.pcdUnit);
      convertField(root, 'chord', 'length', state.pcdUnit);
    }
    if (key === 'drillUnit') {
      for (const n of ['drillDia', 'depth', 'rPlane', 'peckDepth', 'safeZ']) convertField(root, n, 'length', state.drillUnit);
      convertField(root, 'feed', 'perMin', state.drillUnit);
    }
    if (key === 'machine') {
      const m = gcode.MACHINES[state.machine];
      if (m && !m.incDiameter && state.progMode === 'incremental') return true;
    }
    return false;
  },

  compute(state) {
    const unit = state.pcdUnit || 'mm';
    const holes = Math.trunc(units.parseValue(state.holes));
    const apart = Math.trunc(units.parseValue(state.apart));

    if (!Number.isFinite(holes) || holes < 1) return { results: [], error: 'Number of holes must be 1 or more.' };
    if (holes > 200) return { results: [], error: 'That is a lot of holes. Keep the count at 200 or below.' };

    let pcdMm;
    let pcdSource = '';
    if (state.mode === 'fromPcd') {
      pcdMm = state.pcd__mm;
      pcdSource = 'entered directly';
      if (!Number.isFinite(pcdMm) || pcdMm <= 0) return { results: [], error: 'Enter a bolt circle diameter.' };
    } else {
      const chordMm = state.chord__mm;
      if (!Number.isFinite(chordMm) || chordMm <= 0) return { results: [], error: 'Enter a chord between holes.' };
      pcdMm = F.pcdFromChord(chordMm, holes, apart || 1);
      pcdSource = 'back-calculated from the chord';
      if (!Number.isFinite(pcdMm)) return { results: [], error: 'That hole spacing and count do not give a usable circle.' };
    }

    const start = units.parseValue(state.startAngle) || 0;
    const pts = F.boltCirclePoints(pcdMm, holes, { startAngleDeg: start, direction: state.direction });
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    const minChord = Math.min(...pts.map((p, i) => (i ? F.stepDistance(pts[i - 1], p) : NaN)).filter(Number.isFinite));

    const results = [
      { label: 'Bolt circle diameter', dim: 'length', value: pcdMm, hint: pcdSource },
      { label: 'Hole centre radius', dim: 'length', value: pcdMm / 2 },
      { label: 'Holes', dim: 'ratio', value: holes },
      { label: 'Angle step', dim: 'angle', value: 360 / holes },
      { label: 'Chord between neighbours', dim: 'length', value: F.chordAcross(pcdMm, holes, 1) },
      { label: 'Span in X', dim: 'length', value: spanX },
      { label: 'Span in Y', dim: 'length', value: spanY },
      { label: 'Max envelope', dim: 'length', value: Math.max(spanX, spanY), hint: 'The larger of the two spans. Useful for checking vise or fixture clearance.' },
    ];

    const warnings = [];
    const drillMm = state.drillDia__mm;
    if (Number.isFinite(drillMm) && drillMm > 0) {
      if (minChord < drillMm * 2.5) {
        warnings.push(`Neighbouring holes are only ${units.lengthTriple(minChord)} apart and the drill is ${units.lengthTriple(drillMm)}. That is not enough room to break the chip.`);
      }
      if (drillMm > pcdMm) {
        warnings.push('The drill is larger than the bolt circle. That pattern cannot be drilled.');
      }
    }
    if (state.mode === 'fromChord' && apart === 2 && holes === 2) {
      warnings.push('With two holes, "2 apart" is the same pair as "1 apart". Pick 1.');
    }
    if (holes === 2) {
      warnings.push('Two holes on a circle is really just a pair of coordinates. Confirm which pair you meant before running anything.');
    }

    const notes = [
      'X = R &times; cos(&theta;), Y = R &times; sin(&theta;), where R is half the bolt circle and &theta; starts at your start angle.',
      'Chord = BCD &times; sin(180&deg; &divide; holes) for neighbouring holes. Working backwards, BCD = chord &divide; sin(180&deg; &divide; holes).',
      'Chord distance is not arc length. On a large circle with few holes the difference matters; on a 6 inch bolt circle it does not.',
    ];

    const extra = [];
    if (state.showTable === 'yes') {
      const toStr = (mm) => (unit === 'in'
        ? `${units.formatFraction(units.fractionFor(units.fromCanonical(mm, 'in', 'length')), { mixed: true }) || ''}&nbsp;${units.fmt(units.fromCanonical(mm, 'in', 'length'), 4)}`
        : units.fmt(units.fromCanonical(mm, 'mm', 'length'), 3));
      extra.push(section('Coordinates', dataTable(
        [
          { label: 'Hole' },
          { label: '°' },
          { label: `X (${units.unitLabel(unit, 'length')})`, numeric: true },
          { label: `Y (${units.unitLabel(unit, 'length')})`, numeric: true },
        ],
        pts.map((p) => ({ cells: [String(p.i), units.fmt(p.angleDeg, 1), toStr(p.x), toStr(p.y)] })),
        { dense: true },
      )));
    }

    const gcUnit = state.drillUnit === 'in' ? 'in' : 'mm';
    const depthMm = state.depth__mm;
    const rpMm = state.rPlane__mm;
    const feedMm = units.toCanonical(units.parseValue(state.feed), gcUnit, 'perMin');
    const peckMm = units.parseValue(state.peckDepth);
    // A blank spindle is legitimate, the program just carries no S word. A blank
    // one used to reach Math.trunc and arrive as NaN, which is not the same as
    // "not given".
    const rpmRaw = units.parseValue(state.spindle);
    const spindleSpeed = Number.isFinite(rpmRaw) && rpmRaw > 0 ? Math.trunc(rpmRaw) : null;

    const progInput = {
      machine: state.machine,
      holes: pts.map((p) => ({ x: units.fromCanonical(p.x, gcUnit, 'length'), y: units.fromCanonical(p.y, gcUnit, 'length') })),
      zDepth: -units.fromCanonical(Math.abs(depthMm), gcUnit, 'length'),
      rPlane: units.fromCanonical(Math.abs(rpMm), gcUnit, 'length'),
      feed: units.fromCanonical(feedMm, gcUnit, 'perMin'),
      unit: gcUnit,
      mode: state.progMode,
      tool: Math.trunc(units.parseValue(state.tool)),
      toolOffset: Math.trunc(units.parseValue(state.toolOffset)),
      safeZ: units.fromCanonical(Math.abs(state.safeZ__mm || 0), gcUnit, 'length'),
      peck: state.peck === 'peck',
      peckDepth: state.peck === 'peck' ? units.fromCanonical(Math.abs(peckMm), gcUnit, 'length') : null,
      spindleSpeed,
      holeLabel: `BOLT CIRCLE BCD ${units.fmt(units.fromCanonical(pcdMm, gcUnit, 'length'), 3)}${units.unitLabel(gcUnit, 'length')} x ${holes} HOLES`,
    };
    // Checked before emitting, so a blank depth, R plane or feed reports a
    // message instead of quietly producing Z0. or F0.0000 in a program.
    const issues = gcode.gcodeIssues(progInput);

    if (!issues.length) extra.push(codeBlock(gcode.emitDrillCycle(progInput), 'BOLT CIRCLE'));
    else extra.push(notice(`Program not generated: ${issues.join('. ')}.`, 'warn'));
    for (const w of gcode.gcodeWarnings(state.machine, state.progMode)) extra.push(notice(w, 'warn'));

    return { results, notes, warnings, error: issues.join('. '), extra: extra.join('') };
  },
});
