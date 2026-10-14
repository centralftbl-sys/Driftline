
// ───────────────────────── Dock UI ─────────────────────────
const UI = { st: null, tab: 'market', sel: { kind: 'slot', i: 0 }, notices: [], confirmReset: false };
function tryDock() {
  const st = nearestStation(260);
  if (!st) return;
  if (G.rep[st.fac] <= -25) { log(`${st.name} refuses to let you dock.`, 'bad'); return; }
  openDock(st);
}
function openDock(st) {
  mode = 'dock'; UI.st = st; UI.outpost = null; UI.ps = null; UI.returnSt = null; G.lastStation = st.id; fleetDock();
  player.vx = player.vy = 0; player.flux = 0; player.overload = 0; player.venting = false; shieldOn = false; mouse.down = false;
  for (const k in keys) keys[k] = false;
  refreshStation(st.id);
  UI.notices = checkDeliveries(st.id);
  UI.tab = 'talk'; UI.say = null; UI.sel = { kind: 'slot', i: 0 }; UI.confirmReset = false;
  $('dock').hidden = false; $('hud').hidden = true;
  renderDock(); saveGame();
}
function undock() {
  if (mode !== 'dock') return;
  if (UI.ps) {
    const ps = UI.ps;
    if (UI.returnSt) { const rs = UI.returnSt; UI.returnSt = null; UI.ps = null; UI.st = rs; UI.tab = 'invest'; UI.notices = []; renderDock(); return; }
    if (!UI.psDocked) { closePS(); return; }
    UI.ps = null; mode = 'play'; $('dock').hidden = true; $('hud').hidden = false;
    const e = psEntity(ps), r = (e ? e.st.r : 120) + 100, a = rand(0, TAU);
    player.x = ps.x + Math.cos(a) * r; player.y = ps.y + Math.sin(a) * r; player.a = a; player.vx = Math.cos(a) * 60; player.vy = Math.sin(a) * 60;
    fleetUndock(); saveGame(); lastW = lastM = ''; updateHUD(); cv.focus(); return;
  }
  mode = 'play'; $('dock').hidden = true; $('hud').hidden = false;
  const st = UI.outpost || UI.st; const a = rand(0, TAU), r = UI.outpost ? 120 : 170;
  player.x = st.x + Math.cos(a) * r; player.y = st.y + Math.sin(a) * r; player.a = a;
  player.vx = Math.cos(a) * 60; player.vy = Math.sin(a) * 60; UI.outpost = null;
  fleetUndock();
  saveGame(); lastW = lastM = ''; updateHUD();
  cv.focus();
}
function tabsFor(st) {
  const t = [['talk', 'Captain'], ['market', 'Market'], ['port', 'Port'], ['contracts', 'Contracts'], ['bounties', 'Bounties'], ['refit', 'Refit']];
  t.push(['shipyard', 'Shipyard'], ['fleet', 'Fleet'], ['invest', 'Holdings'], ['pilot', 'Pilot'], ['services', 'Services']);
  return t;
}
function renderDock() {
  if (UI.ps) return renderPS();
  if (UI.outpost) return renderOutpostPanel();
  const st = UI.st, f = FACTIONS[st.fac];
  $('dName').textContent = st.name; $('dName').style.color = f.color;
  $('dSub').textContent = `${f.name} · your standing: ${repLabel(G.rep[st.fac])} (${G.rep[st.fac] > 0 ? '+' : ''}${G.rep[st.fac]})`;
  $('dCredits').textContent = fmt(G.credits) + ' cr';
  $('dTabs').innerHTML = tabsFor(st).map(([id, n]) => `<button data-act="tab" data-id="${id}" class="${UI.tab === id ? 'on' : ''}">${n}</button>`).join('');
  let h = UI.notices.map(n => `<div class="notice">${esc(n)}</div>`).join('');
  if (UI.tab !== 'talk') h += capBar(st, UI.tab);
  h += ({ port: tabPort, fleet: tabFleet, invest: tabHoldings, pilot: tabPilot, talk: tabTalk, market: tabMarket, contracts: tabContracts, bounties: tabBounties, refit: tabRefit, shipyard: tabShipyard, services: tabServices }[UI.tab])(st);
  const body = $('dBody'), sc = body.scrollTop;
  body.innerHTML = h; body.scrollTop = sc;
  if (UI.tab === 'refit') drawRefit();
}
function holdLine() {
  const st = player.st; const mc = Object.keys(G.cargo).filter(k => k.startsWith('mc'));
  let s = `<div class="mono" style="color:var(--dim);margin-bottom:10px">Hold ${cargoUsed()} / ${cargoCap()} t${G.fleet.length ? ` (${fleetCargo()} t in fleet holds)` : ''}`;
  if (mc.length) s += ` · contract cargo: ${mc.map(k => { const m = G.missions.find(m => m.cargoKey === k); return `${G.cargo[k]} t ${m ? esc(m.cargoName) : ''}`; }).join(', ')}`;
  return s + '</div>';
}
function tabMarket(st) {
  const S = G.stations[st.id];
  let h = holdLine() + '<div class="tbl"><table><thead><tr><th>Commodity</th><th>Demand</th><th class="num">Stock</th><th class="num">Buy</th><th class="num">Sell</th><th class="num">Hold</th><th style="text-align:right">Trade</th></tr></thead><tbody>';
  for (const c in COMS) {
    const dl = demandLabel(stockRatio(st, c)); const tag = `<span class="tag" style="color:${dl.color};border-color:${dl.color}">${dl.name.toUpperCase()}</span>${st.prod.includes(c) ? ' <span class="ds" style="font-size:11px;color:var(--dim)">made here</span>' : st.cons.includes(c) ? ' <span class="ds" style="font-size:11px;color:var(--dim)">used here</span>' : ''}`;
    const have = G.cargo[c] || 0, bp = buyPrice(st, c), sp = sellPrice(st, c), stock = Math.floor(S.stock[c]);
    h += `<tr><td>${COMS[c].name}</td><td>${tag}</td><td class="num">${stock}</td><td class="num">${fmt(bp)}</td><td class="num">${fmt(sp)}</td><td class="num">${have || '·'}</td>
      <td><div class="btns"><button data-act="buy" data-c="${c}" data-n="1" ${stock < 1 || G.credits < bp || cargoFree() < 1 ? 'disabled' : ''}>+1</button><button data-act="buy" data-c="${c}" data-n="10" ${stock < 1 || G.credits < bp || cargoFree() < 1 ? 'disabled' : ''}>+10</button><button data-act="buy" data-c="${c}" data-n="max" ${stock < 1 || G.credits < bp || cargoFree() < 1 ? 'disabled' : ''}>Max</button>
      <button data-act="sell" data-c="${c}" data-n="1" ${have ? '' : 'disabled'}>−1</button><button data-act="sell" data-c="${c}" data-n="10" ${have ? '' : 'disabled'}>−10</button><button data-act="sell" data-c="${c}" data-n="all" ${have ? '' : 'disabled'}>All</button></div></td></tr>`;
  }
  h += '</tbody></table></div>';
  h += `<p style="color:var(--dim);font-size:12px;margin:12px 0 0;max-width:80ch">Prices follow stock: the emptier the shelf, the more the station pays. Stations make some goods and burn through others, and NPC haulers move cargo between them, so shortages and surpluses shift as you play. Better standing with ${FACTIONS[st.fac].short} improves your margins.</p>`;
  return h;
}
function missionCard(m, btn) {
  let meta = `<span class="rw">${fmt(m.reward)} cr</span><span>+${m.rep} ${FACTIONS[m.fac].short} standing</span>`;
  if (m.kind === 'deliver') meta += `<span>${m.qty} t cargo space</span><span>to ${STN[m.dest].name}</span>`;
  if (m.kind === 'procure') meta += `<span>${m.qty} t ${COMS[m.com].name.toLowerCase()}</span><span>to ${STN[m.dest].name}</span>`;
  if (m.kind === 'kill') meta += `<span>${m.fleet.length} ships: ${m.fleet.map(f => HULLS[f[0]].name).join(', ')}</span>`;
  if (m.kind === 'bounty') meta += `<span>${HULLS[m.leader[0]].name} ${HULLS[m.leader[0]].cls.toLowerCase()} + ${m.fleet.length} escort${m.fleet.length === 1 ? '' : 's'}</span>`;
  if (m.gift) meta += `<span class="rw">Bonus: ${m.gift.weapon ? WEAPONS[m.gift.weapon].name : MODS[m.gift.mod].name}</span>`;
  return `<div class="card"><h4>${esc(m.title)}</h4><p>${esc(m.desc)}</p><div class="meta">${meta}</div>${btn ? `<div>${btn}</div>` : ''}</div>`;
}
function missionStatus(m) {
  if (m.kind === 'kill') return `${m.remaining} of ${m.fleet.length} remaining near ${regionName(m.x, m.y)}`;
  if (m.kind === 'bounty') return `Target near ${regionName(m.x, m.y)}`;
  if (m.kind === 'drop') return `Bring ${m.qty} t ${COMS[m.com].name.toLowerCase()} to the drop point near ${regionName(m.x, m.y)}`;
  if (m.kind === 'deliver') return `Carrying ${G.cargo[m.cargoKey] || 0}/${m.qty} t to ${STN[m.dest].name}`;
  return `${G.cargo[m.com] || 0}/${m.qty} ${COMS[m.com].name.toLowerCase()} in hold, deliver to ${STN[m.dest].name}`;
}
function tabContracts(st) {
  const S = G.stations[st.id]; const f = st.fac; let h = '';
  const step = G.story[f], chain = STORY[f];
  h += `<div class="sec">${FACTIONS[f].name} storyline · step ${Math.min(step + 1, 3)} of 3</div>`;
  if (step >= chain.length) h += `<div class="card"><h4>Storyline complete</h4><p>${FACTIONS[f].name} has nothing more to ask of you. Their markets and shipyards remember the favor.</p></div>`;
  else {
    const sm = chain[step]; const active = G.missions.some(m => m.story === f);
    const locked = G.rep[f] < sm.need;
    const btn = active ? '<button disabled>In progress</button>' : locked ? `<button disabled>Requires ${repLabel(sm.need)} standing (${sm.need}+)</button>` : `<button class="primary" data-act="story">Accept contract</button>`;
    h += missionCard({ ...sm, fac: f }, btn);
  }
  h += `<div class="sec">Job board</div><div class="list">`;
  S.jobs.forEach((m, i) => { const taken = G.missions.some(x => x.id === m.id); h += missionCard(m, taken ? '<button disabled>Accepted</button>' : `<button class="primary" data-act="job" data-i="${i}">Accept</button>`); });
  h += '</div>';
  h += activeList();
  return h;
}
function activeList() {
  let h = `<div class="sec">Your contracts (${G.missions.length}/6)</div>`;
  if (!G.missions.length) return h + '<p style="color:var(--dim);margin:0">No active contracts.</p>';
  h += '<div class="list">';
  for (const m of G.missions) h += `<div class="item"><div><div class="nm">${esc(m.title)} <span class="mono" style="color:var(--amber);font-weight:400;font-size:12px">${fmt(m.reward)} cr</span></div><div class="ds">${esc(missionStatus(m))}</div></div><button class="warn" data-act="abandon" data-id="${m.id}">Abandon</button></div>`;
  return h + '</div>';
}
function tabBounties(st) {
  const S = G.stations[st.id];
  let h = `<p style="color:var(--dim);margin:0 0 12px;max-width:80ch">Bounties pay out the moment the target dies, wherever you are. The board refreshes every few minutes.</p><div class="list">`;
  S.bounties.forEach((m, i) => { const taken = G.missions.some(x => x.id === m.id); h += missionCard(m, taken ? '<button disabled>Accepted</button>' : `<button class="primary" data-act="bounty" data-i="${i}">Take bounty</button>`); });
  return h + '</div>' + activeList();
}
function statsBlock(s, cmp) {
  const row = (n, v, c, unit = '', inv) => {
    let d = ''; if (cmp && Math.round(c) !== Math.round(v)) { const better = inv ? c < v : c > v; d = ` <span style="color:${better ? 'var(--good)' : 'var(--danger)'}">(${c > v ? '+' : ''}${fmt(c - v)})</span>`; }
    return `<span>${n}</span><span>${fmt(cmp ? c : v)}${unit}${d}</span>`;
  };
  const c = cmp || s;
  return `<div class="stats">${row('Hull', s.hull, c.hull)}${row('Armor', s.armor, c.armor)}${row('Flux capacity', s.flux, c.flux)}${row('Dissipation', s.diss, c.diss, '/s')}
    ${row('Shield arc', s.shArc, c.shArc, '°')}<span>Shield efficiency</span><span>${(c.shEff).toFixed(2)}</span>${row('Top speed', s.speed, c.speed)}${row('Cargo', s.cargo, c.cargo, ' t')}
    ${row('Weapon DPS', s.dps, c.dps)}${row('Weapon flux', s.fps, c.fps, '/s', true)}</div>`;
}
function wDesc(id) {
  const W = WEAPONS[id];
  const dt = { kin: 'kinetic', he: 'high explosive', en: 'energy' }[W.dt];
  if (W.beam) return `${SIZE_NAME[W.s]} ${TYPE_NAME[W.t].toLowerCase()} beam · ${W.dps} dps · ${W.range} range · ${W.fps} flux/s${W.mine ? ` · ${W.mine}x mining` : ''}`;
  return `${SIZE_NAME[W.s]} ${TYPE_NAME[W.t].toLowerCase()} · ${dt} · ${W.dmg}${W.pellets ? '×' + W.pellets : ''} dmg · ${W.range} range${W.ammo ? ` · ${W.ammo} ammo` : ` · ${Math.round(W.flux / W.cd)} flux/s`}`;
}
function tabRefit(st) {
  const cfg = G.ship, H = HULLS[cfg.hull], sel = UI.sel;
  let h = `<div class="cols"><div style="min-width:0">`;
  h += `<canvas id="refitCanvas" width="880" height="660" data-act="refitclick"></canvas>`;
  h += `<div class="sec">Weapon mounts · ${H.name}-class ${H.cls.toLowerCase()}</div><div class="list" style="gap:4px">`;
  H.slots.forEach((sl, i) => {
    const w = cfg.weapons[i];
    h += `<div class="slotRow ${sel.kind === 'slot' && sel.i === i ? 'sel' : ''}" data-act="selslot" data-i="${i}" tabindex="0"><span class="id">W${i + 1}</span><div style="min-width:0"><div class="w ${w ? '' : 'empty'}">${w ? esc(WEAPONS[w].name) : 'Empty mount'}</div><div class="ty">${SIZE_NAME[sl.s]} ${TYPE_NAME[sl.t]} · ${sl.arc}° arc</div></div><span class="ty">${w ? WEAPONS[w].s + '·' + WEAPONS[w].t : ''}</span></div>`;
  });
  h += `</div><div class="sec">Internal modules</div><div class="list" style="gap:4px">`;
  cfg.mods.forEach((m, i) => {
    h += `<div class="slotRow ${sel.kind === 'mod' && sel.i === i ? 'sel' : ''}" data-act="selmod" data-i="${i}" tabindex="0"><span class="id">I${i + 1}</span><div style="min-width:0"><div class="w ${m ? '' : 'empty'}">${m ? esc(MODS[m].name) : 'Empty bay'}</div><div class="ty">${m ? esc(MODS[m].desc) : 'Any hull module'}</div></div><span></span></div>`;
  });
  h += `</div></div><div style="min-width:0">`;
  h += `<div class="sec">Ship profile</div>${statsBlock(player.st)}`;
  // selected slot options
  const isSlot = sel.kind === 'slot', slot = isSlot ? H.slots[sel.i] : null, cur = isSlot ? cfg.weapons[sel.i] : cfg.mods[sel.i];
  h += `<div class="sec">${isSlot ? `Mount W${sel.i + 1} · ${SIZE_NAME[slot.s]} ${TYPE_NAME[slot.t]}` : `Bay I${sel.i + 1}`}</div>`;
  if (cur) h += `<div class="item"><div><div class="nm">${esc(isSlot ? WEAPONS[cur].name : MODS[cur].name)}</div><div class="ds">${esc(isSlot ? wDesc(cur) : MODS[cur].desc)}</div></div><button data-act="unfit">Remove to stash</button></div>`;
  else h += `<p style="color:var(--dim);margin:0 0 6px">Nothing fitted.</p>`;
  const stashIds = isSlot ? Object.keys(G.stash.weapons).filter(w => G.stash.weapons[w] > 0 && fits(slot, w)) : Object.keys(G.stash.mods).filter(m => G.stash.mods[m] > 0);
  if (stashIds.length) {
    h += `<div style="color:var(--dim);font-size:12px;margin:10px 0 2px">From your stash</div>`;
    for (const id of stashIds) h += `<div class="item"><div><div class="nm">${esc(isSlot ? WEAPONS[id].name : MODS[id].name)} <span class="mono" style="color:var(--dim);font-weight:400">×${isSlot ? G.stash.weapons[id] : G.stash.mods[id]}</span></div><div class="ds">${esc(isSlot ? wDesc(id) : MODS[id].desc)}</div></div><button class="primary" data-act="fitstash" data-id="${id}">Install</button></div>`;
  }
  const shop = st.armory.filter(id => isSlot ? (WEAPONS[id] && fits(slot, id)) : !!MODS[id]);
  h += `<div style="color:var(--dim);font-size:12px;margin:10px 0 2px">${st.name} armory</div>`;
  if (!shop.length) h += `<p style="color:var(--dim);margin:0">Nothing here fits this ${isSlot ? 'mount' : 'bay'}.</p>`;
  for (const id of shop) {
    const price = itemPrice(st, isSlot ? WEAPONS[id].price : MODS[id].price);
    h += `<div class="item"><div><div class="nm">${esc(isSlot ? WEAPONS[id].name : MODS[id].name)} <span class="mono" style="color:var(--amber);font-weight:400">${fmt(price)} cr</span></div><div class="ds">${esc(isSlot ? wDesc(id) : MODS[id].desc)}</div></div><button data-act="buyfit" data-id="${id}" ${G.credits < price ? 'disabled' : ''}>Buy &amp; install</button></div>`;
  }
  const allStash = [...Object.keys(G.stash.weapons).filter(w => G.stash.weapons[w] > 0).map(id => ['w', id]), ...Object.keys(G.stash.mods).filter(m => G.stash.mods[m] > 0).map(id => ['m', id])];
  h += `<div class="sec">Stash</div>`;
  if (!allStash.length) h += `<p style="color:var(--dim);margin:0">Empty. Removed parts and salvage land here.</p>`;
  for (const [k, id] of allStash) {
    const base = k === 'w' ? WEAPONS[id].price : MODS[id].price, n = k === 'w' ? G.stash.weapons[id] : G.stash.mods[id];
    h += `<div class="item"><div><div class="nm">${esc(k === 'w' ? WEAPONS[id].name : MODS[id].name)} <span class="mono" style="color:var(--dim);font-weight:400">×${n}</span></div><div class="ds">${esc(k === 'w' ? wDesc(id) : MODS[id].desc)}</div></div><button data-act="sellstash" data-k="${k}" data-id="${id}">Sell ${fmt(base * 0.45)} cr</button></div>`;
  }
  h += `</div></div>`;
  return h;
}
function drawRefit(cid) {
  const c = $(cid || 'refitCanvas'); if (!c) return; const x = c.getContext('2d');
  const W = c.width, Hh = c.height, H = HULLS[G.ship.hull];
  x.fillStyle = '#070c12'; x.fillRect(0, 0, W, Hh);
  x.strokeStyle = 'rgba(111,211,230,.06)'; x.lineWidth = 1;
  for (let i = 0; i < W; i += 40) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, Hh); x.stroke(); }
  for (let i = 0; i < Hh; i += 40) { x.beginPath(); x.moveTo(0, i); x.lineTo(W, i); x.stroke(); }
  let ext = 0; for (const p of H.shape) ext = Math.max(ext, Math.abs(p[0]), Math.abs(p[1]));
  const k = Math.min(W, Hh) * 0.36 / ext; const cx = W / 2, cy = Hh / 2;
  x.save(); x.translate(cx, cy); x.rotate(-Math.PI / 2);
  // selected arc
  if (UI.sel.kind === 'slot') {
    const sl = H.slots[UI.sel.i]; const half = sl.arc * Math.PI / 360, f = sl.f * Math.PI / 180;
    x.fillStyle = 'rgba(111,211,230,.10)'; x.strokeStyle = 'rgba(111,211,230,.5)';
    x.beginPath(); x.moveTo(sl.x * k, sl.y * k); x.arc(sl.x * k, sl.y * k, 230, f - half, f + half); x.closePath(); x.fill(); x.stroke();
  }
  x.beginPath(); for (const p of H.shape) x.lineTo(p[0] * k, p[1] * k); x.closePath();
  x.fillStyle = '#121c25'; x.fill(); x.strokeStyle = '#6fd3e6'; x.lineWidth = 2.5; x.stroke();
  x.beginPath(); for (const p of H.shape) x.lineTo((p[0] * 0.55 - 2) * k, p[1] * 0.45 * k); x.closePath(); x.fillStyle = 'rgba(111,211,230,.12)'; x.fill();
  const tc = { B: '#f0b44c', E: '#b88aff', U: '#d4e6ef', M: '#ff7b54' };
  H.slots.forEach((sl, i) => {
    const px = sl.x * k, py = sl.y * k, r = sl.s === 'M' ? 22 : 15, on = UI.sel.kind === 'slot' && UI.sel.i === i;
    x.fillStyle = G.ship.weapons[i] ? '#1d2c38' : '#0b1219'; x.strokeStyle = tc[sl.t]; x.lineWidth = on ? 4 : 2;
    if (sl.t === 'M') { x.beginPath(); x.rect(px - r, py - r, r * 2, r * 2); } else if (sl.t === 'U') { x.beginPath(); for (let j = 0; j < 6; j++) x.lineTo(px + Math.cos(j * TAU / 6) * r, py + Math.sin(j * TAU / 6) * r); x.closePath(); } else { x.beginPath(); x.arc(px, py, r, 0, TAU); }
    x.fill(); x.stroke();
    x.save(); x.translate(px, py); x.rotate(Math.PI / 2); x.fillStyle = on ? '#fff' : tc[sl.t]; x.font = "600 20px 'IBM Plex Mono', monospace"; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(i + 1), 0, 1); x.restore();
  });
  x.restore();
  x.font = "500 18px 'IBM Plex Mono', monospace"; x.textAlign = 'left';
  [['B', 'Ballistic ●'], ['E', 'Energy ●'], ['U', 'Universal ⬡'], ['M', 'Missile ■']].forEach(([t, n], i) => { x.fillStyle = tc[t]; x.fillText(n, 20, 34 + i * 26); });
  x.fillStyle = '#7d95a4'; x.textAlign = 'right'; x.fillText('Click a mount to select', W - 20, Hh - 20);
}
function refitSlotAt(ev) {
  const c = $('refitCanvas'); const r = c.getBoundingClientRect();
  const mx = (ev.clientX - r.left) * c.width / r.width, my = (ev.clientY - r.top) * c.height / r.height;
  const H = HULLS[G.ship.hull]; let ext = 0; for (const p of H.shape) ext = Math.max(ext, Math.abs(p[0]), Math.abs(p[1]));
  const k = Math.min(c.width, c.height) * 0.36 / ext;
  let best = -1, bd = 40 * 40;
  H.slots.forEach((sl, i) => { const px = c.width / 2 + sl.y * k, py = c.height / 2 - sl.x * k; const dd = (px - mx) ** 2 + (py - my) ** 2; if (dd < bd) { bd = dd; best = i; } });
  return best;
}
function applyCfg(newCfg) {
  const ns = computeStats(newCfg);
  if (ns.cargo + fleetCargo() < cargoUsed()) { UI.notices = []; log(`That would shrink your hold below the ${cargoUsed()} t you are carrying.`, 'bad'); return false; }
  G.ship.weapons = newCfg.weapons; G.ship.mods = newCfg.mods; player.refit(); return true;
}
function stashAdd(kind, id, n = 1) { const s = kind === 'w' ? G.stash.weapons : G.stash.mods; s[id] = (s[id] || 0) + n; if (s[id] <= 0) delete s[id]; }
function tabShipyard(st) {
  let h = '';
  if (!st.yard.length) {
    h += `<p style="color:var(--dim);margin:0 0 10px">${st.name} has no shipyard. Hulls are sold at:</p><div class="list">`;
    for (const s of STATIONS.filter(s => s.yard.length)) h += `<div class="item"><div><div class="nm" style="color:${FACTIONS[s.fac].color}">${s.name}</div><div class="ds">${s.yard.map(y => HULLS[y].name).join(', ')}</div></div><span></span></div>`;
    return h + '</div>';
  }
  const curH = HULLS[G.ship.hull]; const trade = Math.round(curH.price * 0.45);
  h += `<p style="color:var(--dim);margin:0 0 12px;max-width:80ch">Trade-in for your ${curH.name}: <span class="mono" style="color:var(--amber)">${fmt(trade)} cr</span>. Weapons and modules move to your stash and are refitted automatically where they fit.</p><div class="starts">`;
  for (const id of st.yard) {
    const H = HULLS[id]; const price = itemPrice(st, H.price); const net = price - trade;
    const s = computeStats({ hull: id, weapons: [], mods: [] });
    const same = id === G.ship.hull; const tooSmall = s.cargo + fleetCargo() < cargoUsed();
    const counts = { S: 0, M: 0 }; H.slots.forEach(sl => counts[sl.s]++);
    h += `<div class="card"><h4>${H.name} <span style="color:var(--dim);font-weight:400">${H.cls}</span></h4>
      <div class="stats"><span>Hull / armor</span><span>${fmt(H.hull)} / ${fmt(H.armor)}</span><span>Flux / dissipation</span><span>${fmt(H.flux)} / ${H.diss}</span><span>Speed</span><span>${H.speed}</span><span>Cargo</span><span>${H.cargo} t</span><span>Mounts</span><span>${counts.M} medium, ${counts.S} small</span><span>Internal bays</span><span>${H.internals}</span><span>Price</span><span style="color:var(--amber)">${fmt(price)}</span><span>After trade-in</span><span style="color:var(--amber)">${fmt(net)}</span></div>
      <button class="primary" data-act="buyhull" data-id="${id}" ${same || G.credits < net || tooSmall ? 'disabled' : ''}>${same ? 'Current hull' : tooSmall ? 'Hold too small for your cargo' : G.credits < net ? 'Not enough credits' : 'Buy hull'}</button><button data-act="buywing" data-id="${id}" ${G.fleet.length >= fleetCap() || G.credits < wingPrice(st, id) ? 'disabled' : ''}>${G.fleet.length >= fleetCap() ? 'Fleet full' : 'Add to fleet · ' + fmt(wingPrice(st, id)) + ' cr'}</button></div>`;
  }
  return h + '</div>';
}
function repairCost(st) { return Math.ceil(((player.st.hull - player.hp) * 0.9 + (player.st.armor - player.armor) * 0.6) * (1 - repDisc(st.fac))); }
function rearmCost(st) { let c = 0; player.ws.forEach(w => { if (w && WEAPONS[w.id].ammo) c += (player.maxAmmo(w.id) - w.ammo) * WEAPONS[w.id].price * 0.015; }); return Math.ceil(c * (1 - repDisc(st.fac))); }
function tabServices(st) {
  const rc = repairCost(st), ac = rearmCost(st);
  let h = `<div class="cols"><div style="min-width:0"><div class="sec">Dockyard</div><div class="list">
    ${repairItemHTML(st)}
    <div class="item"><div><div class="nm">Restock missiles</div><div class="ds">${player.ws.filter(w => w && WEAPONS[w.id].ammo).map(w => `${WEAPONS[w.id].name} ${w.ammo}/${player.maxAmmo(w.id)}`).join(' · ') || 'No missile launchers fitted'}</div></div><button class="primary" data-act="rearm" ${ac <= 0 || G.credits < ac ? 'disabled' : ''}>${ac > 0 ? 'Restock ' + fmt(ac) + ' cr' : 'Full'}</button></div>
    </div>`;
  h += `<div class="sec">Sound</div><div class="stats" style="align-items:center"><label for="volSfx">Effects</label><span><input type="range" id="volSfx" min="0" max="100" value="${Math.round(AUD.prefs.sfx * 100)}"></span><label for="volMusic">Music</label><span><input type="range" id="volMusic" min="0" max="100" value="${Math.round(AUD.prefs.music * 100)}"></span></div><div style="margin:6px 0 4px"><button data-snd><span class="sndLabel">${AUD.prefs.muted ? 'Sound off' : 'Sound on'}</span></button> <span style="color:var(--dim);font-size:12px">Press N in flight to toggle.</span></div>`;
  h += `<div class="sec">Pilot record</div><div class="stats"><span>Ships destroyed</span><span>${G.kills}</span><span>Time in the Drift</span><span>${Math.floor(G.time / 60)} min</span><span>Hull</span><span>${HULLS[G.ship.hull].name}</span></div>`;
  h += `<div class="sec">Save · ${esc(G.name || 'Pilot')} in slot ${G.slot || 1}</div><p style="color:var(--dim);margin:0 0 8px">This pilot saves to its own slot in this browser whenever you dock or undock, and every 45 seconds in flight.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px"><button data-act="save">Save now</button><button data-act="totitle">Save and return to title</button></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span style="color:var(--dim);font-size:12px">Copy this pilot to:</span>${Array.from({ length: SLOTS }, (_, i) => i + 1).filter(n => n !== G.slot).map(n => { const d = readSlot(n); return `<button data-act="copyslot" data-n="${n}" title="${d ? 'Replaces ' + esc(d.name || 'pilot') : 'Empty slot'}">${UI.confirmCopy === n ? 'Confirm overwrite' : `Slot ${n}${d ? ' (' + esc(d.name || 'used') + ')' : ' (empty)'}`}</button>`; }).join('')}</div></div>`;
  h += `<div style="min-width:0"><div class="sec">Standing</div><div class="list" style="gap:12px">`;
  for (const f of ['concord', 'veyra', 'ashen', 'tessel']) {
    const v = G.rep[f]; const left = v < 0 ? 50 + v / 2 : 50, wdt = Math.abs(v) / 2;
    h += `<div><div class="rep"><span style="color:${FACTIONS[f].color};font-weight:600">${FACTIONS[f].name}</span><span class="t"><i style="left:${left}%;width:${wdt}%;background:${v < 0 ? 'var(--danger)' : FACTIONS[f].color}"></i></span><span class="mono" style="text-align:right">${v > 0 ? '+' : ''}${v}</span></div>
      <div style="color:var(--dim);font-size:12px;margin-top:3px">${repLabel(v)} · ${FACTIONS[f].blurb} · storyline ${G.story[f]}/3</div></div>`;
  }
  h += `<div style="color:var(--dim);font-size:12px">Destroying a faction's ships costs standing with them. Concord and the Ashen Covenant reward you for hurting each other. At −25 a faction turns hostile and closes its stations to you.</div></div></div></div>`;
  return h;
}
function buyCom(st, c, n) {
  const S = G.stations[st.id]; let bought = 0, spent = 0;
  const lim = n === 'max' ? 9999 : +n;
  while (bought < lim && cargoFree() > 0 && S.stock[c] >= 1) { const p = buyPrice(st, c); if (G.credits < p) break; G.credits -= p; spent += p; S.stock[c]--; addCargo(c, 1); bought++; }
  if (bought) UI.notices = [`Bought ${bought} t ${COMS[c].name.toLowerCase()} for ${fmt(spent)} cr`];
}
function sellCom(st, c, n) {
  const S = G.stations[st.id]; let sold = 0, got = 0;
  const lim = n === 'all' ? 9999 : +n;
  while (sold < lim && (G.cargo[c] || 0) > 0) { const p = sellPrice(st, c); G.credits += p; got += p; S.stock[c]++; addCargo(c, -1); sold++; }
  if (sold) addXP(Math.round(got / 150), true);
  if (sold) UI.notices = [`Sold ${sold} t ${COMS[c].name.toLowerCase()} for ${fmt(got)} cr`];
}
function autoFit(cfg) {
  const H = HULLS[cfg.hull];
  H.slots.forEach((sl, i) => {
    if (cfg.weapons[i]) return;
    const opts = Object.keys(G.stash.weapons).filter(w => G.stash.weapons[w] > 0 && fits(sl, w)).sort((a, b) => WEAPONS[b].price - WEAPONS[a].price);
    if (opts.length) { cfg.weapons[i] = opts[0]; stashAdd('w', opts[0], -1); }
  });
  cfg.mods = cfg.mods.map(m => { if (m) return m; const o = Object.keys(G.stash.mods).find(k => G.stash.mods[k] > 0 && !cfg.mods.includes(k)); if (o) { stashAdd('m', o, -1); return o; } return null; });
}
function replacePlayer() {
  const old = player; const i = Wd.ships.indexOf(old);
  player = new Ship(G.ship, 'player', old.x, old.y, { player: true, role: 'player', a: old.a });
  player.name = 'Your ' + player.H.name;
  if (i >= 0) Wd.ships[i] = player; else Wd.ships.push(player);
  for (const s of Wd.ships) { if (s.target === old) s.target = player; if (s.lastAttacker === old) s.lastAttacker = player; }
}
function dockAction(act, d, ev) {
  const st = UI.st; UI.notices = [];
  if (act !== 'copyslot') UI.confirmCopy = null;
  switch (act) {
    case 'undock': if (st) log(`${captainOf(st).name}: “${captainOf(st).bye}”`); undock(); return;
    case 'tab': UI.tab = d.id; UI.say = null; $('dBody').scrollTop = 0; break;
    case 'say': UI.say = d.id; UI.notices = []; break;
    case 'buy': buyCom(st, d.c, d.n); break;
    case 'sell': sellCom(st, d.c, d.n); break;
    case 'story': { const sm = STORY[st.fac][G.story[st.fac]]; if (sm) acceptMission(sm, st.fac); break; }
    case 'job': { const m = G.stations[st.id].jobs[+d.i]; if (m) acceptMission(m); break; }
    case 'bounty': { const m = G.stations[st.id].bounties[+d.i]; if (m) acceptMission(m); break; }
    case 'abandon': { const m = G.missions.find(m => m.id === +d.id); if (m) { for (const s of Wd.ships) if (s.tag === m.tag && m.tag) s.tag = null; failMission(m, 'abandoned'); } break; }
    case 'selslot': UI.sel = { kind: 'slot', i: +d.i }; break;
    case 'selmod': UI.sel = { kind: 'mod', i: +d.i }; break;
    case 'refitclick': { const i = refitSlotAt(ev); if (i < 0) return; UI.sel = { kind: 'slot', i }; break; }
    case 'unfit': {
      const cfg = { hull: G.ship.hull, weapons: [...G.ship.weapons], mods: [...G.ship.mods] }; const isSlot = UI.sel.kind === 'slot';
      const cur = isSlot ? cfg.weapons[UI.sel.i] : cfg.mods[UI.sel.i]; if (!cur) break;
      if (isSlot) cfg.weapons[UI.sel.i] = null; else cfg.mods[UI.sel.i] = null;
      if (applyCfg(cfg)) stashAdd(isSlot ? 'w' : 'm', cur);
      break;
    }
    case 'fitstash': case 'buyfit': {
      const isSlot = UI.sel.kind === 'slot'; const id = d.id;
      const cfg = { hull: G.ship.hull, weapons: [...G.ship.weapons], mods: [...G.ship.mods] };
      const cur = isSlot ? cfg.weapons[UI.sel.i] : cfg.mods[UI.sel.i];
      if (isSlot) cfg.weapons[UI.sel.i] = id; else cfg.mods[UI.sel.i] = id;
      let price = 0;
      if (act === 'buyfit') { price = itemPrice(st, isSlot ? WEAPONS[id].price : MODS[id].price); if (G.credits < price) break; }
      if (!applyCfg(cfg)) break;
      if (act === 'buyfit') { G.credits -= price; UI.notices = [`Installed ${isSlot ? WEAPONS[id].name : MODS[id].name} for ${fmt(price)} cr`]; }
      else stashAdd(isSlot ? 'w' : 'm', id, -1);
      if (cur) stashAdd(isSlot ? 'w' : 'm', cur);
      break;
    }
    case 'sellstash': {
      const base = d.k === 'w' ? WEAPONS[d.id].price : MODS[d.id].price; const p = Math.round(base * 0.45);
      stashAdd(d.k, d.id, -1); G.credits += p; UI.notices = [`Sold ${d.k === 'w' ? WEAPONS[d.id].name : MODS[d.id].name} for ${fmt(p)} cr`]; break;
    }
    case 'buyhull': {
      const id = d.id, price = itemPrice(st, HULLS[id].price), trade = Math.round(HULLS[G.ship.hull].price * 0.45), net = price - trade;
      if (G.credits < net || computeStats({ hull: id, weapons: [], mods: [] }).cargo + fleetCargo() < cargoUsed()) break;
      G.credits -= net;
      G.ship.weapons.forEach(w => w && stashAdd('w', w)); G.ship.mods.forEach(m => m && stashAdd('m', m));
      G.ship.hull = id; G.ship.weapons = HULLS[id].slots.map(() => null); G.ship.mods = Array(HULLS[id].internals).fill(null);
      autoFit(G.ship); replacePlayer(); UI.sel = { kind: 'slot', i: 0 };
      UI.notices = [`The ${HULLS[id].name} is yours. Check the Refit tab to finish fitting it out.`];
      break;
    }
    case 'repair': doRepair(st); break;
    case 'rearm': { const c = rearmCost(st); if (G.credits >= c) { G.credits -= c; player.ws.forEach(w => { if (w) w.ammo = player.maxAmmo(w.id); }); UI.notices = [`Missiles restocked for ${fmt(c)} cr`]; } break; }
    default: if (!depthAction(act, d, st)) return; break;
    case 'save': saveGame(); UI.notices = ['Saved.']; break;
    case 'totitle': saveGame(); G = null; Wd = null; player = null; mode = 'title'; UI.st = null; TS.slot = null; showTitle(); return;
    case 'copyslot': {
      const n = +d.n; if (readSlot(n) && UI.confirmCopy !== n) { UI.confirmCopy = n; break; }
      UI.confirmCopy = null; const c = serialize(); c.slot = n; c.name = (G.name || 'Pilot') + ' (copy)';
      UI.notices = [writeSlot(n, c) ? `Copied to slot ${n} as “${c.name}”. You are still playing in slot ${G.slot}.` : 'Could not write that slot. Browser storage may be full or blocked.']; break;
    }
  }
  renderDock();
}
$('dock').addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]'); if (!el || el.disabled) return;
  dockAction(el.dataset.act, el.dataset, ev);
});
$('dock').addEventListener('keydown', ev => {
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.classList.contains('slotRow')) { ev.preventDefault(); dockAction(ev.target.dataset.act, ev.target.dataset, ev); }
});

