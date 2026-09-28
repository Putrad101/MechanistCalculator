export const THREAD_CONST = Object.freeze({
  effective: 0.6495,
  externalMinor: 1.2268,
  internalMinor: 1.0825,
  percent: 1.299,
  rollTapFactor: 0.5,
});

export const threadGeometry = (major, pitch) => {
  const k = THREAD_CONST;
  const pitchDia = major - k.effective * pitch;
  const externalMinor = major - k.externalMinor * pitch;
  const internalMinor = major - k.internalMinor * pitch;
  return {
    pitch,
    pitchDia,
    externalMinor,
    internalMinor,
    maxThread: k.percent * pitch,
  };
};

export const percentThread = (major, pitch, drill) => {
  const span = THREAD_CONST.percent * pitch;
  if (!Number.isFinite(major) || !Number.isFinite(pitch) || pitch <= 0) return NaN;
  return (100 * (major - drill)) / span;
};

export const tapDrillForPercent = (major, pitch, percent) =>
  major - THREAD_CONST.percent * pitch * (percent / 100);

export const shopRuleTapDrill = (major, pitch) => major - pitch;

export const rollTapDrill = (major, pitch) => major - pitch * THREAD_CONST.rollTapFactor;

export const pitchFromTpi = (tpi) => (Number.isFinite(tpi) && tpi > 0 ? 1 / tpi : NaN);

export const tpiFromPitch = (pitch) => (Number.isFinite(pitch) && pitch > 0 ? 1 / pitch : NaN);

export const tpiFromPitchMm = (pitchMm) => (Number.isFinite(pitchMm) && pitchMm > 0 ? 25.4 / pitchMm : NaN);

export const pitchMmFromTpi = (tpi) => (Number.isFinite(tpi) && tpi > 0 ? 25.4 / tpi : NaN);

