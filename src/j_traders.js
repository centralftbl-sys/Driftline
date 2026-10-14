
// ═══════════════ NPC haulers: named trade ships with escorts, mayday calls and trade lanes ═══════════════
const HAUL_NAMES = ['Patient Margin', 'Lucky Seventh', 'Ninefold Harvest', 'Copper Saint', 'Long Haul', 'Brass Tortoise', 'Second Chance', 'Ember Bound', 'Saltwater', 'Good Intentions',
  'Halcyon Dawn', 'Old Reliable', 'Penny Wise', 'Grain Mother', 'Dustrunner', 'Far Meridian', 'Steady Hands', 'Small Mercy', 'Overdue', 'Ledger Line', 'Hearthward', 'Iron Promise'];
function cargoValue(s) { return s.cargoC ? s.cargoQ * COMS[s.cargoC].base : 0; }
function decorateTrader(s, from, to) {
  const used = new Set(Wd.ships.filter(x => x.shipName && !x.dead).map(x => x.shipName));
  s.shipName = pick(HAUL_NAMES.filter(n => !used.has(n)).concat(used.size >= HAUL_NAMES.length ? HAUL_NAMES : [])); s.from = from.id;
  s.name = `${FACTIONS[s.fac].short} hauler ${s.shipName}`;
  const v = cargoValue(s), n = v > 2500 ? (Math.random() < 0.7 ? randi(1, 2) : 0) : (Math.random() < 0.2 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const e = new Ship(genCfg(Math.random() < 0.7 ? 'wren' : 'skiff', 1), s.fac, s.x + rand(-150, 150), s.y + rand(-150, 150), { role: 'escort', a: s.a });
    e.leader = s; e.slot = i; e.name = `${s.shipName} escort`; Wd.ships.push(e);
  }
}
function onTraderArrive(s) {
  for (const e of Wd.ships) if (e.role === 'escort' && e.leader === s) { e.dead = true; e.docked = true; }
  try { portArrive(s); } catch (e) { }
  if (!s.cargoC) return;
  const st = STN[s.dest], r = stockRatio(st, s.cargoC);
  if (r < 0.5) recordNews(`Trade: the hauler ${s.shipName} delivered ${s.cargoQ} t of ${COMS[s.cargoC].name.toLowerCase()} to ${st.name}, easing a shortage.`, 'good');
  for (const e of Wd.ships) if (e.role === 'escort' && e.leader === s) { e.dead = true; e.docked = true; }
}
function traderLost(t) {
  if (t.mayday) log(`The hauler ${t.shipName} was destroyed by raiders.`, 'bad');
  else if (t.shipName && t.cargoC) recordNews(`Raiders destroyed the hauler ${t.shipName} and its ${t.cargoQ} t of ${COMS[t.cargoC].name.toLowerCase()}.`, 'bad');
}
function escortAI(s, t, dt) {
  const L = s.leader, c = s.c;
  if (!L || L.dead) {
    if (L && L.docked) { s.dead = true; s.docked = true; return true; }
    const h = STATIONS.find(x => x.fac === s.fac); if (h) { s.role = 'patrol'; s.home = h.id; } else s.dead = true;
    return false;
  }
  if (!t && L.lastAttacker && !L.lastAttacker.dead && hostile(s, L.lastAttacker)) { s.target = L.lastAttacker; return false; }
  if (t) return false;
  const side = s.slot % 2 ? 1 : -1, a = L.a + Math.PI + side * 0.7, ax = L.x + Math.cos(a) * 130, ay = L.y + Math.sin(a) * 130;
  const d = Math.hypot(ax - s.x, ay - s.y);
  steerTo(s, ax, ay, clamp(d / 200, 0.2, 1)); c.burn = L.burn || d > 700;
  if (s.flux > s.st.flux * 0.2) c.vent = true;
  return true;
}
function traderTick(dt) {
  for (const s of Wd.ships) {
    if (s.dead || s.role !== 'trader') continue;
    const atk = s.lastAttacker;
    if (!s.mayday && atk && !atk.dead && atk.fac === 'pirate' && player && !player.dead && d2(s, player) < 3200 * 3200) {
      s.mayday = { t: Wd.t, clear: 0 };
      log(`Mayday! ${s.name} is under raider attack near ${regionName(s.x, s.y)}. Drive them off for a reward.`, 'bad');
    }
    if (s.mayday) {
      let threat = false;
      for (const o of Wd.ships) if (!o.dead && o.fac === 'pirate' && d2(o, s) < 1400 * 1400) { threat = true; break; }
      s.mayday.clear = threat ? 0 : s.mayday.clear + dt;
      if (s.mayday.clear > 3) {
        if (player && !player.dead && d2(s, player) < 2600 * 2600) {
          const reward = Math.round((400 + cargoValue(s) * 0.2) / 50) * 50;
          G.credits += reward; changeRep(s.fac, 3, true); G.rescued = G.rescued || {}; G.rescued[s.shipName] = true; addXP(40); remember(s.fac, 'favor');
          log(`${s.name}: “You saved our necks. ${fmt(reward)} cr is on its way.” ${FACTIONS[s.fac].short} standing +3`, 'gold');
        }
        s.mayday = null; s.lastAttacker = null;
      }
    }
  }
}
function drawTraderLabels() {
  if (!player) return;
  for (const s of Wd.ships) {
    if (s.dead || s.role !== 'trader' || !inView(s.x, s.y, 60) || d2(s, player) > 1300 * 1300) continue;
    ctx.save(); ctx.translate(s.x, s.y); ctx.scale(1 / cam.zoom, 1 / cam.zoom);
    const y = s.st.r * cam.zoom + 16;
    ctx.font = "600 10px 'IBM Plex Mono', monospace"; ctx.textAlign = 'center';
    ctx.fillStyle = s.mayday ? '#ff9f43' : FACTIONS[s.fac].color; ctx.fillText((s.mayday ? 'MAYDAY · ' : '') + s.shipName, 0, y);
    ctx.font = "500 10px 'IBM Plex Mono', monospace"; ctx.fillStyle = '#8aa2b2';
    ctx.fillText(s.cargoC ? `${s.cargoQ} t ${COMS[s.cargoC].name.toLowerCase()} → ${psDestName(s)}` : `in ballast → ${psDestName(s)}`, 0, y + 12);
    ctx.restore();
  }
}
function drawTradeLanes(c, X, Y) {
  c.save(); c.lineWidth = 1; c.setLineDash([2, 5]);
  for (const s of Wd.ships) {
    if (s.dead || s.role !== 'trader') continue;
    const d = STN[s.dest] || psById(s.psDest); if (!d) continue; c.strokeStyle = FACTIONS[s.fac].color; c.globalAlpha = 0.35;
    c.beginPath(); c.moveTo(X(s.x), Y(s.y)); c.lineTo(X(d.x), Y(d.y)); c.stroke();
    c.globalAlpha = 1; c.fillStyle = s.mayday ? '#ff9f43' : FACTIONS[s.fac].color; c.fillRect(X(s.x) - 2, Y(s.y) - 2, 4, 4);
  }
  c.restore();
}
