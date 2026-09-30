// All three controls take the same opening block. This used to live per machine
// and drift: only Haas had G53 on the Z return, so the Okuma and Fanuc profiles
// emitted a plain G28 Z0., which is a two stage move that can rapid into the
// part. One shared constant so the profiles cannot diverge again.
const SAFETY = ['G21 G17 G40 G49 G80 G90', 'G00 G53 G28 Z0.'];

export const MACHINES = {
  haas: {
    id: 'haas',
    label: 'Haas',
    detail: 'VF series, Mini Mill, DM-1/2/30',
    modalXY: true,
    peckWord: 'Q',
    // K is a Haas extension to G83, not standard Fanuc syntax, so only Haas
    // gets it. The others must not emit it.
    peckReturn: 'K',
    safety: SAFETY,
    zeroReturn: 'G00 G53 G28 Z0.',
    incDiameter: true,
    supportsDiameterMode: true,
  },
  okuma: {
    id: 'okuma',
    label: 'Okuma',
    detail: 'GENOS, LB, MB, OSP-P',
    modalXY: false,
    peckWord: 'Q',
    peckReturn: null,
    safety: SAFETY,
    zeroReturn: 'G00 G53 G28 Z0.',
    incDiameter: true,
    supportsDiameterMode: true,
  },
  fanuc: {
    id: 'fanuc',
    label: 'Generic Fanuc',
    detail: 'Most Fanuc-based controls, incl. Tsubaki / King',
    modalXY: false,
    peckWord: 'Q',
    peckReturn: null,
    safety: SAFETY,
    zeroReturn: 'G00 G53 G28 Z0.',
    incDiameter: false,
    supportsDiameterMode: false,
  },
};

export const MACHINE_LIST = Object.values(MACHINES);

export const PROGRAM_MODES = [
  { id: 'radius', label: 'Radius programming', hint: 'X equals the hole centre radius. Simplest and safest.' },
  { id: 'diameter', label: 'Diameter programming', hint: 'X is doubled. Only valid if the control is in diameter mode.' },
  { id: 'incremental', label: 'Incremental diameter (G91.1)', hint: 'Step deltas between holes. Cleanest bolt circle in diameter mode.' },
];

export const WORK_OFFSETS = ['G54', 'G55', 'G56', 'G57', 'G58', 'G59'];
export const FEED_MODES = [
  { id: 'G94', label: 'G94 feed per minute', hint: 'F is inches or mm per minute. A Haas mill powers up in this mode.' },
  { id: 'G99', label: 'G99 feed per revolution', hint: 'F is the lead of the thread, so a 20 TPI tap is F0.05. This is the lathe convention.' },
];

// Every one of these is required to be present and sane. They used to be fed
// through num(), which turned a non-finite value into a silent '0' and produced
// a program with F0.0000 or Z0. in it. Callers check this first and show the
// message instead of emitting a program.
//
// Depth and R plane are passed already converted to the program unit, with
// depth as a negative Z. Spindle speed is optional, because a program can be
// drilled without commanding a speed, but if one is given it must be sane.
export const gcodeIssues = (input = {}) => {
  const { zDepth, rPlane, feed, spindleSpeed, holes = [] } = input;
  const out = [];
  if (!Number.isFinite(zDepth)) out.push('Depth is missing or not a number');
  else if (zDepth >= 0) out.push('Depth must be greater than zero');
  if (!Number.isFinite(rPlane)) out.push('R plane is missing or not a number');
  else if (rPlane <= 0) out.push('R plane must be greater than zero');
  else if (Number.isFinite(zDepth) && rPlane <= zDepth) out.push('R plane must be above the bottom of the hole');
  if (!Number.isFinite(feed)) out.push('Feed is missing or not a number');
  else if (feed <= 0) out.push('Feed must be greater than zero');
  if (spindleSpeed != null && (!Number.isFinite(spindleSpeed) || spindleSpeed <= 0)) {
    out.push('Spindle speed must be greater than zero');
  }
  if (!Array.isArray(holes) || holes.length === 0) out.push('There are no holes to drill');
  return out;
};

