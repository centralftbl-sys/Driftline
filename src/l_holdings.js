
// ═══════════════ Holdings: buy, claim, build and run your own stations ═══════════════
// Materials chain uses existing commodities: ore → metals (refined) → machinery (components / spare parts).
// Consumables: food (crew), volatiles (reactor fuel), medicine (med bay), machinery (maintenance).
const PS_CELL = 36;
const PS_TIERS = [{ name: 'Outpost', grid: 5, cap: 10 }, { name: 'Station', grid: 7, cap: 22, cost: { cr: 40000, metals: 60, machinery: 30 } }, { name: 'Citadel', grid: 9, cap: 40, cost: { cr: 120000, metals: 150, machinery: 80 } }];
const PSM = {
  command: { name: 'Command Core', short: 'CMD', cat: 'Core', color: '#6fd3e6', gen: 5, crew: 2, cap: 4, o2: 6, store: 120, heat: 1, unique: true, desc: 'The heart of the station. Small reactor, berths and storage.' },
  hab: { name: 'Habitation Ring', short: 'HAB', cat: 'Core', color: '#9fd0ff', draw: 1, cap: 10, heat: 0.5, cost: { cr: 3000, metals: 10 }, work: 12, desc: 'Berths for 10 crew.' },
  lifesup: { name: 'Life Support', short: 'O2', cat: 'Core', color: '#7fe0c2', draw: 2, crew: 1, o2: 12, heat: 1, risk: 'leak', cost: { cr: 4000, metals: 6, machinery: 4 }, work: 14, desc: 'Air and water recycling for 12 crew.' },
  solar: { name: 'Solar Array', short: 'SOL', cat: 'Power', color: '#f0d24c', gen: 4, solar: true, heat: 0.3, cost: { cr: 2500, metals: 8 }, work: 10, desc: '4 power, more near the star, less in the Fringe.' },
  fusion: { name: 'Fusion Reactor', short: 'FUS', cat: 'Power', color: '#ff9f43', gen: 16, crew: 2, heat: 5, fuel: 0.12, risk: 'meltdown', cost: { cr: 9000, metals: 15, machinery: 8 }, work: 30, bp: true, desc: '16 power. Burns volatiles. Neglect it and it can melt down.' },
  battery: { name: 'Battery Bank', short: 'BAT', cat: 'Power', color: '#e8e070', battery: 60, cost: { cr: 3000, metals: 6, machinery: 3 }, work: 10, desc: 'Stores surplus power to ride out shortfalls.' },
  radiator: { name: 'Radiator Fin', short: 'RAD', cat: 'Power', color: '#c0d8e8', cool: 7, cost: { cr: 1800, metals: 8 }, work: 8, desc: 'Sheds 7 heat. Stations near the star run hot.' },
  dock: { name: 'Docking Arm', short: 'DCK', cat: 'Logistics', color: '#8fb5ff', draw: 1, crew: 1, store: 20, heat: 0.5, risk: 'clamp', cost: { cr: 3500, metals: 12 }, work: 14, desc: 'Lets traffic dock: docking fees, refuel sales and supply deliveries.' },
  storage: { name: 'Warehouse', short: 'STO', cat: 'Logistics', color: '#a8b4c0', store: 200, cost: { cr: 2000, metals: 10 }, work: 8, desc: '+200 t storage. Stored goods cost upkeep.' },
  relay: { name: 'Logistics Relay', short: 'REL', cat: 'Logistics', color: '#b8a0ff', draw: 2, crew: 1, heat: 1, cost: { cr: 8000, metals: 10, machinery: 6 }, work: 20, bp: true, desc: 'Links to your other relayed stations and shares consumables.' },
  mining: { name: 'Mining Rig', short: 'MIN', cat: 'Industry', color: '#c8a070', draw: 2, crew: 2, heat: 1, site: 'asteroid', wear: 1.6, cost: { cr: 5000, metals: 10, machinery: 4 }, work: 16, desc: 'Ore from the surrounding field. Asteroid sites only. Wears fast.' },
  refinery: { name: 'Ore Smelter', short: 'SML', cat: 'Industry', color: '#ff8a5c', draw: 3, crew: 2, heat: 2, cost: { cr: 7000, metals: 12, machinery: 6 }, work: 20, desc: 'Smelts 2 ore into 1 metal.' },
  factory: { name: 'Component Factory', short: 'FAB', cat: 'Industry', color: '#ffb070', draw: 4, crew: 3, heat: 2, cost: { cr: 12000, metals: 16, machinery: 6 }, work: 26, bp: true, desc: 'Metals and volatiles into machinery.' },
  hydro: { name: 'Hydroponics', short: 'HYD', cat: 'Life', color: '#7fd68a', draw: 2, crew: 1, heat: 0.5, cost: { cr: 4000, metals: 6, machinery: 2 }, work: 12, desc: 'Grows food for about 20 crew.' },
  medbay: { name: 'Med Bay', short: 'MED', cat: 'Life', color: '#ff9be0', draw: 1, crew: 1, heat: 0.5, cost: { cr: 5000, metals: 6, machinery: 3 }, work: 12, desc: 'Uses medicine. Lifts morale and softens accidents.' },
  rec: { name: 'Recreation Deck', short: 'REC', cat: 'Economy', color: '#e0a0ff', draw: 2, crew: 1, heat: 0.5, cost: { cr: 6000, metals: 8, machinery: 2 }, work: 14, desc: 'Morale, plus tourism income. Doubled near the star.' },
  tradehub: { name: 'Trade Hub', short: 'TRD', cat: 'Economy', color: '#e8c45a', draw: 2, crew: 2, heat: 1, needs: 'dock', cost: { cr: 9000, metals: 10, machinery: 5 }, work: 20, bp: true, desc: 'Doubles docking traffic and auto-sells goods you mark.' },
  lab: { name: 'Research Lab', short: 'LAB', cat: 'Economy', color: '#a0e8ff', draw: 3, crew: 2, heat: 1.5, cost: { cr: 10000, metals: 8, machinery: 8 }, work: 24, bp: true, desc: 'Research points: unlock blueprints or sell the data.' },
  yard: { name: 'Repair Yard', short: 'YRD', cat: 'Economy', color: '#9fe8c8', draw: 4, crew: 3, heat: 2, needs: 'dock', cost: { cr: 14000, metals: 20, machinery: 10 }, work: 30, bp: true, desc: 'Repair income from passing ships. Repairs your fleet for free here.' },
  maint: { name: 'Maintenance Bay', short: 'MNT', cat: 'Support', color: '#d0d0a0', draw: 1, crew: 2, heat: 0.5, cost: { cr: 4500, metals: 8, machinery: 4 }, work: 12, desc: 'Technicians repair worn modules using machinery as spare parts.' },
  drones: { name: 'Drone Works', short: 'DRN', cat: 'Support', color: '#c0ffc0', draw: 2, heat: 1, automation: 3, cost: { cr: 11000, metals: 10, machinery: 10 }, work: 24, bp: true, desc: 'Construction and repair drones. Replaces 3 crew. Builds faster.' },
  security: { name: 'Security Office', short: 'SEC', cat: 'Support', color: '#ffd0a0', draw: 1, crew: 2, cost: { cr: 4000, metals: 6 }, work: 10, desc: 'Prevents sabotage when morale is low.' },
  sensors: { name: 'Sensor Mast', short: 'SNS', cat: 'Defense', color: '#6fd3e6', draw: 1, crew: 1, heat: 0.5, cost: { cr: 4000, metals: 4, machinery: 3 }, work: 10, desc: 'Early warning, and reveals contacts within 5,000 su.' },
  turret: { name: 'Turret Platform', short: 'TUR', cat: 'Defense', color: '#ff6a5c', draw: 2, crew: 1, heat: 1, def: true, cost: { cr: 5000, metals: 12, weapons: 4 }, work: 14, desc: 'Adds a gun. Mk II mounts heavy weapons.' },
  shield: { name: 'Shield Projector', short: 'SHD', cat: 'Defense', color: '#7ab8ff', draw: 3, heat: 2, def: true, cost: { cr: 9000, metals: 8, machinery: 8 }, work: 22, bp: true, desc: 'Station-wide shield. Also stops micrometeors.' },
  pd: { name: 'Point Defense', short: 'PD', cat: 'Defense', color: '#ffa0a0', draw: 2, crew: 1, heat: 1, def: true, cost: { cr: 7000, metals: 8, weapons: 4 }, work: 16, bp: true, desc: 'Shoots down incoming missiles.' },
  hangar: { name: 'Drone Hangar', short: 'HGR', cat: 'Defense', color: '#ff9f43', draw: 3, crew: 2, heat: 1, def: true, cost: { cr: 12000, metals: 14, machinery: 8 }, work: 26, bp: true, desc: 'Launches defense fighters during raids.' },
};
const PS_PRIORITY = ['command', 'lifesup', 'hab', 'medbay', 'hydro', 'dock', 'maint', 'drones', 'security', 'sensors', 'turret', 'shield', 'pd', 'hangar', 'relay', 'mining', 'refinery', 'factory', 'tradehub', 'yard', 'lab', 'rec'];
const BP_SHOP = { concord: ['fusion', 'pd', 'yard', 'shield', 'mk2'], veyra: ['tradehub', 'lab', 'relay'], ashen: ['hangar', 'shield', 'fusion'], tessel: ['factory', 'drones', 'fusion', 'mk2'] };
const BP_PRICE = { fusion: 12000, pd: 9000, yard: 14000, shield: 11000, tradehub: 10000, lab: 12000, relay: 8000, hangar: 14000, factory: 12000, drones: 13000, mk2: 25000 };
const BP_RP = { fusion: 40, pd: 30, yard: 45, shield: 40, tradehub: 35, lab: 20, relay: 30, hangar: 45, factory: 40, drones: 45, mk2: 80 };
const FAC_LAW = { concord: { tax: 0.12, ban: ['hangar'], note: 'Military drone hangars are reserved for the Directorate.' }, veyra: { tax: 0.08, ban: [], note: 'Low taxes, few rules.' },
  ashen: { tax: 0.10, ban: ['rec'], note: 'Recreation decks are forbidden as decadent.' }, tessel: { tax: 0.06, ban: ['fusion'], note: 'Fusion reactors are banned near Tessel claims.' } };
