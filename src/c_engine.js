
// ───────────────────────── State ─────────────────────────
const SAVE_KEY = 'driftline-save-v1';
let G = null;   // persistent campaign state (saved)
let Wd = null;  // runtime world
let player = null;
let mode = 'title';
let steerMode = 'direct'; // direct: WASD = screen directions · relative: A/D turn · cursor: face mouse
const keys = {};
const mouse = { x: 0, y: 0, wx: 0, wy: 0, down: false };
const cam = { x: 0, y: 0, zoom: 0.8 };

function computeStats(cfg) {
  const h = HULLS[cfg.hull];
  const s = { hull: h.hull, armor: h.armor, flux: h.flux, diss: h.diss, shEff: h.shEff, shArc: h.shArc, speed: h.speed, accel: h.accel, turn: h.turn,
    cargo: h.cargo, r: h.r, rangeMul: 1, ammoMul: 1, mineMul: 1, tractor: 1 };
  for (const m of cfg.mods) if (m && MODS[m]) MODS[m].apply(s);
  let dps = 0, fps = 0;
  cfg.weapons.forEach(w => { if (!w) return; const W = WEAPONS[w]; if (W.beam) { dps += W.dps; fps += W.fps; } else { dps += W.dmg * (W.pellets || 1) / W.cd; fps += W.flux / W.cd; } });
  s.dps = dps; s.fps = fps;
  return s;
}
function normalizeCfg(cfg) {
  const H = HULLS[cfg.hull];
  cfg.weapons = H.slots.map((sl, i) => (cfg.weapons[i] && fits(sl, cfg.weapons[i])) ? cfg.weapons[i] : null);
  cfg.mods = Array.from({ length: H.internals }, (_, i) => cfg.mods[i] || null);
  return cfg;
}

// ───────────────────────── Ships ─────────────────────────
class Ship {
  constructor(cfg, fac, x, y, o = {}) {
    this.cfg = cfg; this.fac = fac; this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.a = o.a ?? rand(0, TAU);
    this.isPlayer = !!o.player; this.name = o.name || null; this.role = o.role || 'pirate'; this.tag = o.tag || null; this.leader = !!o.leader;
    this.home = o.home || null; this.dest = o.dest || null; this.guard = o.guard || null; this.group = o.group || null;
    this.side = o.side || (o.player ? 'player' : null); this.officer = o.officer || null;
    this.st = computeStats(cfg); applyBoosts(this); this.hp = this.st.hull; this.armor = this.st.armor; this.flux = 0;
    this.shield = false; this.shA = this.a; this.overload = 0; this.venting = false; this.burn = false; this.dead = false;
    this.initWeapons();
    this.c = { thrust: 0, strafe: 0, turn: 0, turnTo: null, fire: false, fireM: false, aimX: x, aimY: y, shield: false, vent: false, burn: false };
    this.aiT = 0; this.target = null; this.danger = 0; this.angry = false; this.hitFlash = 0; this.thrustVis = 0;
    this.strafeDir = Math.random() < .5 ? -1 : 1; this.strafeT = rand(1, 4); this.wp = null; this.lastAttacker = null; this.playerHitT = -99;
  }
  get H() { return HULLS[this.cfg.hull]; }
  maxAmmo(w) { const W = WEAPONS[w]; return W.ammo ? Math.round(W.ammo * this.st.ammoMul) : Infinity; }
  initWeapons(prev) {
    this.ws = this.cfg.weapons.map((w, i) => {
      if (!w) return null;
      const keep = prev && prev[i] && prev[i].id === w;
      return { id: w, wear: keep ? (prev[i].wear || 0) : 0, cd: rand(0, .3), ammo: keep ? Math.min(prev[i].ammo, this.maxAmmo(w)) : this.maxAmmo(w), rel: this.H.slots[i].f * Math.PI / 180, firing: false, wx: this.x, wy: this.y, wa: this.a };
    });
    const ranges = this.cfg.weapons.filter(w => w && !WEAPONS[w].missile && !WEAPONS[w].mine).map(w => WEAPONS[w].range * this.st.rangeMul);
    this.maxR = ranges.length ? Math.max(...ranges) : 700;
    this.prefR = ranges.length ? Math.min(...ranges) * 0.78 : 500;
  }
  refit() { // after cfg change
    const fh = this.hp / this.st.hull, fa = this.armor / this.st.armor;
    this.st = computeStats(this.cfg); applyBoosts(this); this.hp = fh * this.st.hull; this.armor = fa * this.st.armor; this.flux = Math.min(this.flux, this.st.flux);
    this.initWeapons(this.ws);
  }
}

function isPS(s) { return !!s && (s.isPlayer || s.side === 'player'); } // player side: you, your fleet, your outposts
function hostile(a, b) {
  if (a === b || !a || !b || a.dead || b.dead) return false;
  const pa = isPS(a), pb = isPS(b);
  if (pa && pb) return false;
  if (pa) return playerHostileTo(b);
  if (pb) return playerHostileTo(a);
  if ((a.tag && a.role === 'guard') || (b.tag && b.role === 'guard')) return false; // contract targets wait for the player
  return AT_WAR(a.fac, b.fac);
}
function playerHostileTo(s) { return s.fac === 'pirate' || s.angry || (G.rep[s.fac] ?? 0) <= -25; }
function canHit(owner, t) { return isPS(owner) ? !isPS(t) : hostile(owner, t); }