export const THREADS_UN = [
  { des: "#0-80", series: 'UNF', tpi: 80, majorIn: 0.06, tapInch: 0.0469 },
  { des: "#1-64", series: 'UNC', tpi: 64, majorIn: 0.073, tapInch: 0.0595 },
  { des: "#1-72", series: 'UNF', tpi: 72, majorIn: 0.073, tapInch: 0.0595 },
  { des: "#2-56", series: 'UNC', tpi: 56, majorIn: 0.086, tapInch: 0.07 },
  { des: "#2-64", series: 'UNF', tpi: 64, majorIn: 0.086, tapInch: 0.07 },
  { des: "#3-48", series: 'UNC', tpi: 48, majorIn: 0.099, tapInch: 0.0785 },
  { des: "#3-56", series: 'UNF', tpi: 56, majorIn: 0.099, tapInch: 0.082 },
  { des: "#4-40", series: 'UNC', tpi: 40, majorIn: 0.112, tapInch: 0.089 },
  { des: "#4-48", series: 'UNF', tpi: 48, majorIn: 0.112, tapInch: 0.0935 },
  { des: "#5-40", series: 'UNC', tpi: 40, majorIn: 0.125, tapInch: 0.1015 },
  { des: "#5-44", series: 'UNF', tpi: 44, majorIn: 0.125, tapInch: 0.104 },
  { des: "#6-32", series: 'UNC', tpi: 32, majorIn: 0.136, tapInch: 0.1065 },
  { des: "6-40", series: 'UNF', tpi: 40, majorIn: 0.136, tapInch: 0.113 },
  { des: "#8-32", series: 'UNC', tpi: 32, majorIn: 0.164, tapInch: 0.136 },
  { des: "#8-36", series: 'UNF', tpi: 36, majorIn: 0.164, tapInch: 0.136 },
  { des: "#10-24", series: 'UNC', tpi: 24, majorIn: 0.19, tapInch: 0.1495 },
  { des: "#10-32", series: 'UNF', tpi: 32, majorIn: 0.19, tapInch: 0.159 },
  { des: "#12-24", series: 'UNC', tpi: 24, majorIn: 0.216, tapInch: 0.177 },
  { des: "#12-28", series: 'UNEF', tpi: 28, majorIn: 0.216, tapInch: 0.182 },
  { des: "1/4-20", series: 'UNC', tpi: 20, majorIn: 0.25, tapInch: 0.201 },
  { des: "1/4-28", series: 'UNF', tpi: 28, majorIn: 0.25, tapInch: 0.213 },
  { des: "5/16-18", series: 'UNC', tpi: 18, majorIn: 0.3125, tapInch: 0.257 },
  { des: "5/16-24", series: 'UNF', tpi: 24, majorIn: 0.3125, tapInch: 0.272 },
  { des: "3/8-16", series: 'UNC', tpi: 16, majorIn: 0.375, tapInch: 0.3125 },
  { des: "3/8-24", series: 'UNF', tpi: 24, majorIn: 0.375, tapInch: 0.332 },
  { des: "7/16-14", series: 'UNC', tpi: 14, majorIn: 0.4375, tapInch: 0.368 },
  { des: "7/16-20", series: 'UNF', tpi: 20, majorIn: 0.4375, tapInch: 0.3906 },
  { des: "1/2-13", series: 'UNC', tpi: 13, majorIn: 0.5, tapInch: 0.4219 },
  { des: "1/2-20", series: 'UNF', tpi: 20, majorIn: 0.5, tapInch: 0.4531 },
  { des: "9/16-12", series: 'UNC', tpi: 12, majorIn: 0.5625, tapInch: 0.4844 },
  { des: "9/16-18", series: 'UNF', tpi: 18, majorIn: 0.5625, tapInch: 0.5156 },
  { des: "5/8-11", series: 'UNC', tpi: 11, majorIn: 0.625, tapInch: 0.5312 },
  { des: "5/8-18", series: 'UNF', tpi: 18, majorIn: 0.625, tapInch: 0.5781 },
  { des: "3/4-10", series: 'UNC', tpi: 10, majorIn: 0.75, tapInch: 0.6562 },
  { des: "3/4-16", series: 'UNF', tpi: 16, majorIn: 0.75, tapInch: 0.6875 },
  { des: "7/8-9", series: 'UNC', tpi: 9, majorIn: 0.875, tapInch: 0.7656 },
  { des: "7/8-14", series: 'UNF', tpi: 14, majorIn: 0.875, tapInch: 0.8125 },
  { des: "1-8", series: 'UNC', tpi: 8, majorIn: 1, tapInch: 0.875 },
  { des: "1-12", series: 'UNF', tpi: 12, majorIn: 1, tapInch: 0.9219 },
  { des: "1 1/8-7", series: 'UNC', tpi: 7, majorIn: 1.125, tapInch: 0.9844 },
  { des: "1 1/8-12", series: 'UNF', tpi: 12, majorIn: 1.125, tapInch: 1.0469 },
  { des: "1 1/4-7", series: 'UNC', tpi: 7, majorIn: 1.25, tapInch: 1.1094 },
  { des: "1 1/4-12", series: 'UNF', tpi: 12, majorIn: 1.25, tapInch: 1.1719 },
  { des: "1 3/8-6", series: 'UNC', tpi: 6, majorIn: 1.375, tapInch: 1.2031 },
  { des: "1 1/2-6", series: 'UNC', tpi: 6, majorIn: 1.5, tapInch: 1.3438 },
  { des: "1 3/4-5", series: 'UNC', tpi: 5, majorIn: 1.75, tapInch: 1.5469 },
  { des: "2-4 1/2", series: 'UNC', tpi: 4.5, majorIn: 2, tapInch: 1.7812 },
  { des: "7/16-16", series: 'UNEF', tpi: 16, majorIn: 0.4375, tapInch: 0.377 },
  { des: "1/4-32", series: 'UNEF', tpi: 32, majorIn: 0.25, tapInch: 0.2188 },
  { des: "5/16-32", series: 'UNEF', tpi: 32, majorIn: 0.3125, tapInch: 0.2812 },
  { des: "3/8-32", series: 'UNEF', tpi: 32, majorIn: 0.375, tapInch: 0.3438 },
  { des: "7/16-28", series: 'UNEF', tpi: 28, majorIn: 0.4375, tapInch: 0.404 },
  { des: "1/2-28", series: 'UNEF', tpi: 28, majorIn: 0.5, tapInch: 0.4688 },
  { des: "9/16-24", series: 'UNEF', tpi: 24, majorIn: 0.5625, tapInch: 0.5156 },
  { des: "5/8-24", series: 'UNEF', tpi: 24, majorIn: 0.625, tapInch: 0.5781 },
  { des: "3/4-20", series: 'UNEF', tpi: 20, majorIn: 0.75, tapInch: 0.7031 },
  { des: "7/8-18", series: 'UNEF', tpi: 18, majorIn: 0.875, tapInch: 0.8281 },
  { des: "1-16", series: 'UNEF', tpi: 16, majorIn: 1, tapInch: 0.9375 },
  { des: "1 1/8-16", series: 'UNEF', tpi: 16, majorIn: 1.125, tapInch: 1.0625 },
  { des: "1 1/4-16", series: 'UNEF', tpi: 16, majorIn: 1.25, tapInch: 1.1875 },
  { des: "1 3/8-16", series: 'UNEF', tpi: 16, majorIn: 1.375, tapInch: 1.3125 },
  { des: "1 1/2-16", series: 'UNEF', tpi: 16, majorIn: 1.5, tapInch: 1.4375 },
];

