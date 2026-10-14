
// ═══════════════ Ship console: loadout, cargo, map, factions, contracts and news, opened in flight (game pauses) ═══════════════
const CON = { tab: 'loadout' };
const CON_TABS = [['loadout', 'Loadout'], ['cargo', 'Cargo'], ['map', 'Map'], ['factions', 'Factions'], ['contracts', 'Contracts'], ['news', 'News'], ['holdings', 'Holdings']];
const NEWS_RE = /^(Market news|War|Ceasefire|Raiders sacked|Sensor alert|.*has fallen|.*outpost: raiders|.*sensors:|.*Outpost has been wrecked)/;
function recordNews(msg, cls) {
  if (!G || !cls || /^\+/.test(msg) || /^Recovered/.test(msg)) return;
  G.news = G.news || [];
  G.news.push({ t: G.time, msg, cls, sector: NEWS_RE.test(msg) });
  if (G.news.length > 80) G.news.splice(0, G.news.length - 80);
}
function ago(t) { const s = Math.max(0, G.time - t); return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)} min ago` : `${Math.floor(s / 3600)} h ago`; }
function openConsole(tab) {
  if (tab) CON.tab = tab;
  if (mode === 'play') { mode = 'map'; mouse.down = false; for (const k in keys) keys[k] = false; }
  $('mapPanel').hidden = false; renderConsole();
}
function closeConsole() { if (mode === 'map') mode = 'play'; $('mapPanel').hidden = true; }
function renderConsole() {
  $('cTabs').innerHTML = CON_TABS.map(([id, n], i) => `<button data-act="ctab" data-id="${id}" class="${CON.tab === id ? 'on' : ''}">${n} <span class="k" style="font-size:9px">${i + 1}</span></button>`).join('');
  const isMap = CON.tab === 'map';
  $('cMapWrap').hidden = !isMap; $('cBody').hidden = isMap;
  $('cSub').textContent = `${G.name || 'Pilot'} · ${HULLS[G.ship.hull].name}-class ${HULLS[G.ship.hull].cls.toLowerCase()} · ${fmt(G.credits)} cr · game paused`;
  if (isMap) { drawMap(); return; }
  $('cBody').innerHTML = ({ loadout: conLoadout, cargo: conCargo, factions: conFactions, contracts: conContracts, news: conNews, holdings: conHoldings }[CON.tab])();
  if (CON.tab === 'loadout') { UI.sel = UI.sel && UI.sel.kind === 'slot' ? UI.sel : { kind: 'slot', i: 0 }; drawRefit('conRefit'); }
}
function conLoadout() {
  const p = player, H = p.H;
  let h = `<div class="cols"><div style="min-width:0"><canvas id="conRefit" class="refitC" width="880" height="660"></canvas>
    <div class="sec">Weapons</div><div class="list" style="gap:4px">`;
  H.slots.forEach((sl, i) => {
    const w = p.ws[i], W = w && WEAPONS[w.id];
    const status = !w ? '' : w.off > 0 ? `<span style="color:var(--danger)">offline ${Math.ceil(w.off)}s</span>` : W.missile ? `${w.ammo}/${p.maxAmmo(w.id)} missiles` : W.beam ? 'beam' : 'ready';
    h += `<div class="item"><div><div class="nm">W${i + 1} · ${W ? esc(W.name) : '<span style="color:var(--dim);font-weight:400">Empty mount</span>'}${w && w.wear ? ` <span style="color:var(--amber)">${'▪'.repeat(w.wear)} worn</span>` : ''}</div><div class="ds">${SIZE_NAME[sl.s]} ${TYPE_NAME[sl.t]} mount${W ? ' · ' + esc(wDesc(w.id)) : ''}</div></div><span class="mono" style="font-size:11px">${status}</span></div>`;
  });
  h += `</div><div class="sec">Internal modules</div><div class="list" style="gap:4px">${G.ship.mods.map((m, i) => `<div class="item"><div><div class="nm">I${i + 1} · ${m ? esc(MODS[m].name) : '<span style="color:var(--dim);font-weight:400">Empty bay</span>'}</div><div class="ds">${m ? esc(MODS[m].desc) : ''}</div></div><span></span></div>`).join('')}</div></div>`;
  h += `<div style="min-width:0"><div class="sec">Condition</div><div class="stats"><span>Hull</span><span>${fmt(p.hp)} / ${fmt(p.st.hull)}</span><span>Armor</span><span>${fmt(p.armor)} / ${fmt(p.st.armor)}</span><span>Flux</span><span>${fmt(p.flux)} / ${fmt(p.st.flux)}</span><span>Engines</span><span>${p.engOut > 0 ? 'crippled' : p.engWear ? 'worn ×' + p.engWear : 'nominal'}</span></div>
    <div class="sec">Ship profile</div>${statsBlock(p.st)}`;
  if (G.fleet.length) {
    h += `<div class="sec">Fleet · order: ${G.order}</div><div class="list" style="gap:4px">`;
    for (const f of G.fleet) {
      const live = Wd.ships.find(s => s.role === 'wing' && s.fleetId === f.id);
      const hp = live ? live.hp / live.st.hull : (f.hpF ?? 1);
      h += `<div class="item"><div><div class="nm">${esc(wingName(f))}</div><div class="ds">${f.cfg.weapons.filter(Boolean).map(w => WEAPONS[w].name).join(', ') || 'unarmed'}</div></div><span class="mono" style="font-size:11px;color:${hp < 0.35 ? 'var(--danger)' : 'inherit'}">${Math.round(hp * 100)}% hull</span></div>`;
    }
    h += '</div>';
  }
  return h + '</div></div>';
}
function bestSale(c) {
  let best = null;
  for (const st of STATIONS) { if (G.rep[st.fac] <= -25) continue; const p = sellPrice(st, c); if (!best || p > best.p) best = { p, st }; }
  return best;
}
function conCargo() {
  const used = cargoUsed(), cap = cargoCap();
  let h = `<div class="cols"><div style="min-width:0"><div class="sec">Hold · ${used} / ${cap} t${G.fleet.length ? ` (${fleetCargo()} t in fleet holds)` : ''}</div>
    <div class="bar" style="grid-template-columns:1fr;margin-bottom:10px"><span class="t"><i style="width:${Math.min(100, used / Math.max(1, cap) * 100)}%;background:var(--good)"></i></span></div>`;
  const coms = Object.keys(COMS).filter(c => G.cargo[c] > 0);
  if (!coms.length) h += `<p style="color:var(--dim);margin:0">No trade goods aboard.</p>`;
  else {
    h += '<div class="tbl"><table><thead><tr><th>Commodity</th><th class="num">Tons</th><th>Best known buyer</th><th class="num">Pays</th><th class="num">Value</th><th style="text-align:right">Eject</th></tr></thead><tbody>';
    let total = 0;
    for (const c of coms) { const b = bestSale(c), v = b ? b.p * G.cargo[c] : 0; total += v; h += `<tr><td>${COMS[c].name}</td><td class="num">${G.cargo[c]}</td><td>${b ? `<span style="color:${FACTIONS[b.st.fac].color}">${esc(b.st.name)}</span> <span class="tag" style="color:${demandLabel(stockRatio(b.st, c)).color};border-color:currentColor">${demandLabel(stockRatio(b.st, c)).name.toUpperCase()}</span>` : 'nobody will dock you'}</td><td class="num">${b ? fmt(b.p) : '·'}</td><td class="num">${fmt(v)}</td><td><div class="btns"><button class="warn" data-act="ceject" data-c="${c}" data-n="1">1</button><button class="warn" data-act="ceject" data-c="${c}" data-n="10">10</button><button class="warn" data-act="ceject" data-c="${c}" data-n="all">All</button></div></td></tr>`; }
    h += `<tr><td colspan="4" style="color:var(--dim)">Estimated value at the best prices</td><td class="num" style="color:var(--amber)">${fmt(total)} cr</td><td></td></tr></tbody></table></div>`;
  }
  const mc = Object.keys(G.cargo).filter(k => k.startsWith('mc'));
  if (mc.length) { h += `<div class="sec">Contract cargo</div><div class="list">`; for (const k of mc) { const m = G.missions.find(m => m.cargoKey === k); h += `<div class="item"><div><div class="nm">${G.cargo[k]} t ${esc(m ? m.cargoName : 'sealed cargo')}</div><div class="ds">${m ? 'Deliver to ' + esc(STN[m.dest].name) + '. Jettisoning it fails the contract.' : ''}</div></div><button class="warn" data-act="cjettison" data-c="${k}">${CON.confirmJet === k ? 'Confirm jettison' : 'Jettison'}</button></div>`; } h += '</div>'; }
  h += `</div><div style="min-width:0"><div class="sec">Stash (stored at stations)</div>`;
  const st = [...Object.keys(G.stash.weapons).filter(w => G.stash.weapons[w] > 0).map(w => [WEAPONS[w].name, G.stash.weapons[w]]), ...Object.keys(G.stash.mods).filter(m => G.stash.mods[m] > 0).map(m => [MODS[m].name, G.stash.mods[m]])];
  h += st.length ? `<div class="stats">${st.map(([n, q]) => `<span>${esc(n)}</span><span>×${q}</span>`).join('')}</div>` : `<p style="color:var(--dim);margin:0">Empty.</p>`;
  if (G.outposts.length) { h += `<div class="sec">Outpost storage</div><div class="stats">${G.outposts.map(o => { opInit(o); return `<span>${esc(BELTS[o.belt].name)}${o.wrecked ? ' (wrecked)' : ''}</span><span>${Math.floor(opStored(o))} / ${outpostCap(o)} t · ${Math.floor(o.supplies)} supplies</span>`; }).join('')}</div>`; }
  return h + '</div></div>';
}
function conFactions() {
  let h = `<div class="cols"><div style="min-width:0"><div class="sec">Standing</div><div class="list" style="gap:12px">`;
  for (const f of MAJOR) {
    const v = G.rep[f], left = v < 0 ? 50 + v / 2 : 50, wdt = Math.abs(v) / 2, own = STATIONS.filter(s => s.fac === f);
    h += `<div><div class="rep"><span style="color:${FACTIONS[f].color};font-weight:600">${FACTIONS[f].name}</span><span class="t"><i style="left:${left}%;width:${wdt}%;background:${v < 0 ? 'var(--danger)' : FACTIONS[f].color}"></i></span><span class="mono" style="text-align:right">${v > 0 ? '+' : ''}${v}</span></div>
      <div style="color:var(--dim);font-size:12px;margin-top:3px">${repLabel(v)} · ${own.length} station${own.length === 1 ? '' : 's'} · storyline ${G.story[f]}/3${atWarWith(f).length ? ' · at war with ' + atWarWith(f).map(x => FACTIONS[x].short).join(', ') : ''}</div></div>`;
  }
  h += `<div><div class="rep"><span style="color:${FACTIONS.pirate.color};font-weight:600">${FACTIONS.pirate.name}</span><span style="color:var(--dim);font-size:12px">Always hostile</span><span></span></div></div></div>`;
  h += `<div class="sec">Wars</div>${G.wars.length ? `<div class="stats">${G.wars.map(w => `<span style="color:${FACTIONS[w[0]].color}">${FACTIONS[w[0]].name}</span><span style="color:${FACTIONS[w[1]].color}">vs ${FACTIONS[w[1]].name}</span>`).join('')}</div>` : '<p style="color:var(--dim);margin:0">The sector is at peace, for now.</p>'}</div>`;
  h += `<div style="min-width:0"><div class="sec">Stations</div><div class="tbl"><table><thead><tr><th>Station</th><th>Owner</th><th class="num">Control</th><th>Status</th></tr></thead><tbody>`;
  for (const st of STATIONS) {
    const c = Math.round(G.control[st.id] ?? 100), inb = Wd.ships.some(s => !s.dead && s.role === 'assault' && s.goal === st.id);
    h += `<tr><td>${esc(st.name)}</td><td style="color:${FACTIONS[st.fac].color}">${FACTIONS[st.fac].short}${st.fac !== st.origFac ? ' <span style="color:var(--dim)">(captured)</span>' : ''}</td><td class="num">${c}%</td><td style="color:${inb ? 'var(--danger)' : G.rep[st.fac] <= -25 ? 'var(--danger)' : 'var(--dim)'}">${inb ? 'Under assault' : G.rep[st.fac] <= -25 ? 'Closed to you' : 'Open'}</td></tr>`;
  }
  return h + '</tbody></table></div></div></div>';
}
function conContracts() {
  if (!G.missions.length) return `<p style="color:var(--dim)">No active contracts. Dock at a station and check Contracts or Bounties.</p>`;
  let h = '<div class="list">';
  for (const m of G.missions) {
    const p = missionPoint(m), dist = (Math.hypot(p.x - player.x, p.y - player.y) / 1000).toFixed(1);
    h += `<div class="card"><h4>${esc(m.title)} <span class="mono" style="color:var(--amber);font-weight:400;font-size:12px">${fmt(m.reward)} cr</span></h4><p>${esc(m.desc || '')}</p><div class="meta"><span>${esc(missionStatus(m))}</span><span>${dist}k su away</span><span style="color:${FACTIONS[m.fac] ? FACTIONS[m.fac].color : 'inherit'}">${FACTIONS[m.fac] ? FACTIONS[m.fac].short : ''}</span></div></div>`;
  }
  return h + '</div>';
}
function conNews() {
  const all = (G.news || []).slice().reverse();
  const row = n => `<div class="item"><div><div class="nm" style="font-weight:500;color:${n.cls === 'bad' ? '#ffb3a9' : n.cls === 'good' ? '#c9f2d1' : '#f3d9a4'}">${esc(n.msg)}</div></div><span class="mono" style="font-size:11px;color:var(--dim)">${ago(n.t)}</span></div>`;
  const sector = all.filter(n => n.sector), mine = all.filter(n => !n.sector);
  return `<div class="cols"><div style="min-width:0"><div class="sec">Sector news</div>${sector.length ? '<div class="list" style="gap:2px">' + sector.slice(0, 30).map(row).join('') + '</div>' : '<p style="color:var(--dim);margin:0">Nothing reported yet. Wars, market shocks and raids show up here.</p>'}</div>
    <div style="min-width:0"><div class="sec">Your log</div>${mine.length ? '<div class="list" style="gap:2px">' + mine.slice(0, 30).map(row).join('') + '</div>' : '<p style="color:var(--dim);margin:0">Empty.</p>'}</div></div>`;
}
$('mapPanel').addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]'); if (!el) return;
  if (el.dataset.act !== 'cjettison') CON.confirmJet = null;
  if (el.dataset.act === 'ctab') { CON.tab = el.dataset.id; renderConsole(); }
  if (el.dataset.act === 'ceject') { ejectCargo(el.dataset.c, el.dataset.n); renderConsole(); }
  if (el.dataset.act === 'cjettison') {
    const k = el.dataset.c;
    if (CON.confirmJet !== k) { CON.confirmJet = k; renderConsole(); return; }
    CON.confirmJet = null; const m = G.missions.find(m => m.cargoKey === k);
    if (m) failMission(m, 'cargo jettisoned'); else delete G.cargo[k];
    renderConsole();
  }
});

// Eject cargo out the back of the ship. It floats free for a few seconds before your tractor will grab it again.
function ejectCargo(c, n) {
  const have = G.cargo[c] || 0; if (!have || !player) return;
  let q = n === 'all' ? have : Math.min(have, +n); const total = q;
  addCargo(c, -q);
  const a = player.a;
  while (q > 0) {
    const k = Math.min(10, q); q -= k;
    const sp = rand(90, 150), spread = rand(-0.5, 0.5);
    Wd.pickups.push({ x: player.x - Math.cos(a) * (player.st.r + 16), y: player.y - Math.sin(a) * (player.st.r + 16),
      vx: player.vx - Math.cos(a + spread) * sp, vy: player.vy - Math.sin(a + spread) * sp, kind: 'com', id: c, qty: k, life: 150, rot: rand(0, TAU), noPick: Wd.t + 5 });
  }
  log(`Ejected ${total} t of ${COMS[c].name.toLowerCase()}.`);
}

function conHoldings() {
  if (!G.holdings.length) return `<p style="color:var(--dim);max-width:70ch">You don't own any stations yet. Dock at a faction station and open the Holdings tab to buy a license, blueprints and property, or fly to an asteroid claim or derelict and press F to claim it.</p>`;
  let h = '<div class="list">';
  for (const ps of G.holdings) {
    const bad = ps.alerts.filter(a => a[0] === 'bad'), warn = ps.alerts.filter(a => a[0] === 'warn');
    h += `<div class="card"><h4>${esc(ps.name)} <span style="color:var(--dim);font-weight:400;font-size:12px">${PS_TIERS[ps.tier - 1].name} · ${regionName(ps.x, ps.y)} · ${(Math.hypot(ps.x - player.x, ps.y - player.y) / 1000).toFixed(1)}k away</span></h4>
      <div class="meta"><span>${ps.crew} crew</span><span>morale ${Math.round(ps.morale)}%</span><span>power ${ps.stats ? ps.stats.used.toFixed(0) + '/' + ps.stats.gen.toFixed(0) : '?'}</span><span style="color:${ps.lastPL && ps.lastPL.net < 0 ? 'var(--danger)' : 'var(--good)'}">${ps.lastPL ? (ps.lastPL.net >= 0 ? '+' : '') + fmt(ps.lastPL.net) + ' cr/min' : 'no report yet'}</span><span style="color:${ps.alert === 'red' ? 'var(--danger)' : ps.alert === 'yellow' ? 'var(--amber)' : 'var(--good)'}">${ps.alert.toUpperCase()}</span></div>
      ${bad.concat(warn).slice(0, 3).map(a => `<p style="font-size:12px;color:${a[0] === 'bad' ? '#ffb3a9' : '#f3d9a4'}">${esc(a[1])}</p>`).join('')}
      <div><button class="primary" data-act="cmanage" data-id="${ps.id}">Manage remotely</button></div></div>`;
  }
  return h + '</div>';
}
$('mapPanel').addEventListener('click', ev => { const el = ev.target.closest('[data-act="cmanage"]'); if (!el) return; const ps = psById(+el.dataset.id); if (ps) { $('mapPanel').hidden = true; openPS(ps, false); } });
