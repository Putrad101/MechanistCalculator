export const MACHINES = {
  haas: {
    id: 'haas',
    label: 'Haas',
    detail: 'VF series, Mini Mill, DM-1/2/30',
    modalXY: true,
    peckWord: 'Q',
    peckReturn: 'K',
    safety: ['G21 G17 G40 G49 G80 G90', 'G00 G53 G28 Z0.'],
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
    peckReturn: 'K',
    safety: ['G21 G17 G40 G49 G80 G90', 'G00 G28 Z0.'],
    zeroReturn: 'G00 G28 Z0.',
    incDiameter: true,
    supportsDiameterMode: true,
  },
  fanuc: {
    id: 'fanuc',
    label: 'Generic Fanuc',
    detail: 'Most Fanuc-based controls, incl. Tsubaki / King',
    modalXY: false,
    peckWord: 'Q',
    peckReturn: 'K',
    safety: ['G21 G17 G40 G49 G80 G90', 'G00 G28 Z0.'],
    zeroReturn: 'G00 G28 Z0.',
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

const num = (v, decimals) => {
  if (!Number.isFinite(v)) return '0';
  const s = v.toFixed(decimals);
  return s === '-0' || /^-0\.0*$/.test(s) ? s.slice(1) : s;
};

const unitWord = (unit) => (unit === 'in' ? 'G20' : 'G21');

const pad = (s) => String(s).padStart(3, ' ');

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
    holeLabel = 'BOLT CIRCLE',
  } = input;

  const machine = MACHINES[machineId] || MACHINES.haas;
  const dp = decimals ?? (unit === 'in' ? 4 : 3);
  const word = CYCLE_WORDS[String(cycle || (peck ? 'g83' : 'g81')).toLowerCase()] || 'G81';
  const isTap = word === 'G84' || word === 'G85';
  const out = [];
  const opts = { mode, zDepth, rPlane, feed, decimals: dp, peck: peck && word === 'G83', peckDepth, peckReturn };

  if (includeHeader) out.push(`(${holeLabel})`);

  if (includeSafety) {
    out.push(unitWord(unit));
    for (const line of machine.safety) {
      out.push(line.replace(/G21/, unit === 'in' ? 'G20' : 'G21'));
    }
  }

  if (includeHeader) {
    if (tool) out.push(`T${pad(tool)} M06`);
    if (spindleSpeed) out.push(`S${Math.round(spindleSpeed)} M03`);
    if (toolOffset) out.push(`G43 H${pad(toolOffset)} Z${num(safeZ, dp)}`);
    else out.push(`G00 Z${num(safeZ, dp)}`);
    if (word === 'G84') out.push('M29');
    out.push('');
  }

  if (mode === 'incremental') {
    if (machine.incDiameter) {
      out.push('G91.1');
      let prevX = 0;
      let prevY = 0;
      const first = { x: holes[0] ? absX(holes[0], 'diameter') - prevX : 0, y: holes[0] ? holes[0].y - prevY : 0 };
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
      out.push(`G91.1  (${machine.label} may not support G91.1 - verify)`);
      out.push('G90');
    }
  } else {
    const g = `G98 ${word}`;
    if (machine.modalXY) {
      holes.forEach((h, i) => {
        const xy = `X${num(absX(h, mode), dp)} Y${num(h.y, dp)}`;
        if (i === 0) {
          out.push(`${g} ${xy} ${cycleBlock({ ...opts, mode }, null, machine)}`);
        } else {
          out.push(xy);
        }
      });
    } else {
      for (const h of holes) {
        out.push(`${g} ${cycleBlock({ ...opts, mode }, { x: absX(h, mode), y: h.y }, machine)}`);
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

export const emitSpotCycle = (input) => emitDrillCycle({
  ...input,
  holeLabel: input.holeLabel || 'SPOT / CENTER DRILL',
});

export const emitRtapCycle = (input) => emitDrillCycle({
  ...input,
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
    w.push(`${machine.label}: G91.1 may not be supported. Use radius programming instead.`);
  }
  return w;
};

export const formatGcodeTable = (holes, decimals = 4) => holes
  .map((h, i) => `X${num(h.x, decimals).padStart(9, ' ')} Y${num(h.y, decimals).padStart(9, ' ')}   ; hole ${i + 1}`)
  .join('\n');
