import { panel, field, fieldRow, segmented, section, dataTable, notice, setField } from '../ui.js';
import * as units from '../units.js';

const MM_TAPS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20, 25, 32, 40, 50];
const INCH_TAPS = [
  [1, 64], [1, 32], [3, 64], [1, 16], [3, 32], [1, 8], [3, 16], [1, 4], [5, 16],
  [3, 8], [7, 16], [1, 2], [5, 8], [3, 4], [7, 8], [1, 1],
];

const sizeLabel = (n, d) => (n === d ? '1' : `${n}/${d}`);

const POW2_64THS = [1, 2, 4, 8, 16, 32, 64];
// The fraction you can actually dial in on a machine: nearest step on a real
// 1/64th grid, never a 12/61 or 50/127 style rarity.
const shopFraction = (impIn) => units.fractionFor(impIn, { maxDen: 64, denoms: POW2_64THS });

const tapsGrid = (mode) => {
  if (mode === 'mmToIn') {
    return MM_TAPS
      .map((v) => `<button type="button" class="frac" data-set="value" data-setdim="mm" data-setvalue="${v}">${v}</button>`)
      .join('');
  }
  return INCH_TAPS
    .map(([n, d]) => `<button type="button" class="frac" data-set="value" data-setvalue="${n / d}">${sizeLabel(n, d)}</button>`)
    .join('');
};

export default panel({
  id: 'mmtoinch',
  title: 'mm to inch',
  short: 'mm ↔ in',
  order: 9,
  keywords: 'mm inch inches millimetre millimeter conversion metric imperial translate thou thousandth convert fraction',
  blurb: 'Convert millimetres to inches and back, with the nearest shop fraction and the common sizes you will actually meet.',

  defaultState: {
    mode: 'mmToIn',
    value: '10',
  },

  body(state) {
    const toInch = state.mode === 'mmToIn';
    return [
      section('Convert', [
        fieldRow(segmented({
          label: 'Direction',
          name: 'mode',
          value: state.mode,
          options: [
            { value: 'mmToIn', label: 'mm → in' },
            { value: 'inToMm', label: 'in → mm' },
          ],
        })),
        fieldRow(field({
          label: 'Value',
          name: 'value',
          value: state.value,
          unit: toInch ? 'mm' : 'in',
          dim: 'length',
          placeholder: toInch ? 'e.g. 10, 25/64' : 'e.g. 1.25, 3/8',
        })),
        notice(toInch
          ? 'Type a metric size and read the inch side below. Fractions and unit suffixes like 2cm work too.'
          : 'Type an inch size and read the metric side below. Fractions, thousandths and unit suffixes like 1.5\u2033 work too.', 'info'),
      ].join('')),

      section('Tap a size', `<div class="frac-grid">${tapsGrid(state.mode)}</div>`),

      section('Where the two meet', dataTable(
        [
          { label: 'Metric stock' },
          { label: 'Inch decimal', numeric: true },
          { label: 'Nearest fraction' },
        ],
        MM_TAPS.map((mm) => {
          const imp = mm / 25.4;
          const f = shopFraction(imp);
          return {
            cells: [
              `${mm} mm`,
              units.fmt(imp, 4),
              f ? `${f.exact ? '' : '≈'}${units.formatFraction(f, { mixed: true })}″` : '—',
            ],
          };
        }),
        { dense: true },
      )),
    ].join('');
  },

  onChange(state, key, root) {
    // Flipping the direction carries the current measure over, so toggling does
    // not throw away what was already typed.
    if (key === 'mode') {
      const mm = state.value__mm;
      if (Number.isFinite(mm) && mm !== 0) {
        const toInch = state.mode === 'mmToIn';
        setField(
          root, 'value',
          units.round(toInch ? mm : units.fromCanonical(mm, 'in', 'length'), 6),
          toInch ? 'mm' : 'in',
          'length',
        );
      }
      return true;
    }
    return false;
  },

  compute(state) {
    const mm = state.value__mm;
    const results = [];
    const notes = [];

    if (Number.isFinite(mm) && mm !== 0) {
      const impIn = units.fromCanonical(mm, 'in', 'length');
      const frac = shopFraction(impIn);

      results.push({
        label: 'Inches',
        dim: 'length',
        value: mm,
        hint: frac ? `That dials in as ${units.formatFraction(frac, { mixed: true })}${frac.exact ? '' : `, which is ${units.fmt(frac.error * 25.4, 3)} mm off the exact decimal`}.` : null,
      });
      if (frac) {
        results.push({
          label: 'As a fraction',
          text: units.formatFraction(frac, { mixed: true }),
          hint: `${frac.exact ? 'Exact.' : 'Nearest 1/64th, not exact.'} Decimal is ${units.fmt(impIn, 6)} in.`,
        });
      }

      results.push({ label: 'Thou', text: `${units.fmt(impIn * 1000, 1)} thou` });
      results.push({ label: 'Millimetres', text: `${units.fmt(mm, 3)} mm` });
      results.push({ label: 'Centimetres', text: `${units.fmt(mm / 10, 4)} cm` });
      results.push({ label: 'Metres', text: `${units.fmt(mm / 1000, 5)} m` });

      const feet = Math.floor(Math.abs(impIn) / 12);
      const inches = Math.abs(impIn) - feet * 12;
      const wholeIn = Math.floor(inches);
      const remFrac = shopFraction(inches - wholeIn);
      if (feet > 0) {
        results.push({
          label: 'Feet and inches',
          text: `${impIn < 0 ? '-' : ''}${feet} ft ${wholeIn}${remFrac && remFrac.den > 1 ? `-${remFrac.num}/${remFrac.den}` : ''} in`,
          hint: 'For stock and big work.',
        });
      }

      notes.push('One inch is exactly 25.4 mm, which is why metric and imperial sizes never line up neatly. The fraction above is the nearest step on a 1/64th grid unless marked exact.');
    } else if (state.value && state.value.trim()) {
      return { results: [], error: 'Could not read that value. Try 10, 3/8, 1 1/2, 12.7mm or a plain decimal.' };
    }

    return { results, notes };
  },
});