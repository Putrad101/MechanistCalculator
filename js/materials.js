import * as store from './store.js';

export const TOOL_TYPES = [
  { id: 'carbide', label: 'Carbide', hint: 'General purpose carbide insert / solid carbide' },
  { id: 'coated', label: 'Coated carbide', hint: 'TiN / TiAlN / AlTiN coated carbide' },
  { id: 'hss', label: 'HSS', hint: 'High speed steel' },
  { id: 'cermet', label: 'Cermet', hint: 'Cermet insert, steel and cast iron' },
];

export const MATERIAL_GROUPS = [
  'Aluminium', 'Steel', 'Cast iron', 'Copper alloys',
  'Bronze', 'Titanium', 'Nickel alloys', 'Plastics', 'Other',
];

const S = (sfm, ipt) => ({ sfm, ipt });

const SEED = [
  {
    id: 'al-6061', name: 'Aluminium 6061-T6', group: 'Aluminium', kc: 350,
    tools: { carbide: S(350, 0.0050), coated: S(400, 0.0050), hss: S(90, 0.0020), cermet: null },
    notes: 'Free machining. Use sharp edges, high speed, flood coolant.',
  },
  {
    id: 'al-7075', name: 'Aluminium 7075-T6', group: 'Aluminium', kc: 700,
    tools: { carbide: S(250, 0.0040), coated: S(300, 0.0040), hss: S(70, 0.0018), cermet: null },
    notes: 'Harder alloy, stickier chip. Keep load steady, watch for built-up edge.',
  },
  {
    id: 'al-cast', name: 'Aluminium A356-T6 (cast)', group: 'Aluminium', kc: 450,
    tools: { carbide: S(300, 0.0045), coated: S(350, 0.0045), hss: S(85, 0.0020), cermet: null },
    notes: 'Cast skin is abrasive. Expect intermittent cut, do not let the tool dwell.',
  },
  {
    id: 'steel-1018', name: 'Mild steel 1018 / A36', group: 'Steel', kc: 1500,
    tools: { carbide: S(120, 0.0030), coated: S(140, 0.0030), hss: S(60, 0.0018), cermet: S(250, 0.0025) },
    notes: 'General shop steel. Flood coolant strongly recommended.',
  },
  {
    id: 'steel-1045', name: 'Carbon steel 1045', group: 'Steel', kc: 1800,
    tools: { carbide: S(90, 0.0025), coated: S(110, 0.0025), hss: S(50, 0.0015), cermet: S(220, 0.0022) },
    notes: 'Tougher than 1018. Reduce speed for deeper cuts.',
  },
  {
    id: 'steel-4140', name: 'Alloy steel 4140 (annealed)', group: 'Steel', kc: 1900,
    tools: { carbide: S(85, 0.0025), coated: S(100, 0.0025), hss: S(45, 0.0012), cermet: null },
    notes: 'Prehardened stock needs lower speed still. Check hardness before cutting.',
  },
  {
    id: 'ss-304', name: 'Stainless 304', group: 'Steel', kc: 2000,
    tools: { carbide: S(90, 0.0020), coated: S(100, 0.0020), hss: S(40, 0.0012), cermet: null },
    notes: 'Work hardening. Keep the tool moving, do not dwell, use flood.',
  },
  {
    id: 'ss-316', name: 'Stainless 316', group: 'Steel', kc: 2100,
    tools: { carbide: S(70, 0.0018), coated: S(80, 0.0018), hss: S(35, 0.0010), cermet: null },
    notes: 'Rigid setup required. High pressure coolant helps a lot.',
  },
  {
    id: 'iron-grey', name: 'Cast iron FC250 / Class 30', group: 'Cast iron', kc: 1300,
    tools: { carbide: S(150, 0.0030), coated: S(170, 0.0030), hss: S(70, 0.0020), cermet: S(400, 0.0028) },
    notes: 'Dry cut or air blast. Intermittent cut, keep edges sharp.',
  },
  {
    id: 'iron-ductile', name: 'Ductile iron 65-45-12', group: 'Cast iron', kc: 1600,
    tools: { carbide: S(130, 0.0030), coated: S(150, 0.0030), hss: S(65, 0.0018), cermet: S(380, 0.0028) },
    notes: 'Tougher than grey iron, more tool wear. Higher penetration pressure.',
  },
  {
    id: 'bronze-660', name: 'Bronze SAE 660 / UNS C95800 (hard bearing bronze)', group: 'Bronze', kc: 1900,
    verified: false,
    tools: { carbide: S(60, 0.0018), coated: S(75, 0.0020), hss: S(20, 0.0008), cermet: null },
    notes: 'STARTING VALUES - verify on your setup. Tough, abrasive, high tool wear. '
      + 'Never let the tool rub, use a sharp positive rake insert and steady feed. '
      + 'Expect to back off if the edge breaks down.',
  },
  {
    id: 'bronze-955', name: 'Bronze SAE 955 / UNS C93700 (hard bearing bronze)', group: 'Bronze', kc: 1900,
    verified: false,
    tools: { carbide: S(60, 0.0018), coated: S(75, 0.0020), hss: S(20, 0.0008), cermet: null },
    notes: 'STARTING VALUES - verify on your setup. Same family as SAE 660, leaded. '
      + 'Tough and abrasive, keep a sharp edge and do not dwell.',
  },
  {
    id: 'bronze-fm', name: 'Bronze free machining C93200 (phosphor)', group: 'Bronze', kc: 1100,
    tools: { carbide: S(200, 0.0040), coated: S(220, 0.0040), hss: S(80, 0.0020), cermet: null },
    notes: 'Very free cutting. Lead content helps. Watch for grabbing on small feeds.',
  },
  {
    id: 'bronze-tin', name: 'Tin bronze C90700 (SAE 660 class)', group: 'Bronze', kc: 1400,
    tools: { carbide: S(120, 0.0028), coated: S(140, 0.0028), hss: S(40, 0.0012), cermet: null },
    notes: 'Common bushing and bearing bronze. Between the free-machining and SAE 660 extremes.',
  },
  {
    id: 'brass-c360', name: 'Brass C360 (free cutting)', group: 'Copper alloys', kc: 700,
    tools: { carbide: S(250, 0.0040), coated: S(280, 0.0040), hss: S(90, 0.0020), cermet: null },
    notes: 'Very free cutting. Watch for work hardening and grabbing on small tools.',
  },
  {
    id: 'brass-360f', name: 'Brass C26000 (cartridge brass)', group: 'Copper alloys', kc: 800,
    tools: { carbide: S(200, 0.0035), coated: S(230, 0.0035), hss: S(75, 0.0018), cermet: null },
    notes: 'Slightly tougher than C360, reduce feed a little.',
  },
  {
    id: 'copper-c110', name: 'Copper C110 (E-Copper)', group: 'Copper alloys', kc: 1200,
    tools: { carbide: S(150, 0.0030), coated: S(170, 0.0030), hss: S(60, 0.0015), cermet: null },
    notes: 'Very gummy. Use a sharp high rake edge, light cut, no dwell.',
  },
  {
    id: 'bronze-nickel', name: 'Nickel silver / naval brass', group: 'Copper alloys', kc: 1300,
    tools: { carbide: S(120, 0.0025), coated: S(140, 0.0025), hss: S(45, 0.0012), cermet: null },
    notes: 'Between brass and bronze in behaviour. Cuts well with sharp carbide.',
  },
  {
    id: 'ti-6al-4v', name: 'Titanium Ti-6Al-4V', group: 'Titanium', kc: 1000,
    tools: { carbide: S(50, 0.0020), coated: S(65, 0.0020), hss: S(20, 0.0010), cermet: null },
    notes: 'Low thermal conductivity, heats fast. High pressure coolant, keep speed up not down.',
  },
  {
    id: 'inconel-718', name: 'Inconel 718', group: 'Nickel alloys', kc: 2500,
    tools: { carbide: S(30, 0.0015), coated: S(40, 0.0015), hss: S(10, 0.0008), cermet: null },
    notes: 'Work hardens fast and destroys tooling. Never dwell, use positive rake.',
  },
  {
    id: 'monel-400', name: 'Monel 400', group: 'Nickel alloys', kc: 2000,
    tools: { carbide: S(60, 0.0020), coated: S(70, 0.0020), hss: S(20, 0.0010), cermet: null },
    notes: 'Similar to stainless 304 but tougher. Sharp tool, steady feed.',
  },
  {
    id: 'hardox-450', name: 'Hardox 450 wear plate', group: 'Steel', kc: 2200,
    tools: { carbide: S(70, 0.0025), coated: S(80, 0.0025), hss: S(25, 0.0010), cermet: null },
    notes: 'Abrasion resistant. Expect short tool life, never let it rub.',
  },
  {
    id: 'steel-d2', name: 'Tool steel AISI D2 (annealed)', group: 'Steel', kc: 2000,
    tools: { carbide: S(60, 0.0020), coated: S(70, 0.0020), hss: S(25, 0.0010), cermet: null },
    notes: 'Tough and abrasive. Carbide only in the annealed condition.',
  },
  {
    id: 'plastic-acetal', name: 'Acetal / Delrin (POM)', group: 'Plastics', kc: 300,
    tools: { carbide: S(300, 0.0050), coated: S(300, 0.0050), hss: S(100, 0.0030), cermet: null },
    notes: 'No coolant needed. Watch for melting and stringy chips. Sharp edge, gouge if dull.',
  },
  {
    id: 'plastic-nylon', name: 'Nylon 6 / 6-6', group: 'Plastics', kc: 350,
    tools: { carbide: S(250, 0.0050), coated: S(250, 0.0050), hss: S(100, 0.0030), cermet: null },
    notes: 'Absorbs water, so feed varies with moisture. Use compressed air.',
  },
  {
    id: 'plastic-acrylic', name: 'Acrylic PMMA', group: 'Plastics', kc: 400,
    tools: { carbide: S(250, 0.0040), coated: S(250, 0.0040), hss: S(80, 0.0020), cermet: null },
    notes: 'Gums badly if overheated. Single flute preferred, air blast, keep it cool.',
  },
  {
    id: 'plastic-uhmw', name: 'UHMW / HDPE / plastics (general)', group: 'Plastics', kc: 300,
    tools: { carbide: S(300, 0.0050), coated: S(300, 0.0050), hss: S(100, 0.0030), cermet: null },
    notes: 'Very easy to cut. Heed the stringy chip risk.',
  },
  {
    id: 'mg-az91', name: 'Magnesium AZ91D', group: 'Other', kc: 250,
    tools: { carbide: S(500, 0.0060), coated: S(550, 0.0060), hss: S(120, 0.0030), cermet: null },
    notes: 'Fire risk. Absolutely no coolant of any kind. Use a chip guard.',
  },
  {
    id: 'other-unknown', name: 'Generic / unknown material', group: 'Other', kc: 1500,
    tools: { carbide: S(100, 0.0030), coated: S(120, 0.0030), hss: S(50, 0.0015), cermet: S(200, 0.0025) },
    notes: 'Mid-range starting point only. Always start slow and work up.',
  },
];