// ───────────────────────── Economy ─────────────────────────
// Supply & demand: each station has an ideal stock per commodity. Prices follow how full the shelf is.
function stockTarget(st, c) { return st.prod.includes(c) ? 300 : st.cons.includes(c) ? 140 : 80; }
function stockRatio(st, c) { return Math.max(0, G.stations[st.id].stock[c]) / stockTarget(st, c); }
function rawPrice(st, c) { return COMS[c].base * clamp(1.95 - 0.95 * stockRatio(st, c), 0.42, 2.3); }
function demandLabel(r) {
  return r < 0.25 ? { name: 'Shortage', color: 'var(--danger)', w: 3 } : r < 0.7 ? { name: 'In demand', color: 'var(--amber)', w: 2 }
    : r < 1.25 ? { name: 'Stable', color: 'var(--dim)', w: 0 } : r < 1.8 ? { name: 'Surplus', color: 'var(--good)', w: -1 } : { name: 'Glut', color: 'var(--hud)', w: -2 };
}
function stationNeeds(st) { return Object.keys(COMS).map(c => ({ c, r: stockRatio(st, c), stock: Math.floor(G.stations[st.id].stock[c]) })).sort((a, b) => a.r - b.r); }
const ECON = { cons: {}, prod: {} };
for (const c in COMS) { ECON.cons[c] = STATIONS.filter(s => s.cons.includes(c)).length; ECON.prod[c] = Math.max(1, STATIONS.filter(s => s.prod.includes(c)).length); }
function economyTick() {
  if (Math.random() < 0.035) { // market shock: a station suddenly needs something
    const st = pick(STATIONS), c = pick(st.cons.length ? st.cons : Object.keys(COMS)), S = G.stations[st.id];
    S.stock[c] = Math.floor(S.stock[c] * 0.2); S.refreshed = -9999;
    log(`Market news: ${st.name} reports a ${COMS[c].name.toLowerCase()} shortage. Prices there are climbing.`, 'gold');
  } else if (Math.random() < 0.02) {
    const st = pick(STATIONS.filter(s => s.prod.length)), c = pick(st.prod), S = G.stations[st.id];
    S.stock[c] = Math.max(S.stock[c], stockTarget(st, c) * 2.1);
    log(`Market news: bumper output at ${st.name}. ${COMS[c].name} is selling cheap there.`, 'gold');
  }
  for (const st of STATIONS) {
    const S = G.stations[st.id];
    for (const c in COMS) {
      const T = stockTarget(st, c);
      if (st.prod.includes(c)) { if (S.stock[c] < T * 2.2) S.stock[c] += rand(0.8, 1.2) * (0.75 * ECON.cons[c] / ECON.prod[c] + 0.4) * ((G.econBoost && G.econBoost[st.id] && G.econBoost[st.id][c]) || 1); }
      else if (st.cons.includes(c)) S.stock[c] = Math.max(0, S.stock[c] - rand(0.4, 0.8));
      else S.stock[c] += (T - S.stock[c]) * 0.015;
    }
  }
}
function tradeRoute() {
  const opts = [];
  for (const a of STATIONS) for (const c in COMS) {
    const ra = stockRatio(a, c); if (ra < 1.05) continue;
    for (const b of STATIONS) { if (b === a) continue; const rb = stockRatio(b, c); if (rb < 0.55) opts.push({ a, b, c, score: ra - rb }); }
  }
  if (!opts.length) return null;
  opts.sort((x, y) => y.score - x.score); return pick(opts.slice(0, 10));
}
function repDisc(fac) { return clamp(G.rep[fac] || 0, 0, 100) * 0.0015; }
function buyPrice(st, c) { return Math.ceil(rawPrice(st, c) * 1.05 * (1 - repDisc(st.fac)) * (1 - 0.03 * skill('commerce'))); }
function sellPrice(st, c) { return Math.floor(rawPrice(st, c) * 0.95 * (1 + repDisc(st.fac) * 0.5) * (1 + 0.03 * skill('commerce'))); }
function itemPrice(st, base) { return Math.round(base * (1 - repDisc(st.fac))); }
function cargoUsed() { let n = 0; for (const k in G.cargo) n += G.cargo[k]; return n; }
function cargoFree() { return Math.max(0, cargoCap() - cargoUsed()); }
function addCargo(k, q) { G.cargo[k] = (G.cargo[k] || 0) + q; if (G.cargo[k] <= 0) delete G.cargo[k]; }
function initStations() {
  G.stations = {};
  for (const st of STATIONS) {
    const stock = {}; for (const c in COMS) stock[c] = Math.round(stockTarget(st, c) * (st.prod.includes(c) ? rand(1.1, 1.6) : st.cons.includes(c) ? rand(0.2, 0.9) : rand(0.7, 1.2)));
    G.stations[st.id] = { stock, jobs: [], bounties: [], refreshed: -9999 };
  }
}
function repLabel(v) { return v <= -25 ? 'Hostile' : v < 0 ? 'Suspicious' : v < 15 ? 'Neutral' : v < 35 ? 'Favorable' : v < 60 ? 'Welcoming' : 'Allied'; }
function changeRep(fac, amt, quiet) {
  if (!(fac in G.rep) || !amt) return;
  const before = G.rep[fac]; G.rep[fac] = clamp(before + amt, -100, 100);
  if (!quiet) log(`${FACTIONS[fac].short} standing ${amt > 0 ? '+' : ''}${amt} (${repLabel(G.rep[fac])})`, amt > 0 ? 'good' : 'bad');
  if (before > -25 && G.rep[fac] <= -25) log(`${FACTIONS[fac].name} now considers you hostile.`, 'bad');
  if (before <= -25 && G.rep[fac] > -25) log(`${FACTIONS[fac].name} is no longer hostile.`, 'good');
}