export const THREADS_METRIC_COARSE = [
  { des: 'M1x0.25', majorMm: 1, pitchMm: 0.25, tapMm: 0.8, rollTapMm: 0.88 },
  { des: 'M1.2x0.25', majorMm: 1.2, pitchMm: 0.25, tapMm: 1.0, rollTapMm: 1.08 },
  { des: 'M1.4x0.3', majorMm: 1.4, pitchMm: 0.3, tapMm: 1.1, rollTapMm: 1.25 },
  { des: 'M1.6x0.35', majorMm: 1.6, pitchMm: 0.35, tapMm: 1.3, rollTapMm: 1.42 },
  { des: 'M2x0.4', majorMm: 2, pitchMm: 0.4, tapMm: 1.6, rollTapMm: 1.8 },
  { des: 'M2.5x0.45', majorMm: 2.5, pitchMm: 0.45, tapMm: 2.1, rollTapMm: 2.28 },
  { des: 'M3x0.5', majorMm: 3, pitchMm: 0.5, tapMm: 2.5, rollTapMm: 2.75 },
  { des: 'M3.5x0.6', majorMm: 3.5, pitchMm: 0.6, tapMm: 2.9, rollTapMm: 3.2 },
  { des: 'M4x0.7', majorMm: 4, pitchMm: 0.7, tapMm: 3.3, rollTapMm: 3.65 },
  { des: 'M5x0.8', majorMm: 5, pitchMm: 0.8, tapMm: 4.2, rollTapMm: 4.6 },
  { des: 'M6x1', majorMm: 6, pitchMm: 1, tapMm: 5.0, rollTapMm: 5.5 },
  { des: 'M7x1', majorMm: 7, pitchMm: 1, tapMm: 6.0, rollTapMm: 6.5 },
  { des: 'M8x1.25', majorMm: 8, pitchMm: 1.25, tapMm: 6.8, rollTapMm: 7.38 },
  { des: 'M9x1.25', majorMm: 9, pitchMm: 1.25, tapMm: 7.8, rollTapMm: 8.38 },
  { des: 'M10x1.5', majorMm: 10, pitchMm: 1.5, tapMm: 8.5, rollTapMm: 9.25 },
  { des: 'M11x1.5', majorMm: 11, pitchMm: 1.5, tapMm: 9.5, rollTapMm: 10.25 },
  { des: 'M12x1.75', majorMm: 12, pitchMm: 1.75, tapMm: 10.3, rollTapMm: 11.12 },
  { des: 'M14x2', majorMm: 14, pitchMm: 2, tapMm: 12.1, rollTapMm: 13.0 },
  { des: 'M16x2', majorMm: 16, pitchMm: 2, tapMm: 14.1, rollTapMm: 15.0 },
  { des: 'M18x2.5', majorMm: 18, pitchMm: 2.5, tapMm: 15.6, rollTapMm: 16.75 },
  { des: 'M20x2.5', majorMm: 20, pitchMm: 2.5, tapMm: 17.6, rollTapMm: 18.75 },
  { des: 'M22x2.5', majorMm: 22, pitchMm: 2.5, tapMm: 19.6, rollTapMm: 20.75 },
  { des: 'M24x3', majorMm: 24, pitchMm: 3, tapMm: 21.1, rollTapMm: 22.5 },
  { des: 'M27x3', majorMm: 27, pitchMm: 3, tapMm: 24.1, rollTapMm: 25.5 },
  { des: 'M30x3.5', majorMm: 30, pitchMm: 3.5, tapMm: 26.6, rollTapMm: 28.25 },
  { des: 'M33x3.5', majorMm: 33, pitchMm: 3.5, tapMm: 29.6, rollTapMm: 31.25 },
  { des: 'M36x4', majorMm: 36, pitchMm: 4, tapMm: 32.1, rollTapMm: 34.0 },
  { des: 'M39x4', majorMm: 39, pitchMm: 4, tapMm: 35.1, rollTapMm: 37.0 },
  { des: 'M42x4.5', majorMm: 42, pitchMm: 4.5, tapMm: 37.6, rollTapMm: 39.75 },
  { des: 'M45x4.5', majorMm: 45, pitchMm: 4.5, tapMm: 40.6, rollTapMm: 42.75 },
  { des: 'M48x5', majorMm: 48, pitchMm: 5, tapMm: 43.1, rollTapMm: 45.5 },
  { des: 'M52x5', majorMm: 52, pitchMm: 5, tapMm: 47.1, rollTapMm: 49.5 },
  { des: 'M56x5.5', majorMm: 56, pitchMm: 5.5, tapMm: 50.6, rollTapMm: 53.25 },
  { des: 'M60x5.5', majorMm: 60, pitchMm: 5.5, tapMm: 54.6, rollTapMm: 57.25 },
  { des: 'M64x6', majorMm: 64, pitchMm: 6, tapMm: 58.2, rollTapMm: 61.0 },
];