const NPC_OWNERS = ['Halvard Mining Co.', 'Orrin & Daughters Freight', 'Saltglass Holdings', 'The Kessler Trust', 'Brightwater Logistics', 'Mother Lode Partners'];
const STOREKEYS = Object.keys(COMS);

// ── setup & persistence ──
function initHoldings(g) {
  g.holdings = g.holdings || []; g.bp = g.bp || {}; g.licenses = g.licenses || {}; g.rp = g.rp || 0;
  if (!g.sites) g.sites = genSites();
  if (g.outposts && g.outposts.length) { for (const o of g.outposts) migrateOutpost(o); g.outposts = []; }
  for (const ps of g.holdings) { psFix(ps); if (ps.inbound && ps.inbound.length) { for (const ib of ps.inbound) G.credits += ib.cost || 0; ps.inbound = []; } }
}
function psFix(ps) {
  ps.store = ps.store || {}; for (const c of STOREKEYS) ps.store[c] = ps.store[c] || 0;
  ps.settings = Object.assign({ maintThr: 60, insurance: false, security: false, lease: false, garrison: false, sellData: false, refuel: false, autosell: {}, orders: {} }, ps.settings || {});
  ps.inbound = ps.inbound || []; ps.history = ps.history || []; ps.alerts = ps.alerts || []; ps.morale = ps.morale ?? 60; ps.battery = ps.battery || 0; ps.alert = ps.alert || 'green'; ps.auto = ps.auto ?? true;
  ps.tier = ps.tier || 1; ps.crew = ps.crew || 0; ps.rp = ps.rp || 0; ps.hpF = ps.hpF ?? 1;
  for (const m of ps.mods) { m.mk = m.mk || 1; if (m.on === undefined) m.on = true; }
  return ps;
}
function psById(id) { return (G && G.holdings || []).find(p => p.id === id) || null; }
function farFromAll(x, y, d) { return STATIONS.every(s => (s.x - x) ** 2 + (s.y - y) ** 2 > d * d) && (!G || !G.sites || G.sites.every(s => (s.x - x) ** 2 + (s.y - y) ** 2 > d * d)) && (!G || !G.holdings || G.holdings.every(s => (s.x - x) ** 2 + (s.y - y) ** 2 > d * d)); }
function randomModsFor(n, site) {
  const pool = ['hab', 'lifesup', 'solar', 'solar', 'storage', 'dock', 'hydro', 'turret', 'maint', 'battery', 'radiator', 'sensors', 'refinery', 'medbay', 'rec'];
  if (site === 'asteroid') pool.push('mining', 'mining', 'refinery');
  const out = [{ t: 'command', cx: 0, cy: 0 }], used = new Set(['0,0']);
  for (let i = 0; i < n; i++) {
    const free = []; for (const m of out) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = `${m.cx + dx},${m.cy + dy}`; if (!used.has(k) && Math.abs(m.cx + dx) <= 2 && Math.abs(m.cy + dy) <= 2) free.push([m.cx + dx, m.cy + dy]); }
    if (!free.length) break; const [cx, cy] = pick(free); used.add(`${cx},${cy}`); out.push({ t: i === 0 ? 'lifesup' : i === 1 ? 'hab' : pick(pool), cx, cy });
  }
  return out;
}
function genSites() {
  const s = [], place = (x, y) => { for (let k = 0; k < 30; k++) { if (s.every(o => (o.x - x) ** 2 + (o.y - y) ** 2 > 2600 ** 2) && STATIONS.every(o => (o.x - x) ** 2 + (o.y - y) ** 2 > 2600 ** 2)) return true; return false; } };
  BELTS.forEach((b, i) => { if (b.ring) return; const a = rand(0, TAU), x = b.x + Math.cos(a) * b.r * 0.4, y = b.y + Math.sin(a) * b.r * 0.4; if (place(x, y)) s.push({ id: nid(), type: 'asteroid', x, y, belt: i, name: `${b.name} claim` }); });
  for (let i = 0; i < 3; i++) { const a = rand(0, TAU), r = 15400 + rand(-300, 300), x = Math.cos(a) * r, y = Math.sin(a) * r; if (place(x, y)) s.push({ id: nid(), type: 'asteroid', x, y, belt: 3, name: `Outer Ring claim ${'ABC'[i]}` }); }
  const dn = ['Hulk of the Saint Ardent', 'Abandoned Relay 7', 'Old Vantage Platform', 'Wreck of Greywater Hold'].sort(() => Math.random() - 0.5);
  for (let i = 0; i < 3; i++) { const p = randomPoint(2600); if (!place(p.x, p.y)) continue; s.push({ id: nid(), type: 'derelict', x: p.x, y: p.y, name: dn[i], mods: randomModsFor(randi(3, 6), 'deep').map(m => ({ ...m, cond: randi(5, 35) })) }); }
  for (let i = 0; i < 3; i++) {
    let x, y, site = 'deep', belt = null;
    if (i === 0) { const b = pick(BELTS.filter(b => !b.ring)); const a = rand(0, TAU); x = b.x + Math.cos(a) * b.r * 0.6; y = b.y + Math.sin(a) * b.r * 0.6; site = 'asteroid'; belt = BELTS.indexOf(b); }
    else { const p = randomPoint(3000); x = p.x; y = p.y; }
    if (!place(x, y)) continue;
    const mods = randomModsFor(randi(5, 8), site).map(m => ({ ...m, cond: randi(50, 92) }));
    const site0 = { id: nid(), type: 'sale', site, belt, x, y, owner: pick(NPC_OWNERS), name: pick(['Ridgeline', 'Quietwater', 'Harrow Point', 'Low Lantern', 'Cobalt Rest', 'Thistle Yard']) + ' ' + (site === 'asteroid' ? 'Mine' : 'Platform'), mods, crew: randi(6, 12), auction: i === 2 };
    site0.price = Math.round(siteValue(site0) * (site0.auction ? 1.25 : 1.1) / 100) * 100; s.push(site0);
  }
  return s;
}
function modValue(t) { const c = PSM[t].cost; if (!c) return 6000; return c.cr + (c.metals || 0) * 75 + (c.machinery || 0) * 180 + (c.weapons || 0) * 260; }
function siteValue(site) { return site.mods.reduce((a, m) => a + modValue(m.t) * (m.cond ?? 100) / 100, 0) + (site.crew || 0) * 250 + 8000; }
function psValue(ps) { return ps.mods.reduce((a, m) => a + (m.prog < 0 && !m.wreck ? modValue(m.t) * m.cond / 100 : 0), 0) + ps.tier * 10000 + STOREKEYS.reduce((a, c) => a + ps.store[c] * COMS[c].base * 0.6, 0); }
function sovereign(x, y) { let best = null, bd = 7500 * 7500; for (const st of STATIONS) { const d = (st.x - x) ** 2 + (st.y - y) ** 2; if (d < bd) { bd = d; best = st; } } return best ? best.fac : null; }
function licenseCost(fac) { if (G.story[fac] >= 1) return 0; const v = G.rep[fac] ?? 0; return v <= -25 ? null : v >= 10 ? 5000 : v >= 0 ? 9000 : 16000; }
function hasLicense(fac) { return !fac || !!G.licenses[fac]; }
function psEnv(ps) {
  const d = Math.hypot(ps.x, ps.y), b = ps.belt != null ? BELTS[ps.belt] : null;
  const nearStar = d < 6000, fringe = d > 15800;
  let nearPlanet = false; for (const st of STATIONS) if (st.planet && Math.hypot(st.x + st.planet.dx - ps.x, st.y + st.planet.dy - ps.y) < 3000) nearPlanet = true;
  return { nearStar, fringe, belt: ps.site === 'asteroid', nearPlanet, solarK: clamp(1.7 - d / 11000, 0.35, 1.7), heatEnv: nearStar ? 7 : d < 9000 ? 2 : 0, wearK: (ps.site === 'asteroid' ? 1.25 : 1) * (nearStar ? 1.25 : 1), b };
}
function newStation(site, name, mods, crew) {
  const sov = sovereign(site.x, site.y);
  const ps = psFix({ id: nid(), name, x: site.x, y: site.y, site: site.site || (site.type === 'asteroid' ? 'asteroid' : 'deep'), belt: site.belt ?? null, tier: 1,
    mods: mods.map(m => ({ id: nid(), t: m.t, cx: m.cx, cy: m.cy, cond: m.cond ?? 100, prog: -1, mk: 1, on: true })), crew, licensedBy: sov });
  ps.store.food = 30; ps.store.volatiles = 10; ps.store.machinery = 6;
  G.holdings.push(ps); spawnPS(ps); return ps;
}
function migrateOutpost(o) {
  const map = { turrets: 'turret', plating: 'storage', shieldgen: 'shield', drones: 'hangar', mines: 'turret', drill: 'mining', extractor: 'mining', refinery: 'refinery', fabricator: 'factory', hydro: 'hydro', silos: 'storage', repair: 'yard', sensors: 'sensors', hangar: 'hab', beacon: 'tradehub' };
  const types = ['command', 'lifesup', 'hab', 'solar', 'mining', 'storage', ...(o.mods || []).map(m => map[m]).filter(Boolean)];
  const mods = [], used = new Set();
  const spots = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1], [2, 0], [-2, 0], [0, 2], [0, -2], [2, 1], [-2, 1]];
  types.forEach((t, i) => { if (spots[i]) { mods.push({ t, cx: spots[i][0], cy: spots[i][1], cond: 80 }); for (const b of ['fusion', 'factory', 'shield', 'hangar', 'yard', 'tradehub']) if (t === b) G.bp[b] = true; } });
  const ps = { id: nid(), name: `${BELTS[o.belt].name} Outpost`, x: o.x, y: o.y, site: 'asteroid', belt: o.belt, tier: o.level >= 2 ? 2 : 1, mods: mods.map(m => ({ id: nid(), ...m, prog: -1, mk: 1, on: true })), crew: 8, licensedBy: null, store: {} };
  psFix(ps); for (const c of ['ore', 'volatiles', 'metals', 'machinery']) ps.store[c] = Math.floor(o.store && o.store[c] || 0); ps.store.food = Math.floor(o.supplies || 20);
  G.holdings.push(ps);
}