// ───────────────────────── Missions ─────────────────────────
function nid() { return G.nextId++; }
function pirateName() { return `${pick(PIRATE_FIRST)} '${pick(PIRATE_NICK)}' ${pick(PIRATE_LAST)}`; }
function randomPoint(minFromStations = 1400) {
  for (let i = 0; i < 40; i++) {
    const a = rand(0, TAU), r = rand(4400, 16500), p = { x: Math.cos(a) * r, y: Math.sin(a) * r };
    if (STATIONS.every(s => Math.hypot(s.x - p.x, s.y - p.y) > minFromStations)) return p;
  }
  return { x: 5000, y: -3000 };
}
function regionName(x, y) {
  let best = 'deep space', bd = 1e12;
  for (const b of BELTS) { if (b.ring) { const r = Math.hypot(x, y); if (Math.abs(r - b.ring) < 900) return b.name; continue; } const dd = (b.x - x) ** 2 + (b.y - y) ** 2; if (dd < (b.r + 700) ** 2 && dd < bd) { bd = dd; best = b.name; } }
  if (Math.hypot(BLACKMAW.x - x, BLACKMAW.y - y) < 2200) return 'the Blackmaw approaches';
  if (best !== 'deep space') return best;
  let ns = STATIONS[0], nd = 1e12; for (const s of STATIONS) { const dd = (s.x - x) ** 2 + (s.y - y) ** 2; if (dd < nd) { nd = dd; ns = s; } }
  return `${Math.round(Math.sqrt(nd) / 100) / 10}k from ${ns.name}`;
}
// Jobs come from what the station actually needs right now.
function genJob(st, slot) {
  const id = nid(); const needs = stationNeeds(st);
  if (slot === 0) {
    const n = pick(needs.slice(0, 2)), c = n.c, T = stockTarget(st, c), dl = demandLabel(n.r);
    const qty = clamp(Math.round((T - n.stock) * 0.45 / 5) * 5, 10, 45);
    return { id, kind: 'procure', fac: st.fac, from: st.id, dest: st.id, com: c, qty, need: true,
      reward: Math.round((rawPrice(st, c) * qty * 1.35 + 250) / 50) * 50, rep: dl.w >= 2 ? randi(5, 7) : randi(3, 4),
      title: `${dl.w >= 3 ? 'Urgent: ' : ''}${COMS[c].name} for ${st.name}`,
      desc: `${st.name} is down to ${n.stock} t of ${COMS[c].name.toLowerCase()} (${dl.name.toLowerCase()}). Bring ${qty} t. Pays above market, and the goods go straight onto the shelves.` };
  }
  if (slot === 1) {
    const sur = needs[needs.length - 1], c = sur.c;
    const dest = STATIONS.filter(s => s !== st).sort((a, b) => stockRatio(a, c) - stockRatio(b, c))[0];
    if (sur.r > 1.05 && stockRatio(dest, c) < 0.9) {
      const qty = randi(10, 24), dist = Math.hypot(dest.x - st.x, dest.y - st.y);
      return { id, kind: 'deliver', fac: st.fac, from: st.id, dest: dest.id, com: c, qty, cargoName: COMS[c].name, haul: true,
        reward: Math.round((350 + dist * 0.16 + qty * 25) / 50) * 50, rep: randi(3, 5), title: `Supply haul: ${COMS[c].name.toLowerCase()} to ${dest.name}`,
        desc: `We have more ${COMS[c].name.toLowerCase()} than we can store and ${dest.name} is running low. Haul ${qty} t of our stock there. Cargo is loaded on acceptance.` };
    }
  }
  if (slot === 2 && needs[0].r < 0.4) {
    const p = randomPoint(); const n = randi(2, 4); const c = needs[0].c;
    const fleet = Array.from({ length: n }, () => [Math.random() < 0.55 ? 'skiff' : 'wren', 'pirate']);
    return { id, kind: 'kill', fac: st.fac, from: st.id, x: p.x, y: p.y, fleet, reward: Math.round((2200 + fleet.reduce((a, f) => a + HULLS[f[0]].price * 0.14, 0)) / 100) * 100, rep: randi(4, 6),
      title: `Break the ${COMS[c].name.toLowerCase()} blockade`, desc: `Raiders near ${regionName(p.x, p.y)} are picking off our ${COMS[c].name.toLowerCase()} shipments. That's why the shelves are empty. Destroy all ${n} ships.` };
  }
  const kind = pick(['deliver', 'kill']);
  if (kind === 'deliver') {
    const dest = pick(STATIONS.filter(s => s.id !== st.id));
    const qty = randi(5, 16); const dist = Math.hypot(dest.x - st.x, dest.y - st.y);
    return { id, kind, fac: st.fac, from: st.id, dest: dest.id, qty, cargoName: pick(['Sealed crates', 'Diplomatic pouches', 'Cryo samples', 'Survey cores', 'Relief supplies']),
      reward: Math.round((300 + dist * 0.32 + qty * 30) / 50) * 50, rep: randi(3, 5), title: `Courier run to ${dest.name}`,
      desc: `Carry ${qty} tons of cargo to ${dest.name}. Cargo is loaded on acceptance.` };
  }
  if (kind === 'procure') {
    const com = pick(st.cons.length ? st.cons : Object.keys(COMS)); const qty = randi(10, 30);
    return { id, kind, fac: st.fac, from: st.id, dest: st.id, com, qty, reward: Math.round(COMS[com].base * qty * 2.3 / 50) * 50, rep: randi(3, 5),
      title: `Procure ${COMS[com].name.toLowerCase()}`, desc: `Bring ${qty} tons of ${COMS[com].name.toLowerCase()} to ${st.name}. Pays well above market.` };
  }
  const p = randomPoint(); const n = randi(2, 4);
  const fleet = Array.from({ length: n }, () => [Math.random() < 0.55 ? 'skiff' : 'wren', 'pirate']);
  if (n >= 4 && Math.random() < 0.4) fleet[0] = ['talon', 'pirate'];
  return { id, kind, fac: st.fac, from: st.id, x: p.x, y: p.y, fleet, reward: Math.round((1800 + fleet.reduce((a, f) => a + HULLS[f[0]].price * 0.14, 0)) / 100) * 100, rep: randi(4, 6),
    title: 'Clear raider nest', desc: `${n} raider hulls are holding position near ${regionName(p.x, p.y)}. Destroy them all.` };
}
function genBounty(st) {
  const id = nid(); const p = randomPoint();
  const roll = Math.random(); const hull = roll < 0.35 ? 'wren' : roll < 0.75 ? 'talon' : roll < 0.93 ? 'skiff' : 'halberd';
  const esc = hull === 'halberd' ? randi(2, 3) : hull === 'talon' ? randi(1, 2) : randi(0, 2);
  const name = pirateName();
  const fleet = Array.from({ length: esc }, () => [Math.random() < 0.5 ? 'skiff' : 'wren', 'pirate']);
  return { id, kind: 'bounty', fac: st.fac, from: st.id, x: p.x, y: p.y, leader: [hull, 'pirate', name], fleet,
    reward: Math.round((HULLS[hull].price * 0.22 + esc * 1400 + 1500) / 100) * 100, rep: randi(3, 6),
    title: name, desc: `Last seen near ${regionName(p.x, p.y)} flying a ${HULLS[hull].name}-class ${HULLS[hull].cls.toLowerCase()}${esc ? ` with ${esc} escort${esc > 1 ? 's' : ''}` : ', alone'}.` };
}
function refreshStation(id) {
  const S = G.stations[id], st = STN[id];
  if (G.time - S.refreshed < 150) return;
  S.refreshed = G.time;
  S.jobs = [0, 1, 2].map(i => genJob(st, i));
  S.bounties = Array.from({ length: randi(2, 3) }, () => genBounty(st));
}
function acceptMission(m, story) {
  if (G.missions.length >= 6) { log('Contract log full (6 max).', 'bad'); return false; }
  m = JSON.parse(JSON.stringify(m));
  if (story) { m.story = story; m.fac = story; m.id = nid(); }
  if (m.kind === 'deliver') {
    if (cargoFree() < m.qty) { log(`Need ${m.qty} tons of free cargo space.`, 'bad'); return false; }
    m.cargoKey = 'mc' + m.id; G.cargo[m.cargoKey] = m.qty;
    if (m.haul) { const S = G.stations[m.from].stock; S[m.com] = Math.max(0, S[m.com] - m.qty); }
  }
  if (m.kind === 'kill' || m.kind === 'bounty') {
    m.tag = 'm' + m.id; if (story) { m.x = m.at[0]; m.y = m.at[1]; }
    m.remaining = m.kind === 'kill' ? m.fleet.length : 1;
    if (m.defend) { if (!tagAssault(m)) return false; } else spawnMissionFleet(m);
  }
  G.missions.push(m);
  log(`Contract accepted: ${m.title}`, 'gold');
  if (m.kind === 'bounty') announceElite(newElite());
  return true;
}
function spawnMissionFleet(m) {
  const list = [];
  if (m.kind === 'bounty') { list.push({ e: m.leader, leader: true }); m.fleet.forEach(e => list.push({ e })); }
  else m.fleet.slice(0, m.remaining).forEach(e => list.push({ e }));
  const group = { x: m.x, y: m.y };
  list.forEach((it, i) => {
    const [hull, fac, name] = it.e;
    const a = i * 2.1, r = i ? 180 + i * 40 : 0;
    const s = new Ship(genCfg(hull, 2), fac, m.x + Math.cos(a) * r, m.y + Math.sin(a) * r, { role: 'guard', guard: group, tag: m.tag, leader: it.leader, name: name || null });
    if (m.hostileFleet && fac === 'pirate') s.angry = true;
    Wd.ships.push(s);
  });
}
function completeMission(m, note) {
  onMissionDone(m, true);
  G.credits += m.reward; changeRep(m.fac, m.rep, true);
  log(`${note || 'Contract complete'}: ${m.title}  +${fmt(m.reward)} cr`, 'gold');
  log(`${FACTIONS[m.fac].short} standing +${m.rep} (${repLabel(G.rep[m.fac])})`, 'good');
  if (m.story) {
    G.story[m.story]++;
    if (m.gift) {
      if (m.gift.weapon) { G.stash.weapons[m.gift.weapon] = (G.stash.weapons[m.gift.weapon] || 0) + 1; log(`Received ${WEAPONS[m.gift.weapon].name} (in your stash)`, 'gold'); }
      if (m.gift.mod) { G.stash.mods[m.gift.mod] = (G.stash.mods[m.gift.mod] || 0) + 1; log(`Received ${MODS[m.gift.mod].name} (in your stash)`, 'gold'); }
    }
    if (G.story[m.story] >= 3) log(`${FACTIONS[m.story].name} storyline complete. You are a name in the Drift now.`, 'gold');
  }
  G.missions = G.missions.filter(x => x !== m);
}
function failMission(m, why) {
  onMissionDone(m, false);
  if (m.cargoKey) delete G.cargo[m.cargoKey];
  changeRep(m.fac, -4, true);
  log(`Contract failed: ${m.title}${why ? ' (' + why + ')' : ''}`, 'bad');
  G.missions = G.missions.filter(x => x !== m);
  for (const s of Wd.ships) if (s.tag === m.tag) s.tag = null;
}
function checkDeliveries(stId) {
  const out = [];
  for (const m of [...G.missions]) {
    if (m.dest !== stId) continue;
    if (m.kind === 'deliver' && G.cargo[m.cargoKey] >= m.qty) { delete G.cargo[m.cargoKey]; if (m.com) G.stations[stId].stock[m.com] += m.qty; completeMission(m, 'Delivered'); out.push(`Delivered ${m.qty} tons for “${m.title}”. +${fmt(m.reward)} cr`); }
    if (m.kind === 'procure' && (G.cargo[m.com] || 0) >= m.qty) { addCargo(m.com, -m.qty); G.stations[stId].stock[m.com] += m.qty; completeMission(m, 'Delivered'); out.push(`Delivered ${m.qty} ${COMS[m.com].name.toLowerCase()} for “${m.title}”. +${fmt(m.reward)} cr`); }
  }
  return out;
}