export const THREADS_METRIC_FINE = [
  { des: 'M8x1', majorMm: 8, pitchMm: 1, tapMm: 7.0, rollTapMm: 7.5 },
  { des: 'M10x1', majorMm: 10, pitchMm: 1, tapMm: 9.0, rollTapMm: 9.5 },
  { des: 'M10x1.25', majorMm: 10, pitchMm: 1.25, tapMm: 8.8, rollTapMm: 9.38 },
  { des: 'M12x1.25', majorMm: 12, pitchMm: 1.25, tapMm: 10.8, rollTapMm: 11.38 },
  { des: 'M12x1.5', majorMm: 12, pitchMm: 1.5, tapMm: 10.5, rollTapMm: 11.25 },
  { des: 'M14x1.5', majorMm: 14, pitchMm: 1.5, tapMm: 12.5, rollTapMm: 13.25 },
  { des: 'M16x1.5', majorMm: 16, pitchMm: 1.5, tapMm: 14.5, rollTapMm: 15.25 },
  { des: 'M16x2', majorMm: 16, pitchMm: 2, tapMm: 14.1, rollTapMm: 15.0 },
  { des: 'M18x2', majorMm: 18, pitchMm: 2, tapMm: 16.1, rollTapMm: 17.0 },
  { des: 'M20x2', majorMm: 20, pitchMm: 2, tapMm: 18.1, rollTapMm: 19.0 },
  { des: 'M22x2', majorMm: 22, pitchMm: 2, tapMm: 20.1, rollTapMm: 21.0 },
  { des: 'M24x2', majorMm: 24, pitchMm: 2, tapMm: 22.1, rollTapMm: 23.0 },
  { des: 'M27x2', majorMm: 27, pitchMm: 2, tapMm: 25.1, rollTapMm: 26.0 },
  { des: 'M30x2', majorMm: 30, pitchMm: 2, tapMm: 28.1, rollTapMm: 29.0 },
  { des: 'M33x2', majorMm: 33, pitchMm: 2, tapMm: 31.1, rollTapMm: 32.0 },
  { des: 'M36x2', majorMm: 36, pitchMm: 2, tapMm: 34.1, rollTapMm: 35.0 },
  { des: 'M36x3', majorMm: 36, pitchMm: 3, tapMm: 33.1, rollTapMm: 34.5 },
  { des: 'M40x3', majorMm: 40, pitchMm: 3, tapMm: 37.1, rollTapMm: 38.5 },
  { des: 'M44x3', majorMm: 44, pitchMm: 3, tapMm: 41.1, rollTapMm: 42.5 },
  { des: 'M48x3', majorMm: 48, pitchMm: 3, tapMm: 45.1, rollTapMm: 46.5 },
  { des: 'M52x3', majorMm: 52, pitchMm: 3, tapMm: 49.1, rollTapMm: 50.5 },
  { des: 'M56x4', majorMm: 56, pitchMm: 4, tapMm: 52.1, rollTapMm: 54.0 },
  { des: 'M60x4', majorMm: 60, pitchMm: 4, tapMm: 56.1, rollTapMm: 58.0 },
  { des: 'M64x4', majorMm: 64, pitchMm: 4, tapMm: 60.1, rollTapMm: 62.0 },
];