// ───────────────────────── Death, save, title ─────────────────────────
function playerDied() {
  mode = 'dead';
  const lost = cargoUsed();
  const fee = Math.round(G.credits * 0.1);
  $('deathSub').textContent = `${player.H.name}-class ${player.H.cls.toLowerCase()} destroyed near ${regionName(player.x, player.y)}`;
  $('deathText').textContent = `Your escape pod is recovered and towed to ${STN[G.lastStation].name}. ${lost ? `The ${lost} t in your hold is gone. ` : ''}The insurer covers a bare Wren hull with a mining laser and an autocannon, and takes a ${fmt(fee)} cr deductible. Parts in your stash are safe.`;
  setTimeout(() => { $('death').hidden = false; $('hud').hidden = true; }, 1200);
}
function respawn() {
  G.credits -= Math.round(G.credits * 0.1);
  for (const m of [...G.missions]) if (m.cargoKey) failMission(m, 'cargo lost');
  G.cargo = {};
  G.ship = normalizeCfg({ hull: 'wren', weapons: ['autocannon', 'mininglaser', null], mods: [null, null] });
  Wd.ships = Wd.ships.filter(s => !s.isPlayer && d2(s, STN[G.lastStation]) > 1600 * 1600 || s.role !== 'pirate' && !s.isPlayer);
  Wd.proj.length = 0;
  spawnPlayerAt(G.lastStation);
  $('death').hidden = true;
  openDock(STN[G.lastStation]);
}
function serialize() {
  if (!G) return null;
  depthSync();
  if (player && !player.dead) { G.hp = player.hp; G.armor = player.armor; G.ammo = player.ws.map(w => w ? (w.ammo === Infinity ? -1 : w.ammo) : null); }
  return JSON.parse(JSON.stringify(G));
}
// ── Save slots ──
const SLOTS = 4;
const slotKey = n => `driftline-slot-${n}`;
function readSlot(n) { try { const s = localStorage.getItem(slotKey(n)); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function writeSlot(n, data) { try { localStorage.setItem(slotKey(n), JSON.stringify(data)); return true; } catch (e) { return false; } }
function deleteSlot(n) { try { localStorage.removeItem(slotKey(n)); } catch (e) { } }
function firstEmptySlot() { for (let i = 1; i <= SLOTS; i++) if (!readSlot(i)) return i; return null; }
function migrateOldSave() {
  try { const old = localStorage.getItem(SAVE_KEY); if (old && !localStorage.getItem(slotKey(1))) { const d = JSON.parse(old); d.slot = 1; d.name = d.name || 'Pilot 1'; localStorage.setItem(slotKey(1), JSON.stringify(d)); } if (old) localStorage.removeItem(SAVE_KEY); } catch (e) { }
}
function saveGame() { const s = serialize(); if (!s) return; if (!G.slot) G.slot = s.slot = firstEmptySlot() || 1; writeSlot(G.slot, s); }
const CALLSIGNS = ['Vesper', 'Kestrel', 'Harrow', 'Lark', 'Cinder', 'Moth', 'Rook', 'Sable', 'Wick', 'Tern', 'Quill', 'Ember', 'Drift', 'Halyard', 'Corsair', 'Nettle'];
function loadGame(data) {
  G = data; normalizeCfg(G.ship); initDepth(G);
  buildWorld(); spawnPlayerAt(G.lastStation);
  if (G.hp) player.hp = Math.min(G.hp, player.st.hull);
  if (G.armor != null) player.armor = Math.min(G.armor, player.st.armor);
  if (G.ammo) player.ws.forEach((w, i) => { if (w && G.ammo[i] != null && G.ammo[i] >= 0) w.ammo = Math.min(G.ammo[i], player.maxAmmo(w.id)); });
  applyPlayerWear();
  for (const m of G.missions) if (m.kind === 'kill' || m.kind === 'bounty') spawnMissionFleet(m);
  startPlay();
}
function startNew(id) {
  const S = STARTS.find(s => s.id === id);
  const slot = TS.slot || firstEmptySlot() || 1, name = ($('pilotName').value || '').trim().slice(0, 24) || `Pilot ${slot}`;
  G = { v: 1, slot, name, credits: S.credits, rep: { concord: 0, veyra: 0, ashen: 0, tessel: 0 }, cargo: {}, stash: { weapons: {}, mods: {} }, missions: [],
    story: { concord: 0, veyra: 0, ashen: 0, tessel: 0 }, lastStation: S.station, time: 0, kills: 0, nextId: 1, ship: normalizeCfg(JSON.parse(JSON.stringify(S.cfg))) };
  initDepth(G); initStations(); buildWorld(); spawnPlayerAt(S.station);
  startPlay();
  log('Welcome to the Driftline. Check Contracts and Bounties for work.', 'gold');
}
function startPlay() {
  $('title').hidden = true; $('hud').hidden = false; cam.x = player.x; cam.y = player.y;
  openDock(STN[G.lastStation]);
}
const TS = { slot: null, confirm: null };
function slotSummary(d) { return `Lv ${(d.pilot && d.pilot.level) || 1} · ${HULLS[d.ship.hull].name} · ${fmt(d.credits)} cr · ${STN[d.lastStation] ? STN[d.lastStation].name : ''} · ${Math.floor(d.time / 60)} min`; }
function showTitle() {
  migrateOldSave();
  $('title').hidden = false; $('hud').hidden = true; $('death').hidden = true; $('mapPanel').hidden = true; $('dock').hidden = true;
  if (TS.slot == null) TS.slot = firstEmptySlot();
  $('pilotName').value = pick(CALLSIGNS);
  renderTitle();
}
function renderTitle() {
  let h = '';
  for (let n = 1; n <= SLOTS; n++) {
    const d = readSlot(n), sel = TS.slot === n;
    if (d) h += `<div class="card slot ${sel ? 'sel' : ''}"><h4>${esc(d.name || 'Pilot ' + n)} <span style="color:var(--dim);font-weight:400">· slot ${n}</span></h4><div class="meta"><span>${esc(slotSummary(d))}</span></div>
      <div class="btns"><button class="primary" data-act="load" data-n="${n}">Continue</button><button data-act="slotnew" data-n="${n}">${sel ? 'Selected' : 'Start over'}</button><button class="warn" data-act="del" data-n="${n}">${TS.confirm === 'del' + n ? 'Confirm delete' : 'Delete'}</button></div></div>`;
    else h += `<div class="card slot empty ${sel ? 'sel' : ''}"><h4>Empty slot ${n}</h4><div class="meta"><span>No pilot saved</span></div><div class="btns"><button data-act="slotnew" data-n="${n}" ${sel ? 'disabled' : ''}>${sel ? 'Selected' : 'New pilot here'}</button></div></div>`;
  }
  $('slots').innerHTML = h;
  const target = TS.slot ? readSlot(TS.slot) : null;
  $('startHead').textContent = TS.slot ? `Choose a start · new pilot in slot ${TS.slot}` : 'Choose a start';
  $('startNote').innerHTML = !TS.slot ? `<div class="notice bad">All ${SLOTS} slots are full. Pick “Start over” on a slot, or delete one.</div>`
    : target ? `<div class="notice bad">Starting here will replace ${esc(target.name || 'the pilot')} in slot ${TS.slot}.${TS.confirm === 'ow' ? ' Click a start again to confirm.' : ''}</div>` : '';
  $('starts').classList.toggle('locked', !TS.slot);
  $('starts').innerHTML = STARTS.map(s => { const H = HULLS[s.cfg.hull]; return `<div class="card" data-act="start" data-id="${s.id}" tabindex="0" role="button"><h4>${s.name}</h4><p>${s.blurb}</p><div class="meta"><span>${H.name} ${H.cls.toLowerCase()}</span><span class="rw">${fmt(s.credits)} cr</span><span>${STN[s.station].name}</span></div></div>`; }).join('');
}
function titleStart(id) {
  if (!TS.slot) return;
  if (readSlot(TS.slot) && TS.confirm !== 'ow') { TS.confirm = 'ow'; renderTitle(); return; }
  TS.confirm = null; startNew(id);
}
$('title').addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]'); if (!el || el.disabled) return;
  const a = el.dataset.act, n = +el.dataset.n;
  if (a !== 'del' && a !== 'start') TS.confirm = null;
  if (a === 'start') return titleStart(el.dataset.id);
  if (a === 'load') { const d = readSlot(n); if (d) { d.slot = n; TS.confirm = null; loadGame(d); } return; }
  if (a === 'slotnew') { TS.slot = n; TS.confirm = null; renderTitle(); $('pilotName').focus(); return; }
  if (a === 'del') { if (TS.confirm !== 'del' + n) { TS.confirm = 'del' + n; renderTitle(); return; } deleteSlot(n); TS.confirm = null; if (!TS.slot || TS.slot === n) TS.slot = firstEmptySlot(); renderTitle(); }
});
$('title').addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.dataset && ev.target.dataset.act === 'start') titleStart(ev.target.dataset.id); });
$('death').addEventListener('click', ev => { if (ev.target.closest('[data-act="respawn"]')) respawn(); });
$('mapPanel').addEventListener('click', ev => { if (ev.target.closest('[data-act="closemap"]')) closeConsole(); });
function toggleMap() {
  if (mode === 'play') openConsole('map');
  else if (mode === 'map') { if (CON.tab === 'map') closeConsole(); else { CON.tab = 'map'; renderConsole(); } }
}

