
// ═══════════════ Depth systems: pilot, fleet & officers, war, investments, exploration, subsystems, enemy variety ═══════════════
const MAJOR = ['concord', 'veyra', 'ashen', 'tessel'];
const FAC_YARD = { concord: ['wren', 'talon', 'halberd'], veyra: ['skiff', 'wren', 'mule'], ashen: ['skiff', 'talon', 'brood'], tessel: ['mule', 'wren'] };

function initDepth(g) {
  g.pilot = g.pilot || { xp: 0, level: 1, points: 0, skills: {} };
  g.fleet = g.fleet || []; g.officers = g.officers || []; g.order = g.order || 'escort';
  g.owner = g.owner || {}; g.control = g.control || {}; for (const st of STATIONS) if (g.control[st.id] == null) g.control[st.id] = 100;
  g.wars = g.wars || [['concord', 'ashen']]; g.stakes = g.stakes || {}; g.outposts = g.outposts || [];
  g.lore = g.lore || []; g.mem = g.mem || {}; g.dilemma = g.dilemma || {}; g.capt = g.capt || {}; g.econBoost = g.econBoost || {};
  if (!g.pois) { g.pois = []; for (let i = 0; i < 28; i++) { const p = genPoi(); if (p) g.pois.push(p); } }
  applyOwners();
  initHoldings(g);
}

// ───────── Pilot skills & XP ─────────
const SKILLS = {
  gunnery: { name: 'Gunnery', desc: '+8% weapon damage' },
  shields: { name: 'Shield Discipline', desc: '-8% flux taken by shields' },
  navigation: { name: 'Navigation', desc: '+6% speed and turn rate' },
  industry: { name: 'Industry', desc: '+15% mining yield and outpost output' },
  commerce: { name: 'Commerce', desc: '3% better buy and sell prices' },
  leadership: { name: 'Leadership', desc: '+1 fleet slot; wingmen +5% hull, +4% damage' },
  salvage: { name: 'Salvage', desc: '+20% salvage loot, +800 su scan range' },
  engineering: { name: 'Engineering', desc: 'Repairs 15% cheaper and 25% faster; quicker field fixes' },
};
function skill(k) { return (typeof G !== 'undefined' && G && G.pilot && G.pilot.skills[k]) || 0; }
function xpNeed(l) { return 250 + l * l * 120; }
function addXP(n, quiet) {
  if (!G || !G.pilot || !n || n < 0) return;
  const P = G.pilot; P.xp += n;
  while (P.xp >= xpNeed(P.level)) { P.xp -= xpNeed(P.level); P.level++; P.points++; log(`Pilot level ${P.level}! Spend your skill point in the Pilot tab when docked.`, 'gold'); }
}
function applyBoosts(s) {
  s.dmgMul = s.elite ? 1.3 : 1;
  if (typeof G === 'undefined' || !G || !G.pilot) return;
  const st = s.st;
  if (s.isPlayer) {
    const n = skill('navigation'); st.speed *= 1 + 0.06 * n; st.turn *= 1 + 0.06 * n;
    st.shEff *= 1 - 0.08 * skill('shields'); st.mineMul *= 1 + 0.15 * skill('industry'); s.dmgMul *= 1 + 0.08 * skill('gunnery');
  } else if (s.role === 'wing') { const L = skill('leadership'); st.hull *= 1 + 0.05 * L; s.dmgMul *= 1 + 0.04 * L; }
  if (s.officer) {
    const o = officerById(s.officer);
    if (o) {
      const k = 1 + 0.5 * (o.level - 1), T = o.trait;
      if (T === 'gunner') s.dmgMul *= 1 + 0.12 * k;
      if (T === 'ironclad') { st.hull *= 1 + 0.15 * k; st.armor *= 1 + 0.15 * k; }
      if (T === 'ace') { st.speed *= 1 + 0.1 * k; st.turn *= 1 + 0.15 * k; st.accel *= 1 + 0.1 * k; }
      if (T === 'steady') { st.shEff *= 1 - 0.1 * k; st.flux *= 1 + 0.1 * k; }
      if (T === 'brawler') { s.dmgMul *= 1 + 0.08 * k; st.armor *= 1 + 0.08 * k; }
    }
  }
}

// ───────── Officers ─────────
const TRAITS = {
  gunner: { name: 'Gunner', desc: '+12% weapon damage' }, ironclad: { name: 'Ironclad', desc: '+15% hull and armor' },
  ace: { name: 'Ace', desc: '+10% speed, +15% turn rate' }, steady: { name: 'Steady', desc: '-10% shield flux, +10% flux capacity' },
  brawler: { name: 'Brawler', desc: '+8% damage and armor' },
};
const OFF_FIRST = ['Mara', 'Tobias', 'Ines', 'Kofi', 'Yelena', 'Ravi', 'Saoirse', 'Dmitri', 'Amara', 'Jun', 'Petra', 'Okon', 'Lena', 'Hal', 'Zuri', 'Emil'];
const OFF_LAST = ['Okafor', 'Lindqvist', 'Moreau', 'Tanaka', 'Achebe', 'Novak', 'Reyes', 'Brannigan', 'Sato', 'Haldane', 'Varga', 'Quist', 'Mbeki', 'Castell'];
function genOfficer(fac) {
  const lvl = Math.random() < 0.6 ? 1 : Math.random() < 0.75 ? 2 : 3;
  return { id: nid(), name: `${pick(OFF_FIRST)} ${pick(OFF_LAST)}`, trait: pick(Object.keys(TRAITS)), level: lvl, xp: 0, wage: 15 + lvl * 15, fee: lvl * 2500, look: randomLook(FAC_VOICE[fac] ? FAC_VOICE[fac].coat : '#3a4a5a'), fac };
}
function officerById(id) { return G && G.officers ? G.officers.find(o => o.id === id) : null; }
function officerShip(o) { return G.fleet.find(f => f.officer === o.id) || null; }
function officerImg(o, cls) { const c = makePortrait('off_' + o.id, o.look, FACTIONS[o.fac] ? FACTIONS[o.fac].color : '#6fd3e6'); return `<img class="${cls}" src="${c.url}" alt="Portrait of ${esc(o.name)}" width="24" height="28">`; }
function officerXP(id, t) {
  const o = officerById(id); if (!o || o.level >= 3) return;
  o.xp += t.H.price / 100;
  if (o.xp >= o.level * 160) { o.xp = 0; o.level++; o.wage += 15; log(`Officer ${o.name} reached level ${o.level}.`, 'gold'); }
}
function ensureHire(st) {
  const S = G.stations[st.id];
  if (!S.hire || G.time - (S.hireT || -9999) > 300) { S.hireT = G.time; S.hire = Array.from({ length: randi(1, 2) }, () => genOfficer(st.fac)); }
}

// ───────── Fleet ─────────
function fleetCap() { return 2 + skill('leadership') + (G && G.outposts ? G.outposts.filter(o => opHas(o, 'hangar')).length : 0); }
function fleetCargo() { return (G && G.fleet) ? G.fleet.reduce((a, f) => a + computeStats(f.cfg).cargo, 0) : 0; }
function cargoCap() { return (player ? player.st.cargo : computeStats(G.ship).cargo) + fleetCargo(); }
function wingName(f) { const o = f.officer && officerById(f.officer); return `${HULLS[f.cfg.hull].name}${o ? ' · ' + o.name : ''}`; }
function wingPrice(st, id) { return itemPrice(st, Math.round(HULLS[id].price * 1.3)); }
function wingAnchor() { return G.order === 'hold' && G.holdPt ? G.holdPt : player; }
function wingRange() { return G.order === 'engage' ? 2600 : G.order === 'hold' ? 1000 : 1150; }
function setOrder(o) {
  if (!G.fleet.length) { log('You have no wingmen. Buy hulls at a shipyard to build a fleet.'); return; }
  G.order = o; if (o === 'hold') G.holdPt = { x: player.x, y: player.y };
  for (const s of Wd.ships) if (s.role === 'wing') { s.target = null; s.lastAttacker = null; }
  log({ escort: 'Fleet: escort. Wingmen stay close and defend you.', engage: 'Fleet: engage. Wingmen hunt hostiles in a wide radius.', hold: 'Fleet: hold position here.' }[o]);
}
function fleetUndock() {
  if (!G.fleet) return;
  G.fleet.forEach((f, i) => {
    const a = player.a + Math.PI + (i % 2 ? 1 : -1) * (0.5 + 0.2 * i), r = 130 + i * 45;
    const s = new Ship(f.cfg, 'player', player.x + Math.cos(a) * r, player.y + Math.sin(a) * r, { role: 'wing', side: 'player', officer: f.officer, name: wingName(f), a: player.a });
    s.fleetId = f.id; s.slotIdx = i;
    s.hp = s.st.hull * (f.hpF ?? 1); s.armor = s.st.armor * (f.armorF ?? 1); s.engWear = f.engWear || 0;
    (f.wear || []).forEach((w, j) => { if (s.ws[j]) s.ws[j].wear = w; });
    Wd.ships.push(s);
  });
}
function depthSync() {
  if (!Wd || !G) return;
  for (const s of Wd.ships) {
    if (s.role === 'wing' && !s.dead) { const f = G.fleet.find(f => f.id === s.fleetId); if (f) { f.hpF = s.hp / s.st.hull; f.armorF = s.armor / s.st.armor; f.engWear = s.engWear || 0; f.wear = s.ws.map(w => w ? w.wear || 0 : 0); } }
    if (s.role === 'outpost' && !s.dead) { const o = G.outposts.find(o => o.id === s.outpostId); if (o) o.hpF = s.hp / s.st.hull; }
  }
  psSync();
  if (player && !player.dead) G.wear = { slots: player.ws.map(w => w ? w.wear || 0 : 0), eng: player.engWear || 0 };
}
function applyPlayerWear() { if (!G.wear || !player) return; player.engWear = G.wear.eng || 0; (G.wear.slots || []).forEach((w, i) => { if (player.ws[i]) player.ws[i].wear = w; }); }
function fleetDock() {
  depthSync();
  Wd.ships = Wd.ships.filter(s => s.role !== 'wing' && !(s.role === 'fighter' && s.side === 'player'));
}
function trimCargo() {
  let over = cargoUsed() - cargoCap(); if (over <= 0) return;
  const keys = Object.keys(G.cargo).filter(k => COMS[k]).sort((a, b) => G.cargo[b] - G.cargo[a]);
  for (const k of keys) { if (over <= 0) break; const q = Math.min(over, G.cargo[k]); addCargo(k, -q); over -= q; log(`Lost ${q} t of ${COMS[k].name.toLowerCase()}: not enough hold space left.`, 'bad'); }
}
function wingFollow(s) {
  const k = s.slotIdx || 0, c = s.c;
  let ax, ay;
  if (G.order === 'hold' && G.holdPt) { const a = k * 2.1; ax = G.holdPt.x + Math.cos(a) * 160; ay = G.holdPt.y + Math.sin(a) * 160; }
  else { const side = k % 2 ? 1 : -1, row = Math.floor(k / 2) + 1, a = player.a + Math.PI + side * 0.6; ax = player.x + Math.cos(a) * (110 + row * 70) + player.vx * 0.35; ay = player.y + Math.sin(a) * (110 + row * 70) + player.vy * 0.35; }
  const d = Math.hypot(ax - s.x, ay - s.y);
  if (s.flux > s.st.flux * 0.2) c.vent = true;
  if (d < 45) { c.turnTo = G.order === 'hold' ? null : player.a; c.thrust = 0; c.aimX = s.x + Math.cos(s.a) * 300; c.aimY = s.y + Math.sin(s.a) * 300; return; }
  steerTo(s, ax, ay, clamp(d / 260, 0.15, 1)); c.burn = d > 900 && s.flux < 1;
}