export const THREADS_METRIC = [...THREADS_METRIC_COARSE, ...THREADS_METRIC_FINE];

export const findThread = (des) => {
  const key = String(des).trim().toLowerCase().replace(/\s+/g, '');
  const strip = key.replace(/(unc|unf|unef|un)$/, '');
  const suf = key.match(/(unc|unf|unef)$/);
  return THREADS_UN.find((t) => {
    const d = t.des.toLowerCase().replace(/\s+/g, '');
    if (d === key) return true;
    if (d === strip && (!suf || suf[1] === t.series.toLowerCase())) return true;
    if (d.replace('#', '') === strip.replace('#', '') && (!suf || suf[1] === t.series.toLowerCase())) return true;
    return false;
  }) || null;
};

export const findMetricThread = (des) => {
  const key = String(des).trim().toLowerCase().replace(/\s+/g, '');
  return THREADS_METRIC.find((t) => t.des.toLowerCase() === key) || null;
};

export const NUMBER_DRILLS = [
  { label: '#1', inch: 0.2280, mm: 5.7912 },
  { label: '#2', inch: 0.2210, mm: 5.6134 },
  { label: '#3', inch: 0.2130, mm: 5.4102 },
  { label: '#4', inch: 0.2090, mm: 5.3086 },
  { label: '#5', inch: 0.2055, mm: 5.2197 },
  { label: '#6', inch: 0.2040, mm: 5.1816 },
  { label: '#7', inch: 0.2010, mm: 5.1054 },
  { label: '#8', inch: 0.1990, mm: 5.0546 },
  { label: '#9', inch: 0.1960, mm: 4.9784 },
  { label: '#10', inch: 0.1935, mm: 4.9149 },
  { label: '#11', inch: 0.1910, mm: 4.8514 },
  { label: '#12', inch: 0.1890, mm: 4.8006 },
  { label: '#13', inch: 0.1850, mm: 4.6990 },
  { label: '#14', inch: 0.1820, mm: 4.6228 },
  { label: '#15', inch: 0.1800, mm: 4.5720 },
  { label: '#16', inch: 0.1770, mm: 4.4958 },
  { label: '#17', inch: 0.1730, mm: 4.3942 },
  { label: '#18', inch: 0.1695, mm: 4.3053 },
  { label: '#19', inch: 0.1660, mm: 4.2164 },
  { label: '#20', inch: 0.1610, mm: 4.0894 },
  { label: '#21', inch: 0.1590, mm: 4.0386 },
  { label: '#22', inch: 0.1570, mm: 3.9878 },
  { label: '#23', inch: 0.1540, mm: 3.9116 },
  { label: '#24', inch: 0.1520, mm: 3.8608 },
  { label: '#25', inch: 0.1495, mm: 3.7973 },
  { label: '#26', inch: 0.1470, mm: 3.7338 },
  { label: '#27', inch: 0.1440, mm: 3.6576 },
  { label: '#28', inch: 0.1405, mm: 3.5687 },
  { label: '#29', inch: 0.1360, mm: 3.4544 },
  { label: '#30', inch: 0.1285, mm: 3.2639 },
  { label: '#31', inch: 0.1200, mm: 3.0480 },
  { label: '#32', inch: 0.1160, mm: 2.9464 },
  { label: '#33', inch: 0.1130, mm: 2.8702 },
  { label: '#34', inch: 0.1110, mm: 2.8194 },
  { label: '#35', inch: 0.1100, mm: 2.7940 },
  { label: '#36', inch: 0.1065, mm: 2.7051 },
  { label: '#37', inch: 0.1040, mm: 2.6416 },
  { label: '#38', inch: 0.1015, mm: 2.5781 },
  { label: '#39', inch: 0.0995, mm: 2.5273 },
  { label: '#40', inch: 0.0980, mm: 2.4892 },
  { label: '#41', inch: 0.0960, mm: 2.4384 },
  { label: '#42', inch: 0.0935, mm: 2.3749 },
  { label: '#43', inch: 0.0890, mm: 2.2606 },
  { label: '#44', inch: 0.0860, mm: 2.1844 },
  { label: '#45', inch: 0.0820, mm: 2.0828 },
  { label: '#46', inch: 0.0810, mm: 2.0574 },
  { label: '#47', inch: 0.0785, mm: 1.9939 },
  { label: '#48', inch: 0.0760, mm: 1.9304 },
  { label: '#49', inch: 0.0730, mm: 1.8542 },
  { label: '#50', inch: 0.0700, mm: 1.7780 },
  { label: '#51', inch: 0.0670, mm: 1.7018 },
  { label: '#52', inch: 0.0635, mm: 1.6129 },
  { label: '#53', inch: 0.0595, mm: 1.5113 },
  { label: '#54', inch: 0.0550, mm: 1.3970 },
  { label: '#55', inch: 0.0520, mm: 1.3208 },
  { label: '#56', inch: 0.0465, mm: 1.1811 },
  { label: '#57', inch: 0.0430, mm: 1.0922 },
  { label: '#58', inch: 0.0420, mm: 1.0668 },
  { label: '#59', inch: 0.0410, mm: 1.0414 },
  { label: '#60', inch: 0.0400, mm: 1.0160 },
  { label: '#61', inch: 0.0390, mm: 0.9906 },
  { label: '#62', inch: 0.0380, mm: 0.9652 },
  { label: '#63', inch: 0.0370, mm: 0.9398 },
  { label: '#64', inch: 0.0360, mm: 0.9144 },
  { label: '#65', inch: 0.0350, mm: 0.8890 },
  { label: '#66', inch: 0.0330, mm: 0.8382 },
  { label: '#67', inch: 0.0320, mm: 0.8128 },
  { label: '#68', inch: 0.0310, mm: 0.7874 },
  { label: '#69', inch: 0.0292, mm: 0.7417 },
  { label: '#70', inch: 0.0280, mm: 0.7112 },
  { label: '#71', inch: 0.0260, mm: 0.6604 },
  { label: '#72', inch: 0.0250, mm: 0.6350 },
  { label: '#73', inch: 0.0240, mm: 0.6096 },
  { label: '#74', inch: 0.0225, mm: 0.5715 },
  { label: '#75', inch: 0.0210, mm: 0.5334 },
  { label: '#76', inch: 0.0200, mm: 0.5080 },
  { label: '#77', inch: 0.0180, mm: 0.4572 },
  { label: '#78', inch: 0.0160, mm: 0.4064 },
  { label: '#79', inch: 0.0145, mm: 0.3683 },
  { label: '#80', inch: 0.0135, mm: 0.3429 },
];