const KEY = 'materials';

const clone = (m) => JSON.parse(JSON.stringify(m));

const seedList = () => clone(SEED);

const sanitise = (m) => {
  const tools = {};
  for (const t of TOOL_TYPES) {
    const v = m.tools && m.tools[t.id];
    tools[t.id] = v && Number.isFinite(v.sfm) && Number.isFinite(v.ipt) && v.sfm > 0 && v.ipt > 0
      ? { sfm: v.sfm, ipt: v.ipt }
      : null;
  }
  return {
    id: String(m.id || `m-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`),
    name: String(m.name || 'Untitled material'),
    group: String(m.group || 'Other'),
    kc: Number.isFinite(m.kc) ? m.kc : 1500,
    verified: m.verified !== false,
    notes: String(m.notes || ''),
    tools,
  };
};

export const listMaterials = () => {
  const stored = store.load(KEY, null);
  if (Array.isArray(stored) && stored.length) return stored;
  const fresh = seedList();
  store.saveNow(KEY, fresh);
  return fresh;
};

export const isSeeded = () => Array.isArray(store.load(KEY, null));

export const getMaterial = (id) => listMaterials().find((m) => m.id === id) || null;

export const upsertMaterial = (material) => {
  const list = listMaterials().map(clone);
  const clean = sanitise(material);
  const idx = list.findIndex((m) => m.id === clean.id);
  if (idx >= 0) list[idx] = clean; else list.push(clean);
  store.saveNow(KEY, list);
  return clean;
};