// ───────── Ledger: wages and dividends ─────────
function stakeIncome(id) { const k = G.stakes[id], st = STN[id]; if (!k || !st) return 0; return Math.round(k.lvl * st.prod.reduce((a, c) => a + sellPrice(st, c), 0)); }
function wagesPerMin() { return Math.round(G.fleet.reduce((a, f) => a + HULLS[f.cfg.hull].price * 0.0012, 0) + G.officers.reduce((a, o) => a + o.wage, 0)); }
function ledgerTick(mins) {
  const wages = Math.round(wagesPerMin() * mins);
  let div = 0; for (const id in G.stakes) div += stakeIncome(id); div = Math.round(div * mins) + outpostSales(mins);
  const hnet = Math.round(holdingsMinute(mins) || 0);
  if (!wages && !div && !G.holdings.length) return;
  G.credits += div - wages;
  const parts = []; if (div) parts.push(`+${fmt(div)} cr dividends`); if (G.holdings.length) parts.push(`${hnet >= 0 ? '+' : '−'}${fmt(Math.abs(hnet))} cr holdings`); if (wages) parts.push(`−${fmt(wages)} cr crew wages`);
  log(`Ledger: ${parts.join(' · ')}`, div + hnet >= wages ? 'good' : 'bad');
  if (G.credits < 0) {
    G.credits = 0;
    if (G.fleet.length) {
      const f = G.fleet.pop(); log(`Unpaid crew walked off with your ${HULLS[f.cfg.hull].name}.`, 'bad');
      for (const s of Wd.ships) if (s.role === 'wing' && s.fleetId === f.id) s.dead = true;
      trimCargo();
    } else if (G.officers.length) { const o = G.officers.pop(); log(`Officer ${o.name} quit over unpaid wages.`, 'bad'); }
  }
}

// ───────── Territory & war ─────────
function applyOwners() {
  for (const st of STATIONS) {
    if (!st.origFac) { st.origFac = st.fac; st.origYard = st.yard.slice(); }
    const f = (G && G.owner && G.owner[st.id]) || st.origFac;
    st.fac = f;
    st.yard = !st.origYard.length ? [] : f === st.origFac ? st.origYard.slice() : FAC_YARD[f].slice();
  }
}
function atWarWith(fac) { return G.wars.filter(w => w.includes(fac)).map(w => w[0] === fac ? w[1] : w[0]); }
function captureStation(st, fac) {
  const prev = st.fac;
  G.owner[st.id] = fac; G.control[st.id] = 45; applyOwners();
  for (const s of Wd.ships) {
    if (s.role === 'sentry' && s.home === st.id) { s.dead = true; explosion(s.x, s.y, s.st.r); }
    if (s.role === 'assault' && s.goal === st.id) { s.role = 'sentry'; s.home = st.id; s.orbR = rand(380, 650); s.orbDir = 1; s.tag = null; }
  }
  if (G.stakes[st.id] && G.stakes[st.id].fac !== fac) { delete G.stakes[st.id]; log(`Your stake in ${st.name} was seized by the ${FACTIONS[fac].name}.`, 'bad'); }
  G.stations[st.id].refreshed = -9999;
  log(`${st.name} has fallen! The ${FACTIONS[fac].name} took it from the ${FACTIONS[prev].name}.`, 'bad');
}
function sackStation(st) {
  const S = G.stations[st.id]; for (const c in COMS) S.stock[c] = Math.floor(S.stock[c] * 0.5);
  G.control[st.id] = 40; log(`Raiders sacked ${st.name}. Half its stores were looted.`, 'bad');
}
function warTick() {
  for (const st of STATIONS) {
    let att = 0, raid = 0, guards = 0, attFac = null;
    for (const s of Wd.ships) {
      if (s.dead) continue; const dd = d2(s, st);
      if (s.role === 'assault' && dd < 1900 * 1900 && AT_WAR(s.fac, st.fac)) { att++; attFac = s.fac; }
      else if (s.fac === 'pirate' && s.role === 'pirate' && dd < 1300 * 1300) raid++;
      else if (s.role === 'sentry' && s.home === st.id && dd < 1900 * 1900) guards++;
    }
    let c = G.control[st.id] ?? 100;
    if (att) c -= att * (guards ? 1.0 : 2.6);
    if (raid) c -= raid * (guards ? 0.2 : 0.7);
    if (!att && !raid) c = Math.min(100, c + 0.9);
    if (c <= 0) { if (attFac) captureStation(st, attFac); else sackStation(st); }
    else G.control[st.id] = c;
  }
  Wd.assaultT = (Wd.assaultT ?? 70) - 3.5; if (Wd.assaultT <= 0) { Wd.assaultT = rand(100, 170); launchAssault(); }
  Wd.warT = (Wd.warT ?? 420) - 3.5; if (Wd.warT <= 0) { Wd.warT = rand(380, 640); diplomacy(); }
}
function launchAssault() {
  const wars = G.wars.filter(w => STATIONS.some(s => s.fac === w[0]) && STATIONS.some(s => s.fac === w[1]));
  if (!wars.length) return;
  const w = pick(wars), att = Math.random() < 0.5 ? w[0] : w[1], def = att === w[0] ? w[1] : w[0];
  const from = pick(STATIONS.filter(s => s.fac === att));
  const target = STATIONS.filter(s => s.fac === def).sort((a, b) => d2(a, from) - d2(b, from))[0];
  if (Wd.ships.some(s => !s.dead && s.role === 'assault' && s.goal === target.id)) return;
  const n = randi(3, 5), hulls = FAC_YARD[att].filter(h => h !== 'halberd' || Math.random() < 0.3);
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), hull = pick(hulls);
    const s = new Ship(genCfg(hull, 1), att, from.x + Math.cos(a) * 500, from.y + Math.sin(a) * 500, { role: 'assault' });
    s.goal = target.id; s.name = `${FACTIONS[att].short} strike group`; Wd.ships.push(s);
  }
  log(`War: a ${FACTIONS[att].name} strike group is moving on ${target.name}.`, 'bad');
  G.stations[target.id].refreshed = -9999; G.stations[from.id].refreshed = -9999;
}
function diplomacy() {
  if (G.wars.length < 2 && Math.random() < 0.55) {
    const pairs = []; for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) { const a = MAJOR[i], b = MAJOR[j]; if (!G.wars.some(w => w.includes(a) && w.includes(b))) pairs.push([a, b]); }
    const p = pick(pairs); G.wars.push(p);
    log(`War declared: the ${FACTIONS[p[0]].name} and the ${FACTIONS[p[1]].name} are now at war.`, 'bad');
  } else if (G.wars.length && Math.random() < 0.5) {
    const i = randi(0, G.wars.length - 1), w = G.wars[i];
    const core = w.includes('concord') && w.includes('ashen');
    if (!core || Math.random() < 0.25) {
      G.wars.splice(i, 1);
      log(`Ceasefire: the ${FACTIONS[w[0]].name} and the ${FACTIONS[w[1]].name} have stopped fighting.`, 'good');
      for (const s of Wd.ships) if (s.role === 'assault' && (s.fac === w[0] || s.fac === w[1])) { const h = STATIONS.find(x => x.fac === s.fac); if (h) { s.role = 'patrol'; s.home = h.id; } else s.dead = true; }
    }
  }
}
function warJob(st, id) {
  const enemies = atWarWith(st.fac); if (!enemies.length) return null;
  const inbound = Wd.ships.filter(s => !s.dead && s.role === 'assault' && s.goal === st.id);
  if (inbound.length) return { id, kind: 'kill', defend: st.id, hostileFleet: true, fac: st.fac, from: st.id, x: st.x, y: st.y, fleet: inbound.map(s => [s.cfg.hull, s.fac]),
    reward: Math.round((2500 + inbound.length * 1800) / 100) * 100, rep: randi(6, 8), title: `Defend ${st.name}`,
    desc: `A ${FACTIONS[inbound[0].fac].name} strike group of ${inbound.length} ships is attacking. Break it before they take the station. Station control is at ${Math.round(G.control[st.id])}%.` };
  const tgts = STATIONS.filter(s => enemies.includes(s.fac)); if (!tgts.length) return null;
  const tg = tgts.sort((a, b) => d2(a, st) - d2(b, st))[0], n = randi(3, 4), a = Math.atan2(st.y - tg.y, st.x - tg.x);
  const fleet = Array.from({ length: n }, () => [pick(FAC_YARD[tg.fac].filter(h => h !== 'halberd')), tg.fac]);
  return { id, kind: 'kill', strike: tg.id, hostileFleet: true, fac: st.fac, from: st.id, x: tg.x + Math.cos(a) * 2200, y: tg.y + Math.sin(a) * 2200, fleet,
    reward: Math.round((4000 + n * 2200) / 100) * 100, rep: randi(6, 9), title: `Strike on ${tg.name}`,
    desc: `Destroy the ${FACTIONS[tg.fac].short} picket outside ${tg.name}. Breaking it cuts their control of the station by 45%. If control hits zero, the ${FACTIONS[st.fac].short} take it. Costs ${FACTIONS[tg.fac].short} standing.` };
}
function tagAssault(m) {
  const ships = Wd.ships.filter(s => !s.dead && s.role === 'assault' && s.goal === m.defend);
  if (!ships.length) { log('That assault has already been broken.', 'bad'); return false; }
  ships.forEach(s => { s.tag = m.tag; }); m.remaining = ships.length; m.fleet = ships.map(s => [s.cfg.hull, s.fac]);
  return true;
}
function onMissionDone(m, ok) {
  if (ok) {
    addXP(Math.round(m.reward / 40));
    if (m.from) remember(m.from, 'favor');
    if (m.strike) {
      const tg = STN[m.strike]; G.control[tg.id] = (G.control[tg.id] ?? 100) - 45;
      log(`${tg.name}'s defenses are reeling. Control is down to ${Math.max(0, Math.round(G.control[tg.id]))}%.`, 'gold');
      if (G.control[tg.id] <= 0 && AT_WAR(m.fac, tg.fac)) captureStation(tg, m.fac);
    }
    if (m.defend) G.control[m.defend] = Math.min(100, (G.control[m.defend] ?? 50) + 30);
    if (m.dilemma) resolveDilemma(m);
  } else {
    if (m.from) remember(m.from, 'slight', 'You walked away from a job you took from me.');
    if (m.dilemma) delete G.dilemma[m.dilemma.id];
  }
}
function drawStationStatus(st) {
  const c = G.control[st.id] ?? 100;
  const inbound = Wd.ships.some(s => !s.dead && s.role === 'assault' && s.goal === st.id);
  if (c >= 99.5 && !inbound) return;
  ctx.save(); ctx.translate(st.x, st.y - 120); ctx.scale(1 / cam.zoom, 1 / cam.zoom);
  ctx.fillStyle = 'rgba(10,17,25,.85)'; ctx.fillRect(-50, -4, 100, 6);
  ctx.fillStyle = c < 35 ? '#ff6a5c' : c < 70 ? '#f0b44c' : FACTIONS[st.fac].color; ctx.fillRect(-50, -4, Math.max(0, c), 6);
  ctx.font = "500 10px 'IBM Plex Mono', monospace"; ctx.textAlign = 'center'; ctx.fillStyle = inbound ? '#ff6a5c' : '#9fb3c0';
  ctx.fillText(`${inbound ? 'UNDER ASSAULT · ' : ''}control ${Math.round(c)}%`, 0, -10);
  ctx.restore();
}