// ───────────────────────── Loadouts & spawning ─────────────────────────
function genCfg(hullId, tier) {
  const H = HULLS[hullId];
  const weapons = H.slots.map(sl => {
    const opts = Object.keys(WEAPONS).filter(w => fits(sl, w) && !WEAPONS[w].mine && !WEAPONS[w].rare && (tier >= 2 || WEAPONS[w].price < 6500));
    return opts.length && Math.random() < 0.95 ? pick(opts) : null;
  });
  const mpool = ['bulkheads', 'capacitors', 'vents', 'hardshield', 'drives', 'targeting'];
  const mods = Array.from({ length: H.internals }, () => Math.random() < 0.25 + tier * 0.2 ? pick(mpool) : null);
  return { hull: hullId, weapons, mods };
}
function farFromPlayer(x, y, d) { return !player || (player.x - x) ** 2 + (player.y - y) ** 2 > d * d; }
const ELITE_TITLES = ['the Red Comet', 'Widowmaker', 'the Last Ember', 'Ironveil', 'Grief', 'the Hollow King', 'Starbreaker', 'Nightsworn'];
function newElite() {
  let p = randomPoint(2500);
  for (let i = 0; i < 10 && player && Math.hypot(p.x - player.x, p.y - player.y) < 5000; i++) p = randomPoint(2500);
  const e = { id: nid(), hull: Math.random() < 0.55 ? 'talon' : 'halberd', name: `${pick(PIRATE_FIRST)} ${pick(ELITE_TITLES)}`, x: p.x, y: p.y };
  G.elites = G.elites || []; G.elites.push(e);
  spawnElite(e); return e;
}
function spawnElite(e) {
  const cfg = genCfg(e.hull, 3);
  cfg.mods = cfg.mods.map(() => pick(['bulkheads', 'capacitors', 'vents', 'hardshield', 'drives', 'targeting']));
  const s = new Ship(cfg, 'pirate', e.x, e.y, { role: 'pirate', name: e.name, group: { wp: null } });
  s.elite = true; s.eliteId = e.id; s.dmgMul = 1.3;
  const st = s.st; st.hull *= 1.8; st.armor *= 1.5; st.flux *= 1.5; st.diss *= 1.5; st.speed *= 1.1; st.turn *= 1.15;
  s.hp = st.hull; s.armor = st.armor; s.initWeapons();
  Wd.ships.push(s); return s;
}
function announceElite(e) { log(`Sensor alert: elite raider ${e.name} (${HULLS[e.hull].name}) is hunting near ${regionName(e.x, e.y)}.`, 'bad'); }
function spawnTrader() {
  const route = tradeRoute();
  const a = route ? route.a : pick(STATIONS), b = route ? route.b : pick(STATIONS.filter(s => s !== a));
  const hull = Math.random() < 0.55 ? 'mule' : Math.random() < 0.6 ? 'wren' : 'skiff';
  const s = new Ship(genCfg(hull, 0), a.fac, a.x + rand(-120, 120), a.y + rand(-120, 120), { role: 'trader', dest: b.id, a: Math.atan2(b.y - a.y, b.x - a.x) });
  s.name = `${FACTIONS[a.fac].short} ${HULLS[hull].cls.toLowerCase()}`;
  if (route) { const S = G.stations[a.id].stock; const qty = Math.max(0, Math.min(randi(15, 32), Math.floor(S[route.c] - stockTarget(a, route.c) * 0.6))); if (qty > 0) { S[route.c] -= qty; s.cargoC = route.c; s.cargoQ = qty; } }
  Wd.ships.push(s); decorateTrader(s, a, b);
}
function spawnPirates() {
  let p;
  if (Math.random() < 0.55) p = { x: BLACKMAW.x + rand(-400, 400), y: BLACKMAW.y + rand(-400, 400) };
  else { const b = pick(BELTS.filter(b => !b.ring)); const a = rand(0, TAU); p = { x: b.x + Math.cos(a) * (b.r + 300), y: b.y + Math.sin(a) * (b.r + 300) }; }
  if (!farFromPlayer(p.x, p.y, 2600)) return;
  if (G.holdings && G.holdings.some(h => (h.x - p.x) ** 2 + (h.y - p.y) ** 2 < 4500 * 4500)) return; // pirates keep clear of player stations
  const big = player && (player.cfg.hull === 'talon' || player.cfg.hull === 'halberd');
  const n = randi(1, 3); const group = { wp: null };
  for (let i = 0; i < n; i++) {
    const r = Math.random(); const hull = Math.random() < 0.07 ? 'brood' : r < (big ? 0.25 : 0.45) ? 'skiff' : r < (big ? 0.7 : 0.88) ? 'wren' : r < 0.98 ? 'talon' : 'halberd';
    const s = new Ship(genCfg(hull, big ? 2 : 1), 'pirate', p.x + rand(-200, 200), p.y + rand(-200, 200), { role: 'pirate', group });
    s.name = 'Raider ' + HULLS[hull].name; decoratePirate(s); Wd.ships.push(s);
  }
}
function spawnPatrol(fac) {
  const home = pick(STATIONS.filter(s => s.fac === fac)); if (!home) return;
  const hulls = { concord: ['talon', 'wren'], ashen: ['talon', 'skiff'], veyra: ['wren', 'wren'], tessel: ['mule', 'wren'] }[fac];
  const hull = Math.random() < 0.45 ? hulls[0] : hulls[1];
  const s = new Ship(genCfg(hull, 1), fac, home.x + rand(-300, 300), home.y + rand(-300, 300), { role: 'patrol', home: home.id });
  s.name = `${FACTIONS[fac].short} patrol`; Wd.ships.push(s);
}
const GUARD_HULLS = { concord: ['talon', 'wren'], ashen: ['talon', 'skiff'], veyra: ['wren', 'skiff'], tessel: ['mule', 'wren'] };
function spawnSentry(st) {
  const hull = Math.random() < 0.4 ? GUARD_HULLS[st.fac][0] : GUARD_HULLS[st.fac][1];
  const a = rand(0, TAU), r = rand(380, 650);
  const s = new Ship(genCfg(hull, 1), st.fac, st.x + Math.cos(a) * 110, st.y + Math.sin(a) * 110, { role: 'sentry', home: st.id, a });
  s.orbR = r; s.orbDir = Math.random() < 0.5 ? 1 : -1; s.name = `${st.name} guard`;
  Wd.ships.push(s); return s;
}
function population(dt) {
  Wd.popT -= dt; if (Wd.popT > 0) return; Wd.popT = 3.5;
  const cnt = {}; for (const s of Wd.ships) if (!s.dead) { const k = s.role === 'patrol' ? 'patrol_' + s.fac : s.role; cnt[k] = (cnt[k] || 0) + 1; }
  if ((cnt.trader || 0) < 12) spawnTrader();
  if ((cnt.pirate || 0) < 7 && Math.random() < 0.3) spawnPirates();
  for (const f of ['concord', 'veyra', 'ashen', 'tessel']) if ((cnt['patrol_' + f] || 0) < (f === 'concord' ? 5 : 3) && Math.random() < 0.4) spawnPatrol(f);
  const guards = {}; for (const s of Wd.ships) if (!s.dead && s.role === 'sentry') guards[s.home] = (guards[s.home] || 0) + 1;
  for (const st of STATIONS) if ((guards[st.id] || 0) < 3 && Math.random() < 0.25) spawnSentry(st);
  // asteroid regrowth
  for (const b of BELTS) {
    const have = Wd.asteroids.filter(a => a.belt === b).length;
    if (have < b.n) { const a = makeAsteroid(b); if (farFromPlayer(a.x, a.y, 1400)) Wd.asteroids.push(a); }
  }
  // market drift
  economyTick(); depthPopulation();
}