// ───────────────────────── Fullscreen ─────────────────────────
function isFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
function fsFail() { log('Fullscreen was blocked here. Open the game in its own browser tab and try again.', 'bad'); }
function toggleFullscreen() {
  try {
    if (isFullscreen()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) return fsFail();
    const p = req.call(el, { navigationUI: 'hide' });
    if (p && p.catch) p.catch(fsFail);
  } catch (e) { fsFail(); }
}
function syncFsLabels() { document.querySelectorAll('.fsLabel').forEach(s => { s.textContent = isFullscreen() ? 'Exit fullscreen' : 'Fullscreen'; }); setTimeout(resize, 50); }
document.addEventListener('fullscreenchange', syncFsLabels);
document.addEventListener('webkitfullscreenchange', syncFsLabels);
document.addEventListener('click', e => { if (e.target.closest('[data-fs]')) { e.preventDefault(); toggleFullscreen(); } });

// ───────────────────────── Input ─────────────────────────
window.addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code) && mode === 'play') e.preventDefault();
  if (e.code === 'Escape') { if (mode === 'dock') undock(); else if (mode === 'map') closeConsole(); return; }
  if (e.code === 'KeyP' && !e.repeat) { toggleFullscreen(); return; }
  if (e.code === 'KeyM' && (mode === 'play' || mode === 'map')) { toggleMap(); return; }
  if (e.code === 'Tab' && (mode === 'play' || mode === 'map')) { e.preventDefault(); if (mode === 'map') closeConsole(); else openConsole(); return; }
  if (mode === 'map' && /^Digit[1-7]$/.test(e.code)) { CON.tab = CON_TABS[+e.code.slice(5) - 1][0]; renderConsole(); return; }
  if (mode === 'dock' && UI.tab === 'talk' && /^Digit[1-9]$/.test(e.code)) { const b = document.querySelectorAll('#dBody .choice')[+e.code.slice(5) - 1]; if (b) b.click(); return; }
  if (mode !== 'play') return;
  if (!e.repeat) {
    if (e.code === 'KeyF') tryInteract();
    if (e.code === 'KeyG') doScan();
    if (e.code === 'Digit1') setOrder('escort'); if (e.code === 'Digit2') setOrder('engage'); if (e.code === 'Digit3') setOrder('hold');
    if (e.code === 'KeyV') ventReq = true;
    if (e.code === 'KeyC') { steerMode = { direct: 'relative', relative: 'cursor', cursor: 'direct' }[steerMode]; log({ direct: 'WASD steering: W/A/S/D move up/left/down/right, the ship faces the cursor.', relative: 'Relative steering: W/S thrust, A/D turn, Q/E strafe.', cursor: 'Cursor steering: ship faces the cursor, W/S thrust, A/D strafe.' }[steerMode]); }
    if (e.code === 'KeyH') $('help').hidden = !$('help').hidden;
    if (e.code === 'KeyR') { shieldOn = !shieldOn; }
  }
  keys[e.code] = true;
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = false; });
cv.addEventListener('mousemove', e => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
cv.addEventListener('mousedown', e => {
  if (mode !== 'play') return;
  if (e.button === 0) mouse.down = true;
  if (e.button === 2) shieldOn = !shieldOn;
});
window.addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; });
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('wheel', e => { e.preventDefault(); cam.zoom = clamp(cam.zoom * (e.deltaY > 0 ? 0.9 : 1.1), 0.35, 1.6); }, { passive: false });
cv.tabIndex = 0;

// ───────────────────────── Boot ─────────────────────────
let lastT = performance.now(), mapT = 0;
function frame(now) {
  const dt = Math.min(0.033, (now - lastT) / 1000); lastT = now;
  if (mode === 'play' && player && !player.dead) update(dt);
  else if (mode === 'dead' && Wd) { Wd.beams.length = 0; updateProjectiles(dt); updateWorldBits(dt); }
  if (mode === 'map') { mapT -= dt; if (mapT <= 0) { mapT = 0.25; drawMap(); } }
  render(now);
  requestAnimationFrame(frame);
}
function boot(data) {
  resize();
  window.claude?.hot?.snapshot?.(() => ({ save: serialize() }));
  if (data && data.save) loadGame(data.save); else showTitle();
  requestAnimationFrame(frame);
}
window.addEventListener('beforeunload', () => { if (mode !== 'title') saveGame(); });
window.claude?.hot?.ready ? window.claude.hot.ready(boot) : boot(window.claude?.hot?.data ?? {});