// ───────── Investments: stakes and mining outposts ─────────
function stakeCost(st) { const k = G.stakes[st.id]; return 15000 * ((k ? k.lvl : 0) + 1); }
// Outpost modules: built into slots, paid for in credits plus materials hauled in your hold.
const OP_MODS = {
  turrets: { cat: 'Defenses', name: 'Heavy Turret Battery', desc: 'Replaces the light guns with a railgun, a Lumen beam and a Heavy Mauler.', cost: { cr: 14000, metals: 15 } },
  plating: { cat: 'Defenses', name: 'Armored Bulwarks', desc: '+60% hull and armor.', cost: { cr: 9000, metals: 20 } },
  shieldgen: { cat: 'Defenses', name: 'Shield Generator', desc: '+60% flux capacity and dissipation, so the shield holds far longer.', cost: { cr: 11000, machinery: 8 } },
  drones: { cat: 'Defenses', name: 'Drone Bay', desc: 'Launches up to four defense fighters when raiders attack.', cost: { cr: 16000, machinery: 10 } },
  mines: { cat: 'Defenses', name: 'Minefield Layer', desc: 'Seeds proximity mines around the outpost during attacks.', cost: { cr: 7000, weapons: 8 } },
  drill: { cat: 'Production', name: 'Deep Core Drill', desc: '+50% ore output.', cost: { cr: 8000, machinery: 6 } },
  extractor: { cat: 'Production', name: 'Volatile Extractor', desc: 'Pulls volatiles from any field, and doubles them in rich fields.', cost: { cr: 9000, machinery: 8 } },
  refinery: { cat: 'Production', name: 'Ore Smelter', desc: 'Automatically smelts 2 ore into 1 ton of metals.', cost: { cr: 12000, metals: 10 } },
  fabricator: { cat: 'Production', name: 'Fabricator', desc: 'Turns metals and volatiles into machinery.', cost: { cr: 15000, metals: 15, machinery: 5 } },
  hydro: { cat: 'Production', name: 'Hydroponics Bay', desc: 'Grows food on site, so supplies drain 70% slower.', cost: { cr: 7000, machinery: 4 } },
  silos: { cat: 'Production', name: 'Storage Silos', desc: 'Doubles storage capacity.', cost: { cr: 5000, metals: 10 } },
  repair: { cat: 'Services', name: 'Repair Dock', desc: 'Your ships within 700 su slowly repair hull and armor.', cost: { cr: 12000, metals: 10, machinery: 6 } },
  sensors: { cat: 'Services', name: 'Sensor Array', desc: 'Reveals contacts and hidden raiders within 5,000 su.', cost: { cr: 8000, machinery: 4 } },
  hangar: { cat: 'Services', name: 'Fleet Hangar', desc: '+1 fleet slot while the outpost stands.', cost: { cr: 18000, metals: 15 } },
  beacon: { cat: 'Services', name: 'Trade Beacon', desc: 'Passing haulers buy your stored output every minute at 70% of market price.', cost: { cr: 10000, machinery: 5 } },
};
const OP_STORE = ['ore', 'volatiles', 'metals', 'machinery'];
function opInit(o) { o.mods = o.mods || []; for (const c of OP_STORE) o.store[c] = o.store[c] || 0; return o; }
function opHas(o, m) { return !o.wrecked && (o.mods || []).includes(m); }
function opSlots(o) { return [2, 4, 6][o.level - 1]; }
function outpostCap(o) { return 200 * o.level * (opHas(o, 'silos') ? 2 : 1); }
function opStored(o) { return OP_STORE.reduce((a, c) => a + (o.store[c] || 0), 0); }
function avgSell(c) { return STATIONS.reduce((a, st) => a + sellPrice(st, c), 0) / STATIONS.length; }
function spawnOutpost(o) {
  opInit(o); if (o.wrecked) return;
  const b = BELTS[o.belt];
  const weapons = opHas(o, 'turrets') ? ['railgun', 'lumen', 'mauler'] : ['autocannon', 'lightlaser', 'autocannon'];
  const s = new Ship({ hull: 'outpost', weapons, mods: [] }, 'player', o.x, o.y, { role: 'outpost', side: 'player', a: 0 });
  const st = s.st;
  if (opHas(o, 'plating')) { st.hull *= 1.6; st.armor *= 1.6; }
  if (opHas(o, 'shieldgen')) { st.flux *= 1.6; st.diss *= 1.6; }
  s.droneBay = opHas(o, 'drones'); s.mineField = opHas(o, 'mines');
  s.outpostId = o.id; s.name = `${b.name} Outpost`; s.hp = st.hull * (o.hpF ?? 1); s.armor = st.armor;
  Wd.ships.push(s);
  Wd.asteroids = Wd.asteroids.filter(a => (a.x - o.x) ** 2 + (a.y - o.y) ** 2 > 170 * 170);
}
function respawnOutpost(o) {
  const e = outpostEntity(o); if (e) { o.hpF = e.hp / e.st.hull; e.dead = true; Wd.ships = Wd.ships.filter(s => s !== e); }
  spawnOutpost(o);
}
function buildOutpost(bi) {
  const b = BELTS[bi], a = rand(0, TAU);
  const o = { id: nid(), belt: bi, x: b.x + Math.cos(a) * b.r * 0.35, y: b.y + Math.sin(a) * b.r * 0.35, level: 1, store: { ore: 0, volatiles: 0, metals: 0, machinery: 0 }, supplies: 40, hpF: 1, wrecked: false, mods: [] };
  G.outposts.push(o); spawnOutpost(o);
  log(`Outpost founded in ${b.name}. Keep it supplied with food or machinery.`, 'gold');
}
function outpostTick() {
  for (const o of G.outposts) {
    opInit(o);
    if (o.wrecked || o.supplies <= 0) continue;
    const b = BELTS[o.belt], L = o.level, k = L * (1 + 0.15 * skill('industry'));
    const rich = b.rich > 0.15, room = opStored(o) < outpostCap(o);
    if (room) {
      o.store.ore += 0.6 * k * (opHas(o, 'drill') ? 1.5 : 1);
      if (rich) o.store.volatiles += 0.25 * k * (opHas(o, 'extractor') ? 2 : 1);
      else if (opHas(o, 'extractor')) o.store.volatiles += 0.2 * k;
    }
    if (opHas(o, 'refinery')) { const c = Math.min(o.store.ore, 0.6 * L); o.store.ore -= c; o.store.metals += c / 2; }
    if (opHas(o, 'fabricator') && o.store.metals >= 0.3 * L && o.store.volatiles >= 0.15 * L) { o.store.metals -= 0.3 * L; o.store.volatiles -= 0.15 * L; o.store.machinery += 0.2 * L; }
    const drain = (0.12 * L + 0.02 * o.mods.length) * (opHas(o, 'hydro') ? 0.3 : 1);
    o.supplies = Math.max(0, o.supplies - drain);
  }
}
function outpostSales(mins) {
  let total = 0;
  for (const o of G.outposts) {
    if (!opHas(o, 'beacon')) continue; opInit(o);
    for (const c of OP_STORE) { const q = Math.min(Math.floor(o.store[c]), Math.round(25 * mins)); if (q > 0) { o.store[c] -= q; total += q * avgSell(c) * 0.7; } }
  }
  return Math.round(total);
}
function openOutpost(o) {
  mode = 'dock'; UI.outpost = opInit(o); UI.st = null;
  player.vx = player.vy = 0; shieldOn = false; mouse.down = false; for (const k in keys) keys[k] = false;
  fleetDock();
  $('dock').hidden = false; $('hud').hidden = true; UI.notices = []; renderDock();
}
function outpostEntity(o) { return Wd.ships.find(s => s.role === 'outpost' && s.outpostId === o.id && !s.dead); }
function opCostText(cost) { return Object.entries(cost).map(([k, v]) => k === 'cr' ? `${fmt(v)} cr` : `${v} t ${COMS[k].name.toLowerCase()}`).join(' + '); }
function opCanPay(cost) { return Object.entries(cost).every(([k, v]) => k === 'cr' ? G.credits >= v : (G.cargo[k] || 0) >= v); }
function renderOutpostPanel() {
  const o = opInit(UI.outpost), b = BELTS[o.belt], e = outpostEntity(o);
  $('dName').textContent = `${b.name} Outpost`; $('dName').style.color = 'var(--hud)';
  $('dSub').textContent = `Your mining outpost · level ${o.level} · ${o.mods.length}/${opSlots(o)} module slots${o.wrecked ? ' · WRECKED' : ''}`;
  $('dCredits').textContent = fmt(G.credits) + ' cr'; $('dTabs').innerHTML = '';
  const hpF = e ? e.hp / e.st.hull : (o.wrecked ? 0 : o.hpF ?? 1);
  const repairCost = o.wrecked ? 9000 : Math.ceil((1 - hpF) * 4000);
  const upCost = o.level < 3 ? 22000 * o.level : 0;
  const food = G.cargo.food || 0, mach = G.cargo.machinery || 0;
  const drain = (0.12 * o.level + 0.02 * o.mods.length) * (opHas(o, 'hydro') ? 0.3 : 1) * 60 / 3.5;
  let h = UI.notices.map(n => `<div class="notice">${esc(n)}</div>`).join('');
  h += `<div class="cols"><div style="min-width:0"><div class="sec">Status</div><div class="stats">
    <span>Integrity</span><span>${o.wrecked ? 'Wrecked' : Math.round(hpF * 100) + '%'}</span>
    <span>Supplies</span><span>${Math.floor(o.supplies)} (−${drain.toFixed(1)}/min)${o.supplies <= 0 ? ' · halted' : ''}</span>
    ${OP_STORE.map(c => `<span>Stored ${COMS[c].name.toLowerCase()}</span><span>${Math.floor(o.store[c])} t</span>`).join('')}
    <span>Storage</span><span>${Math.floor(opStored(o))} / ${outpostCap(o)} t</span><span>Your hold</span><span>${cargoUsed()} / ${cargoCap()} t</span></div>
    <div class="sec">Actions</div><div class="list">
    <div class="item"><div><div class="nm">Load stored output</div><div class="ds">Moves ore, volatiles, metals and machinery into your hold</div></div><button class="primary" data-act="opcollect" ${opStored(o) < 1 || cargoFree() < 1 ? 'disabled' : ''}>Load</button></div>
    <div class="item"><div><div class="nm">Deliver food</div><div class="ds">${food} t in hold · 1 supply per ton</div></div><button data-act="opsupply" data-id="food" ${food < 1 ? 'disabled' : ''}>Unload food</button></div>
    <div class="item"><div><div class="nm">Deliver machinery as supplies</div><div class="ds">${mach} t in hold · 3 supplies per ton</div></div><button data-act="opsupply" data-id="machinery" ${mach < 1 ? 'disabled' : ''}>Unload machinery</button></div>
    <div class="item"><div><div class="nm">${o.wrecked ? 'Rebuild outpost' : 'Repair outpost'}</div><div class="ds">${o.wrecked ? 'Everything is offline until you rebuild. Modules survive.' : 'Patches the hull'}</div></div><button data-act="oprepair" ${repairCost <= 0 || G.credits < repairCost ? 'disabled' : ''}>${repairCost > 0 ? fmt(repairCost) + ' cr' : 'Intact'}</button></div>
    ${o.level < 3 ? `<div class="item"><div><div class="nm">Expand to level ${o.level + 1}</div><div class="ds">More output, storage and ${opSlots({ level: o.level + 1 }) - opSlots(o)} more module slots. Uses supplies faster.</div></div><button data-act="opupgrade" ${G.credits < upCost ? 'disabled' : ''}>${fmt(upCost)} cr</button></div>` : ''}
    </div></div><div style="min-width:0"><div class="sec">Installed modules (${o.mods.length}/${opSlots(o)})</div>`;
  if (!o.mods.length) h += `<p style="color:var(--dim);margin:0 0 6px">No modules yet. Build them below with credits and materials from your hold.</p>`;
  h += '<div class="list">' + o.mods.map(m => `<div class="item"><div><div class="nm">${OP_MODS[m].name} <span class="tag" style="color:var(--dim);border-color:var(--line2)">${OP_MODS[m].cat.toUpperCase()}</span></div><div class="ds">${OP_MODS[m].desc}</div></div><button class="warn" data-act="opdemolish" data-id="${m}">${UI.confirmDemo === m ? 'Confirm' : 'Demolish'}</button></div>`).join('') + '</div>';
  const full = o.mods.length >= opSlots(o);
  for (const cat of ['Defenses', 'Production', 'Services']) {
    h += `<div class="sec">${cat}</div><div class="list">`;
    for (const id in OP_MODS) {
      const M = OP_MODS[id]; if (M.cat !== cat || o.mods.includes(id)) continue;
      const can = !o.wrecked && !full && opCanPay(M.cost);
      h += `<div class="item"><div><div class="nm">${M.name}</div><div class="ds">${M.desc}<br>${opCostText(M.cost)}</div></div><button class="primary" data-act="opbuild" data-id="${id}" ${can ? '' : 'disabled'}>${o.wrecked ? 'Rebuild first' : full ? 'No free slot' : opCanPay(M.cost) ? 'Build' : 'Need materials'}</button></div>`;
    }
    h += '</div>';
  }
  $('dBody').innerHTML = h + '</div></div>';
}
function opAction(act, d) {
  const o = UI.outpost; if (!o) return false;
  if (act !== 'opdemolish') UI.confirmDemo = null;
  switch (act) {
    case 'opcollect': { let n = 0; for (const c of ['machinery', 'metals', 'volatiles', 'ore']) { const q = Math.min(Math.floor(o.store[c]), cargoFree()); if (q > 0) { o.store[c] -= q; addCargo(c, q); n += q; } } UI.notices = [`Loaded ${n} t into your hold.`]; return true; }
    case 'opsupply': { const c = d.id, q = G.cargo[c] || 0; const s = c === 'machinery' ? q * 3 : q; o.supplies += s; addCargo(c, -q); UI.notices = [`Delivered ${s} supplies.`]; return true; }
    case 'oprepair': {
      const e = outpostEntity(o), cost = o.wrecked ? 9000 : Math.ceil((1 - (e ? e.hp / e.st.hull : 1)) * 4000);
      if (G.credits < cost) return true; G.credits -= cost;
      if (o.wrecked) { o.wrecked = false; o.hpF = 1; spawnOutpost(o); } else if (e) e.hp = e.st.hull;
      UI.notices = ['Outpost repaired.']; return true;
    }
    case 'opupgrade': { const c = 22000 * o.level; if (o.level < 3 && G.credits >= c) { G.credits -= c; o.level++; UI.notices = [`Outpost expanded to level ${o.level}.`]; } return true; }
    case 'opbuild': {
      const M = OP_MODS[d.id]; if (!M || o.wrecked || o.mods.length >= opSlots(o) || o.mods.includes(d.id) || !opCanPay(M.cost)) return true;
      for (const [k, v] of Object.entries(M.cost)) { if (k === 'cr') G.credits -= v; else addCargo(k, -v); }
      o.mods.push(d.id); respawnOutpost(o); UI.notices = [`${M.name} is online.`]; return true;
    }
    case 'opdemolish': {
      const id = d.id; if (UI.confirmDemo !== id) { UI.confirmDemo = id; return true; }
      UI.confirmDemo = null; o.mods = o.mods.filter(m => m !== id); G.credits += Math.round(OP_MODS[id].cost.cr * 0.4);
      respawnOutpost(o); UI.notices = [`${OP_MODS[id].name} demolished. Salvage returned ${fmt(OP_MODS[id].cost.cr * 0.4)} cr.`]; return true;
    }
  }
  return false;
}
function outpostAuras(dt) {
  for (const o of G.outposts) {
    if (!opHas(o, 'repair')) continue;
    for (const s of Wd.ships) {
      if (s.dead || !(s.isPlayer || s.role === 'wing')) continue;
      if ((s.x - o.x) ** 2 + (s.y - o.y) ** 2 > 700 * 700) continue;
      s.hp = Math.min(s.st.hull, s.hp + s.st.hull * 0.02 * dt); s.armor = Math.min(s.st.armor, s.armor + s.st.armor * 0.06 * dt);
      if (s.isPlayer) s.opRepair = 0.3;
    }
  }
  if (player && player.opRepair > 0) player.opRepair -= dt;
}
function outpostSensors() {
  for (const o of G.outposts) {
    if (!opHas(o, 'sensors')) continue; const R2 = 5000 * 5000;
    for (const p of G.pois) if (!p.found && !p.done && (p.x - o.x) ** 2 + (p.y - o.y) ** 2 < R2) { p.found = true; log(`${BELTS[o.belt].name} sensors: ${POI_TYPES[p.type].name} located.`, 'gold'); }
    for (const s of Wd.ships) if (s.role === 'ambush' && !s.revealed && (s.x - o.x) ** 2 + (s.y - o.y) ** 2 < R2) s.revealed = true;
  }
}