// ───────────────────────── World ─────────────────────────
function makeAsteroid(b, r) {
  let x, y;
  if (b.ring) { const a = rand(0, TAU), rr = b.ring + rand(-b.w, b.w); x = Math.cos(a) * rr; y = Math.sin(a) * rr; }
  else { const a = rand(0, TAU), rr = Math.sqrt(Math.random()) * b.r; x = b.x + Math.cos(a) * rr; y = b.y + Math.sin(a) * rr; }
  r = r || (Math.random() < 0.3 ? rand(32, 52) : rand(14, 32));
  return asteroidAt(x, y, r, Math.random() < b.rich, b);
}
function asteroidAt(x, y, r, rich, belt) {
  const n = randi(7, 11), pts = [];
  for (let i = 0; i < n; i++) pts.push(rand(0.72, 1.08));
  const hp = r * r * 0.5;
  return { x, y, r, rich, belt, pts, rot: rand(0, TAU), vr: rand(-0.3, 0.3), vx: rand(-6, 6), vy: rand(-6, 6), hp, maxhp: hp, mined: 0, shade: rand(0.75, 1.1) };
}
function makeStars() {
  const layers = [];
  for (let l = 0; l < 3; l++) { const arr = []; for (let i = 0; i < 140; i++) arr.push([Math.random() * 2048, Math.random() * 2048, rand(0.4, 1) * (l + 1) * 0.6]); layers.push(arr); }
  return layers;
}
function buildWorld() {
  Wd = { ships: [], proj: [], parts: [], pickups: [], asteroids: [], beams: [], popT: 0, t: 0, stars: makeStars(), saveT: 30, nebula: [] };
  for (const b of BELTS) for (let i = 0; i < b.n; i++) Wd.asteroids.push(makeAsteroid(b));
  const neb = ['#1d2f55', '#3a1a3f', '#123d3d', '#3d2414'];
  for (let i = 0; i < 20; i++) { const a = rand(0, TAU), r = rand(2000, 17500); Wd.nebula.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, r: rand(1400, 3200), c: pick(neb) }); }
  for (let i = 0; i < 5; i++) spawnTrader();
  for (const f of ['concord', 'veyra', 'ashen', 'tessel']) spawnPatrol(f);
  depthWorld();
  for (const st of STATIONS) for (let i = 0; i < 3; i++) { const g = spawnSentry(st); const a = rand(0, TAU); g.x = st.x + Math.cos(a) * g.orbR; g.y = st.y + Math.sin(a) * g.orbR; }
  for (let i = 0; i < 3; i++) spawnPirates();
  for (const e of (G.elites || [])) spawnElite(e);
}
function spawnPlayerAt(stId) {
  const st = STN[stId];
  player = new Ship(G.ship, 'player', st.x, st.y + 170, { player: true, role: 'player', a: -Math.PI / 2 });
  player.name = 'Your ' + player.H.name;
  Wd.ships.push(player);
  cam.x = player.x; cam.y = player.y;
}

// ───────────────────────── FX ─────────────────────────
function part(x, y, vx, vy, life, color, size, kind) { if (Wd.parts.length < 900) Wd.parts.push({ x, y, vx, vy, life, max: life, color, size, kind: kind || 'spark' }); }
function spark(x, y, color, n = 3) { for (let i = 0; i < n; i++) { const a = rand(0, TAU), s = rand(40, 220); part(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(.15, .4), color, rand(1, 2.4)); } }
function explosion(x, y, r) {
  part(x, y, 0, 0, 0.35, '#fff3d6', r * 3, 'flash');
  for (let i = 0; i < r * 1.6; i++) { const a = rand(0, TAU), s = rand(30, 260) * (r / 25); part(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(.4, 1.2), pick(['#ffd27a', '#ff8a3d', '#ff5a2a', '#fff1c4']), rand(1.5, 3.5)); }
  for (let i = 0; i < r * 0.6; i++) { const a = rand(0, TAU), s = rand(10, 70); part(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(1, 2.4), '#3a3a44', rand(8, 18) * (r / 25), 'smoke'); }
}
let logBox = null;
function log(msg, cls) {
  try { recordNews(msg, cls); } catch (e) { }
  if (!logBox) logBox = document.getElementById('log');
  const d = document.createElement('div'); d.textContent = msg; if (cls) d.className = cls;
  logBox.appendChild(d); while (logBox.children.length > 6) logBox.removeChild(logBox.firstChild);
  setTimeout(() => d.remove(), 7200);
}
function dropPickup(x, y, kind, id, qty) {
  if (qty <= 0) return;
  const a = rand(0, TAU), s = rand(20, 90);
  Wd.pickups.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, kind, id, qty, life: 120, rot: rand(0, TAU) });
}

