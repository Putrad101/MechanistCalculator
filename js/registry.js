import rpm from './calc/rpm.js';
import tablefeed from './calc/tablefeed.js';
import feedrev from './calc/feedrev.js';
import boltcircle from './calc/boltcircle.js';
import drill from './calc/drill.js';
import threads from './calc/threads.js';
import mrr from './calc/mrr.js';
import fractions from './calc/fractions.js';

export const CALCULATORS = [
  rpm, tablefeed, feedrev, boltcircle, drill, threads, mrr, fractions,
];

export const byId = (id) => CALCULATORS.find((c) => c.id === id) || null;

export const search = (query) => {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return CALCULATORS;
  return CALCULATORS.filter((c) => [c.id, c.title, c.short, c.keywords, c.blurb]
    .filter(Boolean).join(' ').toLowerCase().includes(q));
};