// ───────── Exploration ─────────
const POI_TYPES = { derelict: { name: 'Derelict hulk', color: '#a9bcc8' }, salvage: { name: 'Debris field', color: '#d2c2a6' }, beacon: { name: 'Distress beacon', color: '#ff6a5c' }, cache: { name: 'Data cache', color: '#6fd3e6' }, relic: { name: 'Precursor relic', color: '#b88aff' } };
function genPoi(far) {
  for (let k = 0; k < 40; k++) {
    const fringe = Math.random() < 0.55, a = rand(0, TAU), r = fringe ? rand(16000, 17600) : rand(3500, 15000);
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (STATIONS.some(s => (s.x - x) ** 2 + (s.y - y) ** 2 < 2500 * 2500)) continue;
    if (far && (far.x - x) ** 2 + (far.y - y) ** 2 < 4000 * 4000) continue;
    const roll = Math.random();
    const type = fringe && roll < 0.22 ? 'relic' : roll < 0.4 ? 'derelict' : roll < 0.62 ? 'salvage' : roll < 0.8 ? 'beacon' : 'cache';
    return { id: nid(), type, x, y, fringe, found: false, done: false, trap: type === 'derelict' ? Math.random() < (fringe ? 0.45 : 0.25) : type === 'beacon' ? Math.random() < 0.5 : false };
  }
  return null;
}
function scanRange() { return 3000 + 800 * skill('salvage'); }
function doScan() {
  if ((Wd.scanCd || 0) > 0) { log(`Scanner recharging (${Math.ceil(Wd.scanCd)}s)`); return; }
  Wd.scanCd = 10; const R = scanRange(); Wd.scanFx = { x: player.x, y: player.y, t: 0, R };
  let n = 0;
  for (const p of G.pois) if (!p.found && !p.done && (p.x - player.x) ** 2 + (p.y - player.y) ** 2 < R * R) { p.found = true; n++; addXP(25, true); }
  let a = 0; for (const s of Wd.ships) if (s.role === 'ambush' && !s.revealed && d2(s, player) < R * R) { s.revealed = true; a++; }
  log(`Scan complete: ${n ? n + ' new contact' + (n > 1 ? 's' : '') : 'no new contacts'}${a ? `, ${a} hidden ship${a > 1 ? 's' : ''} detected` : ''}.`, n || a ? 'gold' : '');
}
function randomLootWeapon(fringe) {
  if (fringe && Math.random() < 0.15) return pick(['voidlance', 'gravcannon', 'shardgun']);
  return pick(Object.keys(WEAPONS).filter(w => !WEAPONS[w].rare));
}
function spawnAmbushAt(x, y, n) {
  const g = { wp: { x, y } };
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), hull = Math.random() < 0.45 ? 'wren' : Math.random() < 0.5 ? 'talon' : 'skiff';
    const s = new Ship(genCfg(hull, 1), 'pirate', x + Math.cos(a) * 1000, y + Math.sin(a) * 1000, { role: 'pirate', group: g, a: a + Math.PI });
    s.name = 'Raider'; s.target = player; decoratePirate(s); Wd.ships.push(s);
  }
}
function spawnAmbushGroup(x, y) {
  const g = { wp: { x, y } };
  for (let i = 0; i < randi(2, 3); i++) {
    const s = new Ship(genCfg(Math.random() < 0.6 ? 'wren' : 'skiff', 1), 'pirate', x + rand(-160, 160), y + rand(-160, 160), { role: 'ambush', group: g });
    s.name = 'Raider'; decoratePirate(s); Wd.ships.push(s);
  }
}
function resolvePoi(p) {
  p.done = true; const mul = (p.fringe ? 2 : 1) * (1 + 0.2 * skill('salvage')), T = p.type;
  if ((T === 'derelict' || T === 'beacon') && p.trap) { log(T === 'beacon' ? 'The beacon was bait. Raiders are closing in!' : 'Booby-trapped! Raiders were waiting in the dark.', 'bad'); spawnAmbushAt(p.x, p.y, randi(2, 4)); }
  if (T === 'derelict') {
    dropPickup(p.x, p.y, 'credits', null, Math.round(rand(900, 2600) * mul));
    if (Math.random() < 0.55) dropPickup(p.x, p.y, 'weapon', randomLootWeapon(p.fringe), 1);
    if (Math.random() < 0.3) dropPickup(p.x, p.y, 'mod', pick(Object.keys(MODS)), 1);
    addXP(60); log('You strip the derelict for anything still worth having.', 'gold');
  }
  if (T === 'salvage') {
    for (let i = 0; i < randi(3, 5); i++) dropPickup(p.x, p.y, 'com', pick(['metals', 'machinery', 'metals', 'weapons']), Math.round(randi(4, 9) * mul));
    dropPickup(p.x, p.y, 'credits', null, Math.round(rand(300, 900) * mul)); addXP(40); log('Salvage recovered from the debris field.', 'gold');
  }
  if (T === 'beacon' && !p.trap) {
    const m = { id: nid(), kind: 'kill', fac: pick(MAJOR), from: null, x: p.x + rand(-300, 300), y: p.y + rand(-300, 300), fleet: Array.from({ length: randi(2, 3) }, () => [Math.random() < 0.6 ? 'skiff' : 'wren', 'pirate']),
      reward: Math.round(rand(2500, 4500) * mul / 100) * 100, rep: 5, title: 'Answer the distress call', desc: 'A stricken hauler is being picked apart by raiders. Drive them off.' };
    if (acceptMission(m)) log('Distress call answered. Drive off the raiders to claim the rescue fee.', 'gold');
    addXP(30);
  }
  if (T === 'cache') {
    const L = LORE.find(l => !G.lore.includes(l.id));
    if (L) { G.lore.push(L.id); log(`Data cache decoded: “${L.title}” added to your logbook.`, 'gold'); }
    dropPickup(p.x, p.y, 'credits', null, Math.round(rand(500, 1400) * mul)); addXP(80);
  }
  if (T === 'relic') {
    dropPickup(p.x, p.y, 'weapon', pick(['voidlance', 'gravcannon', 'shardgun']), 1);
    dropPickup(p.x, p.y, 'credits', null, Math.round(rand(3000, 6000) * mul)); addXP(150);
    log('You pry a precursor relic loose. It hums against the hull.', 'gold');
    if (Math.random() < 0.5) spawnAmbushAt(p.x, p.y, 2);
  }
  spark(p.x, p.y, '#ffffff', 14);
}
function doDrop(m) {
  if ((G.cargo[m.com] || 0) < m.qty) { log(`You need ${m.qty} t of ${COMS[m.com].name.toLowerCase()} in your hold.`, 'bad'); return; }
  addCargo(m.com, -m.qty); completeMission(m, 'Delivered');
}

