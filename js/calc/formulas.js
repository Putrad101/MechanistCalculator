export const PI = Math.PI;
export const MM_PER_IN = 25.4;
export const SFM_TO_MMIN = 0.3048;
export const MMIN_TO_SFM = 3.280839895;
export const IPM_TO_MMPERMIN = 25.4;
export const IN_TO_MM = 25.4;

const valid = (...nums) => nums.every((n) => Number.isFinite(n));

export const rpmFromCuttingSpeed = (vcMMin, diaMm) => {
  if (!valid(vcMMin, diaMm) || diaMm <= 0) return NaN;
  return (1000 * vcMMin) / (PI * diaMm);
};

export const cuttingSpeedFromRpm = (rpm, diaMm) => {
  if (!valid(rpm, diaMm) || diaMm <= 0) return NaN;
  return (PI * diaMm * rpm) / 1000;
};

export const rpmFromCuttingSpeedMM = (vcMmPerMin, diaMm) => {
  if (!valid(vcMmPerMin, diaMm) || diaMm <= 0) return NaN;
  return vcMmPerMin / (PI * diaMm);
};

export const cuttingSpeedMMFromRpm = (rpm, diaMm) => {
  if (!valid(rpm, diaMm) || diaMm <= 0) return NaN;
  return PI * diaMm * rpm;
};

export const feedFromToothLoad = (rpm, fzMm, flutes) => {
  if (!valid(rpm, fzMm, flutes) || flutes <= 0) return NaN;
  return rpm * fzMm * flutes;
};

export const toothLoadFromFeed = (rpm, feedMmPerMin, flutes) => {
  if (!valid(rpm, feedMmPerMin, flutes) || rpm <= 0 || flutes <= 0) return NaN;
  return feedMmPerMin / (rpm * flutes);
};

export const toothLoadFromRpmFeed = toothLoadFromFeed;

export const stepover = (diaMm, pct) => {
  if (!valid(diaMm, pct)) return NaN;
  return (diaMm * pct) / 100;
};

export const fullSlotStepover = (diaMm) => diaMm;

export const mrrMilling = (feedMmPerMin, radialDepthMm, axialDepthMm) => {
  if (!valid(feedMmPerMin, radialDepthMm, axialDepthMm)) return NaN;
  return feedMmPerMin * radialDepthMm * axialDepthMm;
};

export const mrrTurning = (feedMmPerMin, docMm, diaMm) => {
  if (!valid(feedMmPerMin, docMm, diaMm) || diaMm <= 0) return NaN;
  return feedMmPerMin * docMm * PI * diaMm;
};

export const mrrDrilling = (feedMmPerMin, areaMm2) => {
  if (!valid(feedMmPerMin, areaMm2)) return NaN;
  return feedMmPerMin * areaMm2;
};

export const cuttingAreaFacing = (diaMm, radialDepthMm) => {
  if (!valid(diaMm, radialDepthMm)) return NaN;
  const r = diaMm / 2;
  if (radialDepthMm >= r) return PI * r * r;
  const a = 2 * Math.acos((r - radialDepthMm) / r);
  return (r * r * (a - Math.sin(a))) / 2;
};

export const cycleTimeMin = (lengthMm, feedMmPerMin) => {
  if (!valid(lengthMm, feedMmPerMin) || feedMmPerMin <= 0) return NaN;
  return lengthMm / feedMmPerMin;
};

export const powerKw = (kc, mrrMm3PerMin) => {
  if (!valid(kc, mrrMm3PerMin)) return NaN;
  return (kc * mrrMm3PerMin) / 6e7;
};

export const hpFromKw = (kw) => kw * 1.34102209;

export const drillPointLength = (diaMm, includedAngleDeg) => {
  if (!valid(diaMm, includedAngleDeg) || diaMm <= 0) return NaN;
  if (includedAngleDeg <= 0 || includedAngleDeg >= 180) return NaN;
  return (diaMm / 2) / Math.tan((includedAngleDeg / 2) * (PI / 180));
};

export const fullDepth = (finishedDepthMm, pointLengthMm) => finishedDepthMm + pointLengthMm;

export const holeCountByPitch = (lengthMm, pitchMm) => {
  if (!valid(lengthMm, pitchMm) || pitchMm <= 0) return NaN;
  return Math.floor(lengthMm / pitchMm) + 1;
};

export const boltCirclePoints = (pcdMm, holes, opts = {}) => {
  if (!valid(pcdMm, holes) || pcdMm <= 0 || holes < 1) return [];
  const r = pcdMm / 2;
  const start = Number.isFinite(opts.startAngleDeg) ? opts.startAngleDeg : 0;
  const dir = opts.direction === 'cw' ? -1 : 1;
  const out = [];
  for (let i = 0; i < Math.trunc(holes); i++) {
    const a = ((start + dir * i * (360 / holes)) * PI) / 180;
    out.push({ i: i + 1, x: r * Math.cos(a), y: r * Math.sin(a), angleDeg: (start + dir * i * (360 / holes) + 360) % 360 });
  }
  return out;
};

export const chordAcross = (pcdMm, holes, apart) => {
  if (!valid(pcdMm, holes, apart) || pcdMm <= 0 || holes < 1) return NaN;
  const half = (PI * apart) / holes;
  return pcdMm * Math.sin(half);
};

export const pcdFromChord = (chordMm, holes, apart) => {
  if (!valid(chordMm, holes, apart) || chordMm <= 0 || holes < 1 || apart < 1) return NaN;
  const half = (PI * apart) / holes;
  const s = Math.sin(half);
  if (Math.abs(s) < 1e-9) return NaN;
  return chordMm / s;
};

export const arcLength = (pcdMm, holes) => {
  if (!valid(pcdMm, holes) || holes < 1) return NaN;
  return pcdMm * PI * (holes - 1);
};

export const stepDistance = (from, to) => Math.hypot(to.x - from.x, to.y - from.y);

export const rightTriangle = (a, b) => (valid(a, b) ? Math.hypot(a, b) : NaN);
