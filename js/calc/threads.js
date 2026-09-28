import {
  panel, field, fieldRow, select, segmented, section, dataTable, codeBlock, notice, convertField, setField,
} from '../ui.js';
import * as units from '../units.js';
import * as T from '../tables.js';
import * as gcode from '../gcode.js';

const UN_SERIES = [
  { value: 'UNC', label: 'UNC - Unified coarse' },
  { value: 'UNF', label: 'UNF - Unified fine' },
  { value: 'UNEF', label: 'UNEF - Unified extra fine' },
];

const PCT_OPTIONS = [
  { value: '75', label: '75% thread - usual for general work' },
  { value: '65', label: '65% thread - harder material' },
  { value: '60', label: '60% thread - tough, thin material' },
  { value: 'custom', label: 'custom %' },
];

export default panel({
  id: 'threads',
  title: 'Threads & Tapping',
  short: 'Threads',
  order: 6,
  keywords: 'thread tapping tap tpi threads per inch pitch tap drill percent thread unified unc unf metric iso m8',
  blurb: 'Look up a thread, work out the tap drill, and check the percent of thread engagement.',

  defaultState: {
    system: 'un',
    des: '1/4-20',
    series: 'UNC',
    tpi: '20',
    major: '0.2500',
    majorUnit: 'in',
    pitch: '0.0500',
    pitchUnit: 'in',
    metricDes: 'M10x1.5',
    pct: '75',
    pctCustom: '75',
    machine: 'haas',
    tapCycle: 'g84',
    unit: 'in',
    x: '0',
    y: '0',
    depth: '0.500',
    rPlane: '0.100',
    feed: '5.0',
    tool: '3',
    toolOffset: '3',
    spindle: '800',
  },

  body(state) {
    const metric = state.system === 'metric';
    return [
      section('Thread', [
        segmented({
          label: 'Standard',
          name: 'system',
          value: state.system,
          options: [
            { value: 'un', label: 'Unified (inch)' },
            { value: 'metric', label: 'Metric ISO' },
          ],
        }),
        metric
          ? fieldRow(
            field({ label: 'Designation (e.g. M10x1.5)', name: 'metricDes', value: state.metricDes, placeholder: 'M10x1.5' }),
          )
          : fieldRow(
            field({ label: 'Designation (e.g. 1/4-20)', name: 'des', value: state.des, placeholder: '1/4-20 or 10-24' }),
            select({ label: 'Series', name: 'series', value: state.series, options: UN_SERIES }),
            field({ label: 'or TPI', name: 'tpi', value: state.tpi, step: 1, suffix: 'TPI' }),
          ),
        fieldRow(
          field({ label: 'Major diameter', name: 'major', value: state.major, unit: state.majorUnit, dim: 'length' }),
          field({ label: 'Pitch', name: 'pitch', value: state.pitch, unit: state.pitchUnit, dim: 'length' }),
        ),
      ].join('')),

      section('Tap drill', [
        fieldRow(select({ label: 'Target thread engagement', name: 'pct', value: state.pct, options: PCT_OPTIONS })),
        state.pct === 'custom'
          ? fieldRow(field({ label: 'Custom percent', name: 'pctCustom', value: state.pctCustom, unit: '%', dim: 'ratio', step: 1 }))
          : '',
      ].join('')),

      section('Tapping program (single hole)', [
        fieldRow(
          field({ label: 'X start', name: 'x', value: state.x, unit: state.unit, dim: 'length' }),
          field({ label: 'Y start', name: 'y', value: state.y, unit: state.unit, dim: 'length' }),
          field({ label: 'Full thread depth', name: 'depth', value: state.depth, unit: state.unit, dim: 'length' }),
        ),
        fieldRow(
          field({ label: 'R plane', name: 'rPlane', value: state.rPlane, unit: state.unit, dim: 'length' }),
          field({ label: 'Feed (equal to rpm)', name: 'feed', value: state.feed, unit: state.unit, dim: 'perMin' }),
          field({ label: 'Spindle rpm', name: 'spindle', value: state.spindle, step: 50 }),
        ),
        fieldRow(
          select({
            label: 'Machine', name: 'machine', value: state.machine,
            options: gcode.MACHINE_LIST.map((m) => ({ value: m.id, label: m.label })),
          }),
          select({
            label: 'Cycle', name: 'tapCycle', value: state.tapCycle,
            options: [
              { value: 'g84', label: 'G84 floating tap (needs M29)' },
              { value: 'g85', label: 'G85 rigid tap' },
            ],
          }),
        ),
        fieldRow(
          field({ label: 'Tool number', name: 'tool', value: state.tool, step: 1 }),
          field({ label: 'Length offset H', name: 'toolOffset', value: state.toolOffset, step: 1 }),
        ),
      ].join('')),
    ].join('');
  },

  onChange(state, key, root) {
    if (key === 'system') return true;
    if (key === 'des' || key === 'series') {
      const t = T.findThread(state.des);
      if (t) {
        setField(root, 'major', units.fmt(t.majorIn, 4), 'in', 'length');
        setField(root, 'pitch', units.fmt(1 / t.tpi, 5), 'in', 'length');
        setField(root, 'tpi', String(t.tpi));
        setField(root, 'series', t.series);
      }
    }
    if (key === 'tpi') {
      const tpi = units.parseValue(state.tpi);
      if (Number.isFinite(tpi) && tpi > 0) {
        setField(root, 'pitch', units.fmt(1 / tpi, 5), 'in', 'length');
        const guess = T.THREADS_UN.find((x) => x.series === state.series && Math.abs(x.tpi - tpi) < 1e-9);
        if (guess) {
          setField(root, 'major', units.fmt(guess.majorIn, 4), 'in', 'length');
          setField(root, 'des', guess.des);
        }
      }
    }
    if (key === 'metricDes') {
      const t = T.findMetricThread(state.metricDes);
      if (t) {
        setField(root, 'major', t.majorMm, 'mm', 'length');
        setField(root, 'pitch', t.pitchMm, 'mm', 'length');
      }
    }
    if (key === 'major') {
      const m = state.major__mm;
      const p = state.pitch__mm;
      if (Number.isFinite(m) && Number.isFinite(p) && p > 0) {
        setField(root, 'tpi', units.fmt(1 / units.fromCanonical(p, 'in', 'length'), 1));
      }
    }
    if (key === 'majorUnit') {
      convertField(root, 'major', 'length', state.majorUnit);
      convertField(root, 'pitch', 'length', state.majorUnit);
    }
    if (key === 'pitchUnit') convertField(root, 'pitch', 'length', state.pitchUnit);
    if (key === 'pct') return true;
    if (key === 'spindle') {
      setField(root, 'feed', units.fmt(units.parseValue(state.spindle), 1), state.unit, 'perMin');
    }
    return false;
  },

  compute(state) {
    const majorMm = state.major__mm;
    let pitchMm = state.pitch__mm;
    const metric = state.system === 'metric';

    if (!Number.isFinite(majorMm) || majorMm <= 0) return { results: [], error: 'Enter a major diameter.' };
    if (!Number.isFinite(pitchMm) || pitchMm <= 0) {
      const tpi = units.parseValue(state.tpi);
      if (Number.isFinite(tpi) && tpi > 0) pitchMm = units.toCanonical(1 / tpi, 'in', 'length');
    }
    if (!Number.isFinite(pitchMm) || pitchMm <= 0) return { results: [], error: 'Enter a pitch or a TPI.' };

    const g = T.threadGeometry(majorMm, pitchMm);
    const pct = state.pct === 'custom' ? units.parseValue(state.pctCustom) : units.parseValue(state.pct);
    const pctVal = Number.isFinite(pct) && pct > 0 && pct <= 100 ? pct : 75;
    const tapMm = T.tapDrillForPercent(majorMm, pitchMm, pctVal);
    const shopMm = T.shopRuleTapDrill(majorMm, pitchMm);
    const rollMm = T.rollTapDrill(majorMm, pitchMm);
    const tpi = T.tpiFromPitchMm(pitchMm);

    let publishedTapMm = NaN;
    let desLabel = '';
    if (metric) {
      const t = T.findMetricThread(state.metricDes);
      if (t) { publishedTapMm = t.tapMm; desLabel = t.des; }
    } else {
      const t = T.findThread(state.des);
      if (t) { publishedTapMm = units.toCanonical(t.tapInch, 'in', 'length'); desLabel = `${t.des} ${t.series}`; }
    }

    const actualTapIn = Number.isFinite(publishedTapMm)
      ? T.findExactDrill(units.fromCanonical(publishedTapMm, 'in', 'length'))
      : T.findExactDrill(units.fromCanonical(tapMm, 'in', 'length'));
    const drillToUse = Number.isFinite(publishedTapMm) && Math.abs(publishedTapMm - tapMm) / tapMm < 0.06
      ? publishedTapMm
      : tapMm;
    const engagement = T.percentThread(majorMm, pitchMm, drillToUse);

    const results = [
      { label: 'Major diameter', dim: 'length', value: majorMm },
      { label: 'Pitch', dim: 'length', value: pitchMm, hint: metric ? 'Metric pitch, in mm.' : 'Distance from one thread to the next.' },
      { label: 'Threads per inch', dim: 'ratio', value: tpi, hint: 'TPI is just the inch version of pitch.' },
      { label: 'Pitch diameter', dim: 'length', value: g.pitchDia, hint: 'Major minus 0.6495 &times; pitch.' },
      { label: 'External minor diameter', dim: 'length', value: g.externalMinor, hint: 'Root of a male thread. Major minus 1.2268 &times; pitch.' },
      { label: 'Internal minor diameter', dim: 'length', value: g.internalMinor, hint: 'Root of a female thread. Major minus 1.0825 &times; pitch.' },
      { label: `Tap drill for ${units.fmt(pctVal, 0)}% thread`, dim: 'length', value: drillToUse, hint: 'Major minus 1.299 &times; pitch &times; the percentage.' },
      { label: 'Thread engagement you get', dim: 'ratio', value: engagement, hint: 'How much of the full thread height is actually being used.' },
      { label: 'Shop rule D minus P', dim: 'length', value: shopMm, hint: 'The 77% rule. Close to a real 75% tap drill and much easier to remember.' },
    ];

    if (metric) {
      results.push({ label: 'Form (roll) tap drill', dim: 'length', value: rollMm, hint: 'Roll taps only. They form the thread instead of cutting it. Major minus half a pitch.' });
    }
    if (desLabel) {
      results.unshift({ label: 'Matched size', dim: 'length', value: majorMm, hint: `From the table: ${desLabel}. Values below are the standard for that size.` });
    }
    if (actualTapIn) {
      results.push({ label: 'Nearest stock drill', dim: 'length', value: units.toCanonical(actualTapIn.inch, 'in', 'length'), hint: `${actualTapIn.label} is an exact stock size at that diameter.` });
    }

    const near = T.nearestDrills(units.fromCanonical(drillToUse, 'in', 'length'), 6);
    const rows = near.map((d) => ({
      cells: [
        d.label,
        units.fmt(d.inch, 4),
        units.fmt(d.mm, 3),
        d.diff < 5e-6 ? 'exact' : `${units.fmt(units.fmt(d.diff * 25.4, 3), 3)} mm over/under`,
      ],
      cls: d.diff < 5e-6 ? 'is-here' : '',
    }));

    const warnings = [];
    if (engagement < 55) warnings.push(`${units.fmt(engagement, 0)}% engagement is very low. The tap will probably strip or break, and the thread will be weak. Use a bigger tap drill.`);
    if (engagement > 85) warnings.push(`${units.fmt(engagement, 0)}% engagement is high. That needs a lot of torque and a sharp tap. Reduce the percentage if the tap keeps breaking.`);
    if (metric && !T.findMetricThread(state.metricDes)) warnings.push('That designation is not in the table. The maths still apply, but double-check the pitch against your drawing.');

    const notes = [
      'Percent thread = (major &minus; drill) &divide; (1.299 &times; pitch) &times; 100. 75% is the usual shop compromise between strength and tap life.',
      'For inch threads the quick rule is drill = major &minus; pitch, which lands you at about 77% thread. The formula is the one to trust.',
      'In a blind hole, the tap drill needs to be at least one full pitch deeper than the full thread depth, otherwise the tap bottoms out before the thread is complete.',
      metric
        ? 'Metric coarse and fine pitches both use the same 60&deg; ISO thread form, so the 0.6495 / 1.2268 / 1.0825 / 1.299 constants are identical.'
        : 'Unified threads use a 60&deg; form too, so the same constants work for UNC, UNF and UNEF.',
    ];

    const unit = state.unit;
    const depthMm = state.depth__mm ?? units.toCanonical(1, 'in', 'length');
    const rMm = state.rPlane__mm ?? units.toCanonical(0.1, 'in', 'length');
    const rpm = units.parseValue(state.spindle) || 0;
    const cycle = state.tapCycle;

    const program = gcode.emitDrillCycle({
      machine: state.machine,
      holes: [{ x: units.fromCanonical(state.x__mm || 0, unit, 'length'), y: units.fromCanonical(state.y__mm || 0, unit, 'length') }],
      zDepth: -units.fromCanonical(Math.abs(depthMm), unit, 'length'),
      rPlane: units.fromCanonical(Math.abs(rMm), unit, 'length'),
      feed: units.fromCanonical(rpm, unit, 'perMin'),
      unit,
      cycle,
      tool: Math.trunc(units.parseValue(state.tool)),
      toolOffset: Math.trunc(units.parseValue(state.toolOffset)),
      safeZ: units.fromCanonical(units.toCanonical(0.5, 'in', 'length'), unit, 'length'),
      spindleSpeed: rpm,
      holeLabel: `${metric ? 'METRIC TAP' : 'TAP'} ${desLabel} TAP DRILL ${units.fmt(units.fromCanonical(drillToUse, unit, 'length'), 4)}`.replace(/\s+/g, ' '),
    });

    return {
      results,
      notes,
      warnings,
      extra: [
        section('Nearest stock drills for the tap', dataTable(
          [
            { label: 'Size' },
            { label: 'Inch', numeric: true },
            { label: 'mm', numeric: true },
            { label: 'Match' },
          ],
          rows,
          { dense: true },
        )),
        codeBlock(program, 'TAP'),
        notice(`Tap feed must equal spindle rpm exactly. ${units.fmt(rpm, 0)} rpm means ${units.fmt(units.fromCanonical(rpm, unit, 'perMin'), 1)} ${units.unitLabel(unit, 'perMin')} of feed. If those do not match, the tap will gall or break.`, 'warn'),
        notice(`For a blind hole, drill the tap hole at least one full pitch deeper than the full thread depth, so the tap does not bottom out before the thread is complete.`, 'info'),
      ].join(''),
    };
  },
});