export const deleteMaterial = (id) => {
  const list = listMaterials().filter((m) => m.id !== id);
  store.saveNow(KEY, list);
  return list;
};

export const duplicateMaterial = (id) => {
  const src = getMaterial(id);
  if (!src) return null;
  const copy = sanitise({ ...clone(src), name: `${src.name} (copy)`, id: undefined });
  return upsertMaterial(copy);
};

export const resetMaterials = () => {
  const fresh = seedList();
  store.saveNow(KEY, fresh);
  return fresh;
};

export const searchMaterials = (query) => {
  const q = String(query || '').trim().toLowerCase();
  const list = listMaterials();
  if (!q) return list;
  return list.filter((m) => m.name.toLowerCase().includes(q) || m.group.toLowerCase().includes(q));
};

export const materialsByGroup = (list = listMaterials()) => {
  const groups = new Map();
  for (const m of list) {
    if (!groups.has(m.group)) groups.set(m.group, []);
    groups.get(m.group).push(m);
  }
  return Array.from(groups.entries()).map(([name, items]) => ({ name, items }));
};

export const getToolFor = (materialId, toolType) => {
  const m = getMaterial(materialId);
  if (!m) return null;
  return m.tools[toolType] || null;
};

export const SFM_TO_VC = 0.3048;
export const IPT_TO_FZ = 25.4;