// ───────── Interaction (F key) ─────────
function nearestInteract() {
  const st = nearestStation(260); if (st) return { kind: 'station', st };
  for (const ps of G.holdings || []) { const e = psEntity(ps), r = (e ? e.st.r : 100) + 170; if ((ps.x - player.x) ** 2 + (ps.y - player.y) ** 2 < r * r) return { kind: 'ps', ps }; }
  for (const s of G.sites || []) if (s.type !== 'sale' && (s.x - player.x) ** 2 + (s.y - player.y) ** 2 < 330 * 330) return { kind: 'site', s };
  for (const o of G.outposts) if ((o.x - player.x) ** 2 + (o.y - player.y) ** 2 < 240 * 240) return { kind: 'outpost', o };
  for (const p of G.pois) if (p.found && !p.done && (p.x - player.x) ** 2 + (p.y - player.y) ** 2 < 180 * 180) return { kind: 'poi', p };
  for (const m of G.missions) if (m.kind === 'drop' && (m.x - player.x) ** 2 + (m.y - player.y) ** 2 < 320 * 320) return { kind: 'drop', m };
  return null;
}
function interactPrompt() {
  const it = nearestInteract(); if (!it) return '';
  if (it.kind === 'station') return G.rep[it.st.fac] <= -25 ? `${it.st.name} refuses docking (hostile)` : `<span class="k">F</span> Dock at ${it.st.name}`;
  if (it.kind === 'outpost') return `<span class="k">F</span> Dock at your ${BELTS[it.o.belt].name} outpost`;
  if (it.kind === 'ps') return `<span class="k">F</span> Dock at ${esc(it.ps.name)}`;
  if (it.kind === 'site') { const sov = sovereign(it.s.x, it.s.y); return sov && !G.licenses[sov] ? `${esc(it.s.name)}: you need a ${FACTIONS[sov].short} building license to claim this` : `<span class="k">F</span> Claim ${esc(it.s.name)} · ${it.s.type === 'derelict' ? '6,000' : '8,000'} cr`; }
  if (it.kind === 'poi') return `<span class="k">F</span> ${it.p.type === 'beacon' ? 'Answer' : it.p.type === 'cache' ? 'Download' : 'Salvage'} ${POI_TYPES[it.p.type].name.toLowerCase()}`;
  return `<span class="k">F</span> Hand over ${it.m.qty} t ${COMS[it.m.com].name.toLowerCase()}`;
}
function tryInteract() {
  const it = nearestInteract(); if (!it) return;
  if (it.kind === 'station') tryDock(); else if (it.kind === 'ps') openPS(it.ps, true); else if (it.kind === 'site') claimSite(it.s); else if (it.kind === 'outpost') openOutpost(it.o); else if (it.kind === 'poi') resolvePoi(it.p); else doDrop(it.m);
}

// ───────── Subsystem damage ─────────
function subsysHit(t, dmg) {
  if (t.role === 'outpost' || t.cfg.hull === 'fighter' || t.dead) return;
  const af = t.st.armor ? t.armor / t.st.armor : 0;
  if (af > 0.5) return;
  const p = Math.min(0.3, dmg / (t.st.hull * 0.2)) * (1 - af);
  if (Math.random() > p) return;
  const ws = t.ws.map((w, i) => w && !(w.off > 0) ? i : -1).filter(i => i >= 0);
  const fix = t.isPlayer ? 1 - 0.25 * skill('engineering') : 1;
  if (Math.random() < 0.3 || !ws.length) {
    if (t.engOut > 0) return;
    t.engOut = rand(6, 11) * fix; if (Math.random() < 0.5) t.engWear = Math.min(3, (t.engWear || 0) + 1);
    if (t.isPlayer) log('Engines hit! Thrust is crippled.', 'bad');
  } else {
    const w = t.ws[pick(ws)]; w.off = rand(7, 13) * fix; w.firing = false;
    if (Math.random() < 0.5) w.wear = Math.min(3, (w.wear || 0) + 1);
    if (t.isPlayer) log(`${WEAPONS[w.id].name} knocked offline!`, 'bad');
  }
  spark(t.x, t.y, '#ffd27a', 8);
}
function repairQuote(st) {
  const p = player; let cost = 0, time = 0;
  const hm = p.st.hull - p.hp, am = p.st.armor - p.armor;
  cost += hm * 0.9 + am * 0.6; time += hm / p.st.hull * 150 + am / p.st.armor * 40;
  const wear = p.ws.reduce((a, w) => a + (w ? w.wear || 0 : 0), 0) + (p.engWear || 0);
  cost += wear * 450; time += wear * 50;
  let fw = 0;
  for (const f of G.fleet) {
    const S = computeStats(f.cfg), fh = 1 - (f.hpF ?? 1), fa = 1 - (f.armorF ?? 1);
    cost += fh * S.hull * 0.9 + fa * S.armor * 0.6; time += fh * 120;
    const w = (f.wear || []).reduce((a, b) => a + b, 0) + (f.engWear || 0); fw += w; cost += w * 450; time += w * 40;
  }
  const e = skill('engineering');
  cost *= (1 - repDisc(st.fac)) * (1 - 0.15 * e); time *= 1 - 0.25 * e;
  return { cost: Math.ceil(cost), time: Math.round(time), wear, fw };
}
function fmtDur(s) { s = Math.round(s); return s >= 60 ? `${Math.floor(s / 60)} min ${s % 60 ? (s % 60) + ' s' : ''}`.trim() : `${s} s`; }
function repairItemHTML(st) {
  const q = repairQuote(st), p = player;
  const ds = `${fmt(p.hp)}/${fmt(p.st.hull)} hull · ${fmt(p.armor)}/${fmt(p.st.armor)} armor · ${q.wear ? q.wear + ' worn subsystem' + (q.wear > 1 ? 's' : '') : 'no subsystem wear'}${G.fleet.length ? ` · fleet wear ${q.fw}` : ''}`;
  return `<div class="item"><div><div class="nm">Full overhaul (you and your fleet)</div><div class="ds">${ds}. Repairs take time, and the sector keeps moving while you wait.</div></div><button class="primary" data-act="repair" ${q.cost <= 0 || G.credits < q.cost ? 'disabled' : ''}>${q.cost > 0 ? `${fmt(q.cost)} cr · ${fmtDur(q.time)}` : 'No damage'}</button></div>`;
}
function doRepair(st) {
  const q = repairQuote(st); if (q.cost <= 0) return;
  if (G.credits < q.cost) { UI.notices = ['Not enough credits for a full overhaul.']; return; }
  G.credits -= q.cost;
  player.hp = player.st.hull; player.armor = player.st.armor; player.engWear = 0; player.engOut = 0;
  player.ws.forEach(w => { if (w) { w.wear = 0; w.off = 0; } });
  for (const f of G.fleet) { f.hpF = 1; f.armorF = 1; f.wear = []; f.engWear = 0; }
  G.wear = null; fastForward(q.time);
  UI.notices = [`Overhaul complete for ${fmt(q.cost)} cr. It took ${fmtDur(q.time)} of station time.`];
}
function fastForward(sec) {
  const ticks = Math.floor(sec / 3.5);
  for (let i = 0; i < ticks; i++) { economyTick(); outpostTick(); holdingsTick(); for (const st of STATIONS) G.control[st.id] = Math.min(100, (G.control[st.id] ?? 100) + 0.9); }
  G.time += sec; Wd.t += sec * 0; if (sec >= 30) ledgerTick(sec / 60);
}

