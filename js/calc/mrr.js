import {
  panel, field, fieldRow, select, segmented, section, notice, convertField,
} from '../ui.js';
import * as units from '../units.js';
import * as F from './formulas.js';
import { CUSTOM, matOptions, kcFor, matAdvisory, noToolData } from './matfield.js';

export default panel({
  id: 'mrr',
  title: 'Stepover, MRR & Cycle Time',
  short: 'MRR',
  order: 7,
  keywords: 'mrr material removal rate stepover cycle time cut time power hp kw feed milling turning',
  blurb: 'Stepover, material removal rate, how long the cut takes, and what it costs you in horsepower.',

  defaultState: {
    op: 'milling',
    matId: CUSTOM,
    dia: '10',
    diaUnit: 'mm',
    stepPct: '50',
    ae: '5',
    aeUnit: 'mm',
    ap: '7.75',
    apUnit: 'mm',
    doc: '2',
    docUnit: 'mm',
    feed: '955',
    feedUnit: 'mm',
    length: '120',
    lengthUnit: 'mm',
    numPasses: '1',
    approach: '10',
    approachUnit: 'mm',
  },

  body(state) {
    const milling = state.op === 'milling';
    return [
      section('Operation', [
        segmented({
          label: 'Type',
          name: 'op',
          value: state.op,
          options: [
            { value: 'milling', label: 'Milling / slotting' },
            { value: 'turning', label: 'Turning' },
          ],
        }),
        fieldRow(
          select({ label: 'Material', name: 'matId', value: state.matId, options: matOptions(state.matId) }),
        ),
        fieldRow(
          field({ label: milling ? 'Tool diameter' : 'Work diameter', name: 'dia', value: state.dia, unit: state.diaUnit, dim: 'length' }),
          select({
            label: 'Length unit', name: 'diaUnit', value: state.diaUnit,
            options: [{ value: 'in', label: 'inch' }, { value: 'mm', label: 'mm' }],
          }),
        ),
      ].join('')),

      milling
        ? section('Cut geometry', [
          fieldRow(
            field({ label: 'Stepover as percent of tool', name: 'stepPct', value: state.stepPct, unit: '%', dim: 'ratio', step: 5 }),
            field({ label: 'or radial depth (ae)', name: 'ae', value: state.ae, unit: state.aeUnit, dim: 'length' }),
          ),
          fieldRow(
            field({ label: 'Axial depth (ap)', name: 'ap', value: state.ap, unit: state.apUnit, dim: 'length' }),
            field({ label: 'Cut length', name: 'length', value: state.length, unit: state.lengthUnit, dim: 'length' }),
          ),
          fieldRow(
            field({ label: 'Number of passes', name: 'numPasses', value: state.numPasses, step: 1 }),
            field({ label: 'Approach and overrun', name: 'approach', value: state.approach, unit: state.approachUnit, dim: 'length' }),
          ),
        ].join(''))
        : section('Cut geometry', [
          fieldRow(
            field({ label: 'Depth of cut (doc)', name: 'doc', value: state.doc, unit: state.docUnit, dim: 'length' }),
            field({ label: 'Cut length', name: 'length', value: state.length, unit: state.lengthUnit, dim: 'length' }),
          ),
        ].join('')),

      section('Feed', fieldRow(
        field({ label: 'Table feed', name: 'feed', value: state.feed, unit: state.feedUnit, dim: 'perMin' }),
        select({
          label: 'Feed unit', name: 'feedUnit', value: state.feedUnit,
          options: [{ value: 'in', label: 'IPM' }, { value: 'mm', label: 'mm/min' }],
        }),
      )),
    ].join('');
  },

  onChange(state, key, root) {
    if (key === 'op') return true;
    if (key === 'diaUnit') {
      for (const n of ['ae', 'ap', 'doc', 'approach']) convertField(root, n, 'length', state.diaUnit);
      convertField(root, 'length', 'length', state.diaUnit);
    }
    if (key === 'stepPct') {
      const dia = state.dia__mm;
      const pct = units.parseValue(state.stepPct);
      if (Number.isFinite(dia) && Number.isFinite(pct)) {
        const el = getFieldEl(root, 'ae');
        if (el) el.value = String(units.round(units.fromCanonical(F.stepover(dia, pct), el.dataset.unit, 'length'), 4));
      }
    }
    if (key === 'ae' || key === 'dia') {
      const dia = state.dia__mm;
      const ae = state.ae__mm;
      if (Number.isFinite(dia) && dia > 0 && Number.isFinite(ae) && state.op === 'milling') {
        const el = getFieldEl(root, 'stepPct');
        if (el) el.value = String(units.round((ae / dia) * 100, 2));
      }
    }
    if (key === 'feedUnit') convertField(root, 'feed', 'perMin', state.feedUnit);
    return false;
  },

  compute(state) {
    const milling = state.op === 'milling';
    const diaMm = state.dia__mm;
    const feedMm = state.feed__mm;
    const lengthMm = state.length__mm;

    if (!Number.isFinite(diaMm) || diaMm <= 0) return { results: [], error: 'Enter a tool or work diameter.' };
    if (!Number.isFinite(feedMm) || feedMm <= 0) return { results: [], error: 'Enter a table feed.' };
    if (!Number.isFinite(lengthMm) || lengthMm <= 0) return { results: [], error: 'Enter a cut length.' };

    const passes = Math.max(1, Math.trunc(units.parseValue(state.numPasses) || 1));
    const approachMm = units.toCanonical(units.parseValue(state.approach) || 0, state.approachUnit, 'length');
    const kc = kcFor(state.matId);

    const results = [];
    const notes = [];
    const warnings = [matAdvisory(state.matId), noToolData(state.matId)].filter(Boolean);
    let mrr;
    let travel;
    let timeMin;

    if (milling) {
      const aeMm = state.ae__mm;
      const apMm = state.ap__mm;
      if (!Number.isFinite(aeMm) || aeMm <= 0) return { results: [], error: 'Enter a stepover or a radial depth.' };
      if (!Number.isFinite(apMm) || apMm <= 0) return { results: [], error: 'Enter an axial depth.' };

      const fullSlot = aeMm >= diaMm / 2 - 1e-9;
      const actualStepPct = (aeMm / diaMm) * 100;
      mrr = F.mrrMilling(feedMm, aeMm, apMm);
      travel = (lengthMm + (Number.isFinite(approachMm) ? approachMm : 0)) * passes;
      timeMin = F.cycleTimeMin(travel, feedMm);

      results.push({ label: 'Stepover', dim: 'length', value: aeMm, hint: fullSlot ? 'That is a full-width slot, the tool is cutting its own diameter.' : `${units.fmt(actualStepPct, 0)}% of the tool diameter.` });
      results.push({ label: 'Axial depth', dim: 'length', value: apMm });
      results.push({ label: 'Material removal rate', dim: 'volume', value: mrr, hint: 'Volume of metal coming off per minute.' });
      results.push({ label: 'Arc length of a full circle', dim: 'length', value: Math.PI * diaMm, hint: 'A full circular slot is this much travel, and the tool only cuts on the arc.' });
      results.push({ label: 'Time to cut one full circle', dim: 'time', value: F.cycleTimeMin(Math.PI * diaMm, feedMm) });

      if (fullSlot) {
        notes.push('Radial depth equals the tool radius, so this is a slot. The MRR formula still works but the tool is at its maximum width, which is the hardest cut it can take.');
      } else {
        notes.push('For a real slot the area removed is not simply ae &times; ap. It is the circular segment, which is less than the rectangle. This calculator uses the simple rectangle, so treat it as the optimistic end of the range.');
      }
      if (actualStepPct > 60) {
        warnings.push(`Stepover over 60% is roughing territory. Light finishes normally want 10 to 30% of the tool diameter, and under 10% is a finishing pass.`);
      }
      if (passes > 1) notes.push(`Total travel is the cut length plus approach, times ${passes} passes. Rapid moves and the return are not included, so add a few percent.`);
    } else {
      const docMm = state.doc__mm;
      if (!Number.isFinite(docMm) || docMm <= 0) return { results: [], error: 'Enter a depth of cut.' };
      mrr = F.mrrTurning(feedMm, docMm, diaMm);
      travel = lengthMm + (Number.isFinite(approachMm) ? approachMm : 0);
      timeMin = F.cycleTimeMin(travel, feedMm);
      results.push({ label: 'Depth of cut', dim: 'length', value: docMm });
      results.push({ label: 'Material removal rate', dim: 'volume', value: mrr, hint: 'Feed &times; depth &times; pi &times; diameter, for a straight cut at constant diameter.' });
      notes.push('MRR in turning assumes the diameter stays constant. If the cut is a taper, a facing pass or on a tube, this is the maximum, not the average.');
    }

    results.push({ label: 'Total travel', dim: 'length', value: travel });
    results.push({ label: 'Cycle time', dim: 'time', value: timeMin, hint: 'Minutes at the programmed feed. Rapids and tool changes are extra.' });

    if (Number.isFinite(kc) && mrr > 0) {
      const kw = F.powerKw(kc, mrr);
      results.push({ label: 'Horsepower needed', dim: 'power', value: kw * 1000, hint: 'At about 80% machine efficiency. Real draw is a little higher still.' });
      results.push({ label: 'Power', dim: 'kw', value: kw });
      notes.push(`Power = kc &times; MRR &divide; 60 000, with kc in N/mm&sup2; and MRR in mm&sup3;/min. Material specific cutting force used: ${units.fmt(kc, 0)} N/mm&sup2;.`);
    } else {
      warnings.push('Pick a material to get the power figure. Without a specific cutting force there is no honest way to estimate horsepower.');
    }

    return { results, notes, warnings };
  },
});

const getFieldEl = (root, name) => root.querySelector(`[data-f="${CSS.escape(name)}"]`);