// ───────────────────────── Combat ─────────────────────────
function rayCircle(ox, oy, dx, dy, cx, cy, r) {
  const fx = ox - cx, fy = oy - cy, b = fx * dx + fy * dy, c = fx * fx + fy * fy - r * r;
  if (c < 0) return 0;
  const disc = b * b - c; if (disc < 0) return null;
  const t = -b - Math.sqrt(disc); return t >= 0 ? t : null;
}
function provoke(t, radius) {
  for (const o of Wd.ships) if (!o.dead && !o.isPlayer && o.fac === t.fac && d2(o, t) < radius * radius) { o.angry = true; o.target = player; }
  t.angry = true;
}
// Friendly fire on a non-hostile faction: two warnings, then they fight back.
function onPlayerAggression(t) {
  t.playerHitT = Wd.t;
  if (t.fac === 'pirate' || t.angry || (G.rep[t.fac] ?? 0) <= -25) return;
  Wd.warn = Wd.warn || {};
  const w = Wd.warn[t.fac] || (Wd.warn[t.fac] = { n: 0, t: -99 });
  if (Wd.t - w.t > 60) w.n = 0;           // forgiven after a minute of good behavior
  if (Wd.t - w.t < 2) return;             // one burst of fire counts as one incident
  w.t = Wd.t; w.n++;
  const who = t.name || `${FACTIONS[t.fac].short} ${t.H.name}`;
  // Hits only draw warnings. A faction turns on you when you actually destroy one of its ships (see killShip).
  if (w.n === 1) log(`${who}: “Check your fire, pilot.”`, 'bad');
  else if (w.n === 2) log(`${who}: “You're shooting at a ${FACTIONS[t.fac].short} ship. Stand down.”`, 'bad');
  else { log(`${who}: “Cease fire! Destroy one of us and every ${FACTIONS[t.fac].short} ship out here will answer.”`, 'bad'); if (w.n === 3) remember(t.fac, 'slight', 'You opened fire on our ships.'); }
}
function applyHit(t, dmg, dtype, fx, fy, owner) {
  if (t.dead) return;
  if (owner) { t.lastAttacker = owner; if (isPS(owner)) onPlayerAggression(t); }
  const ang = Math.atan2(fy - t.y, fx - t.x);
  if (t.shield && t.overload <= 0 && Math.abs(angDiff(t.shA, ang)) <= t.st.shArc * Math.PI / 360) {
    const m = dtype === 'kin' ? 2 : dtype === 'he' ? 0.5 : 1;
    t.flux += dmg * m * t.st.shEff; t.shieldHit = 0.15;
    if (t.flux >= t.st.flux) {
      t.flux = t.st.flux; t.overload = 3.5; t.shield = false;
      spark(t.x, t.y, '#c07ae0', 14);
      if (t.isPlayer) log('Flux overload! Shields down, weapons offline.', 'bad');
    }
    return;
  }
  const am = dtype === 'kin' ? 0.5 : dtype === 'he' ? 2 : 1;
  const frac = t.st.armor > 0 ? t.armor / t.st.armor : 0;
  t.armor = Math.max(0, t.armor - dmg * am * 0.5);
  t.hp -= dmg * (1 - frac * 0.8);
  t.hitFlash = 0.08; t.lastDmgT = Wd.t; subsysHit(t, dmg);
  if (t.hp <= 0) killShip(t, owner);
}
function killShip(t, killer) {
  if (t.dead) return;
  t.dead = true; t.hp = 0;
  explosion(t.x, t.y, t.st.r);
  if (t.isPlayer) { playerDied(); return; }
  if (onSpecialDeath(t, killer)) return;
  const byPlayer = (killer && isPS(killer)) || Wd.t - t.playerHitT < 4;
  if (byPlayer) { addXP(Math.round(t.H.price / 110), true); if (killer && killer.officer) officerXP(killer.officer, t); if (t.fac !== 'pirate') remember(t.fac, 'slight', 'You destroyed one of our ships.'); }
  if (t.elite) {
    G.elites = (G.elites || []).filter(e => e.id !== t.eliteId);
    if (byPlayer) { const bonus = Math.round(t.H.price * 0.25); G.credits += bonus; log(`Elite ${t.name} destroyed. Kill bonus +${fmt(bonus)} cr`, 'gold'); changeRep('concord', 3, true); changeRep('veyra', 3, true); changeRep('tessel', 3, true); }
    else log(`Elite ${t.name} was destroyed.`, 'gold');
    const ws = t.cfg.weapons.filter(Boolean); for (let i = 0; i < 2 && ws.length; i++) dropPickup(t.x, t.y, 'weapon', pick(ws), 1);
    const ms = t.cfg.mods.filter(Boolean); if (ms.length) dropPickup(t.x, t.y, 'mod', pick(ms), 1);
  }
  const loot = Math.round(t.H.price * rand(0.025, 0.05));
  dropPickup(t.x, t.y, 'credits', null, loot);
  if (t.role === 'trader') traderLost(t);
  if (t.role === 'trader' && t.cargoC) { let q = Math.round(t.cargoQ * 0.6); while (q > 0) { const k = Math.min(8, q); dropPickup(t.x, t.y, 'com', t.cargoC, k); q -= k; } }
  else if (t.role === 'trader') for (let i = 0; i < randi(2, 3); i++) dropPickup(t.x, t.y, 'com', pick(Object.keys(COMS)), randi(3, 9));
  else if (Math.random() < 0.6) dropPickup(t.x, t.y, 'com', pick(['weapons', 'luxury', 'food', 'machinery', 'medicine']), randi(2, 7));
  if (Math.random() < 0.14) { const ws = t.cfg.weapons.filter(Boolean); if (ws.length) dropPickup(t.x, t.y, 'weapon', pick(ws), 1); }
  if (byPlayer) {
    G.kills++;
    if (t.fac === 'pirate') { changeRep('concord', 1, true); changeRep('veyra', 1, true); changeRep('tessel', 1, true); }
    else {
      changeRep(t.fac, -12);
      if (G.rep[t.fac] > -25) { provoke(t, 1500); log(`${FACTIONS[t.fac].short} ships nearby are now firing on you.`, 'bad'); }
      for (const f of ['concord', 'veyra', 'ashen', 'tessel']) if (f !== t.fac && AT_WAR(f, t.fac)) changeRep(f, 4);
    }
  }
  if (t.tag) {
    const m = G.missions.find(m => m.tag === t.tag);
    if (m) {
      const near = player && !player.dead && d2(player, t) < 3500 * 3500;
      if (m.kind === 'bounty' && t.leader) { if (near || byPlayer) completeMission(m, 'Bounty collected'); else failMission(m, 'target killed by someone else'); }
      else if (m.kind === 'kill') { m.remaining--; if (m.remaining <= 0) completeMission(m); else if (near) log(`${m.title}: ${m.remaining} left`); }
    }
  }
}
function damageAsteroid(a, amt, owner, mining) {
  a.hp -= amt; if (mining) a.mined += amt;
  if (a.hp <= 0 && !a.gone) breakAsteroid(a, owner);
}
function breakAsteroid(a, owner) {
  a.gone = true;
  Wd.asteroids.splice(Wd.asteroids.indexOf(a), 1);
  for (let i = 0; i < a.r * 0.5; i++) { const an = rand(0, TAU), s = rand(20, 120); part(a.x, a.y, Math.cos(an) * s, Math.sin(an) * s, rand(.6, 1.4), a.rich ? '#6ff0d8' : '#8b8173', rand(1.5, 3.5)); }
  let yieldMul = 1;
  if (a.r > 30) {
    yieldMul = 0.5;
    for (let k = 0; k < 2; k++) { const an = rand(0, TAU); const c = asteroidAt(a.x + Math.cos(an) * a.r * 0.4, a.y + Math.sin(an) * a.r * 0.4, a.r * 0.58, a.rich, a.belt); c.vx = Math.cos(an) * 25; c.vy = Math.sin(an) * 25; Wd.asteroids.push(c); }
  }
  if (!owner || !owner.isPlayer) return;
  const frac = clamp(a.mined / a.maxhp, 0, 1);
  let total = a.r / 4.5 * (0.3 + 0.7 * frac) * owner.st.mineMul * yieldMul;
  addXP(Math.round(total / 2), true);
  let ore = total, vol = 0;
  if (a.rich) { vol = total * 0.55; ore = total * 0.6; }
  ore = Math.round(ore); vol = Math.round(vol);
  while (ore > 0) { const q = Math.min(6, ore); dropPickup(a.x, a.y, 'com', 'ore', q); ore -= q; }
  while (vol > 0) { const q = Math.min(5, vol); dropPickup(a.x, a.y, 'com', 'volatiles', q); vol -= q; }
}
function spawnProj(s, W, x, y, a) {
  const n = W.pellets || 1, rng = W.range * s.st.rangeMul;
  for (let k = 0; k < n; k++) {
    const aa = a + (Math.random() - .5) * W.spread * Math.PI / 180 * (n > 1 ? 1 : 2) || a;
    const sp = W.spd * (n > 1 ? rand(.85, 1.1) : 1);
    const p = { x, y, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, a: aa, spd: sp, dmg: W.dmg * (s.dmgMul || 1), dt: W.dt, owner: s, life: rng / sp, color: W.color, len: W.len || 8, r: W.missile ? (W.big ? 9 : 5) : 3 };
    if (W.missile) {
      p.missile = true; p.homing = W.homing; p.big = !!W.big; p.life = rng / sp * 1.25;
      p.vx += s.vx * 0.5; p.vy += s.vy * 0.5;
      if (s.isPlayer) { let best = null, bd = 700 * 700; for (const t of Wd.ships) { if (t.dead || t.isPlayer) continue; const dd = (t.x - mouse.wx) ** 2 + (t.y - mouse.wy) ** 2; if (dd < bd && (playerHostileTo(t) || dd < 120 * 120)) { bd = dd; best = t; } } p.target = best; }
      else p.target = s.target;
    }
    Wd.proj.push(p);
  }
  if (Wd.parts.length < 900) part(x + Math.cos(a) * 4, y + Math.sin(a) * 4, s.vx, s.vy, 0.06, W.color, W.missile ? 6 : 4, 'flash');
}
function fireBeam(s, W, a, x, y, dt) {
  const rng = W.range * s.st.rangeMul, dx = Math.cos(a), dy = Math.sin(a);
  let best = rng, hit = null, hitA = null;
  for (const t of Wd.ships) {
    if (t === s || t.dead || !canHit(s, t)) continue;
    if (Math.abs(t.x - x) > rng + 60 || Math.abs(t.y - y) > rng + 60) continue;
    const tt = rayCircle(x, y, dx, dy, t.x, t.y, t.st.r * (t.shield ? 1.25 : 0.9));
    if (tt !== null && tt < best) { best = tt; hit = t; hitA = null; }
  }
  for (const as of Wd.asteroids) {
    if (Math.abs(as.x - x) > rng + as.r || Math.abs(as.y - y) > rng + as.r) continue;
    const tt = rayCircle(x, y, dx, dy, as.x, as.y, as.r * 0.92);
    if (tt !== null && tt < best) { best = tt; hit = null; hitA = as; }
  }
  const ex = x + dx * best, ey = y + dy * best;
  Wd.beams.push({ x1: x, y1: y, x2: ex, y2: ey, color: W.color, w: W.w, hit: !!(hit || hitA) });
  if (hit) { hit.danger = Math.max(hit.danger, 0.4); applyHit(hit, W.dps * dt * (s.dmgMul || 1), 'en', x, y, s); }
  if (hitA) damageAsteroid(hitA, W.dps * dt * (W.mine || 0.6), s, !!W.mine);
  if ((hit || hitA) && Math.random() < dt * 25) spark(ex, ey, W.color, 2);
}