// ───────── Enemy variety ─────────
function decoratePirate(s) {
  if ((s.cfg.hull === 'skiff' || s.cfg.hull === 'wren') && Math.random() < 0.13) { s.minelayer = true; s.name = 'Raider mine-layer'; }
}
function isHidden(t, viewer) { return t.role === 'ambush' && !t.revealed && (!viewer || isPS(viewer)) && (!viewer || d2(t, viewer) > 650 * 650); }
function aiSpecial(s, t, dt) {
  const c = s.c;
  if (s.role === 'escort') return escortAI(s, t, dt);
  if (s.role === 'outpost') {
    c.turnTo = null; c.thrust = 0;
    if (t) { const d = Math.sqrt(d2(s, t)); c.aimX = t.x + t.vx * d / 1100; c.aimY = t.y + t.vy * d / 1100; c.fire = d < s.maxR; c.shield = s.danger > 0 && s.flux < s.st.flux * 0.85; if (s.flux > s.st.flux * 0.8 && !s.danger) c.vent = true; }
    else if (s.flux > s.st.flux * 0.3) c.vent = true;
    return true;
  }
  if (s.role === 'ambush') {
    if (t || (s.lastAttacker && !s.lastAttacker.dead)) {
      for (const o of Wd.ships) if (o.group && o.group === s.group) { o.role = 'pirate'; o.revealed = true; }
      if (player && d2(s, player) < 2500 * 2500 && Wd.t - (Wd.ambushLogT || -99) > 6) { Wd.ambushLogT = Wd.t; log('Ambush! Raiders were hiding in the rocks.', 'bad'); }
      return false;
    }
    c.thrust = 0; return true;
  }
  if (s.role === 'wing') { if (t) return false; wingFollow(s); return true; }
  if (s.role === 'fighter') {
    if (!t && s.mother && !s.mother.dead && s.mother.target && !s.mother.target.dead) { s.target = s.mother.target; return false; }
    if (t) return false;
    const m = s.mother;
    if (m && !m.dead) { s.orbA = (s.orbA ?? rand(0, TAU)) + dt * 1.6; steerTo(s, m.x + Math.cos(s.orbA) * 90, m.y + Math.sin(s.orbA) * 90, 0.8); }
    return true;
  }
  if (s.role === 'assault') {
    if (t) return false;
    const g = STN[s.goal];
    if (!g || !AT_WAR(s.fac, g.fac)) { const h = STATIONS.find(x => x.fac === s.fac); if (h) { s.role = 'patrol'; s.home = h.id; } return false; }
    const d = Math.hypot(g.x - s.x, g.y - s.y);
    if (d > 1100) { steerTo(s, g.x, g.y, 1); c.burn = d > 3000 && s.flux < 1; }
    else { const a = Math.atan2(s.y - g.y, s.x - g.x) + 0.5; steerTo(s, g.x + Math.cos(a) * 750, g.y + Math.sin(a) * 750, 0.5); }
    return true;
  }
  return false;
}
function onSpecialDeath(t, killer) {
  if (t.role === 'wing') {
    const f = G.fleet.find(f => f.id === t.fleetId);
    G.fleet = G.fleet.filter(x => x !== f);
    log(`${f ? wingName(f) : 'A wingman'} was destroyed.`, 'bad');
    if (f && f.officer) { const o = officerById(f.officer); if (o) log(`Officer ${o.name} ejected and will wait for you at the next station.`); }
    trimCargo(); return true;
  }
  if (t.role === 'outpost' && t.psId) { psCrippled(t); return true; }
  if (t.role === 'outpost') { const o = G.outposts.find(o => o.id === t.outpostId); if (o) { o.wrecked = true; o.hpF = 0; } log(`${t.name} has been wrecked by raiders! Dock there to rebuild it.`, 'bad'); return true; }
  if (t.role === 'fighter') return true;
  return false;
}
function updateDepth(dt) {
  for (const s of Wd.ships) {
    if (s.dead) continue;
    if (s.mineField && s.target && !s.target.dead && d2(s, s.target) < 1700 * 1700) {
      s.mineT = (s.mineT ?? 1) - dt;
      if (s.mineT <= 0 && Wd.mines.filter(m => m.owner === s).length < 8) { s.mineT = 2.5; const a = rand(0, TAU), r = rand(260, 560); Wd.mines.push({ x: s.x + Math.cos(a) * r, y: s.y + Math.sin(a) * r, src: { fac: s.fac, side: s.side }, owner: s, life: 60, arm: 1.0 }); }
    }
    if (s.H.carrier || s.droneBay) {
      s.launchT = (s.launchT ?? 2) - dt;
      if (s.launchT <= 0) {
        s.launchT = 4.5; const t = s.target;
        if (t && !t.dead && d2(s, t) < 2300 * 2300 && Wd.ships.filter(f => f.mother === s && !f.dead).length < 4) {
          const f = new Ship(genCfg('fighter', 1), s.fac, s.x + Math.cos(s.a) * s.st.r, s.y + Math.sin(s.a) * s.st.r, { role: 'fighter', side: s.side, a: s.a });
          f.mother = s; f.vx = s.vx + Math.cos(s.a) * 220; f.vy = s.vy + Math.sin(s.a) * 220; f.target = t; f.name = 'Fighter';
          Wd.ships.push(f);
        }
      }
    }
    if (s.role === 'fighter' && (!s.mother || s.mother.dead)) { s.orphanT = (s.orphanT ?? 25) - dt; if (s.orphanT <= 0) { s.dead = true; explosion(s.x, s.y, 6); } }
    if (s.minelayer && s.target && !s.target.dead && d2(s, s.target) < 1700 * 1700) {
      s.mineT = (s.mineT ?? 2) - dt;
      if (s.mineT <= 0 && Wd.mines.filter(m => m.owner === s).length < 5) { s.mineT = 4.5; Wd.mines.push({ x: s.x - Math.cos(s.a) * s.st.r * 1.5, y: s.y - Math.sin(s.a) * s.st.r * 1.5, src: { fac: s.fac, side: s.side }, owner: s, life: 55, arm: 1.0 }); }
    }
  }
  const M = Wd.mines;
  for (let i = M.length - 1; i >= 0; i--) {
    const m = M[i]; m.life -= dt; m.arm -= dt; let boom = m.life <= 0 ? 'fizzle' : null;
    if (!boom && m.arm <= 0) for (const s of Wd.ships) { if (s.dead || s === m.owner || !hostile(m.src, s)) continue; if ((s.x - m.x) ** 2 + (s.y - m.y) ** 2 < (70 + s.st.r) ** 2) { boom = 'hit'; break; } }
    if (!boom) for (const p of Wd.proj) { if (p.owner === m.owner || (isPS(p.owner) && m.src.side === 'player') || !(isPS(p.owner) || hostile(p.owner, m.src))) continue; if ((p.x - m.x) ** 2 + (p.y - m.y) ** 2 < 16 * 16) { boom = 'shot'; p.life = 0; break; } }
    if (boom) {
      if (boom !== 'fizzle') { explosion(m.x, m.y, 14); for (const s of Wd.ships) { if (s.dead || s === m.owner) continue; const dd = Math.hypot(s.x - m.x, s.y - m.y); if (dd < 160) applyHit(s, 420 * (1 - dd / 190) * (boom === 'shot' ? 0.35 : 1), 'he', m.x, m.y, null); } }
      M.splice(i, 1);
    }
  }
  outpostAuras(dt); traderTick(dt); psFrame(dt);
  Wd.scanCd = (Wd.scanCd || 0) - dt;
  if (Wd.scanFx) { Wd.scanFx.t += dt; if (Wd.scanFx.t > 1.3) Wd.scanFx = null; }
  Wd.revealT = (Wd.revealT || 0) - dt;
  if (Wd.revealT <= 0) {
    Wd.revealT = 0.5;
    for (const p of G.pois) if (!p.found && !p.done && (p.x - player.x) ** 2 + (p.y - player.y) ** 2 < 750 * 750) { p.found = true; log(`Contact: ${POI_TYPES[p.type].name} detected nearby.`, 'gold'); addXP(20, true); }
  }
  Wd.ledgerT = (Wd.ledgerT ?? 60) - dt; if (Wd.ledgerT <= 0) { Wd.ledgerT = 60; ledgerTick(1); }
}
function depthPopulation() {
  warTick(); outpostTick(); outpostSensors(); portTick(); holdingsTick();
  for (const o of G.outposts) if (!o.wrecked && Math.random() < 0.004) {
    const a = rand(0, TAU), g = { wp: { x: o.x, y: o.y } };
    for (let i = 0; i < randi(2, 3); i++) { const s = new Ship(genCfg(Math.random() < 0.5 ? 'wren' : 'skiff', 1), 'pirate', o.x + Math.cos(a) * 2000 + rand(-200, 200), o.y + Math.sin(a) * 2000 + rand(-200, 200), { role: 'pirate', group: g }); s.name = 'Raider'; Wd.ships.push(s); }
    log(`${BELTS[o.belt].name} outpost: raiders inbound!`, 'bad');
  }
  if (Wd.ships.filter(s => s.role === 'ambush').length < 5 && Math.random() < 0.15) {
    const b = pick(BELTS.filter(b => !b.ring)), a = rand(0, TAU), r = rand(0, b.r * 0.7), x = b.x + Math.cos(a) * r, y = b.y + Math.sin(a) * r;
    if (farFromPlayer(x, y, 2800) && G.outposts.every(o => (o.x - x) ** 2 + (o.y - y) ** 2 > 2400 * 2400) && (G.holdings || []).every(h => (h.x - x) ** 2 + (h.y - y) ** 2 > 4500 * 4500)) spawnAmbushGroup(x, y);
  }
  G.pois = G.pois.filter(p => !p.done);
  if (G.pois.length < 20) { const p = genPoi(player); if (p) G.pois.push(p); }
}
function depthWorld() {
  Wd.mines = [];
  applyOwners();
  for (const o of G.outposts) spawnOutpost(o);
  for (const ps of G.holdings || []) spawnPS(ps);
  for (let i = 0; i < 4; i++) { const b = pick(BELTS.filter(b => !b.ring)), a = rand(0, TAU), r = rand(0, b.r * 0.7); spawnAmbushGroup(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r); }
}