// ── grid helpers ──
function psBuilt(ps) { return ps.mods.filter(m => m.prog < 0 && !m.wreck); }
function psCount(ps, t, activeOnly) { return ps.mods.filter(m => m.t === t && m.prog < 0 && !m.wreck && (!activeOnly || m.active)).length; }
function psAt(ps, cx, cy) { return ps.mods.find(m => m.cx === cx && m.cy === cy); }
function psHalf(ps) { return (PS_TIERS[ps.tier - 1].grid - 1) / 2; }
function canPlace(ps, t, cx, cy) {
  const D = PSM[t], h = psHalf(ps);
  if (Math.abs(cx) > h || Math.abs(cy) > h) return 'Outside the frame. Expand the station first.';
  if (psAt(ps, cx, cy)) return 'That cell is taken.';
  if (!ps.mods.some(m => Math.abs(m.cx - cx) + Math.abs(m.cy - cy) === 1)) return 'Must connect to an existing module.';
  if (ps.mods.length >= PS_TIERS[ps.tier - 1].cap) return `${PS_TIERS[ps.tier - 1].name} frame is full (${PS_TIERS[ps.tier - 1].cap} modules).`;
  if (D.unique && ps.mods.some(m => m.t === t)) return 'Only one allowed.';
  if (D.site && ps.site !== D.site) return 'Needs an asteroid site.';
  if (D.needs && !psCount(ps, D.needs)) return `Needs a ${PSM[D.needs].name} first.`;
  if (D.bp && !G.bp[t]) return 'Blueprint not owned.';
  const sov = sovereign(ps.x, ps.y); if (sov && FAC_LAW[sov].ban.includes(t)) return `Banned under ${FACTIONS[sov].short} law.`;
  return null;
}
function connectedWithout(ps, skip) {
  const rest = ps.mods.filter(m => m !== skip), core = rest.find(m => m.t === 'command'); if (!core) return false;
  const seen = new Set([core]), q = [core];
  while (q.length) { const a = q.pop(); for (const b of rest) if (!seen.has(b) && Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy) === 1) { seen.add(b); q.push(b); } }
  return seen.size === rest.length;
}
function placeOrder(ps, t, cx, cy, quiet) {
  const why = canPlace(ps, t, cx, cy); if (why) { if (!quiet) UI.notices = [why]; return false; }
  const c = PSM[t].cost; if (G.credits < c.cr) { if (!quiet) UI.notices = [`Need ${fmt(c.cr)} cr for labor.`]; return false; }
  G.credits -= c.cr;
  ps.mods.push({ id: nid(), t, cx, cy, cond: 100, prog: 0, mk: 1, on: true, paidMat: false });
  if (!quiet) UI.notices = [`${PSM[t].name} ordered. Construction starts when the materials are in station storage.`];
  return true;
}
function matNeed(t, mult = 1) { const c = PSM[t].cost || {}; const o = {}; for (const k of ['metals', 'machinery', 'weapons']) if (c[k]) o[k] = Math.ceil(c[k] * mult); return o; }
function hasMats(ps, need) { return Object.entries(need).every(([k, v]) => ps.store[k] >= v); }
function takeMats(ps, need) { for (const [k, v] of Object.entries(need)) ps.store[k] -= v; }

