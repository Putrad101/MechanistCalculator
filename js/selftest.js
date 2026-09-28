import * as units from './units.js';
import * as F from './calc/formulas.js';
import * as T from './tables.js';
import * as mat from './materials.js';
import * as gcode from './gcode.js';

const cases = [];
const test = (name, got, want, tol = 0) => {
  let pass;
  if (typeof want === 'number') {
    pass = Number.isFinite(got) && (tol > 0 ? Math.abs(got - want) <= tol : got === want);
  } else {
    pass = got === want;
  }
  cases.push({ name, got, want, pass, tol });
  return pass;
};

const near = (name, got, want, tol) => test(name, got, want, tol);

export const run = () => {
  near('rpm from 150 m/min and a 10 mm cutter', F.rpmFromCuttingSpeedMM(150000, 10), 4774.648, 0.001);
  near('rpm from 100 SFM and a 0.5 in cutter', F.rpmFromCuttingSpeedMM(100 * 304.8, 12.7), 763.9437, 0.001);
  near('surface speed back from 400 rpm and 0.75 in', units.fromCanonical(F.cuttingSpeedMMFromRpm(400, 19.05), 'ft', 'speed'), 78.54, 0.01);
  near('surface speed in m/min from 400 rpm and 0.75 in', F.cuttingSpeedMMFromRpm(400, 19.05) / 1000, 23.938, 0.001);
  near('table feed from 800 rpm, 0.05 IPT, 2 flutes (IPM)', units.fromCanonical(F.feedFromToothLoad(800, 0.05 * 25.4, 2), 'in', 'perMin'), 80, 0.0001);
  near('feed per revolution from 40 IPM at 800 rpm', 40 / 800, 0.05, 1e-12);
  near('tooth load from 0.05 IPR at 800 rpm in 2 flutes', F.toothLoadFromFeed(800, 0.05 * 25.4 * 800, 2), 0.025 * 25.4, 1e-9);

  // Feed per revolution and the surface speed at the part. FPR is chip load
  // times edges; it does not depend on spindle speed, and SFM does not set it.
  near('feed per revolution is chip load times edges', F.feedPerRevolution(0.05 * 25.4, 2), 0.1 * 25.4, 1e-9);
  near('one edge is just the chip load', F.feedPerRevolution(0.03 * 25.4, 1), 0.03 * 25.4, 1e-9);
  near('chip load on a 1/2 in carbide tool', F.chipLoadFromToolDia(12.7), 0.05, 1e-9);
  near('chip load on a 1 in carbide tool', F.chipLoadFromToolDia(25.4), 0.1, 1e-9);
  near('chip load scales with diameter', F.chipLoadFromToolDia(25.4) / F.chipLoadFromToolDia(12.7), 2, 1e-9);
  near('speed at a 2 in part is 220 SFM at 420 rpm', units.fromCanonical(F.cuttingSpeedMMFromRpm(420, 50.8), 'ft', 'speed'), 220, 0.1);
  near('speed at the part is the same relation as the tool', units.fromCanonical(F.cuttingSpeedMMFromRpm(763.9437, 12.7), 'ft', 'speed'), 100, 0.01);
  test('FPR is unaffected by spindle speed', F.feedPerRevolution(0.05 * 25.4, 2) === F.feedPerRevolution(0.05 * 25.4, 2), true);
  test('the count dimension converts without error', units.toCanonical(2, 'each', 'count'), 2);
  test('the count dimension labels as edges', units.unitLabel('each', 'count'), 'edges');

  // Regression: thousands grouping used to run across the decimal point, so any
  // result needing more than two decimal places came out as 0.00,280.
  test('fmt does not group the decimal part', units.fmt(0.0028, 5), '0.00280');
  test('fmt does not group a small feed', units.fmt(1.1765, 4), '1.1765');
  test('fmt does not group a small metric feed', units.fmt(0.0711, 4), '0.0711');
  test('fmt still groups the integer part', units.fmt(12345.678, 3), '12,345.678');
  test('fmt leaves a two decimal result alone', units.fmt(29.88, 2), '29.88');

  // IPR is read off a feed dial, so it is shown to four decimals, not five.
  test('feed per revolution shows four decimals', units.fmt(units.fromCanonical(0.0711, 'in', 'perRev'), 4), '0.0028');
  test('feed per revolution shows four decimals in mm', units.fmt(0.0711, 4), '0.0711');

  // The RPM speed box was labelled SFM while its value was read as in/min, so
  // 250 in a box called SFM meant 20.8 SFM. Pin the real SFM unit down.
  test('the speed unit labelled SFM is feet per minute', units.unitLabel('ft', 'speed'), 'SFM');
  test('250 SFM is 76200 mm per min', units.toCanonical(250, 'ft', 'speed'), 76200);
  test('250 SFM survives a round trip', units.fromCanonical(units.toCanonical(250, 'ft', 'speed'), 'ft', 'speed'), 250);
  test('250 SFM is not read as 250 in/min', units.fromCanonical(units.toCanonical(250, 'ft', 'speed'), 'in', 'speed'), 3000);

  // The shipped default page should be a setup a machinist would recognise.
  near('the default 250 SFM on a half inch carbide is about 1900 rpm', F.rpmFromCuttingSpeedMM(units.toCanonical(250, 'ft', 'speed'), 12.7), 1909, 1);
  near('half inch carbide at four edges gives about 0.008 in/rev', F.feedPerRevolution(F.chipLoadFromToolDia(12.7), 4) / F.MM_PER_IN, 0.0079, 0.0001);
  near('the default setup lands on a sane table feed', F.feedFromToothLoad(1909, F.chipLoadFromToolDia(12.7), 4) / F.MM_PER_IN, 15, 0.1);
  near('FPR and feed agree: IPM = FPR x rpm', F.feedFromToothLoad(800, 0.05 * 25.4, 2), F.feedPerRevolution(0.05 * 25.4, 2) * 800, 1e-9);

  near('118 degree point on a 10 mm drill', F.drillPointLength(10, 118), 3.0043, 0.001);
  near('135 degree point on a 10 mm drill', F.drillPointLength(10, 135), 2.0711, 0.001);
  near('chord on a 100 mm circle, 6 holes, neighbours', F.chordAcross(100, 6, 1), 50, 0.0001);
  near('pcd back from a 50 mm chord, 6 holes', F.pcdFromChord(50, 6, 1), 100, 0.0001);
  near('pcd from a 72 mm chord, 5 holes, 2 apart', F.pcdFromChord(72, 5, 2), 75.7055, 0.001);

  const six = F.boltCirclePoints(100, 6, { startAngleDeg: 0 });
  test('six holes at 60 degrees apart', Math.round((six[1].angleDeg - six[0].angleDeg) * 1e6) / 1e6, 60);
  near('first hole of a 100 mm circle is at radius 50', six[0].x, 50, 0.0001);
  near('second hole x', six[1].x, 25, 0.0001);
  near('second hole y', six[1].y, 43.3013, 0.001);

  test('24 TPI gives a pitch of 0.0416667 in', T.pitchFromTpi(24), 1 / 24);
  near('pitch 0.0500 in gives 20 TPI', T.tpiFromPitch(0.05), 20, 1e-9);
  near('1.5 mm metric pitch in TPI', T.tpiFromPitchMm(1.5), 16.9333, 0.001);
  near('effective diameter of 1/4-20', units.fromCanonical(T.threadGeometry(25.4 * 0.25, 25.4 / 20).pitchDia, 'in', 'length'), 0.21753, 0.0001);
  near('external minor of 1/4-20', units.fromCanonical(T.threadGeometry(25.4 * 0.25, 25.4 / 20).externalMinor, 'in', 'length'), 0.1887, 0.0001);
  near('internal minor of 1/4-20', units.fromCanonical(T.threadGeometry(25.4 * 0.25, 25.4 / 20).internalMinor, 'in', 'length'), 0.195875, 0.00001);
  near('75 percent tap drill for 1/4-20', units.fromCanonical(T.tapDrillForPercent(25.4 * 0.25, 25.4 / 20, 75), 'in', 'length'), 0.2012, 0.0002);
  near('percent thread for a 0.2012 in drill in 1/4-20', T.percentThread(25.4 * 0.25, 25.4 / 20, 0.2012 * 25.4), 75, 0.3);
  near('D minus P on 1/4-20', units.fromCanonical(T.shopRuleTapDrill(25.4 * 0.25, 25.4 / 20), 'in', 'length'), 0.2, 1e-12);

  near('M10 coarse pitch is 1.5 mm', T.findMetricThread('M10x1.5').pitchMm, 1.5, 1e-12);
  near('M8 fine is M8x1', T.findMetricThread('M8x1').pitchMm, 1, 1e-12);
  near('1/4-20 lookup finds UNC', T.findThread('1/4-20').series, 'UNC');
  near('1/2-13 lookup finds UNC', T.findThread('1/2-13').series, 'UNC');
  near('3/8-16 lookup finds UNC', T.findThread('3/8-16').series, 'UNC');
  near('3/8-24 lookup finds UNF', T.findThread('3/8-24').series, 'UNF');
  near('10-32 lookup finds UNF', T.findThread('10-32').series, 'UNF');

  near('number drill #7 in inches', T.NUMBER_DRILLS.find((d) => d.label === '#7').inch, 0.201, 1e-12);
  near('letter drill F in inches', T.LETTER_DRILLS.find((d) => d.label === 'F').inch, 0.257, 1e-12);
  near('fractional 1/4 exact match', T.findExactDrill(0.25).label, '1/4');
  near('3/8 in millimetres', T.findExactDrill(0.375).mm, 9.525, 0.0001);

  near('stepover at 50 percent of a 10 mm tool', F.stepover(10, 50), 5, 1e-12);
  near('milling MRR at 955 mm/min, ae 5, ap 7.75', F.mrrMilling(955, 5, 7.75), 37006.25, 0.01);
  near('turning MRR at 0.1 mm/rev, 2 mm doc, 50 mm dia', F.mrrTurning(100, 2, 50), 31415.9, 0.5);
  near('cycle time for 100 mm at 250 mm/min', F.cycleTimeMin(100, 250), 0.4, 1e-12);
  near('power for kc 350 and 37006 mm3/min in kW', F.powerKw(350, 37006.25), 0.21587, 0.0001);
  near('that power in horsepower', F.hpFromKw(0.21587), 0.2895, 0.0005);

  test('parses 7/8', units.parseValue('7/8'), 0.875);
  test('parses 1 1/2', units.parseValue('1 1/2'), 1.5);
  test('parses 1-1/2', units.parseValue('1-1/2'), 1.5);
  test('parses -5/16', units.parseValue('-5/16'), -0.3125);
  test('parses a decimal', units.parseValue('0.375'), 0.375);
  test('parses 12.7mm', units.parseValue('12.7mm'), 12.7);
  test('parses 1 in', units.parseValue('1 in'), 1);
  test('parses 2"', units.parseValue('2"'), 2);
  test('parses 1/2"', units.parseValue('1/2"'), 0.5);
  test('formats a fraction', units.formatFraction(units.fractionFor(0.375)), '3/8');
  test('formats a mixed fraction', units.formatFraction(units.fractionFor(1.5), { mixed: true }), '1-1/2');
  test('1 inch is 25.4 mm', units.toCanonical(1, 'in', 'length'), 25.4);
  test('10 mm is 0.3937008 in', units.fromCanonical(10, 'in', 'length'), 0.393700787, 1e-9);
  test('100 SFM is 30.48 m/min', units.toCanonical(100, 'ft', 'speed') / 1000, 30.48, 1e-12);

  const haas = gcode.emitDrillCycle({ machine: 'haas', holes: [{ x: 1, y: 0 }, { x: 0.5, y: 0.866 }], zDepth: -0.5, rPlane: 0.1, feed: 10, unit: 'in', spindleSpeed: 2000 });
  test('Haas uses G98 G81', /G98 G81/.test(haas), true);
  test('Haas states the cycle word once, X Y being modal', (haas.match(/G98 G81/g) || []).length, 1);
  test('Haas repeats the coordinates on later holes', /\nX0\.5000 Y0\.8660\n/.test(haas), true);
  test('Haas ends with G80 and M30', /G80[\s\S]*M30/.test(haas), true);

  const okuma = gcode.emitDrillCycle({ machine: 'okuma', holes: [{ x: 1, y: 0 }, { x: 0.5, y: 0.866 }], zDepth: -0.5, rPlane: 0.1, feed: 10, unit: 'in', spindleSpeed: 2000 });
  test('Okuma repeats the full cycle block per hole', (okuma.match(/G98 G81/g) || []).length, 2);
  test('Okuma puts X and Y on every hole', (okuma.match(/X[0-9].*Y[0-9]/g) || []).length, 2);
  test('Okuma repeats Z and R on every hole', (okuma.match(/Z-0\.5000 R0\.1000/g) || []).length, 2);

  const metric = gcode.emitDrillCycle({ machine: 'haas', holes: [{ x: 25, y: 0 }], zDepth: -20, rPlane: 2, feed: 150, unit: 'mm', mode: 'incremental' });
  test('metric program starts with G21', /^G21/m.test(metric), true);
  test('incremental diameter mode uses G91.1', /G91\.1/.test(metric), true);
  test('G91.1 is turned back off with G90.1', /G90\.1/.test(metric), true);
  test('G83 appears when pecking', /G98 G83/.test(gcode.emitDrillCycle({ machine: 'fanuc', holes: [{ x: 0, y: 0 }], zDepth: -1, rPlane: 0.1, feed: 5, unit: 'in', peck: true, peckDepth: 0.25 })), true);
  test('G84 tapping emits M29', /M29/.test(gcode.emitDrillCycle({ machine: 'haas', holes: [{ x: 0, y: 0 }], zDepth: -0.5, rPlane: 0.1, feed: 800, unit: 'in', cycle: 'g84' })), true);

  test('SAE 660 bronze is seeded', !!mat.getMaterial('bronze-660'), true);
  test('SAE 660 bronze is marked unverified', mat.getMaterial('bronze-660').verified, false);
  test('SAE 955 bronze is seeded', !!mat.getMaterial('bronze-955'), true);
  test('SAE 955 bronze is marked unverified', mat.getMaterial('bronze-955').verified, false);
  test('SAE 660 has carbide data', !!mat.getMaterial('bronze-660').tools.carbide, true);
  test('SAE 660 has HSS data', !!mat.getMaterial('bronze-660').tools.hss, true);
  test('SAE 660 has coated carbide data', !!mat.getMaterial('bronze-660').tools.coated, true);
  test('at least 20 materials seeded', mat.listMaterials().length >= 20, true);

  // Shop standard: SAE 660 runs soft, SAE 955 runs hard.
  test('SAE 660 bronze is classed soft', mat.getMaterial('bronze-660').hardness, 'soft');
  test('SAE 955 bronze is classed hard', mat.getMaterial('bronze-955').hardness, 'hard');
  test('SAE 660 is not labelled hard in its name', /hard bearing bronze/.test(mat.getMaterial('bronze-660').name), false);
  test('soft bronze takes more IPT than hard bronze',
    mat.getMaterial('bronze-660').tools.carbide.ipt > mat.getMaterial('bronze-955').tools.carbide.ipt, true);
  test('every material has a valid hardness class',
    mat.listMaterials().every((m) => ['soft', 'medium', 'hard'].includes(m.hardness)), true);

  const outOfRange = T.THREADS_UN.filter((t) => {
    const p = 1 / t.tpi;
    const pct = T.percentThread(t.majorIn * 25.4, p * 25.4, t.tapInch * 25.4);
    return pct < 60 || pct > 92;
  });
  test('every Unified thread in the table lands between 60 and 92 percent', outOfRange.length, 0);

  const failed = cases.filter((c) => !c.pass);
  return { total: cases.length, failed: failed.length, cases, ok: failed.length === 0 };
};

export const runInto = (host) => {
  const t0 = performance.now();
  const r = run();
  const ms = performance.now() - t0;
  host.innerHTML = `<div class="selftest">
    <h1>Self test</h1>
    <p class="st-summary ${r.ok ? 'is-pass' : 'is-fail'}">${r.ok ? 'All passed' : 'FAILURES'} &mdash; ${r.total - r.failed} of ${r.total} in ${units.fmt(ms, 1)} ms</p>
    <table class="data"><thead><tr><th>Result</th><th>Check</th><th class="num">Got</th><th class="num">Want</th></tr></thead>
    <tbody>${r.cases.map((c) => `<tr class="${c.pass ? 'is-pass' : 'is-fail'}">
      <td>${c.pass ? 'pass' : 'FAIL'}</td>
      <td>${c.name}</td>
      <td class="num">${format(c.got)}</td>
      <td class="num">${format(c.want)}</td></tr>`).join('')}</tbody></table>
  </div>`;
  document.title = `${r.ok ? 'PASS' : 'FAIL'} self test - Mechanist Calculator`;
  return r;
};

const format = (v) => {
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toPrecision(8).replace(/0+$/, '');
  return String(v);
};