export const LETTER_DRILLS = [
  { label: 'A', inch: 0.2340, mm: 5.9436 },
  { label: 'B', inch: 0.2380, mm: 6.0452 },
  { label: 'C', inch: 0.2420, mm: 6.1468 },
  { label: 'D', inch: 0.2460, mm: 6.2484 },
  { label: 'E', inch: 0.2500, mm: 6.3500 },
  { label: 'F', inch: 0.2570, mm: 6.5278 },
  { label: 'G', inch: 0.2610, mm: 6.6294 },
  { label: 'H', inch: 0.2660, mm: 6.7564 },
  { label: 'I', inch: 0.2720, mm: 6.9088 },
  { label: 'J', inch: 0.2770, mm: 7.0358 },
  { label: 'K', inch: 0.2810, mm: 7.1374 },
  { label: 'L', inch: 0.2900, mm: 7.3660 },
  { label: 'M', inch: 0.2950, mm: 7.4930 },
  { label: 'N', inch: 0.3020, mm: 7.6708 },
  { label: 'O', inch: 0.3160, mm: 8.0264 },
  { label: 'P', inch: 0.3230, mm: 8.2042 },
  { label: 'Q', inch: 0.3320, mm: 8.4328 },
  { label: 'R', inch: 0.3390, mm: 8.6106 },
  { label: 'S', inch: 0.3480, mm: 8.8392 },
  { label: 'T', inch: 0.3580, mm: 9.0932 },
  { label: 'U', inch: 0.3680, mm: 9.3472 },
  { label: 'V', inch: 0.3770, mm: 9.5758 },
  { label: 'W', inch: 0.3860, mm: 9.8044 },
  { label: 'X', inch: 0.3970, mm: 10.0838 },
  { label: 'Y', inch: 0.4040, mm: 10.2616 },
  { label: 'Z', inch: 0.4130, mm: 10.4902 },
];