// ───────────────────────── Ship update ─────────────────────────
function updateShip(s, dt) {
  const c = s.c, st = s.st;
  // Armor regenerates once the ship has gone 5 seconds without taking hull or armor damage.
  s.armorRegen = Wd.t - (s.lastDmgT ?? -99) > 5 && s.armor < s.st.armor;
  if (s.armorRegen) s.armor = Math.min(s.st.armor, s.armor + s.st.armor * 0.08 * dt);
  s.hitFlash = Math.max(0, s.hitFlash - dt); s.danger = Math.max(0, s.danger - dt); s.shieldHit = Math.max(0, (s.shieldHit || 0) - dt);
  // flux, shields, overload
  if (s.overload > 0) {
    s.overload -= dt; s.shield = false; s.flux = Math.max(0, s.flux - st.diss * dt);
    if (Math.random() < dt * 8) spark(s.x + rand(-st.r, st.r), s.y + rand(-st.r, st.r), '#c07ae0', 1);
  } else if (s.venting) {
    s.shield = false; s.flux -= (st.diss * 2.5 + st.flux * 0.06) * dt;
    if (Math.random() < dt * 20) part(s.x, s.y, rand(-60, 60) + s.vx, rand(-60, 60) + s.vy, .5, '#cfa8ff', 3);
    if (s.flux <= 0) { s.flux = 0; s.venting = false; }
  } else {
    if (c.vent && s.flux > 1) { s.venting = true; s.shield = false; }
    else {
      s.shield = c.shield && !s.burn && st.shArc > 0;
      s.flux = Math.max(0, s.flux - st.diss * (s.shield ? 0.5 : 1) * dt);
    }
  }
  const shAim = Math.atan2(c.aimY - s.y, c.aimX - s.x);
  s.shA += clamp(angDiff(s.shA, shAim), -5 * dt, 5 * dt);
  // movement
  s.burn = c.burn && !s.shield && s.overload <= 0 && !s.venting;
  const eng = s.engOut > 0 ? 0.35 : 1 - 0.06 * (s.engWear || 0); if (s.engOut > 0) s.engOut -= dt;
  const maxV = st.speed * eng * (s.burn ? 2.8 : 1), acc = st.accel * eng * (s.burn ? 2 : 1);
  if (c.turnTo !== null && c.turnTo !== undefined) { const d = angDiff(s.a, c.turnTo), tr = st.turn * (eng < 0.5 ? 0.5 : 1); s.a += clamp(d, -tr * dt, tr * dt); }
  else s.a += c.turn * st.turn * dt;
  const ca = Math.cos(s.a), sa = Math.sin(s.a);
  let th, sf;
  if (c.dir) { // screen-direction movement (player WASD)
    th = c.dir.x || c.dir.y ? 1 : (s.burn ? 1 : 0); sf = 0;
    const dx = c.dir.x || c.dir.y ? c.dir.x : ca, dy = c.dir.x || c.dir.y ? c.dir.y : sa;
    if (th) { s.vx += dx * acc * dt; s.vy += dy * acc * dt; }
  } else {
    th = s.burn ? 1 : c.thrust; sf = s.burn ? 0 : c.strafe;
    const fwd = th >= 0 ? th : th * 0.6;
    s.vx += (ca * fwd - sa * sf * 0.75) * acc * dt;
    s.vy += (sa * fwd + ca * sf * 0.75) * acc * dt;
  }
  s.thrustVis += ((th > 0 ? (s.burn ? 1.6 : 1) : 0) - s.thrustVis) * Math.min(1, dt * 8);
  const sp = Math.hypot(s.vx, s.vy);
  if (!th && !sf && sp > 0) { const ns = Math.max(0, sp - acc * 0.45 * dt); s.vx *= ns / sp; s.vy *= ns / sp; }
  const sp2 = Math.hypot(s.vx, s.vy);
  if (sp2 > maxV) { const ns = Math.max(maxV, sp2 - acc * 2 * dt); s.vx *= ns / sp2; s.vy *= ns / sp2; }
  s.x += s.vx * dt; s.y += s.vy * dt;
  const rr = Math.hypot(s.x, s.y);
  if (rr > SECTOR_R) { s.vx -= s.x / rr * 400 * dt; s.vy -= s.y / rr * 400 * dt; }
  if (rr < 520) { s.vx += s.x / rr * 600 * dt; s.vy += s.y / rr * 600 * dt; if (Math.random() < dt * 2) applyHit(s, 30 * dt * 10, 'en', 0, 0, null); }
  if (s.burn && Math.random() < dt * 30) { const e = s.H.engines[0]; part(s.x + (e[0] * ca), s.y + (e[0] * sa), -ca * 200 + s.vx, -sa * 200 + s.vy, .3, '#9fe8ff', 2); }
  // weapons
  const slots = s.H.slots;
  for (let i = 0; i < slots.length; i++) {
    const w = s.ws[i]; if (!w) continue;
    const W = WEAPONS[w.id], sl = slots[i];
    const mx = s.x + sl.x * ca - sl.y * sa, my = s.y + sl.x * sa + sl.y * ca;
    const tgt = Math.atan2(c.aimY - my, c.aimX - mx);
    const half = sl.arc * Math.PI / 360, face = sl.f * Math.PI / 180;
    const want = face + clamp(angDiff(s.a + face, tgt), -half, half);
    const tr = (W.s === 'M' ? 2.4 : 4) * dt;
    w.rel += clamp(angDiff(w.rel, want), -tr, tr);
    const wa = s.a + w.rel; w.wx = mx; w.wy = my; w.wa = wa;
    w.cd -= dt;
    if (w.off > 0) { w.off -= dt; w.firing = false; continue; }
    const trig = W.missile ? c.fireM : c.fire;
    const can = trig && !s.burn && s.overload <= 0 && !s.venting && w.ammo > 0;
    const aligned = s.isPlayer || Math.abs(angDiff(wa, tgt)) < 0.3;
    if (W.beam) {
      w.firing = can && aligned && s.flux + W.fps * dt < st.flux;
      if (w.firing) { s.flux += W.fps * dt; fireBeam(s, W, wa, mx, my, dt); }
    } else if (can && aligned && w.cd <= 0 && s.flux + W.flux <= st.flux) {
      w.cd = W.cd * (1 + 0.12 * (w.wear || 0)); s.flux += W.flux; if (W.ammo) w.ammo--;
      spawnProj(s, W, mx, my, wa);
    }
  }
}