export const toolData = (materialId, toolType) => {
  const t = getToolFor(materialId, toolType);
  if (!t) return null;
  return {
    sfm: t.sfm,
    ipt: t.ipt,
    vc: t.sfm * SFM_TO_VC,
    fz: t.ipt * IPT_TO_FZ,
    source: getMaterial(materialId),
  };
};

export const materialFor = (materialId) => getMaterial(materialId);

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'materials';

export const exportJson = () => {
  const payload = { app: 'mechanist-calculator', kind: 'materials', version: 1, exportedAt: new Date().toISOString(), materials: listMaterials() };
  return JSON.stringify(payload, null, 2);
};

export const exportFileName = () => `mechanist-materials-${slugify(new Date().toISOString().slice(0, 10))}.json`;

export const importJson = (text, mode = 'replace') => {
  const data = JSON.parse(text);
  const incoming = Array.isArray(data) ? data : data.materials;
  if (!Array.isArray(incoming) || !incoming.length) {
    throw new Error('No materials found in that file.');
  }
  const clean = incoming.map(sanitise);
  let next;
  if (mode === 'merge') {
    const byId = new Map(listMaterials().map((m) => [m.id, clone(m)]));
    for (const m of clean) byId.set(m.id, m);
    next = Array.from(byId.values());
  } else {
    next = clean;
  }
  store.saveNow(KEY, next);
  return next;
};

export const isDefaultMaterial = (id) => SEED.some((m) => m.id === id);