const num = (v, decimals) => {
  // Belt and braces. gcodeIssues should have rejected this already, so reaching
  // here means a caller bypassed the check and we would otherwise write a 0.
  if (!Number.isFinite(v)) throw new Error('gcode: refusing to emit a non-finite number');
  const s = v.toFixed(decimals);
  return s === '-0' || /^-0\.0*$/.test(s) ? s.slice(1) : s;
};

const unitWord = (unit) => (unit === 'in' ? 'G20' : 'G21');

// Tool and offset words must not contain a space: T  1 M06 is a syntax error.
// Zero pad instead.
const pad = (s) => String(s).padStart(2, '0');

const cycleBlock = (opts, hole, machine) => {
  const { mode, zDepth, rPlane, feed, decimals, peck, peckDepth, peckReturn } = opts;
  const parts = [];
  if (hole) parts.push(`X${num(hole.x, decimals)} Y${num(hole.y, decimals)}`);
  parts.push(`Z${num(zDepth, decimals)}`, `R${num(rPlane, decimals)}`, `F${num(feed, decimals)}`);
  if (peck) {
    parts.push(`Q${num(peckDepth, decimals)}`);
    if (peckReturn != null) parts.push(`${machine.peckReturn}${num(peckReturn, decimals)}`);
  }
  return parts.join(' ');
};

const absX = (hole, mode) => (mode === 'diameter' ? hole.x * 2 : hole.x);

const CYCLE_WORDS = { g81: 'G81', g83: 'G83', g84: 'G84', g85: 'G85', spot: 'G81' };

export const emitDrillCycle = (input) => {
  const {
    machine: machineId = 'haas',
    holes = [],
    zDepth,
    rPlane,
    feed,
    unit = 'in',
    mode = 'radius',
    peck = false,
    cycle,
    tool = 1,
    toolOffset = 1,
    safeZ = 1,
    peckDepth,
    peckReturn = null,
    decimals,
    includeHeader = true,
    includeFooter = true,
    includeSafety = true,
    spindleSpeed = null,
    workOffset = 'G54',
    feedMode = 'G94',
    holeLabel = 'BOLT CIRCLE',
  } = input;

  const issues = gcodeIssues(input);
  if (issues.length) throw new Error(issues.join('. '));

  // Rigid tapping carries the rpm in the M29 word, so a blank spindle is not an
  // optional field on this cycle. M29 S0 would arm the tap at a standstill.
  if (input.cycle && String(input.cycle).toLowerCase() === 'g84'
      && !(Number.isFinite(input.spindleSpeed) && input.spindleSpeed > 0)) {
    throw new Error('A spindle speed is required for G84, because the rpm is carried in the M29 word. Enter the tap rpm or use G85.');
  }

  const machine = MACHINES[machineId] || MACHINES.haas;
  const dp = decimals ?? (unit === 'in' ? 4 : 3);
  const word = CYCLE_WORDS[String(cycle || (peck ? 'g83' : 'g81')).toLowerCase()] || 'G81';
  const rigid = word === 'G84';
  const out = [];
  const opts = { mode, zDepth, rPlane, feed, decimals: dp, peck: peck && word === 'G83', peckDepth, peckReturn };

  if (includeHeader) out.push(`(${holeLabel})`);

  if (includeSafety) {
    out.push(unitWord(unit));
    for (const line of machine.safety) {
      out.push(line.replace(/G21/, unit === 'in' ? 'G20' : 'G21'));
    }
    // The work offset and the feed mode are modal and were never asserted, so
    // the program ran on whatever the control happened to be sitting in. Both
    // are modal groups of their own, so they can share a block.
    out.push(`${WORK_OFFSETS.includes(workOffset) ? workOffset : 'G54'} ${FEED_MODES.some((f) => f.id === feedMode) ? feedMode : 'G94'}`);
  }

  if (includeHeader) {
    if (tool) out.push(`T${pad(tool)} M06`);
    if (spindleSpeed) out.push(`S${Math.round(spindleSpeed)} M03`);
    if (toolOffset) out.push(`G43 H${pad(toolOffset)} Z${num(safeZ, dp)}`);
    else out.push(`G00 Z${num(safeZ, dp)}`);
    out.push('');
  }

  // Fanuc rigid tapping is armed by M29 S____ in the block immediately before
  // G84. A bare M29 parked in the header, with the S three blocks earlier and a
  // blank line between, is not the documented form.
  const armRigidTap = () => {
    if (rigid && includeHeader) out.push(`M29 S${Math.round(spindleSpeed)}`);
  };

  // G91.1 is not universal. The generic Fanuc profile sets incDiameter false,
  // and that branch used to emit G91.1 and G90 and then nothing at all, so the
  // operator got a valid program that drilled no holes. Fall back to the
  // absolute radius emitter instead.
  const effectiveMode = (mode === 'incremental' && !machine.incDiameter) ? 'radius' : mode;

  if (effectiveMode === 'incremental') {
    out.push('G91.1');
    let prevX = 0;
    let prevY = 0;
    const first = { x: holes[0] ? absX(holes[0], 'diameter') - prevX : 0, y: holes[0] ? holes[0].y - prevY : 0 };
    armRigidTap();
    out.push(`G98 ${word} ${cycleBlock(opts, first, machine)}`);
    holes.forEach((h, i) => {
      if (i === 0) { prevX = absX(h, 'diameter'); prevY = h.y; return; }
      const dx = absX(h, 'diameter') - prevX;
      const dy = h.y - prevY;
      out.push(`X${num(dx, dp)} Y${num(dy, dp)}`);
      prevX = absX(h, 'diameter');
      prevY = h.y;
    });
    out.push('G90.1');
  } else {
    const g = `G98 ${word}`;
    armRigidTap();
    if (machine.modalXY) {
      holes.forEach((h, i) => {
        const xy = `X${num(absX(h, effectiveMode), dp)} Y${num(h.y, dp)}`;
        if (i === 0) {
          out.push(`${g} ${xy} ${cycleBlock({ ...opts, mode: effectiveMode }, null, machine)}`);
        } else {
          out.push(xy);
        }
      });
    } else {
      for (const h of holes) {
        out.push(`${g} ${cycleBlock({ ...opts, mode: effectiveMode }, { x: absX(h, effectiveMode), y: h.y }, machine)}`);
      }
    }
  }

  out.push('G80');

  if (includeFooter) {
    out.push('');
    out.push(machine.zeroReturn);
    if (spindleSpeed) out.push('M05');
    out.push('M30');
    out.push('%');
  }

  return out.join('\n');
};