// ───────────────────────── AI ─────────────────────────
function aggroRange(s) { return s.elite ? 2400 : s.role === 'escort' ? 1300 : s.role === 'wing' ? 2600 : s.role === 'assault' ? 1800 : s.role === 'ambush' ? 900 : s.role === 'fighter' ? 1600 : s.role === 'outpost' ? 950 : s.role === 'sentry' ? 1500 : s.role === 'patrol' ? 2000 : s.role === 'guard' ? 1300 : s.role === 'trader' ? 900 : 1500; }
function pickTarget(s) {
  const R = aggroRange(s);
  if (s.lastAttacker && !s.lastAttacker.dead && hostile(s, s.lastAttacker) && d2(s, s.lastAttacker) < 2600 * 2600) return s.lastAttacker;
  if (s.target && !s.target.dead && hostile(s, s.target) && d2(s, s.target) < (R * 1.6) ** 2) return s.target;
  let best = null, bd = R * R;
  const post = s.role === 'sentry' ? STN[s.home] : s.role === 'wing' ? wingAnchor() : s.role === 'escort' ? s.leader : null, postR = s.role === 'wing' ? wingRange() : s.role === 'escort' ? 1300 : 1700;
  for (const t of Wd.ships) { if (t === s || t.dead || !hostile(s, t) || isHidden(t, s)) continue; if (t.psId && !s.raider && s.lastAttacker !== t) continue; if (post && d2(t, post) > postR * postR) continue; const dd = d2(s, t); if (dd < bd) { bd = dd; best = t; } }
  return best;
}
function steerTo(s, x, y, thr) { s.c.turnTo = Math.atan2(y - s.y, x - s.x); s.c.thrust = Math.abs(angDiff(s.a, s.c.turnTo)) < 0.9 ? thr : 0.1; s.c.aimX = x; s.c.aimY = y; }
function aiUpdate(s, dt) {
  const c = s.c;
  c.fire = c.fireM = c.vent = c.burn = false; c.strafe = 0; c.thrust = 0; c.turn = 0; c.turnTo = null; c.shield = false;
  s.aiT -= dt; s.strafeT -= dt;
  if (s.strafeT <= 0) { s.strafeT = rand(2, 5); s.strafeDir *= -1; }
  if (s.aiT <= 0) { s.aiT = rand(0.3, 0.6); s.target = pickTarget(s); }
  let t = s.target && !s.target.dead ? s.target : null;
  if (s.role === 'guard' && s.guard && Math.hypot(s.x - s.guard.x, s.y - s.guard.y) > 4200) t = null;
  if (s.role === 'sentry') { const h = STN[s.home]; if (Math.hypot(s.x - h.x, s.y - h.y) > 2600 || (t && Math.hypot(t.x - h.x, t.y - h.y) > 2300)) { t = null; s.target = null; s.lastAttacker = null; } }
  if (aiSpecial(s, t, dt)) return;
  const hpF = s.hp / s.st.hull;
  if (s.role === 'trader') {
    const th = t || (s.lastAttacker && !s.lastAttacker.dead && d2(s, s.lastAttacker) < 1800 * 1800 ? s.lastAttacker : null);
    if (th) {
      c.turnTo = Math.atan2(s.y - th.y, s.x - th.x); c.thrust = 1; c.aimX = th.x; c.aimY = th.y;
      c.shield = s.danger > 0 && s.flux < s.st.flux * 0.9; c.burn = !c.shield && s.danger <= 0; c.fire = d2(s, th) < s.maxR ** 2;
      return;
    }
    const d = STN[s.dest] || (s.psDest ? psById(s.psDest) : null);
    if (!d) { s.dead = true; s.docked = true; return; }
    steerTo(s, d.x, d.y, 1); c.burn = false; // haulers cruise their routes at normal speed (they still burn to flee)
    if (d2(s, d) < (s.psDest ? 300 * 300 : 160 * 160)) { s.dead = true; s.docked = true; if (s.psDest) psDeliver(s); else { if (s.cargoC) G.stations[s.dest].stock[s.cargoC] += s.cargoQ; onTraderArrive(s); } }
    if (s.flux > 0 && !s.danger) c.vent = s.flux > s.st.flux * 0.3;
    return;
  }
  if (t) {
    const d = Math.sqrt(d2(s, t));
    if (hpF < 0.2 && s.role === 'pirate' && !s.elite && !s.fleeing && Math.random() < 0.5) s.fleeing = true;
    if (s.fleeing) { c.turnTo = Math.atan2(s.y - t.y, s.x - t.x); c.thrust = 1; c.burn = s.danger <= 0; c.shield = s.danger > 0; c.aimX = t.x; c.aimY = t.y; return; }
    const ps = s.ws.find(w => w && !WEAPONS[w.id].beam && !WEAPONS[w.id].missile);
    const spd = ps ? WEAPONS[ps.id].spd : 2000, lt = d / spd;
    c.aimX = t.x + (t.vx - s.vx * 0.3) * lt; c.aimY = t.y + (t.vy - s.vy * 0.3) * lt;
    c.turnTo = Math.atan2(c.aimY - s.y, c.aimX - s.x);
    const R = s.prefR;
    c.thrust = d > R + 120 ? 1 : d < R - 160 ? -0.7 : 0;
    if (d < R + 400) c.strafe = s.strafeDir * 0.8;
    c.fire = d < s.maxR * 1.02;
    c.fireM = d < 1050 && Math.random() < dt * 1.2;
    c.burn = d > 2400 && s.flux < 1;
    c.shield = s.danger > 0 && s.flux < s.st.flux * 0.88;
    if (s.flux > s.st.flux * 0.78 && s.danger <= 0) c.vent = true;
    if (!s.isPlayer && s.flux > s.st.flux * 0.6) c.fire = c.fire && Math.random() < 0.6;
    return;
  }
  // idle
  if (s.flux > s.st.flux * 0.2) c.vent = true;
  let home;
  if (s.role === 'guard') home = s.guard;
  else if (s.role === 'patrol') home = STN[s.home];
  if (s.role === 'sentry') {
    const h = STN[s.home]; const cur = Math.atan2(s.y - h.y, s.x - h.x), ta = cur + 0.45 * s.orbDir;
    steerTo(s, h.x + Math.cos(ta) * s.orbR, h.y + Math.sin(ta) * s.orbR, 0.5);
    return;
  }
  if (s.role === 'guard') {
    if (!s.wp || d2(s, s.wp) < 120 * 120) s.wp = { x: home.x + rand(-450, 450), y: home.y + rand(-450, 450) };
    steerTo(s, s.wp.x, s.wp.y, 0.35);
  } else if (s.role === 'patrol') {
    if (!s.wp || d2(s, s.wp) < 200 * 200) { const a = rand(0, TAU), r = rand(500, 2600); s.wp = { x: home.x + Math.cos(a) * r, y: home.y + Math.sin(a) * r }; }
    steerTo(s, s.wp.x, s.wp.y, 0.6);
  } else {
    const g = s.group || s;
    if (!g.wp || d2(s, g.wp) < 300 * 300) {
      const opts = [...BELTS.filter(b => !b.ring).map(b => ({ x: b.x + rand(-b.r, b.r), y: b.y + rand(-b.r, b.r) })), ...STATIONS.map(st => ({ x: st.x + rand(-2500, 2500), y: st.y + rand(-2500, 2500) })), { x: BLACKMAW.x, y: BLACKMAW.y }];
      g.wp = pick(opts);
    }
    steerTo(s, g.wp.x, g.wp.y, 0.75); c.burn = d2(s, g.wp) > 2500 * 2500;
  }
}