// ── simulation (every 3.5 s) ──
function condEff(c) { return c >= 60 ? 1 : c >= 30 ? 0.6 + (c - 30) / 75 : Math.max(0.1, c / 50); }
function psSpec(ps) {
  const b = psBuilt(ps).filter(m => !['command', 'hab', 'lifesup', 'solar', 'fusion', 'battery', 'radiator', 'storage'].includes(m.t)); if (b.length < 4) return null;
  const g = { Mining: ['mining', 'refinery'], Foundry: ['factory', 'refinery'], Research: ['lab'], Trade: ['dock', 'tradehub', 'rec', 'yard'], Fortress: ['turret', 'shield', 'pd', 'hangar', 'sensors'] };
  for (const k in g) if (b.filter(m => g[k].includes(m.t)).length / b.length >= 0.6) return k;
  return null;
}
function psTick(ps) {
  const env = psEnv(ps), built = psBuilt(ps), S = ps.store, spec = psSpec(ps);
  ps.crippledT = Math.max(0, (ps.crippledT || 0) - 3.5);
  for (const m of ps.mods) { if (m.trip > 0) m.trip -= 1; m.active = false; m.powered = false; }
  // crew & life
  const automation = built.filter(m => m.t === 'drones' && m.on).length * 3;
  const crewNeed = Math.max(0, built.reduce((a, m) => a + (m.on ? (PSM[m.t].crew || 0) : 0), 0) - automation);
  const crewCap = built.reduce((a, m) => a + (PSM[m.t].cap || 0), 0);
  const staff = crewNeed ? clamp(ps.crew / crewNeed, 0, 1) : 1;
  // power
  let gen = 0;
  for (const m of built) {
    const D = PSM[m.t]; if (!D.gen || !m.on || m.trip > 0 || (ps.crippledT > 0 && m.t !== 'command')) continue;
    if (D.fuel) { if (S.volatiles >= D.fuel) { S.volatiles -= D.fuel; } else { m.noFuel = true; continue; } }
    m.noFuel = false; gen += D.gen * (D.solar ? env.solarK : 1) * condEff(m.cond) * (m.mk === 2 ? 1.5 : 1); m.active = m.powered = true;
  }
  const batCap = built.reduce((a, m) => a + (PSM[m.t].battery || 0) * (m.mk === 2 ? 1.6 : 1), 0);
  const red = ps.alert === 'red';
  let avail = gen + Math.min(ps.battery, 30), used = 0, blackout = false;
  const order = built.filter(m => !PSM[m.t].gen).sort((a, b) => PS_PRIORITY.indexOf(a.t) - PS_PRIORITY.indexOf(b.t));
  for (const m of order) {
    const D = PSM[m.t]; if (!m.on || m.trip > 0) continue;
    const draw = (D.draw || 0) * (red && D.def ? 2 : 1);
    if (draw <= avail - used) { used += draw; m.powered = true; m.active = ps.crippledT <= 0 || ['lifesup', 'hab', 'medbay'].includes(m.t); } else blackout = true;
  }
  ps.battery = clamp(ps.battery + (gen - used), 0, batCap);
  // heat
  const heat = built.reduce((a, m) => a + (m.active ? (PSM[m.t].heat || 0) : 0), 0) + env.heatEnv;
  const cool = 10 + built.reduce((a, m) => a + (m.active || PSM[m.t].cool ? (PSM[m.t].cool || 0) * condEff(m.cond) : 0), 0);
  const hot = heat > cool;
  const o2 = built.reduce((a, m) => a + (m.active ? (PSM[m.t].o2 || 0) * condEff(m.cond) * (m.leak > 0 ? 0.5 : 1) : 0), 0);
  for (const m of ps.mods) if (m.leak > 0) m.leak--;
  const moraleK = ps.morale < 25 ? 0.35 : ps.morale < 45 ? 0.8 : ps.morale > 75 ? 1.1 : 1;
  const eff = m => m.active ? condEff(m.cond) * (0.4 + 0.6 * staff) * moraleK * (hot ? 0.8 : 1) * (m.mk === 2 ? 1.5 : 1) * (red && !PSM[m.t].def && PSM[m.t].cat !== 'Core' ? 0.5 : 1) : 0;
  for (const m of built) m.eff = eff(m);
  const sum = t => built.filter(m => m.t === t).reduce((a, m) => a + m.eff, 0);
  // consumption
  const hungry = S.food < ps.crew * 0.02;
  const synth = built.some(m => m.t === 'command' && m.active) ? 0.04 : 0; // emergency ration synth feeds a skeleton crew
  S.food = Math.max(0, S.food - ps.crew * 0.02 + synth) + sum('hydro') * 0.4;
  const foodNet = synth + sum('hydro') * 0.4 - ps.crew * 0.02;
  const suffocating = ps.crew > o2 + 0.5;
  if (suffocating && Math.random() < 0.1) { ps.crew = Math.max(0, ps.crew - 1); }
  if (hungry && Math.random() < 0.025) ps.crew = Math.max(0, ps.crew - 1);
  const med = sum('medbay'); let medOK = false; if (med > 0 && S.medicine >= 0.015 * med) { S.medicine -= 0.015 * med; medOK = true; }
  // production
  const specK = k => spec === k ? 1.25 : 1;
  if (ps.site === 'asteroid') S.ore += sum('mining') * 1.0 * specK('Mining') * (ps.settings.lease ? 0.5 : 1);
  const smelt = Math.min(S.ore, sum('refinery') * 0.8 * specK('Foundry') * specK('Mining')); S.ore -= smelt; S.metals += smelt / 2;
  const fab = sum('factory') * specK('Foundry'); if (fab > 0 && S.metals >= 0.4 * fab && S.volatiles >= 0.2 * fab) { S.metals -= 0.4 * fab; S.volatiles -= 0.2 * fab; S.machinery += 0.25 * fab; }
  ps.rp += sum('lab') * 0.12 * specK('Research');
  // storage cap
  const cap = psStoreCap(ps), tot = STOREKEYS.reduce((a, c) => a + S[c], 0);
  if (tot > cap) { const over = tot - cap; for (const c of ['ore', 'metals', 'volatiles']) { const t = Math.min(S[c], over * (S[c] / tot) + 0.01); S[c] -= t; } ps.overflow = true; } else ps.overflow = false;
  // wear & maintenance
  for (const m of built) m.cond = Math.max(0, m.cond - 0.035 * env.wearK * (PSM[m.t].wear || 1) * (m.active ? 1 : 0.3) * (hot ? 1.8 : 1));
  let techs = sum('maint') * 2 + sum('drones') * 1;
  ps.noParts = false;
  while (techs > 0.05) {
    const tgt = built.filter(m => m.cond < ps.settings.maintThr).sort((a, b) => a.cond - b.cond)[0]; if (!tgt) break;
    if (S.machinery < 0.04) { ps.noParts = true; break; }
    const k = Math.min(1, techs); S.machinery -= 0.04 * k; tgt.cond = Math.min(100, tgt.cond + 1.4 * k); techs -= k;
  }
  // incidents
  const secure = sum('security') > 0.3;
  for (const m of built) {
    if (m.cond >= 30) continue;
    if (Math.random() < (30 - m.cond) / 30 * 0.012) psIncident(ps, m, medOK);
    if (m.cond <= 0) { m.wreck = true; psAlertLog(ps, 'wreck' + m.id, `${ps.name}: ${PSM[m.t].name} has failed completely and must be rebuilt.`); }
  }
  if (ps.morale < 25 && !secure && Math.random() < 0.012) { const m = pick(built); if (m) { m.cond = Math.max(0, m.cond - 18); m.trip = 8; psAlertLog(ps, 'sab', `${ps.name}: sabotage! Disgruntled crew wrecked the ${PSM[m.t].name}.`); } }
  if (env.belt && Math.random() < 0.01 && !(sum('shield') > 0.3)) { const m = pick(built); if (m) m.cond = Math.max(0, m.cond - 4); }
  // morale
  const unpaid = (ps.unpaid || 0) > 0;
  const target = 55 + Math.min(25, sum('rec') * 12) + (medOK ? 10 : 0) + (secure ? 5 : 0) - (hungry ? 30 : 0) - (ps.crew > crewCap ? 20 : 0) - (suffocating ? 35 : 0) - (unpaid ? 25 : 0) - (red ? 8 : 0) - (hot ? 6 : 0);
  ps.morale = clamp(ps.morale + (target - ps.morale) * 0.06, 0, 100);
  // construction
  const crews = 1 + Math.floor(sum('drones'));
  let slots = crews;
  for (const m of ps.mods) {
    if (m.prog < 0 || slots <= 0) continue;
    const need = m.upg ? matNeed(m.t, 1.5) : matNeed(m.t);
    if (!m.paidMat) { if (hasMats(ps, need)) { takeMats(ps, need); m.paidMat = true; } else { m.waiting = true; continue; } }
    m.waiting = false; slots--;
    const idle = Math.max(0, ps.crew - crewNeed);
    const rate = (0.6 + Math.min(0.6, idle * 0.08)) * (1 + 0.5 * sum('drones')) * (blackout ? 0.5 : 1);
    m.prog += rate;
    const work = (PSM[m.t].work || 10) * (m.upg ? 1.2 : 1);
    if (m.prog >= work) {
      m.prog = -1; m.cond = 100; if (m.upg) { m.mk = 2; m.upg = false; }
      psAlertLog(ps, 'built' + m.id, `${ps.name}: ${PSM[m.t].name}${m.mk === 2 ? ' Mk II' : ''} is complete.`, 'gold');
      psRespawn(ps);
    }
  }
  // threats & alert level
  const e = psEntity(ps); let near2 = false, near4 = false;
  if (e) for (const s of Wd.ships) { if (s.dead || !hostile(e, s) || isHidden(s, e)) continue; const dd = d2(s, e); if (dd < 1600 * 1600) near2 = true; else if (dd < 4200 * 4200 && sum('sensors') > 0) near4 = true; }
  if (ps.auto) ps.alert = near2 ? 'red' : near4 ? 'yellow' : 'green';
  if (sum('sensors') > 0) for (const p of G.pois) if (!p.found && !p.done && (p.x - ps.x) ** 2 + (p.y - ps.y) ** 2 < 5000 * 5000) { p.found = true; log(`${ps.name} sensors: ${POI_TYPES[p.type].name} located.`, 'gold'); }
  if (sum('sensors') > 0) for (const s of Wd.ships) if (s.role === 'ambush' && !s.revealed && (s.x - ps.x) ** 2 + (s.y - ps.y) ** 2 < 5000 * 5000) s.revealed = true;
  psRaidCheck(ps, env);
  // alerts summary for UI
  const A = [];
  if (ps.crippledT > 0) A.push(['bad', `Station crippled. Systems back in ${Math.ceil(ps.crippledT)} s.`]);
  if (blackout) A.push(['bad', `Power shortfall: ${fmt(used)}/${(gen).toFixed(1)} used. Some modules are dark.`]);
  if (built.some(m => m.noFuel)) A.push(['bad', 'Fusion reactor out of volatiles.']);
  if (suffocating) A.push(['bad', `Life support for ${o2.toFixed(0)} but ${ps.crew} crew aboard. Crew are dying.`]);
  if (hungry) A.push(['bad', 'Out of food. Crew are starving.']);
  else if (foodNet < 0 && S.food / -foodNet < 120) A.push(['warn', `Food running low (~${Math.ceil(S.food / -foodNet * 3.5 / 60)} min left). Build Hydroponics or ship food in.`]);
  if (ps.crew > crewCap) A.push(['warn', `Overcrowded: ${ps.crew} crew, ${crewCap} berths.`]);
  if (staff < 0.8) A.push(['warn', `Understaffed: ${ps.crew}/${crewNeed} crew. Output reduced.`]);
  if (hot) A.push(['warn', `Overheating: ${heat.toFixed(1)} heat, ${cool.toFixed(1)} cooling. Wear doubled.`]);
  if (ps.morale < 30) A.push(['bad', `Morale ${Math.round(ps.morale)}%. Strikes${secure ? '' : ' and sabotage'} likely.`]);
  if (ps.noParts) A.push(['warn', 'Maintenance stalled: no machinery for spare parts.']);
  if (ps.overflow) A.push(['warn', 'Storage full. Excess raw goods are being dumped.']);
  const failing = built.filter(m => m.cond < 30); if (failing.length) A.push(['bad', `${failing.length} module${failing.length > 1 ? 's' : ''} below 30% condition. Accidents likely.`]);
  if (ps.mods.some(m => m.waiting)) A.push(['warn', 'Construction waiting on materials in station storage.']);
  if (ps.alert === 'red') A.push(['bad', 'RED ALERT: hostiles near the station.']);
  ps.alerts = A;
  ps.stats = { gen, used, batCap, heat, cool, o2, crewNeed, crewCap, staff, hungry, suffocating, blackout, hot, spec, env };
  for (const a of A) if (a[0] === 'bad') psAlertLog(ps, a[1].replace(/[\d.,/~%()]+/g, '').slice(0, 20), `${ps.name}: ${a[1]}`, 'bad', 150);
}
function psStoreCap(ps) { return psBuilt(ps).reduce((a, m) => a + (PSM[m.t].store || 0) * (m.mk === 2 ? 1.6 : 1), 0); }
const PS_LOGT = {};
function psAlertLog(ps, key, msg, cls = 'bad', gap = 9999) { const k = ps.id + key; if (k in PS_LOGT && G.time - PS_LOGT[k] < gap) return; PS_LOGT[k] = G.time; log(msg, cls); }
function psIncident(ps, m, medOK) {
  const risk = PSM[m.t].risk;
  if (risk === 'meltdown') {
    for (const o of ps.mods) if (Math.abs(o.cx - m.cx) <= 1 && Math.abs(o.cy - m.cy) <= 1 && o !== m) o.cond = Math.max(0, o.cond - 35);
    m.cond = Math.max(0, m.cond - 30); ps.crew = Math.max(0, ps.crew - (medOK ? 1 : 3));
    const e = psEntity(ps); if (e) { e.hp -= e.st.hull * 0.25; explosion(ps.x + m.cx * PS_CELL, ps.y + m.cy * PS_CELL, 40); }
    psAlertLog(ps, 'melt' + m.id, `${ps.name}: REACTOR MELTDOWN. Neighboring modules damaged, crew lost.`, 'bad', 0);
  } else if (risk === 'leak') { m.leak = 20; ps.crew = Math.max(0, ps.crew - (medOK ? 0 : 1)); ps.morale -= 8; psAlertLog(ps, 'leak' + m.id, `${ps.name}: atmosphere leak in Life Support.`, 'bad', 60); }
  else if (risk === 'clamp') { m.trip = 25; m.cond = Math.max(0, m.cond - 8); psAlertLog(ps, 'clamp' + m.id, `${ps.name}: docking clamp failure. Docking offline.`, 'bad', 60); }
  else { m.trip = 15; m.cond = Math.max(0, m.cond - 10); psAlertLog(ps, 'brk' + m.id, `${ps.name}: ${PSM[m.t].name} broke down.`, 'bad', 60); }
}
function psRaidCheck(ps, env) {
  if (!ps.raidT) ps.raidT = G.time + 900; // new holdings get a quiet period
  if (G.time < ps.raidT) return;
  const sov = sovereign(ps.x, ps.y);
  const k = 0.0005 * (env.fringe ? 1.6 : 1) * (sov ? (ps.settings.security ? 0.4 : 0.8) : 1.1) * clamp(psValue(ps) / 80000, 0.5, 1.6);
  let raiders = null;
  if (Math.random() < k) raiders = { fac: 'pirate', n: randi(2, 4) };
  else if (ps.settings.garrison && sov && atWarWith(sov).length && Math.random() < 0.0015) raiders = { fac: pick(atWarWith(sov)), n: randi(3, 4) };
  if (!raiders) return;
  ps.raidT = G.time + 900;
  const a = rand(0, TAU), g = { wp: { x: ps.x, y: ps.y } };
  for (let i = 0; i < raiders.n; i++) {
    const hull = raiders.fac === 'pirate' ? (Math.random() < 0.5 ? 'wren' : pick(['skiff', 'talon'])) : pick(FAC_YARD[raiders.fac].filter(h => h !== 'halberd'));
    const s = new Ship(genCfg(hull, 1), raiders.fac, ps.x + Math.cos(a) * 2400 + rand(-200, 200), ps.y + Math.sin(a) * 2400 + rand(-200, 200), { role: 'pirate', group: g });
    s.name = raiders.fac === 'pirate' ? 'Raider' : `${FACTIONS[raiders.fac].short} raider`; s.angry = true; s.raider = true; Wd.ships.push(s);
  }
  psAlertLog(ps, 'raid', `${ps.name}: ${raiders.fac === 'pirate' ? 'raiders' : FACTIONS[raiders.fac].name + ' warships'} inbound!`, 'bad', 0);
  if (ps.settings.security && sov && raiders.fac !== sov) {
    const home = STATIONS.filter(s => s.fac === sov).sort((a, b) => d2(a, ps) - d2(b, ps))[0];
    if (home) for (let i = 0; i < 2; i++) { const s = new Ship(genCfg(pick(FAC_YARD[sov].filter(h => h !== 'halberd')), 1), sov, ps.x + rand(-500, 500), ps.y + rand(-500, 500), { role: 'patrol', home: home.id }); s.name = `${FACTIONS[sov].short} security`; Wd.ships.push(s); }
    log(`${FACTIONS[sov].short} security responding to ${ps.name}.`, 'good');
  }
}