const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a || 1; };

export const FRACTIONAL_DRILLS = (() => {
  const out = [];
  for (let den = 2; den <= 64; den *= 2) {
    for (let num = 1; num < den; num++) {
      if (gcd(num, den) !== 1) continue;
      const inch = num / den;
      out.push({ label: `${num}/${den}`, inch, mm: Math.round(inch * 25.4 * 1e4) / 1e4 });
    }
  }
  for (const whole of [1, 2]) {
    for (let num = 1; num < 8; num++) {
      if (gcd(num, 8) !== 1) continue;
      const inch = whole + num / 8;
      out.push({ label: `${whole}-${num}/8`, inch, mm: Math.round(inch * 25.4 * 1e4) / 1e4 });
    }
  }
  for (let num = 1; num < 64; num++) {
    const inch = 1 + num / 64;
    out.push({ label: `1-${num}/64`, inch, mm: Math.round(inch * 25.4 * 1e4) / 1e4 });
  }
  return out;
})();

export const ALL_DRILLS = [...FRACTIONAL_DRILLS, ...NUMBER_DRILLS, ...LETTER_DRILLS]
  .sort((a, b) => a.inch - b.inch);

export const nearestDrills = (inch, count = 6) => ALL_DRILLS
  .map((d) => ({ ...d, diff: Math.abs(d.inch - inch) }))
  .sort((a, b) => a.diff - b.diff)
  .slice(0, count);

export const findExactDrill = (inch) =>
  ALL_DRILLS.find((d) => Math.abs(d.inch - inch) < 5e-6) || null;