// ───────── World & map drawing ─────────
function drawPoiIcon(g, p, x, y, s) {
  const col = POI_TYPES[p.type].color; g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 1.5;
  if (p.type === 'derelict') { g.beginPath(); g.moveTo(x + s, y); g.lineTo(x - s * 0.6, y - s * 0.7); g.lineTo(x - s * 0.3, y); g.lineTo(x - s * 0.6, y + s * 0.7); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(x - s * 0.2, y - s); g.lineTo(x + s * 0.3, y + s); g.stroke(); }
  else if (p.type === 'salvage') { for (let i = 0; i < 4; i++) g.fillRect(x + Math.cos(i * 1.7) * s * 0.7 - 2, y + Math.sin(i * 1.7) * s * 0.7 - 2, 4, 4); }
  else if (p.type === 'beacon') { g.beginPath(); g.arc(x, y, s * 0.4, 0, TAU); g.fill(); g.globalAlpha = 0.5 + 0.5 * Math.sin(Wd.t * 6); g.beginPath(); g.arc(x, y, s, 0, TAU); g.stroke(); g.globalAlpha = 1; }
  else if (p.type === 'cache') { g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.7, y); g.lineTo(x, y + s); g.lineTo(x - s * 0.7, y); g.closePath(); g.stroke(); }
  else { g.beginPath(); for (let i = 0; i < 10; i++) { const a = i * TAU / 10 - Math.PI / 2, r = i % 2 ? s * 0.45 : s; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); g.fill(); }
}
function drawDepthWorld() {
  for (const p of G.pois) {
    if (!p.found || p.done || !inView(p.x, p.y, 60)) continue;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1 / cam.zoom, 1 / cam.zoom);
    drawPoiIcon(ctx, p, 0, 0, 12);
    ctx.font = "500 10px 'IBM Plex Mono', monospace"; ctx.textAlign = 'center'; ctx.fillStyle = POI_TYPES[p.type].color; ctx.fillText(POI_TYPES[p.type].name, 0, 26);
    ctx.restore();
  }
  for (const m of G.missions) if (m.kind === 'drop' && inView(m.x, m.y, 100)) { ctx.save(); ctx.strokeStyle = '#f0b44c'; ctx.setLineDash([10, 8]); ctx.lineWidth = 2 / cam.zoom; ctx.beginPath(); ctx.arc(m.x, m.y, 300, 0, TAU); ctx.stroke(); ctx.restore(); label('DROP POINT', m.x, m.y + 4, '#f0b44c', 12); }
  for (const o of G.outposts) if (o.wrecked && inView(o.x, o.y, 60)) { ctx.strokeStyle = '#5a6a76'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < 6; i++) ctx.lineTo(o.x + Math.cos(i * TAU / 6) * 34, o.y + Math.sin(i * TAU / 6) * 34); ctx.closePath(); ctx.stroke(); label('WRECKED OUTPOST', o.x, o.y + 60, '#8aa2b2', 11); }
  for (const o of G.outposts) if (!o.wrecked && inView(o.x, o.y, 100)) label(`${BELTS[o.belt].name.toUpperCase()} OUTPOST`, o.x, o.y + 64, '#6fd3e6', 11);
  for (const m of Wd.mines) {
    if (!inView(m.x, m.y, 20)) continue;
    const on = m.arm <= 0 && Math.floor(Wd.t * 4) % 2;
    ctx.fillStyle = '#3a2a2a'; ctx.beginPath(); ctx.arc(m.x, m.y, 6, 0, TAU); ctx.fill();
    ctx.fillStyle = on ? '#ff4a3a' : '#7a3a34'; ctx.beginPath(); ctx.arc(m.x, m.y, 2.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,90,70,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(m.x, m.y, 70, 0, TAU); ctx.stroke();
  }
  if (Wd.scanFx) { const f = Wd.scanFx, k = f.t / 1.3; ctx.strokeStyle = `rgba(111,211,230,${0.6 * (1 - k)})`; ctx.lineWidth = 3 / cam.zoom; ctx.beginPath(); ctx.arc(f.x, f.y, f.R * k, 0, TAU); ctx.stroke(); }
  if (G.order === 'hold' && G.holdPt && G.fleet.length && inView(G.holdPt.x, G.holdPt.y, 40)) { ctx.strokeStyle = 'rgba(159,232,200,.6)'; ctx.setLineDash([4, 6]); ctx.lineWidth = 1.5 / cam.zoom; ctx.beginPath(); ctx.arc(G.holdPt.x, G.holdPt.y, 60, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
  drawTraderLabels(); drawSites();
}
function drawMiniDepth(tx, ty, W) {
  for (const p of G.pois) { if (!p.found || p.done) continue; const x = tx(p.x), y = ty(p.y); if (x < 0 || x > W || y < 0 || y > W) continue; mctx.fillStyle = POI_TYPES[p.type].color; mctx.fillRect(x - 2, y - 2, 4, 4); }
  for (const o of G.outposts) { const x = tx(o.x), y = ty(o.y); if (x < 0 || x > W || y < 0 || y > W) continue; mctx.strokeStyle = '#6fd3e6'; mctx.strokeRect(x - 3, y - 3, 6, 6); }
}
function drawMapDepth(c, X, Y) {
  drawTradeLanes(c, X, Y); drawMapHoldings(c, X, Y);
  for (const p of G.pois) if (p.found && !p.done) drawPoiIcon(c, p, X(p.x), Y(p.y), 6);
  for (const o of G.outposts) { c.strokeStyle = o.wrecked ? '#5a6a76' : '#6fd3e6'; c.lineWidth = 1.5; c.strokeRect(X(o.x) - 5, Y(o.y) - 5, 10, 10); }
  c.font = "500 10px 'IBM Plex Mono', monospace"; c.textAlign = 'center';
  for (const st of STATIONS) { const v = G.control[st.id] ?? 100; const inb = Wd.ships.some(s => !s.dead && s.role === 'assault' && s.goal === st.id); if (v < 99.5 || inb) { c.fillStyle = inb ? '#ff6a5c' : '#f0b44c'; c.fillText(`${inb ? 'under assault · ' : ''}control ${Math.round(v)}%`, X(st.x), Y(st.y) + 31); } }
  c.textAlign = 'left'; c.fillStyle = '#9fb3c0';
  c.fillText('Wars: ' + (G.wars.length ? G.wars.map(w => `${FACTIONS[w[0]].short} vs ${FACTIONS[w[1]].short}`).join(', ') : 'none'), 14, 22);
}
function updateDepthHUD() {
  const P = G.pilot; $('hPilot').textContent = `Lv ${P.level}${P.points ? ' (+' + P.points + ')' : ''}`;
  $('hFleet').textContent = G.fleet.length ? `${G.fleet.length} · ${G.order}` : 'none';
  $('hScan').textContent = (Wd.scanCd || 0) > 0 ? `${Math.ceil(Wd.scanCd)}s` : 'ready';
}

// ───────── Dock tabs: Fleet, Pilot, Invest ─────────
function tabFleet(st) {
  ensureHire(st);
  let h = `<div class="sec">Your fleet (${G.fleet.length}/${fleetCap()})</div>`;
  h += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;align-items:center"><span style="color:var(--dim)">Standing order:</span>${['escort', 'engage', 'hold'].map((o, i) => `<button data-act="order" data-id="${o}" class="${G.order === o ? 'primary' : ''}">${i + 1} · ${o[0].toUpperCase() + o.slice(1)}</button>`).join('')}<span style="color:var(--dim);font-size:12px">Keys 1–3 in flight. Wages: ${fmt(wagesPerMin())} cr/min.</span></div>`;
  if (!G.fleet.length) h += `<p style="color:var(--dim);margin:0">No wingmen yet. Shipyards sell hulls as fleet ships (“Add to fleet”). Fleet holds add to your cargo space.</p>`;
  h += '<div class="list">';
  for (const f of G.fleet) {
    const H = HULLS[f.cfg.hull], o = f.officer && officerById(f.officer);
    const unassigned = G.officers.filter(x => !officerShip(x));
    h += `<div class="card"><h4>${esc(wingName(f))} <span style="color:var(--dim);font-weight:400">${H.cls}</span></h4>
      <div class="meta"><span>Hull ${Math.round((f.hpF ?? 1) * 100)}%</span><span>${f.cfg.weapons.filter(Boolean).map(w => WEAPONS[w].name).join(', ') || 'unarmed'}</span><span>${computeStats(f.cfg).cargo} t hold</span><span>wage ${Math.round(H.price * 0.0012)} cr/min</span></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${o ? `<button data-act="unassign" data-id="${f.id}">Remove officer</button>` : unassigned.map(x => `<button data-act="assign" data-id="${f.id}" data-o="${x.id}">Assign ${esc(x.name)}</button>`).join('')}
      <button data-act="flagship" data-id="${f.id}">Make flagship</button><button class="warn" data-act="sellwing" data-id="${f.id}">Sell ${fmt(H.price * 0.45)} cr</button></div></div>`;
  }
  h += `</div><div class="sec">Officers (${G.officers.length}/${fleetCap() + 1})</div>`;
  if (!G.officers.length) h += `<p style="color:var(--dim);margin:0">Officers fly your fleet ships, add their trait bonuses and gain levels from kills.</p>`;
  h += '<div class="starts">';
  for (const o of G.officers) { const f = officerShip(o); h += officerCard(o, `<div class="meta"><span>${f ? 'Flying ' + HULLS[f.cfg.hull].name : 'Unassigned'}</span><span>${o.wage} cr/min</span></div><div><button class="warn" data-act="dismiss" data-id="${o.id}">Dismiss</button></div>`); }
  h += `</div><div class="sec">Officers for hire at ${esc(st.name)}</div><div class="starts">`;
  const S = G.stations[st.id];
  S.hire.forEach((o, i) => { const full = G.officers.length >= fleetCap() + 1; h += officerCard(o, `<div class="meta"><span class="rw">${fmt(o.fee)} cr signing</span><span>${o.wage} cr/min</span></div><div><button class="primary" data-act="hire" data-i="${i}" ${full || G.credits < o.fee ? 'disabled' : ''}>${full ? 'Roster full' : 'Hire'}</button></div>`); });
  if (!S.hire.length) h += '<p style="color:var(--dim)">Nobody looking for work right now.</p>';
  return h + '</div>';
}
function officerCard(o, foot) {
  const T = TRAITS[o.trait], k = 1 + 0.5 * (o.level - 1);
  return `<div class="card" style="grid-template-columns:48px 1fr;align-items:start">${officerImg(o, 'cap-sm')}<div style="display:grid;gap:4px;min-width:0"><h4>${esc(o.name)} <span style="color:var(--dim);font-weight:400">Lv ${o.level}</span></h4><div style="font-size:12px;color:#aac0cc">${T.name}: ${T.desc}${o.level > 1 ? ` (×${k} from level)` : ''}</div>${foot}</div></div>`;
}
function tabPilot(st) {
  const P = G.pilot;
  let h = `<div class="cols"><div style="min-width:0"><div class="sec">Pilot record</div><div class="stats"><span>Level</span><span>${P.level}</span><span>Experience</span><span>${Math.floor(P.xp)} / ${xpNeed(P.level)}</span><span>Skill points</span><span style="color:${P.points ? 'var(--amber)' : 'inherit'}">${P.points}</span><span>Ships destroyed</span><span>${G.kills}</span></div>
    <div class="bar" style="grid-template-columns:1fr;margin:8px 0 4px"><span class="t"><i style="width:${P.xp / xpNeed(P.level) * 100}%"></i></span></div>
    <p style="color:var(--dim);font-size:12px">XP comes from kills, contracts, mining, trading, scanning and salvage. Each skill has three ranks.</p>
    <div class="sec">Skills</div><div class="list">`;
  for (const k in SKILLS) {
    const r = skill(k);
    h += `<div class="item"><div><div class="nm">${SKILLS[k].name} <span class="mono" style="color:var(--hud);font-weight:400">${'■'.repeat(r)}${'□'.repeat(3 - r)}</span></div><div class="ds">${SKILLS[k].desc} per rank</div></div><button data-act="skill" data-id="${k}" ${!P.points || r >= 3 ? 'disabled' : ''}>${r >= 3 ? 'Max' : 'Train'}</button></div>`;
  }
  h += `</div></div><div style="min-width:0"><div class="sec">Logbook (${G.lore.length}/${LORE.length})</div>`;
  if (!G.lore.length) h += `<p style="color:var(--dim)">Data caches hidden around the sector hold fragments of the Drift's history. Press G in flight to scan for them.</p>`;
  for (const id of G.lore) { const L = LORE.find(l => l.id === id); if (L) h += `<div class="card" style="margin-bottom:8px"><h4>${esc(L.title)}</h4><p>${esc(L.text)}</p></div>`; }
  return h + '</div></div>';
}
function tabInvest(st) {
  let h = `<div class="cols"><div style="min-width:0"><div class="sec">Industry stakes</div>`;
  if (st.prod.length) {
    const k = G.stakes[st.id], lvl = k ? k.lvl : 0;
    h += `<p style="color:var(--dim);margin:0 0 8px;font-size:12px;max-width:60ch">A stake pays a share of ${esc(st.name)}'s ${st.prod.map(c => COMS[c].name.toLowerCase()).join(' and ')} output every minute, at current prices. If the station changes hands in a war, the new owners seize it.</p>
      <div class="stats"><span>Your stake</span><span>${lvl ? 'Level ' + lvl : 'None'}</span><span>Income now</span><span>${fmt(stakeIncome(st.id))} cr/min</span></div>
      <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">${lvl < 3 ? `<button class="primary" data-act="stake" ${G.credits < stakeCost(st) ? 'disabled' : ''}>Buy stake level ${lvl + 1} · ${fmt(stakeCost(st))} cr</button>` : ''}${lvl ? `<button class="warn" data-act="unstake">Sell back for ${fmt(15000 * lvl * 0.6)} cr</button>` : ''}</div>`;
  } else h += `<p style="color:var(--dim)">${esc(st.name)} doesn't produce anything to invest in.</p>`;
  const all = Object.keys(G.stakes);
  if (all.length) h += `<div class="sec">All stakes</div><div class="stats">${all.map(id => `<span>${STN[id].name} (level ${G.stakes[id].lvl})</span><span>${fmt(stakeIncome(id))} cr/min</span>`).join('')}</div>`;
  h += `</div><div style="min-width:0"><div class="sec">Mining outposts</div><p style="color:var(--dim);margin:0 0 8px;font-size:12px;max-width:60ch">An outpost mines its asteroid field on its own and stores the output for you to collect. It needs supplies and will attract raiders.</p><div class="list">`;
  BELTS.forEach((b, i) => {
    if (b.ring) return;
    const o = G.outposts.find(o => o.belt === i);
    h += `<div class="item"><div><div class="nm">${esc(b.name)}</div><div class="ds">${o ? `Level ${o.level} · ${(o.mods || []).length} modules · ${o.wrecked ? 'WRECKED' : Math.floor(o.supplies) + ' supplies'} · ${Math.floor(opStored(opInit(o)))} t stored` : `${b.rich > 0.15 ? 'Rich in volatiles' : 'Mostly ore'} · ${regionName(b.x, b.y)}`}</div></div>${o ? '<span class="tag" style="color:var(--hud);border-color:var(--hud)">OWNED</span>' : `<button data-act="buildop" data-id="${i}" ${G.credits < 30000 ? 'disabled' : ''}>Build · 30,000 cr</button>`}</div>`;
  });
  return h + '</div></div></div>';
}
function depthAction(act, d, st) {
  if (UI.ps && psAction(act, d)) return true;
  if (UI.st) { const r = holdAction(act, d, UI.st); if (r) return r; }
  if (portAction(act, d, st)) return true;
  if (UI.outpost && opAction(act, d)) return true;
  switch (act) {
    case 'order': G.order = d.id; if (d.id === 'hold') G.holdPt = { x: player.x, y: player.y }; return true;
    case 'skill': if (G.pilot.points > 0 && skill(d.id) < 3) { G.pilot.skills[d.id] = skill(d.id) + 1; G.pilot.points--; player.refit(); UI.notices = [`${SKILLS[d.id].name} trained to rank ${skill(d.id)}.`]; } return true;
    case 'hire': { const S = G.stations[st.id], o = S.hire[+d.i]; if (o && G.credits >= o.fee && G.officers.length < fleetCap() + 1) { G.credits -= o.fee; G.officers.push(o); S.hire.splice(+d.i, 1); UI.notices = [`${o.name} joins your crew.`]; } return true; }
    case 'dismiss': { const o = officerById(+d.id); if (o) { const f = officerShip(o); if (f) f.officer = null; G.officers = G.officers.filter(x => x !== o); UI.notices = [`${o.name} leaves your service.`]; } return true; }
    case 'assign': { const f = G.fleet.find(f => f.id === +d.id); if (f) f.officer = +d.o; return true; }
    case 'unassign': { const f = G.fleet.find(f => f.id === +d.id); if (f) f.officer = null; return true; }
    case 'buywing': {
      const id = d.id, price = wingPrice(st, id);
      if (G.fleet.length >= fleetCap()) { UI.notices = ['Your fleet is full. Train Leadership to command more ships.']; return true; }
      if (G.credits < price) return true;
      G.credits -= price; const cfg = normalizeCfg(genCfg(id, 1)); cfg.mods = cfg.mods.map(() => null);
      G.fleet.push({ id: nid(), cfg, officer: null, hpF: 1, armorF: 1, wear: [], engWear: 0 });
      UI.notices = [`A ${HULLS[id].name} joins your fleet with a standard loadout.`]; return true;
    }
    case 'sellwing': {
      const f = G.fleet.find(f => f.id === +d.id); if (!f) return true;
      if (cargoUsed() > cargoCap() - computeStats(f.cfg).cargo) { UI.notices = ['Unload cargo first: your hold would be too small without this ship.']; return true; }
      G.credits += Math.round(HULLS[f.cfg.hull].price * 0.45); f.cfg.weapons.forEach(w => w && stashAdd('w', w));
      G.fleet = G.fleet.filter(x => x !== f); UI.notices = [`Sold the ${HULLS[f.cfg.hull].name}. Its weapons went to your stash.`]; return true;
    }
    case 'flagship': {
      const f = G.fleet.find(f => f.id === +d.id); if (!f) return true;
      const old = { cfg: G.ship, hpF: player.hp / player.st.hull, armorF: player.armor / player.st.armor, wear: player.ws.map(w => w ? w.wear || 0 : 0), engWear: player.engWear || 0 };
      const nw = { hpF: f.hpF ?? 1, armorF: f.armorF ?? 1, wear: f.wear || [], engWear: f.engWear || 0 };
      G.ship = f.cfg; f.cfg = old.cfg; f.hpF = old.hpF; f.armorF = old.armorF; f.wear = old.wear; f.engWear = old.engWear;
      replacePlayer(); player.hp = player.st.hull * nw.hpF; player.armor = player.st.armor * nw.armorF; player.engWear = nw.engWear; nw.wear.forEach((w, i) => { if (player.ws[i]) player.ws[i].wear = w; });
      UI.sel = { kind: 'slot', i: 0 }; UI.notices = [`You transfer your flag to the ${HULLS[G.ship.hull].name}. Refit it in the Refit tab.`]; return true;
    }
    case 'stake': { const c = stakeCost(st); if (G.credits >= c && st.prod.length) { G.credits -= c; const k = G.stakes[st.id]; G.stakes[st.id] = { lvl: (k ? k.lvl : 0) + 1, fac: st.fac }; UI.notices = [`You now hold a level ${G.stakes[st.id].lvl} stake in ${st.name}.`]; } return true; }
    case 'unstake': { const k = G.stakes[st.id]; if (k) { G.credits += Math.round(15000 * k.lvl * 0.6); delete G.stakes[st.id]; UI.notices = ['Stake sold.']; } return true; }
    case 'buildop': { const i = +d.id; if (G.credits >= 30000 && !G.outposts.some(o => o.belt === i)) { G.credits -= 30000; buildOutpost(i); UI.notices = [`Outpost founded in ${BELTS[i].name}. Fly there to collect its output.`]; } return true; }
    case 'dilemma': { const D = DILEMMAS.find(x => x.id === d.id); if (D && !G.dilemma[D.id]) { const m = dilemmaMission(D, d.side); if (acceptMission(m)) { G.dilemma[D.id] = 'pending'; UI.say = null; UI.tab = 'contracts'; } } return true; }
  }
  return false;
}
