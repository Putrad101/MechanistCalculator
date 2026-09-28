import {
  panel, field, fieldRow, select, section, dataTable, notice, convertField,
} from '../ui.js';
import * as units from '../units.js';
import * as T from '../tables.js';

const SHOP_FRACTIONS = [
  [1, 64], [1, 32], [3, 64], [1, 16], [3, 32], [1, 8], [3, 16], [1, 4], [5, 16],
  [3, 8], [7, 16], [1, 2], [9, 16], [5, 8], [11, 16], [3, 4], [13, 16], [7, 8], [15, 16], [1, 1],
];

const unitPicker = (state) => select({
  label: 'Unit', name: 'unit', value: state.unit,
  options: [
    { value: 'in', label: 'inch' },
    { value: 'mm', label: 'mm' },
    { value: 'cm', label: 'cm' },
    { value: 'm', label: 'm' },
    { value: 'ft', label: 'foot' },
    { value: 'thou', label: 'thousandth' },
  ],
});

export default panel({
  id: 'fractions',
  title: 'Fractions & Drill Sizes',
  short: 'Fractions',
  order: 8,
  keywords: 'fraction decimal conversion drill chart number letter size reference inch mm',
  blurb: 'Convert anything to a fraction, tap the common sizes, and search the full drill chart.',

  defaultState: {
    value: '1/2',
    unit: 'in',
    den: '64',
    search: '',
  },

  body(state) {
    const grid = SHOP_FRACTIONS
      .map(([n, d]) => `<button type="button" class="frac" data-set="value" data-setunit="in" data-setvalue="${n / d}">${n === d ? '1' : `${n}/${d}`}</button>`)
      .join('');

    return [
      section('Convert', [
        fieldRow(
          field({ label: 'Value', name: 'value', value: state.value, unit: state.unit, dim: 'length', placeholder: '7/8, 1 1/2, 1-1/2, 0.5, 12.7' }),
          unitPicker(state),
        ),
        notice('Accepts 7/8, 1 1/2, 1-1/2, -5/16, a plain decimal, or a number with a unit suffix like 12.7mm. Fractions are shown reduced, and 1/64ths and finer are recognised.', 'info'),
      ].join('')),

      section('Tap a size', `<div class="frac-grid">${grid}</div>`),

      section('Fraction reference', [
        fieldRow(
          select({
            label: 'Smallest step', name: 'den', value: state.den,
            options: units.FRACTION_DENOMINATORS.map((d) => ({ value: String(d), label: `1/${d} in steps` })),
          }),
        ),
        dataTable(
          [
            { label: 'Fraction' },
            { label: 'Inch', numeric: true },
            { label: 'mm', numeric: true },
          ],
          units.commonFractions(Number(state.den) || 64, 8).slice(0, 220).map((f) => ({
            cells: [f.text, units.fmt(f.value, 5), units.fmt(f.value * 25.4, 4)],
          })),
          { dense: true },
        ),
      ].join('')),

      section('Drill chart', [
        fieldRow(field({ label: 'Search by size or label', name: 'search', value: state.search, placeholder: 'e.g. 5/16, 1/4, #7, F, 8mm' })),
        notice('Numbered, letter and fractional drill sizes in one place. Type a label or a decimal to filter.', 'info'),
      ].join('')),
    ].join('');
  },

  onChange(state, key, root) {
    if (key === 'unit') convertField(root, 'value', 'length', state.unit);
    return false;
  },

  compute(state) {
    const v = state.value__mm;
    const results = [];
    const notes = [];

    if (Number.isFinite(v) && v !== 0) {
      const impIn = units.fromCanonical(v, 'in', 'length');
      const frac = units.fractionFor(impIn, { maxDen: 256 });
      const nearest64 = units.fractionFor(impIn, { maxDen: 64 });

      results.push({ label: 'Inches', dim: 'length', value: v, hint: frac ? `That is ${units.formatFraction(frac, { mixed: true })}, so it is a fraction you can dial in on a machine.` : null });
      if (frac) {
        results.push({ label: 'As a fraction', text: units.formatFraction(frac, { mixed: true }), hint: `${frac.exact ? 'Exact.' : 'Nearest match, not exact.'} Decimal is ${units.fmt(impIn, 6)} in.` });
      }
      if (nearest64 && (!frac || frac.den > 64)) {
        results.push({ label: 'Nearest 1/64th', text: units.formatFraction(nearest64, { mixed: true }), hint: `Off by ${units.fmt(nearest64.error * 25.4, 5)} mm.` });
      }

      const feet = Math.floor(Math.abs(impIn) / 12);
      const inches = Math.abs(impIn) - feet * 12;
      const wholeIn = Math.floor(inches);
      const remFrac = units.fractionFor(inches - wholeIn, { maxDen: 256 });
      if (feet > 0) {
        results.push({
          label: 'Feet and inches',
          text: `${impIn < 0 ? '-' : ''}${feet} ft ${wholeIn}${remFrac && remFrac.den > 1 ? `-${remFrac.num}/${remFrac.den}` : ''}`,
          hint: 'For lathes and big stock.',
        });
      }
      results.push({ label: 'Thou', dim: 'length', value: units.toCanonical(impIn, 'thou', 'length') });
      results.push({ label: 'Metres', dim: 'length', value: units.toCanonical(v, 'm', 'length') });

      const near = T.nearestDrills(impIn, 5);
      results.push({
        label: 'Nearest stock drill',
        dim: 'length',
        value: units.toCanonical(near[0].inch, 'in', 'length'),
        hint: `${near[0].label}${near[0].diff < 5e-6 ? ' is an exact match.' : ` is ${units.fmt(near[0].diff * 25.4, 4)} mm away.`}`,
      });
      notes.push(`One inch is exactly 25.4 mm. So a 1/64th step is ${units.fmt(25.4 / 64, 5)} mm, and 1/32 is ${units.fmt(25.4 / 32, 5)} mm. That is why metric and imperial never line up exactly.`);
    } else if (state.value && state.value.trim()) {
      return { results: [], error: 'Could not read that value. Try 7/8, 1 1/2, 1-1/2 or a plain decimal.' };
    }

    const q = String(state.search || '').trim().toLowerCase();
    const all = T.ALL_DRILLS;
    const filtered = q
      ? all.filter((d) => d.label.toLowerCase().includes(q)
        || d.label.toLowerCase().replace('#', '') === q
        || String(d.inch).startsWith(q)
        || String(d.mm).startsWith(q)
        || `${d.inch}`.includes(q)
        || `${d.mm}`.includes(q))
      : all;

    const rows = filtered.slice(0, 300).map((d) => ({
      cells: [d.label, units.fmt(d.inch, 4), units.fmt(d.mm, 3)],
    }));

    return {
      results,
      notes,
      extra: q
        ? section(`Drill chart, ${filtered.length} match${filtered.length === 1 ? '' : 'es'}`, dataTable(
          [{ label: 'Size' }, { label: 'Inch', numeric: true }, { label: 'mm', numeric: true }],
          rows,
          { dense: true },
        ))
        : '',
    };
  },
});