// ── economy (every minute) ──
function avgBuyPrice(c) { return STATIONS.reduce((a, st) => a + buyPrice(st, c), 0) / STATIONS.length; }
function psMinute(ps, mins = 1) {
  const st = ps.stats; if (!st) return;
  const env = st.env, built = psBuilt(ps), sum = t => built.filter(m => m.t === t).reduce((a, m) => a + (m.eff || 0), 0), spec = st.spec;
  const sov = sovereign(ps.x, ps.y), law = sov ? FAC_LAW[sov] : null, licensed = !sov || G.licenses[sov];
  const inc = {}, exp = {}, add = (o, k, v) => { if (v > 0.5) o[k] = (o[k] || 0) + Math.round(v * mins); };
  const dock = sum('dock'), hub = sum('tradehub'), traffic = STATIONS.some(s => (s.x - ps.x) ** 2 + (s.y - ps.y) ** 2 < 7000 * 7000) ? 1 : 0.5;
  add(inc, 'Docking fees', dock * 4 * (1 + hub) * traffic * 25 * (spec === 'Trade' ? 1.25 : 1));
  if (ps.settings.refuel && dock > 0) { const q = Math.min(Math.max(0, ps.store.volatiles - 20), 3 * mins); ps.store.volatiles -= q; add(inc, 'Refuel sales', q * avgSell('volatiles') * 1.1 / mins); }
  add(inc, 'Repair yard', sum('yard') * 150 * (spec === 'Trade' ? 1.25 : 1));
  add(inc, 'Tourism', sum('rec') * 60 * (env.nearStar || env.nearPlanet ? 2 : 1));
  if (ps.settings.sellData && ps.rp >= 1) { const q = Math.floor(ps.rp); ps.rp -= q; add(inc, 'Research data', q * 40 / mins); }
  if (ps.settings.lease && ps.site === 'asteroid') add(inc, 'Mining lease', 180);
  if (ps.settings.garrison && sov && atWarWith(sov).length && psCount(ps, 'turret') >= 2) add(inc, 'Garrison contract', 220);
  if (hub > 0) for (const c of STOREKEYS) if (ps.settings.autosell[c]) { const q = Math.min(Math.max(0, Math.floor(ps.store[c] - 20)), Math.round(30 * mins)); if (q > 0) { ps.store[c] -= q; add(inc, 'Auto-sales', q * avgSell(c) * 0.8 / mins); } }
  const gross = Object.values(inc).reduce((a, b) => a + b, 0);
  add(exp, 'Crew wages', ps.crew * 4);
  if (law) add(exp, licensed ? `${FACTIONS[sov].short} taxes` : 'Unlicensed penalty tax', gross / mins * law.tax * (licensed ? 1 : 2.5));
  if (ps.settings.insurance) add(exp, 'Insurance', psValue(ps) * 0.002);
  if (ps.settings.security && sov) add(exp, 'Security contract', 150);
  add(exp, 'Storage upkeep', STOREKEYS.reduce((a, c) => a + ps.store[c], 0) * 0.02);
  // supply orders
  if (dock > 0) for (const c in ps.settings.orders) {
    const tgt = ps.settings.orders[c]; if (!tgt || ps.store[c] >= tgt * 0.6 || ps.inbound.some(i => i.c === c)) continue;
    const q = Math.min(40, Math.ceil(tgt - ps.store[c])), cost = Math.round(q * avgBuyPrice(c) * 1.1 + 150);
    if (G.credits >= cost && psDispatch(ps, c, q, cost)) add(exp, 'Supply orders', cost / mins);
  }
  for (const ib of [...ps.inbound]) if (!Wd.ships.some(s => s.id_ib === ib.key && !s.dead)) { ps.inbound = ps.inbound.filter(x => x !== ib); log(`${ps.name}: supply hauler with ${ib.q} t ${COMS[ib.c].name.toLowerCase()} was lost.`, 'bad'); }
  const net = Object.values(inc).reduce((a, b) => a + b, 0) - Object.values(exp).reduce((a, b) => a + b, 0);
  G.credits += net;
  if (G.credits < 0) { G.credits = 0; ps.unpaid = (ps.unpaid || 0) + 1; if (ps.unpaid >= 3 && ps.crew > 0) { const q = Math.ceil(ps.crew * 0.2); ps.crew -= q; log(`${ps.name}: ${q} unpaid crew walked out.`, 'bad'); } }
  else ps.unpaid = 0;
  ps.lastPL = { inc, exp, net, mins }; ps.history.push(Math.round(net / mins)); if (ps.history.length > 15) ps.history.shift();
  return net;
}
function psDispatch(ps, c, q, cost) {
  if (!Wd) return false;
  const from = STATIONS.filter(s => G.rep[s.fac] > -25).sort((a, b) => d2(a, ps) - d2(b, ps))[0]; if (!from) return false;
  G.credits -= cost;
  const s = new Ship(genCfg('mule', 0), from.fac, from.x + rand(-120, 120), from.y + rand(-120, 120), { role: 'trader', dest: 'ps' + ps.id, a: Math.atan2(ps.y - from.y, ps.x - from.x) });
  s.psDest = ps.id; s.cargoC = c; s.cargoQ = q; s.id_ib = nid();
  Wd.ships.push(s); decorateTrader(s, from, null); s.name = `Supply hauler ${s.shipName}`;
  ps.inbound.push({ c, q, cost, key: s.id_ib, ship: s.shipName });
  return true;
}
function psDeliver(s) {
  const ps = psById(s.psDest); if (!ps) return;
  ps.store[s.cargoC] += s.cargoQ; ps.inbound = ps.inbound.filter(i => i.key !== s.id_ib);
  for (const e of Wd.ships) if (e.role === 'escort' && e.leader === s) { e.dead = true; e.docked = true; }
  if (player && d2(player, ps) < 6000 * 6000) log(`${ps.name}: supply hauler ${s.shipName} delivered ${s.cargoQ} t ${COMS[s.cargoC].name.toLowerCase()}.`, 'good');
}
function psDestName(s) { if (s.psDest) { const p = psById(s.psDest); return p ? p.name : 'your station'; } return STN[s.dest] ? STN[s.dest].name : '?'; }

