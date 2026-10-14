
// ═══════════════ Port traders: haulers docked at a station you can talk to, buy intel from, and trade with ═══════════════
const PORT_MOODS = {
  chatty: { hi: 'Pull up a crate! Long haul in from {from}.', bye: 'Safe flying, friend.' },
  gruff: { hi: "Make it quick. We push off for {next} soon.", bye: 'Right.' },
  nervous: { hi: 'Is it quiet out there? We barely made it in from {from}.', bye: 'Watch the dark spots.' },
  sly: { hi: 'Looking for a deal? I might have one, for the right pilot.', bye: 'Pleasure doing business.' },
};
function portOf(st) { const S = G.stations[st.id]; S.port = S.port || []; return S.port; }
function makePortTrader(st, ship) {
  const fac = ship ? ship.fac : (Math.random() < 0.6 ? st.fac : pick(MAJOR));
  const hull = ship ? ship.cfg.hull : (Math.random() < 0.6 ? 'mule' : 'wren');
  const used = new Set(STATIONS.flatMap(s => portOf(s).map(p => p.shipName)));
  const from = ship && ship.from ? ship.from : pick(STATIONS.filter(s => s !== st)).id;
  const others = STATIONS.filter(s => s !== st), next = pick(others).id;
  const cargo = {}; const srcSt = STN[from];
  const sur = stationNeeds(srcSt).slice(-3);
  for (const n of sur.slice(0, randi(1, 3))) cargo[n.c] = randi(6, 24);
  return {
    id: nid(), fac, hull, shipName: ship && ship.shipName ? ship.shipName : pick(HAUL_NAMES.filter(n => !used.has(n)).concat(['Wayfarer'])),
    captain: `${pick(OFF_FIRST)} ${pick(OFF_LAST)}`, look: randomLook(FAC_VOICE[fac].coat), mood: pick(Object.keys(PORT_MOODS)),
    from, next, cargo, credits: randi(3000, 12000), arrived: G.time, leaveT: G.time + rand(200, 480), tips: null, tipIdx: 0, logSold: false,
  };
}
function portArrive(s) {
  if (!G || !s.shipName) return;
  const st = STN[s.dest], P = portOf(st);
  P.push(makePortTrader(st, s)); while (P.length > 4) P.shift();
}
function spawnDeparture(st, p) {
  if (!Wd || Wd.ships.filter(s => s.role === 'trader').length >= 14) return;
  const s = new Ship(genCfg(p.hull, 0), p.fac, st.x + rand(-120, 120), st.y + rand(-120, 120), { role: 'trader', dest: p.next, a: Math.atan2(STN[p.next].y - st.y, STN[p.next].x - st.x) });
  const top = Object.entries(p.cargo).sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] > 0) { s.cargoC = top[0]; s.cargoQ = top[1]; }
  Wd.ships.push(s); decorateTrader(s, st, STN[p.next]);
  s.shipName = p.shipName; s.name = `${FACTIONS[p.fac].short} hauler ${p.shipName}`; s.from = st.id;
}
function portTick() {
  for (const st of STATIONS) {
    const P = portOf(st), S = G.stations[st.id];
    if (!S.portSeeded) { S.portSeeded = true; for (let i = randi(1, 3); i > 0; i--) P.push(makePortTrader(st)); }
    for (let i = P.length - 1; i >= 0; i--) if (G.time > P[i].leaveT) { const p = P.splice(i, 1)[0]; if (!(mode === 'dock' && UI.st === st)) spawnDeparture(st, p); }
    if (P.length < 2 && Math.random() < 0.05) P.push(makePortTrader(st));
  }
}
function portMod(p) { const v = G.rep[p.fac] ?? 0, saved = G.rescued && G.rescued[p.shipName]; return { buy: (v >= 15 ? 0.95 : v < 0 ? 1.08 : 1) * (saved ? 0.9 : 1), sell: (v >= 15 ? 1.05 : v < 0 ? 0.94 : 1) * (saved ? 1.08 : 1) }; }
function portWants(p) { const nx = STN[p.next]; return stationNeeds(nx).slice(0, 2).map(n => n.c); }
function portBuyPrice(st, p, c) { return Math.max(1, Math.round(buyPrice(st, c) * 0.88 * portMod(p).buy)); }      // what you pay them
function portSellPrice(st, p, c) { return Math.round(sellPrice(st, c) * 1.12 * portMod(p).sell); }              // what they pay you
function genTips(p) {
  const tips = [];
  // arbitrage
  let best = null;
  for (const c in COMS) for (const a of STATIONS) { if (G.rep[a.fac] <= -25) continue; for (const b of STATIONS) { if (a === b || G.rep[b.fac] <= -25) continue; const m = sellPrice(b, c) - buyPrice(a, c); if (!best || m > best.m) best = { m, c, a, b }; } }
  if (best && best.m > 10) tips.push(`Word on the docks: ${COMS[best.c].name.toLowerCase()} goes for ${fmt(buyPrice(best.a, best.c))} at ${best.a.name} and fetches ${fmt(sellPrice(best.b, best.c))} at ${best.b.name}. That's ${fmt(best.m)} a ton.`);
  // shortage
  let worst = null; for (const st of STATIONS) { const n = stationNeeds(st)[0]; if (!worst || n.r < worst.r) worst = { ...n, st }; }
  if (worst && worst.r < 0.5) tips.push(`${worst.st.name} is desperate for ${COMS[worst.c].name.toLowerCase()}. Down to ${worst.stock} tons last I heard.`);
  // danger
  const e = (G.elites || [])[0];
  if (e) tips.push(`Steer clear of ${regionName(e.x, e.y)}. ${e.name} is hunting there in a ${HULLS[e.hull].name}.`);
  else { const amb = Wd.ships.find(s => s.role === 'ambush'); if (amb) tips.push(`Raiders like to sit quiet in the rocks around ${regionName(amb.x, amb.y)}. Scan before you mine there.`); }
  // war
  const inb = Wd.ships.find(s => !s.dead && s.role === 'assault');
  if (inb) tips.push(`The ${FACTIONS[inb.fac].name} sent a strike group at ${STN[inb.goal].name}. Prices there will go strange.`);
  // salvage
  const poi = G.pois.find(x => !x.found && !x.done && x.type !== 'beacon');
  if (poi) tips.push({ text: `We passed a ${POI_TYPES[poi.type].name.toLowerCase()} near ${regionName(poi.x, poi.y)}. I'll send you the coordinates.`, poi: poi.id });
  for (let i = tips.length - 1; i > 0; i--) { const j = randi(0, i); [tips[i], tips[j]] = [tips[j], tips[i]]; }
  return tips.slice(0, 3);
}
function logPrice(p) { return 150 + Math.round(Math.hypot(STN[p.from].x - STN[p.next].x, STN[p.from].y - STN[p.next].y) / 80); }
function tabPort(st) {
  const P = portOf(st);
  if (!P.length) return `<p style="color:var(--dim)">No haulers are docked right now. Check back later; ships come and go every few minutes.</p>`;
  if (!UI.portSel || !P.find(p => p.id === UI.portSel)) UI.portSel = P[0].id;
  let h = `<div class="cols" style="grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr)"><div style="min-width:0"><div class="sec">Docked haulers (${P.length})</div><div class="list" style="gap:6px">`;
  for (const p of P) {
    const sel = p.id === UI.portSel, mins = Math.max(0, Math.ceil((p.leaveT - G.time) / 60));
    h += `<div class="slotRow ${sel ? 'sel' : ''}" data-act="psel" data-id="${p.id}" tabindex="0" style="grid-template-columns:44px minmax(0,1fr) auto">${makePortraitImg(p)}<div style="min-width:0"><div class="w" style="color:${FACTIONS[p.fac].color}">${esc(p.shipName)}</div><div class="ty">${HULLS[p.hull].name} · from ${esc(STN[p.from].name)} → ${esc(STN[p.next].name)}</div></div><span class="ty">leaves ~${mins}m</span></div>`;
  }
  h += `</div></div><div style="min-width:0">` + portDetail(st, P.find(p => p.id === UI.portSel)) + `</div></div>`;
  return h;
}
function makePortraitImg(p, cls) { const c = makePortrait('port_' + p.id, p.look, FACTIONS[p.fac].color); return `<img class="${cls || 'cap-sm'}" src="${c.url}" alt="Portrait of ${esc(p.captain)}" width="24" height="28">`; }
function portDetail(st, p) {
  const M = PORT_MOODS[p.mood], saved = G.rescued && G.rescued[p.shipName];
  let line = UI.portSay || (saved ? `You! You pulled the ${p.shipName} out of that raider mess. Anything you need, at a friend's price.` : (G.rep[p.fac] ?? 0) < 0 ? `Your name isn't popular with the ${FACTIONS[p.fac].short}. Prices are what they are.` : M.hi.replace('{from}', STN[p.from].name).replace('{next}', STN[p.next].name));
  let h = `<div style="display:flex;gap:12px;align-items:center;margin-bottom:10px">${makePortraitImg(p)}<div><div class="cname" style="margin:0;font-size:18px;color:${FACTIONS[p.fac].color}">Captain ${esc(p.captain)}</div><div class="ctitle">${esc(p.shipName)} · ${FACTIONS[p.fac].name} ${HULLS[p.hull].name}</div></div></div>`;
  h += `<div class="speech" style="--fc:${FACTIONS[p.fac].color}"><p>“${esc(line)}”</p></div>`;
  const tipsLeft = !p.tips || p.tipIdx < p.tips.length;
  h += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px"><button data-act="ptip" data-id="${p.id}">${p.tips && !tipsLeft ? 'Anything else?' : 'Any trade tips?'}</button>`;
  h += `<button data-act="plog" data-id="${p.id}" ${!p.logSold && G.credits < logPrice(p) ? 'disabled' : ''}>${p.logSold ? `Show ${esc(STN[p.from].name)} prices` : `Buy their market log from ${esc(STN[p.from].name)} · ${fmt(logPrice(p))} cr`}</button></div>`;
  if (UI.portLog === p.id) {
    const S = p.logSnap;
    h += `<div class="sec">Market log · ${esc(STN[p.from].name)} · taken ${ago(S.t)}</div><div class="tbl"><table><thead><tr><th>Commodity</th><th>Demand</th><th class="num">Buy</th><th class="num">Sell</th><th class="num">Here (sell)</th></tr></thead><tbody>`;
    for (const c in COMS) { const r = S.rows[c]; const here = sellPrice(st, c); h += `<tr><td>${COMS[c].name}</td><td><span class="tag" style="color:${demandLabel(r.r).color};border-color:currentColor">${demandLabel(r.r).name.toUpperCase()}</span></td><td class="num">${fmt(r.buy)}</td><td class="num" style="color:${r.sell > here ? 'var(--good)' : 'inherit'}">${fmt(r.sell)}</td><td class="num">${fmt(here)}</td></tr>`; }
    h += `</tbody></table></div>`;
  }
  // trading
  const wants = portWants(p), goods = Object.keys(p.cargo).filter(c => p.cargo[c] > 0);
  h += `<div class="sec">Trade with the ${esc(p.shipName)} · they have ${fmt(p.credits)} cr</div><div class="tbl"><table><thead><tr><th>Commodity</th><th class="num">They have</th><th class="num">You pay</th><th class="num">Station price</th><th style="text-align:right">Buy</th></tr></thead><tbody>`;
  if (!goods.length) h += `<tr><td colspan="5" style="color:var(--dim)">Their hold is empty.</td></tr>`;
  for (const c of goods) { const pr = portBuyPrice(st, p, c), can = G.credits >= pr && cargoFree() > 0; h += `<tr><td>${COMS[c].name}</td><td class="num">${p.cargo[c]}</td><td class="num" style="color:var(--good)">${fmt(pr)}</td><td class="num">${fmt(buyPrice(st, c))}</td><td><div class="btns"><button data-act="pbuy" data-id="${p.id}" data-c="${c}" data-n="1" ${can ? '' : 'disabled'}>+1</button><button data-act="pbuy" data-id="${p.id}" data-c="${c}" data-n="10" ${can ? '' : 'disabled'}>+10</button><button data-act="pbuy" data-id="${p.id}" data-c="${c}" data-n="all" ${can ? '' : 'disabled'}>All</button></div></td></tr>`; }
  h += `</tbody></table></div><div class="tbl" style="margin-top:8px"><table><thead><tr><th>They want (for ${esc(STN[p.next].name)})</th><th class="num">You have</th><th class="num">They pay</th><th class="num">Station pays</th><th style="text-align:right">Sell</th></tr></thead><tbody>`;
  for (const c of wants) { const have = G.cargo[c] || 0, pr = portSellPrice(st, p, c), can = have > 0 && p.credits >= pr; h += `<tr><td>${COMS[c].name}</td><td class="num">${have || '·'}</td><td class="num" style="color:var(--good)">${fmt(pr)}</td><td class="num">${fmt(sellPrice(st, c))}</td><td><div class="btns"><button data-act="psell" data-id="${p.id}" data-c="${c}" data-n="1" ${can ? '' : 'disabled'}>−1</button><button data-act="psell" data-id="${p.id}" data-c="${c}" data-n="10" ${can ? '' : 'disabled'}>−10</button><button data-act="psell" data-id="${p.id}" data-c="${c}" data-n="all" ${can ? '' : 'disabled'}>All</button></div></td></tr>`; }
  h += `</tbody></table></div><p style="color:var(--dim);font-size:12px;margin:8px 0 0;max-width:70ch">Haulers sell below station prices and pay above them for what their next stop needs. Better standing with their faction, or having saved their ship, gets you better rates.</p>`;
  return h;
}
function portAction(act, d, st) {
  if (!['psel', 'ptip', 'plog', 'pbuy', 'psell'].includes(act) || !st) return false;
  const p = portOf(st).find(x => x.id === +d.id); if (!p) return true;
  if (act === 'psel') { UI.portSel = p.id; UI.portSay = null; UI.portLog = null; return true; }
  if (act === 'ptip') {
    if (!p.tips) p.tips = genTips(p);
    if (p.tipIdx >= p.tips.length) { UI.portSay = p.tips.length ? "That's all I've got. Buy me a drink at the next port and I'll hear more." : "Quiet run. Nothing worth telling."; return true; }
    const t = p.tips[p.tipIdx++];
    if (typeof t === 'object') { const poi = G.pois.find(x => x.id === t.poi); if (poi) { poi.found = true; log(`Coordinates received: ${POI_TYPES[poi.type].name} marked on your map.`, 'gold'); } UI.portSay = t.text; }
    else UI.portSay = t;
    return true;
  }
  if (act === 'plog') {
    if (!p.logSold) {
      const c = logPrice(p); if (G.credits < c) return true; G.credits -= c; p.logSold = true;
      const S = STN[p.from], rows = {}; for (const k in COMS) rows[k] = { buy: buyPrice(S, k), sell: sellPrice(S, k), r: stockRatio(S, k) };
      p.logSnap = { t: p.arrived, rows }; UI.notices = [`Bought the ${p.shipName}'s market log for ${fmt(c)} cr.`];
    }
    UI.portLog = UI.portLog === p.id ? null : p.id; return true;
  }
  if (act === 'pbuy') {
    const c = d.c; let n = d.n === 'all' ? 9999 : +d.n, got = 0, spent = 0;
    while (n-- > 0 && p.cargo[c] > 0 && cargoFree() > 0) { const pr = portBuyPrice(st, p, c); if (G.credits < pr) break; G.credits -= pr; p.credits += pr; spent += pr; p.cargo[c]--; addCargo(c, 1); got++; }
    if (got) { UI.notices = [`Bought ${got} t ${COMS[c].name.toLowerCase()} from the ${p.shipName} for ${fmt(spent)} cr.`]; addXP(Math.round(spent / 300), true); }
    return true;
  }
  if (act === 'psell') {
    const c = d.c; let n = d.n === 'all' ? 9999 : +d.n, sold = 0, got = 0;
    while (n-- > 0 && (G.cargo[c] || 0) > 0) { const pr = portSellPrice(st, p, c); if (p.credits < pr) break; p.credits -= pr; G.credits += pr; got += pr; p.cargo[c] = (p.cargo[c] || 0) + 1; addCargo(c, -1); sold++; }
    if (sold) { UI.notices = [`Sold ${sold} t ${COMS[c].name.toLowerCase()} to the ${p.shipName} for ${fmt(got)} cr.`]; addXP(Math.round(got / 150), true); }
    return true;
  }
  return false;
}