// A spot pass is a plain G81 at a shallow depth. These used to pass the caller's
// peck flag straight through, and because the cycle word defaults to g83 when
// peck is set, emitSpotCycle({ peck: true }) would have deep pecked with a centre
// drill. Pin the cycle and clear the flag.
export const emitSpotCycle = (input) => emitDrillCycle({
  ...input,
  peck: false,
  cycle: 'spot',
  holeLabel: input.holeLabel || 'SPOT / CENTER DRILL',
});

export const emitRtapCycle = (input) => emitDrillCycle({
  ...input,
  peck: false,
  cycle: 'g84',
  holeLabel: input.holeLabel || 'RIGID TAPPING',
});

export const gcodeWarnings = (machineId, mode) => {
  const machine = MACHINES[machineId] || MACHINES.haas;
  const w = [
    'Review before running. This is a starting block, not a finished program.',
    'Coordinates are hole CENTRES. Confirm your tool actual cutting diameter in the tool data.',
  ];
  if (machine.modalXY) {
    w.push(`${machine.label}: X/Y are modal in the canned cycle, so they appear only once. `
      + 'Keep the first block in the same position as the pattern, or add X/Y to every block.');
  }
  if (mode === 'diameter' && !machine.supportsDiameterMode) {
    w.push(`${machine.label}: diameter programming may not be available. Verify before use.`);
  }
  if (mode === 'incremental' && !machine.incDiameter) {
    w.push(`${machine.label}: G91.1 may not be supported, so the program has been written in radius mode instead. Check the X and Y values.`);
  }
  return w;
};

export const formatGcodeTable = (holes, decimals = 4) => holes
  .map((h, i) => `X${num(h.x, decimals).padStart(9, ' ')} Y${num(h.y, decimals).padStart(9, ' ')}   ; hole ${i + 1}`)
  .join('\n');