// ── world entity ──
function psHullDef(ps) {
  const b = psBuilt(ps), n = b.length, shields = b.filter(m => m.t === 'shield').length, turrets = b.filter(m => m.t === 'turret').sort((a, c) => a.id - c.id).slice(0, 8);
  const ext = Math.max(1, ...ps.mods.map(m => Math.max(Math.abs(m.cx), Math.abs(m.cy))));
  const fort = psSpec(ps) === 'Fortress' ? 1.25 : 1;
  HULLS['ps_' + ps.id] = { name: ps.name, cls: PS_TIERS[ps.tier - 1].name, price: 0, hull: (3000 + 500 * n) * fort, armor: (500 + 80 * n) * fort, flux: 800 + 2500 * shields, diss: 100 + 220 * shields, shEff: 0.8, shArc: shields ? 360 : 0,
    speed: 0, accel: 0, turn: 0, cargo: 0, r: (ext + 0.6) * PS_CELL, internals: 0, engines: [], shape: [[PS_CELL, 0], [0, -PS_CELL], [-PS_CELL, 0], [0, PS_CELL]],
    slots: turrets.map(m => ({ x: m.cx * PS_CELL, y: m.cy * PS_CELL, s: m.mk === 2 ? 'M' : 'S', t: 'U', f: 0, arc: 360 })), noBuy: true };
  const pool1 = ['autocannon', 'lightlaser', 'ionpulse'], pool2 = ['railgun', 'lancer', 'mauler'];
  return { hull: 'ps_' + ps.id, weapons: turrets.map((m, i) => (m.mk === 2 ? pool2 : pool1)[i % 3]), mods: [] };
}
function spawnPS(ps) {
  if (!Wd) return; const cfg = psHullDef(ps);
  const s = new Ship(cfg, 'player', ps.x, ps.y, { role: 'outpost', side: 'player', a: 0 });
  s.psId = ps.id; s.name = ps.name; s.hp = s.st.hull * clamp(ps.hpF ?? 1, 0.05, 1);
  s.droneBay = psCount(ps, 'hangar') > 0; s.pd = psCount(ps, 'pd');
  Wd.ships.push(s);
  Wd.asteroids = Wd.asteroids.filter(a => (a.x - ps.x) ** 2 + (a.y - ps.y) ** 2 > (s.st.r + 60) ** 2);
}
function psEntity(ps) { return Wd ? Wd.ships.find(s => s.psId === ps.id && !s.dead) : null; }
function psRespawn(ps) { const e = psEntity(ps); if (e) { ps.hpF = e.hp / e.st.hull; e.dead = true; Wd.ships = Wd.ships.filter(s => s !== e); } if (!ps.crippledT) spawnPS(ps); }
function psCrippled(t) {
  const ps = psById(t.psId); if (!ps) return;
  for (const m of ps.mods) if (m.prog < 0) m.cond = Math.max(0, m.cond - 20);
  ps.crew = Math.floor(ps.crew * 0.9); ps.crippledT = 45; ps.hpF = 0.35;
  let msg = `${ps.name} has been crippled! Modules damaged, crew lost.`;
  if (ps.settings.insurance) { const pay = Math.round(psValue(ps) * 0.25); G.credits += pay; msg += ` Insurance paid ${fmt(pay)} cr.`; }
  log(msg, 'bad');
}
function psFrame(dt) {
  if (!G || !G.holdings) return;
  for (const ps of G.holdings) {
    if (ps.crippledT <= 0 && !psEntity(ps)) spawnPS(ps);
    const e = psEntity(ps); if (!e) continue;
    if (e.pd) for (const p of Wd.proj) if (p.missile && !isPS(p.owner) && (p.x - e.x) ** 2 + (p.y - e.y) ** 2 < 500 * 500 && Math.random() < e.pd * 1.6 * dt) { p.life = 0; spark(p.x, p.y, '#ffa0a0', 5); }
    if (psCount(ps, 'yard', true)) for (const s of Wd.ships) if ((s.isPlayer || s.role === 'wing') && !s.dead && d2(s, e) < 900 * 900) { s.hp = Math.min(s.st.hull, s.hp + s.st.hull * 0.03 * dt); s.armor = Math.min(s.st.armor, s.armor + s.st.armor * 0.08 * dt); if (s.isPlayer) s.opRepair = 0.3; }
  }
}
function psSync() { if (!G || !G.holdings) return; for (const ps of G.holdings) { const e = psEntity(ps); if (e) ps.hpF = e.hp / e.st.hull; } }
function drawPS(s) {
  const ps = psById(s.psId); if (!ps) return;
  ctx.save(); ctx.translate(s.x, s.y);
  // trusses
  ctx.strokeStyle = '#2a3a48'; ctx.lineWidth = 6;
  for (const a of ps.mods) for (const b of ps.mods) if (a.id < b.id && Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy) === 1) { ctx.beginPath(); ctx.moveTo(a.cx * PS_CELL, a.cy * PS_CELL); ctx.lineTo(b.cx * PS_CELL, b.cy * PS_CELL); ctx.stroke(); }
  const z = PS_CELL * 0.38;
  for (const m of ps.mods) {
    const x = m.cx * PS_CELL, y = m.cy * PS_CELL, D = PSM[m.t];
    if (m.prog >= 0) { ctx.strokeStyle = m.waiting ? '#f0b44c' : '#6fd3e6'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5; ctx.strokeRect(x - z, y - z, z * 2, z * 2); ctx.setLineDash([]); ctx.fillStyle = 'rgba(111,211,230,.35)'; ctx.fillRect(x - z, y + z - 3, z * 2 * clamp(m.prog / (D.work || 10), 0, 1), 3); continue; }
    ctx.fillStyle = m.wreck ? '#1a1414' : '#141e27'; ctx.fillRect(x - z, y - z, z * 2, z * 2);
    ctx.globalAlpha = m.wreck ? 0.2 : m.active ? 0.85 : 0.3; ctx.fillStyle = D.color; ctx.fillRect(x - z + 3, y - z + 3, z * 2 - 6, z * 2 - 6); ctx.globalAlpha = 1;
    ctx.strokeStyle = m.cond < 30 ? '#ff6a5c' : '#9fe8c8'; ctx.lineWidth = m.t === 'command' ? 2.5 : 1.2; ctx.strokeRect(x - z, y - z, z * 2, z * 2);
    if (m.t === 'solar') { ctx.fillStyle = '#3a4a8a'; ctx.fillRect(x - z - 10, y - 4, 8, 8); ctx.fillRect(x + z + 2, y - 4, 8, 8); }
    if (m.t === 'dock') { ctx.strokeStyle = '#8fb5ff'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sign(m.cx || 1) * PS_CELL * 0.7, y); ctx.stroke(); }
  }
  ctx.restore();
  for (const w of s.ws) { if (!w) continue; ctx.save(); ctx.translate(w.wx, w.wy); ctx.rotate(w.wa); ctx.fillStyle = '#d6e2ea'; ctx.fillRect(-3, -2.5, WEAPONS[w.id].s === 'M' ? 16 : 11, 5); ctx.restore(); }
  if (s.shield) { ctx.save(); ctx.globalAlpha = 0.12 + (s.shieldHit > 0 ? 0.2 : 0); ctx.fillStyle = '#6fd3e6'; ctx.beginPath(); ctx.arc(s.x, s.y, s.st.r * 1.15, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.8; ctx.strokeStyle = '#6fd3e6'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
  label(ps.name.toUpperCase(), s.x, s.y + s.st.r + 26, '#6fd3e6', 12);
  const col = ps.alert === 'red' ? '#ff6a5c' : ps.alert === 'yellow' ? '#f0b44c' : '#7fd68a';
  label(`${PS_TIERS[ps.tier - 1].name} · ${ps.alert.toUpperCase()} · ${ps.crew} crew`, s.x, s.y + s.st.r + 41, col, 10);
  if (s.hp < s.st.hull) { ctx.save(); ctx.translate(s.x, s.y - s.st.r - 16); ctx.scale(1 / cam.zoom, 1 / cam.zoom); ctx.fillStyle = 'rgba(10,17,25,.85)'; ctx.fillRect(-40, 0, 80, 4); ctx.fillStyle = '#9fe8c8'; ctx.fillRect(-40, 0, 80 * s.hp / s.st.hull, 4); ctx.restore(); }
}
function drawSites() {
  for (const site of G.sites) {
    if (!inView(site.x, site.y, 300)) continue;
    if (site.type === 'asteroid') { ctx.save(); ctx.strokeStyle = 'rgba(240,180,76,.5)'; ctx.setLineDash([10, 10]); ctx.lineWidth = 1.5 / cam.zoom; ctx.beginPath(); ctx.arc(site.x, site.y, 260, 0, TAU); ctx.stroke(); ctx.restore(); label(`UNCLAIMED · ${site.name.toUpperCase()}`, site.x, site.y + 4, '#f0b44c', 11); }
    else {
      ctx.save(); ctx.translate(site.x, site.y); const z = PS_CELL * 0.38;
      for (const m of site.mods) { ctx.fillStyle = site.type === 'derelict' ? '#1b1d20' : '#141e27'; ctx.fillRect(m.cx * PS_CELL - z, m.cy * PS_CELL - z, z * 2, z * 2); ctx.globalAlpha = site.type === 'derelict' ? 0.25 : 0.7; ctx.fillStyle = PSM[m.t].color; ctx.fillRect(m.cx * PS_CELL - z + 3, m.cy * PS_CELL - z + 3, z * 2 - 6, z * 2 - 6); ctx.globalAlpha = 1; }
      ctx.restore();
      label(site.type === 'derelict' ? `DERELICT · ${site.name.toUpperCase()}` : `FOR SALE · ${site.name.toUpperCase()} · ${fmt(site.price)} cr`, site.x, site.y + 140, site.type === 'derelict' ? '#8aa2b2' : '#f0b44c', 11);
    }
  }
}
function drawMapHoldings(c, X, Y) {
  for (const s of G.sites) { c.strokeStyle = s.type === 'sale' ? '#f0b44c' : s.type === 'derelict' ? '#8aa2b2' : 'rgba(240,180,76,.7)'; c.lineWidth = 1.2; c.setLineDash(s.type === 'asteroid' ? [3, 3] : []); c.strokeRect(X(s.x) - 5, Y(s.y) - 5, 10, 10); c.setLineDash([]); }
  for (const ps of G.holdings) { c.fillStyle = '#6fd3e6'; c.fillRect(X(ps.x) - 6, Y(ps.y) - 6, 12, 12); c.fillStyle = '#d4e6ef'; c.font = "600 11px 'Saira', sans-serif"; c.textAlign = 'center'; c.fillText(ps.name, X(ps.x), Y(ps.y) - 10); }
}
// claim on site
function claimSite(site) {
  const sov = sovereign(site.x, site.y);
  if (sov && !hasLicense(sov)) { log(`You need a ${FACTIONS[sov].name} license to claim here. Buy one at any ${FACTIONS[sov].short} station (Holdings tab).`, 'bad'); return; }
  const fee = site.type === 'derelict' ? 6000 : 8000;
  if (G.credits < fee) { log(`Claim fee is ${fmt(fee)} cr.`, 'bad'); return; }
  G.credits -= fee; G.sites = G.sites.filter(s => s !== site);
  let ps;
  if (site.type === 'asteroid') ps = newStation({ ...site, site: 'asteroid' }, site.name.replace(' claim', ' Station'), [{ t: 'command', cx: 0, cy: 0 }], 4);
  else {
    ps = newStation({ ...site, site: 'deep' }, site.name.replace(/^(Hulk of the |Wreck of |Abandoned |Old )/, ''), site.mods, 0);
    if (Math.random() < 0.4) { const opts = Object.keys(BP_PRICE).filter(b => b !== 'mk2' && !G.bp[b]); if (opts.length) { const b = pick(opts); G.bp[b] = true; log(`Reverse-engineered a ${PSM[b].name} blueprint from the wreck.`, 'gold'); } }
    if (Math.random() < 0.5) spawnAmbushAt(site.x, site.y, randi(2, 3));
  }
  log(`Claim registered: ${ps.name} is yours. Dock with F to manage it.`, 'gold');
  if (sov) remember(sov, 'favor');
}
