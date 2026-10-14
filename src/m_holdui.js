
// ═══════════════ Holdings UI: station management, property market, blueprints, licenses, templates ═══════════════
const PSUI = { tab: 'overview', overlay: 'modules', pal: null, sel: null, confirm: null, tmplCode: '' };
let LAST_CLICK = null;
document.addEventListener('click', e => { LAST_CLICK = e; }, true);
function loadTemplates() { try { return JSON.parse(localStorage.getItem('driftline-templates') || '[]'); } catch (e) { return []; } }
function saveTemplates(t) { try { localStorage.setItem('driftline-templates', JSON.stringify(t)); } catch (e) { } }

function openPS(ps, docked) {
  psFix(ps);
  if (mode === 'play' || mode === 'map') { $('mapPanel').hidden = true; }
  mode = 'dock'; UI.ps = ps; UI.psDocked = !!docked; UI.st = null; UI.outpost = null; UI.notices = [];
  PSUI.sel = null; PSUI.pal = null; PSUI.confirm = null;
  if (docked) { player.vx = player.vy = 0; shieldOn = false; fleetDock(); }
  mouse.down = false; for (const k in keys) keys[k] = false;
  if (!ps.stats) psTick(ps);
  $('dock').hidden = false; $('hud').hidden = true; renderDock();
}
const PS_TABS = [['overview', 'Overview'], ['build', 'Build'], ['logistics', 'Logistics'], ['crew', 'Crew'], ['ops', 'Operations']];
function renderPS() {
  const ps = UI.ps, st = ps.stats || {}, sov = sovereign(ps.x, ps.y);
  $('dName').textContent = ps.name; $('dName').style.color = 'var(--hud)';
  $('dSub').textContent = `${PS_TIERS[ps.tier - 1].name} · ${ps.site === 'asteroid' ? 'asteroid site' : 'deep space'} · ${sov ? FACTIONS[sov].name + ' space' : 'unclaimed space'} · ${UI.psDocked ? 'docked' : 'remote link'}`;
  $('dCredits').textContent = fmt(G.credits) + ' cr';
  $('dTabs').innerHTML = PS_TABS.map(([id, n]) => `<button data-act="pstab" data-id="${id}" class="${PSUI.tab === id ? 'on' : ''}">${n}</button>`).join('');
  let h = UI.notices.map(n => `<div class="notice">${esc(n)}</div>`).join('');
  h += ({ overview: psOverview, build: psBuild, logistics: psLogistics, crew: psCrew, ops: psOps }[PSUI.tab])(ps);
  const body = $('dBody'), sc = body.scrollTop; body.innerHTML = h; body.scrollTop = sc;
  if (PSUI.tab === 'overview' || PSUI.tab === 'build') drawPSGrid(ps);
}
function bar(v, max, col) { return `<span class="t" style="display:inline-block;width:110px;height:6px;background:#14212c;position:relative;vertical-align:middle"><i style="position:absolute;inset:0 auto 0 0;width:${clamp(v / Math.max(1e-6, max) * 100, 0, 100)}%;background:${col}"></i></span>`; }
function psOverview(ps) {
  const st = ps.stats || {}, S = ps.store, food = S.food / Math.max(0.01, ps.crew * 0.02 * 60 / 3.5);
  const ovs = [['modules', 'Modules'], ['power', 'Power'], ['life', 'Life support'], ['cond', 'Condition'], ['build', 'Construction']];
  let h = `<div class="cols"><div style="min-width:0"><div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">${ovs.map(([id, n]) => `<button data-act="psov" data-id="${id}" class="${PSUI.overlay === id ? 'primary' : ''}">${n}</button>`).join('')}</div>
    <canvas id="psGrid" width="560" height="560" data-act="psgrid" style="width:100%;max-width:460px;aspect-ratio:1;background:#070c12;border:1px solid var(--line);display:block;cursor:pointer"></canvas>${psSelInfo(ps)}</div><div style="min-width:0">`;
  h += `<div class="sec">Status</div><div class="stats">
    <span>Power</span><span>${bar(st.used, st.gen, st.blackout ? 'var(--danger)' : 'var(--amber)')} ${(st.used || 0).toFixed(1)} / ${(st.gen || 0).toFixed(1)}</span>
    <span>Battery</span><span>${bar(ps.battery, st.batCap || 1, 'var(--amber)')} ${Math.round(ps.battery)} / ${Math.round(st.batCap || 0)}</span>
    <span>Heat</span><span>${bar(st.heat, st.cool, st.hot ? 'var(--danger)' : 'var(--good)')} ${(st.heat || 0).toFixed(1)} / ${(st.cool || 0).toFixed(1)}</span>
    <span>Crew</span><span>${ps.crew} aboard · ${st.crewNeed} needed · ${st.crewCap} berths</span>
    <span>Life support</span><span>${bar(ps.crew, st.o2, st.suffocating ? 'var(--danger)' : 'var(--good)')} ${ps.crew} / ${(st.o2 || 0).toFixed(0)}</span>
    <span>Morale</span><span>${bar(ps.morale, 100, ps.morale < 30 ? 'var(--danger)' : ps.morale < 50 ? 'var(--amber)' : 'var(--good)')} ${Math.round(ps.morale)}%</span>
    <span>Food</span><span>${Math.floor(S.food)} t · ${ps.crew ? (food > 99 ? '99+' : food.toFixed(0)) + ' min' : '—'}</span>
    <span>Storage</span><span>${Math.floor(STOREKEYS.reduce((a, c) => a + S[c], 0))} / ${Math.round(psStoreCap(ps))} t</span>
    <span>Alert</span><span style="color:${ps.alert === 'red' ? 'var(--danger)' : ps.alert === 'yellow' ? 'var(--amber)' : 'var(--good)'}">${ps.alert.toUpperCase()}${ps.auto ? ' (auto)' : ''}</span>
    <span>Specialization</span><span>${st.spec ? st.spec + ' (+25%)' : 'None yet'}</span>
    <span>Environment</span><span>${[st.env && st.env.nearStar ? 'near the star: hot, strong solar' : '', st.env && st.env.belt ? 'asteroid field: ore, meteors' : '', st.env && st.env.fringe ? 'Fringe: weak solar, raiders' : ''].filter(Boolean).join(' · ') || 'open space'}</span></div>`;
  h += `<div class="sec">Alerts</div>${ps.alerts.length ? '<div class="list" style="gap:2px">' + ps.alerts.map(a => `<div class="item" style="border-left:2px solid ${a[0] === 'bad' ? 'var(--danger)' : 'var(--amber)'}"><div class="ds" style="color:var(--ink);font-size:12px">${esc(a[1])}</div><span></span></div>`).join('') + '</div>' : '<p style="color:var(--good);margin:0">All systems nominal.</p>'}`;
  const pl = ps.lastPL;
  h += `<div class="sec">Profit and loss · last minute</div>${pl ? `<div class="stats">${Object.entries(pl.inc).map(([k, v]) => `<span>${k}</span><span style="color:var(--good)">+${fmt(v)}</span>`).join('')}${Object.entries(pl.exp).map(([k, v]) => `<span>${k}</span><span style="color:var(--danger)">−${fmt(v)}</span>`).join('')}<span><b>Net</b></span><span style="color:${pl.net >= 0 ? 'var(--good)' : 'var(--danger)'}"><b>${pl.net >= 0 ? '+' : ''}${fmt(pl.net)} cr</b></span></div>${psSpark(ps.history)}` : '<p style="color:var(--dim);margin:0">First report arrives within a minute.</p>'}`;
  const up = psBuilt(ps).filter(m => m.cond < 80).sort((a, b) => a.cond - b.cond).slice(0, 5);
  h += `<div class="sec">Upcoming maintenance</div>${up.length ? '<div class="stats">' + up.map(m => { const eta = Math.max(0, (m.cond - 30) / (0.035 * (st.env ? st.env.wearK : 1) * (PSM[m.t].wear || 1) * 60 / 3.5)); return `<span>${PSM[m.t].name}</span><span style="color:${m.cond < 30 ? 'var(--danger)' : m.cond < 50 ? 'var(--amber)' : 'inherit'}">${Math.round(m.cond)}%${m.cond >= 30 ? ` · critical in ~${Math.ceil(eta)} min` : ' · CRITICAL'}</span>`; }).join('') + '</div>' : '<p style="color:var(--dim);margin:0">Nothing below 80%.</p>'}`;
  return h + '</div></div>';
}
function psSpark(hist) {
  if (!hist.length) return ''; const mx = Math.max(1, ...hist.map(Math.abs));
  return `<div style="display:flex;gap:2px;align-items:center;height:40px;margin-top:6px" aria-label="Net income per minute, last ${hist.length} minutes">${hist.map(v => `<span style="width:8px;height:${Math.max(2, Math.abs(v) / mx * 18)}px;background:${v >= 0 ? 'var(--good)' : 'var(--danger)'};align-self:${v >= 0 ? 'flex-end' : 'flex-start'};margin-${v >= 0 ? 'bottom' : 'top'}:20px"></span>`).join('')}</div>`;
}
function psSelInfo(ps) {
  const m = PSUI.sel && ps.mods.find(x => x.id === PSUI.sel); if (!m) return `<p style="color:var(--dim);font-size:12px;margin:6px 0 0">Click a module to inspect it.</p>`;
  const D = PSM[m.t], building = m.prog >= 0;
  const repairMach = Math.ceil((100 - m.cond) / 20), repairCr = Math.round((100 - m.cond) * 40);
  let h = `<div class="card" style="margin-top:8px"><h4>${D.name}${m.mk === 2 ? ' Mk II' : ''} <span class="mono" style="color:var(--dim);font-weight:400;font-size:11px">(${m.cx}, ${m.cy})</span></h4><p>${D.desc}</p>
    <div class="meta"><span>${building ? (m.waiting ? 'Waiting for materials' : `Building ${Math.round(m.prog / ((D.work || 10) * (m.upg ? 1.2 : 1)) * 100)}%`) : m.wreck ? 'WRECKED' : `Condition ${Math.round(m.cond)}%`}</span>${!building && !m.wreck ? `<span>${m.active ? 'Online' : m.on ? 'No power' : 'Switched off'}</span><span>Efficiency ${Math.round((m.eff || 0) * 100)}%</span>` : ''}${D.draw ? `<span>Draws ${D.draw}</span>` : ''}${D.gen ? `<span>Generates ${D.gen}</span>` : ''}${D.crew ? `<span>Crew ${D.crew}</span>` : ''}</div><div style="display:flex;gap:6px;flex-wrap:wrap">`;
  if (!building && !m.wreck && m.t !== 'command') h += `<button data-act="pstoggle" data-id="${m.id}">${m.on ? 'Switch off' : 'Switch on'}</button>`;
  if (!building && !m.wreck && m.cond < 99) h += `<button data-act="psrepair" data-id="${m.id}" ${ps.store.machinery < repairMach || G.credits < repairCr ? 'disabled' : ''}>Emergency repair · ${repairMach} t machinery + ${fmt(repairCr)} cr</button>`;
  if (!building && !m.wreck && m.mk === 1 && D.cost) h += `<button data-act="psupg" data-id="${m.id}" ${!G.bp.mk2 ? 'disabled' : ''}>${G.bp.mk2 ? `Upgrade to Mk II · ${fmt(Math.round(D.cost.cr * 0.8))} cr + ${Object.entries(matNeed(m.t, 1.5)).map(([k, v]) => `${v} ${k}`).join(', ')}` : 'Mk II needs the blueprint'}</button>`;
  if (m.t !== 'command') h += `<button class="warn" data-act="psdemo" data-id="${m.id}">${PSUI.confirm === 'demo' + m.id ? 'Confirm' : building ? 'Cancel order' : 'Demolish'}</button>`;
  return h + '</div></div>';
}
function psBuild(ps) {
  const T = PS_TIERS[ps.tier - 1], sov = sovereign(ps.x, ps.y);
  let h = `<div class="cols"><div style="min-width:0"><canvas id="psGrid" width="560" height="560" data-act="psgrid" style="width:100%;max-width:460px;aspect-ratio:1;background:#070c12;border:1px solid var(--line);display:block;cursor:crosshair"></canvas>
    <p style="color:var(--dim);font-size:12px;margin:6px 0">${PSUI.pal ? `Placing <b style="color:var(--ink)">${PSM[PSUI.pal].name}</b>: click a highlighted cell next to an existing module.` : 'Pick a module on the right, then click a highlighted cell.'} ${ps.mods.length}/${T.cap} modules.</p>${psSelInfo(ps)}`;
  const q = ps.mods.filter(m => m.prog >= 0);
  h += `<div class="sec">Construction queue (${q.length})</div>${q.length ? '<div class="list" style="gap:2px">' + q.map(m => `<div class="item"><div><div class="nm">${PSM[m.t].name}${m.upg ? ' → Mk II' : ''}</div><div class="ds">${m.waiting ? 'Waiting for ' + Object.entries(m.upg ? matNeed(m.t, 1.5) : matNeed(m.t)).map(([k, v]) => `${v} t ${k}`).join(', ') + ' in station storage' : Math.round(m.prog / ((PSM[m.t].work || 10) * (m.upg ? 1.2 : 1)) * 100) + '% built'}</div></div><span></span></div>`).join('') + '</div><p style="color:var(--dim);font-size:12px">Work goes faster with idle crew and Drone Works. One project at a time, plus one per Drone Works.</p>' : '<p style="color:var(--dim);margin:0">Nothing under construction.</p>'}`;
  if (ps.tier < 3) { const nx = PS_TIERS[ps.tier], c = nx.cost; h += `<div class="sec">Expand the frame</div><div class="item"><div><div class="nm">Upgrade to ${nx.name}</div><div class="ds">${nx.grid}×${nx.grid} grid, up to ${nx.cap} modules · ${fmt(c.cr)} cr + ${c.metals} t metals + ${c.machinery} t machinery from station storage</div></div><button class="primary" data-act="pstier" ${G.credits < c.cr || ps.store.metals < c.metals || ps.store.machinery < c.machinery ? 'disabled' : ''}>Expand</button></div>`; }
  h += `</div><div style="min-width:0"><div class="sec">Modules</div>`;
  const cats = ['Core', 'Power', 'Logistics', 'Industry', 'Life', 'Economy', 'Support', 'Defense'];
  for (const cat of cats) {
    h += `<div style="color:var(--dim);font-size:11px;letter-spacing:.1em;text-transform:uppercase;margin:8px 0 3px">${cat}</div><div style="display:flex;gap:4px;flex-wrap:wrap">`;
    for (const t in PSM) {
      const D = PSM[t]; if (D.cat !== cat || t === 'command') continue;
      const locked = D.bp && !G.bp[t], banned = sov && FAC_LAW[sov].ban.includes(t), wrongSite = D.site && ps.site !== D.site;
      h += `<button data-act="pspal" data-id="${t}" class="${PSUI.pal === t ? 'primary' : ''}" ${locked || banned || wrongSite ? 'disabled' : ''} title="${esc(D.desc)}" style="border-left:3px solid ${D.color}">${D.name}${locked ? ' 🔒' : banned ? ' ⊘' : ''}</button>`;
    }
    h += '</div>';
  }
  if (PSUI.pal) { const D = PSM[PSUI.pal]; h += `<div class="card" style="margin-top:10px"><h4>${D.name}</h4><p>${D.desc}</p><div class="meta"><span class="rw">${fmt(D.cost.cr)} cr labor</span><span>${Object.entries(matNeed(PSUI.pal)).map(([k, v]) => `${v} t ${k}`).join(' + ')} from storage</span>${D.draw ? `<span>Draws ${D.draw} power</span>` : ''}${D.gen ? `<span>+${D.gen} power</span>` : ''}${D.crew ? `<span>${D.crew} crew</span>` : ''}${D.heat ? `<span>${D.heat} heat</span>` : ''}</div></div>`; }
  const locked = Object.keys(PSM).filter(t => PSM[t].bp && !G.bp[t]);
  h += `<p style="color:var(--dim);font-size:12px;margin-top:10px">🔒 Blueprints: buy them in the Holdings tab at faction stations, unlock them with research (Operations), or reverse-engineer them from derelicts. ${locked.length} locked.${sov ? ` ⊘ ${FACTIONS[sov].short} law: ${FAC_LAW[sov].note}` : ''}</p>`;
  // templates
  const T2 = loadTemplates();
  h += `<div class="sec">Templates</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px"><button data-act="pstsave">Save this layout as a template</button></div>`;
  h += T2.length ? '<div class="list" style="gap:2px">' + T2.map((t, i) => `<div class="item"><div><div class="nm">${esc(t.name)}</div><div class="ds">${t.mods.length} modules · ${PS_TIERS[(t.tier || 1) - 1].name} frame</div></div><div class="btns"><button data-act="pstapply" data-id="${i}">Queue on this station</button><button data-act="pstcopy" data-id="${i}">Copy code</button><button class="warn" data-act="pstdel" data-id="${i}">Delete</button></div></div>`).join('') + '</div>' : '<p style="color:var(--dim);margin:0 0 6px">No templates yet.</p>';
  h += `<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap"><input id="tmplCode" placeholder="Paste a template code to import" style="flex:1;min-width:180px;font:inherit;color:var(--ink);background:var(--panel2);border:1px solid var(--line2);padding:5px 8px" value="${esc(PSUI.tmplCode)}"><button data-act="pstimport">Import</button></div>`;
  return h + '</div></div>';
}
function psLogistics(ps) {
  const S = ps.store, docked = UI.psDocked, hub = psCount(ps, 'tradehub'), dock = psCount(ps, 'dock');
  let h = `<div class="cols"><div style="min-width:0"><div class="sec">Station storage · ${Math.floor(STOREKEYS.reduce((a, c) => a + S[c], 0))} / ${Math.round(psStoreCap(ps))} t</div>`;
  if (!docked) h += `<p style="color:var(--amber);font-size:12px;margin:0 0 6px">Remote link: dock at the station to move cargo.</p>`;
  h += `<div class="tbl"><table><thead><tr><th>Goods</th><th class="num">Station</th><th class="num">Your hold</th><th style="text-align:right">Move</th>${hub ? '<th>Auto-sell</th>' : ''}</tr></thead><tbody>`;
  for (const c of STOREKEYS) {
    const have = G.cargo[c] || 0;
    h += `<tr><td>${COMS[c].name}</td><td class="num">${Math.floor(S[c])}</td><td class="num">${have || '·'}</td><td><div class="btns"><button data-act="psxfer" data-c="${c}" data-n="in" ${!docked || !have ? 'disabled' : ''}>Unload all</button><button data-act="psxfer" data-c="${c}" data-n="out" ${!docked || S[c] < 1 || cargoFree() < 1 ? 'disabled' : ''}>Load</button></div></td>${hub ? `<td><button data-act="psauto" data-c="${c}" class="${ps.settings.autosell[c] ? 'primary' : ''}">${ps.settings.autosell[c] ? 'On' : 'Off'}</button></td>` : ''}</tr>`;
  }
  h += `</tbody></table></div>${hub ? '<p style="color:var(--dim);font-size:12px">Auto-sell keeps 20 t in reserve and sells up to 30 t a minute at 80% of the average market price.</p>' : ''}<p style="color:var(--dim);font-size:12px">Stored goods cost 0.02 cr per ton per minute. Stockpiling is safe but not free.</p></div>`;
  h += `<div style="min-width:0"><div class="sec">Standing supply orders</div>`;
  if (!dock) h += `<p style="color:var(--amber);font-size:12px;margin:0 0 6px">Build a Docking Arm to receive supply haulers.</p>`;
  h += `<p style="color:var(--dim);font-size:12px;margin:0 0 6px">When stock falls below 60% of a target, a hauler is hired from the nearest friendly station: market price + 10% + 150 cr delivery. Haulers fly real routes and can be raided.</p><div class="list" style="gap:2px">`;
  for (const c of ['food', 'volatiles', 'machinery', 'metals', 'medicine', 'weapons']) {
    const t = ps.settings.orders[c] || 0;
    h += `<div class="item"><div><div class="nm">${COMS[c].name}</div><div class="ds">Target ${t ? t + ' t' : 'off'} · in stock ${Math.floor(S[c])} t</div></div><div class="btns"><button data-act="psorder" data-c="${c}" data-n="-20">−20</button><button data-act="psorder" data-c="${c}" data-n="20">+20</button></div></div>`;
  }
  h += '</div>';
  if (ps.inbound.length) h += `<div class="sec">Inbound haulers</div><div class="stats">${ps.inbound.map(i => `<span>${esc(i.ship)}</span><span>${i.q} t ${COMS[i.c].name.toLowerCase()}</span>`).join('')}</div>`;
  const net = G.holdings.filter(p => psCount(p, 'relay', true));
  h += `<div class="sec">Relay network</div><p style="color:var(--dim);font-size:12px;margin:0">${psCount(ps, 'relay') ? `${net.length} station${net.length === 1 ? '' : 's'} linked. Food, volatiles, machinery and medicine are balanced between them every minute.` : 'Build a Logistics Relay on two or more stations to share consumables between them.'}</p>`;
  return h + '</div></div>';
}
function psCrew(ps) {
  const st = ps.stats || {}, docked = UI.psDocked, auto = psCount(ps, 'drones') * 3;
  let h = `<div class="cols"><div style="min-width:0"><div class="sec">Crew</div><div class="stats"><span>Aboard</span><span>${ps.crew}</span><span>Needed to run modules</span><span>${st.crewNeed}${auto ? ` (after ${auto} replaced by drones)` : ''}</span><span>Berths</span><span>${st.crewCap}</span><span>Life support capacity</span><span>${(st.o2 || 0).toFixed(0)}</span><span>Staffing</span><span>${Math.round((st.staff || 0) * 100)}%</span><span>Wages</span><span>${fmt(ps.crew * 4)} cr/min</span></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px"><button class="primary" data-act="pshire" data-n="1" ${!docked || G.credits < 250 ? 'disabled' : ''}>Hire 1 · 250 cr</button><button class="primary" data-act="pshire" data-n="5" ${!docked || G.credits < 1250 ? 'disabled' : ''}>Hire 5 · 1,250 cr</button><button class="warn" data-act="psfire" ${ps.crew < 1 ? 'disabled' : ''}>Dismiss 1</button></div>
    ${docked ? '' : '<p style="color:var(--amber);font-size:12px">Remote link: dock at the station to hire crew.</p>'}
    <p style="color:var(--dim);font-size:12px">Idle crew (aboard beyond what modules need) speed up construction. Every crew member eats food and needs air and a berth.</p></div>`;
  const f = [['Base', 55], ['Recreation', Math.min(25, psBuilt(ps).filter(m => m.t === 'rec').reduce((a, m) => a + (m.eff || 0), 0) * 12)], ['Med Bay with medicine', psCount(ps, 'medbay', true) && ps.store.medicine > 0 ? 10 : 0], ['Security', psCount(ps, 'security', true) ? 5 : 0],
    ['Hunger', st.hungry ? -30 : 0], ['Overcrowding', ps.crew > st.crewCap ? -20 : 0], ['Suffocation', st.suffocating ? -35 : 0], ['Unpaid wages', ps.unpaid ? -25 : 0], ['Red alert', ps.alert === 'red' ? -8 : 0], ['Overheating', st.hot ? -6 : 0]];
  h += `<div style="min-width:0"><div class="sec">Morale · ${Math.round(ps.morale)}%</div><div class="stats">${f.filter(x => x[1]).map(([n, v]) => `<span>${n}</span><span style="color:${v > 0 ? 'var(--good)' : 'var(--danger)'}">${v > 0 ? '+' : ''}${Math.round(v)}</span>`).join('')}</div>
    <p style="color:var(--dim);font-size:12px">Morale drifts toward the total. Above 75% output rises 10%. Below 45% output drops. Below 25% crews strike, and without a Security Office they sabotage modules.</p>
    <div class="sec">Consumption</div><div class="stats"><span>Food</span><span>${(ps.crew * 0.02 * 60 / 3.5).toFixed(1)} t/min eaten · ${(psBuilt(ps).filter(m => m.t === 'hydro').reduce((a, m) => a + (m.eff || 0), 0) * 0.4 * 60 / 3.5).toFixed(1)} t/min grown</span><span>Medicine</span><span>${psCount(ps, 'medbay') ? (psCount(ps, 'medbay') * 0.015 * 60 / 3.5).toFixed(2) + ' t/min' : 'not used'}</span><span>Reactor fuel</span><span>${psCount(ps, 'fusion') ? (psCount(ps, 'fusion') * 0.12 * 60 / 3.5).toFixed(1) + ' t/min volatiles' : 'not used'}</span><span>Spare parts</span><span>machinery, as maintenance needs it</span></div></div></div>`;
  return h;
}
function psOps(ps) {
  const sov = sovereign(ps.x, ps.y), S = ps.settings, val = psValue(ps);
  const tog = (k, label, desc, dis) => `<div class="item"><div><div class="nm">${label}</div><div class="ds">${desc}</div></div><button data-act="psset" data-id="${k}" class="${S[k] ? 'primary' : ''}" ${dis ? 'disabled' : ''}>${S[k] ? 'On' : 'Off'}</button></div>`;
  let h = `<div class="cols"><div style="min-width:0"><div class="sec">Sovereignty and law</div><div class="stats"><span>Space</span><span style="color:${sov ? FACTIONS[sov].color : 'var(--dim)'}">${sov ? FACTIONS[sov].name : 'Unclaimed'}</span>${sov ? `<span>License</span><span style="color:${G.licenses[sov] ? 'var(--good)' : 'var(--danger)'}">${G.licenses[sov] ? 'Valid' : 'NONE: penalty tax ×2.5'}</span><span>Tax</span><span>${Math.round(FAC_LAW[sov].tax * 100)}% of income</span><span>Restriction</span><span>${FAC_LAW[sov].note}</span>` : '<span>Tax</span><span>None, and no protection</span>'}<span>Station value</span><span>${fmt(val)} cr</span></div>
    <div class="sec">Alert level</div><div style="display:flex;gap:6px;flex-wrap:wrap">${['green', 'yellow', 'red'].map(a => `<button data-act="psalert" data-id="${a}" class="${!ps.auto && ps.alert === a ? 'primary' : ''}">${a[0].toUpperCase() + a.slice(1)}</button>`).join('')}<button data-act="psalert" data-id="auto" class="${ps.auto ? 'primary' : ''}">Automatic</button></div>
    <p style="color:var(--dim);font-size:12px">Red alert doubles power to defenses and halves production. Automatic switches with nearby threats (yellow needs a Sensor Mast).</p>
    <div class="sec">Policies</div><div class="list" style="gap:2px">
    ${tog('insurance', 'Insurance', `${fmt(val * 0.002)} cr/min. Pays 25% of station value if the station is crippled.`)}
    ${tog('security', 'Security contract', sov ? `150 cr/min. ${FACTIONS[sov].short} ships respond to raids, and raids come half as often.` : 'Only available in faction space.', !sov)}
    ${tog('lease', 'Lease mining rights', ps.site === 'asteroid' ? '+180 cr/min, but your own rigs mine at half rate.' : 'Asteroid sites only.', ps.site !== 'asteroid')}
    ${tog('garrison', 'Garrison contract', sov && atWarWith(sov).length ? `+220 cr/min with 2+ turrets. ${atWarWith(sov).map(f => FACTIONS[f].short).join(', ')} warships will start raiding you.` : 'Only offered while your sovereign is at war.', !(sov && atWarWith(sov).length))}
    ${tog('refuel', 'Sell refueling', 'Sells volatiles above a 20 t reserve to docking ships at 110% of market.')}
    ${tog('sellData', 'Sell research data', `Converts research points into 40 cr each every minute instead of saving them. ${Math.floor(ps.rp)} RP stored here.`)}
    <div class="item"><div><div class="nm">Maintenance threshold</div><div class="ds">Technicians repair modules below ${S.maintThr}%. Higher uses more spare parts; lower risks accidents.</div></div><div class="btns">${[40, 60, 80].map(v => `<button data-act="psmaint" data-id="${v}" class="${S.maintThr === v ? 'primary' : ''}">${v}%</button>`).join('')}</div></div></div></div>`;
  const rpAll = G.holdings.reduce((a, p) => a + p.rp, 0);
  h += `<div style="min-width:0"><div class="sec">Research · ${Math.floor(rpAll)} RP across your stations</div><div class="list" style="gap:2px">${Object.keys(BP_RP).filter(b => !G.bp[b]).map(b => `<div class="item"><div><div class="nm">${b === 'mk2' ? 'Mk II module upgrades' : PSM[b].name}</div><div class="ds">${BP_RP[b]} RP</div></div><button data-act="psresearch" data-id="${b}" ${rpAll < BP_RP[b] ? 'disabled' : ''}>Unlock</button></div>`).join('') || '<p style="color:var(--dim)">Every blueprint unlocked.</p>'}</div>
    <div class="sec">Ownership</div><div class="list" style="gap:2px">
    <div class="item"><div><div class="nm">Sell the station</div><div class="ds">Sold to an NPC buyer for 55% of its value (${fmt(val * 0.55)} cr). Crew and storage go with it.</div></div><button class="warn" data-act="pssell">${PSUI.confirm === 'sell' ? 'Confirm sale' : 'Sell'}</button></div>
    <div class="item"><div><div class="nm">Abandon the station</div><div class="ds">No payout.${sov ? ` −5 ${FACTIONS[sov].short} standing.` : ''} It becomes a derelict, and scavengers will move in.</div></div><button class="warn" data-act="psabandon">${PSUI.confirm === 'abandon' ? 'Confirm abandon' : 'Abandon'}</button></div></div></div></div>`;
  return h;
}
// ── grid canvas ──
function psGridGeom(ps, c) { const N = PS_TIERS[ps.tier - 1].grid, cs = c.width / N, h = (N - 1) / 2; return { N, cs, h }; }
function drawPSGrid(ps) {
  const c = $('psGrid'); if (!c) return; const x = c.getContext('2d'), { N, cs, h } = psGridGeom(ps, c);
  x.fillStyle = '#070c12'; x.fillRect(0, 0, c.width, c.height);
  const px = cx => (cx + h) * cs, ov = PSUI.tab === 'build' ? 'build' : PSUI.overlay;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { x.strokeStyle = 'rgba(111,211,230,.08)'; x.strokeRect(i * cs + .5, j * cs + .5, cs - 1, cs - 1); }
  if (PSUI.tab === 'build' && PSUI.pal) for (let i = -h; i <= h; i++) for (let j = -h; j <= h; j++) if (!canPlace(ps, PSUI.pal, i, j)) { x.fillStyle = 'rgba(127,214,138,.18)'; x.fillRect(px(i) + 2, px(j) + 2, cs - 4, cs - 4); }
  x.strokeStyle = '#2a3a48'; x.lineWidth = cs * 0.12;
  for (const a of ps.mods) for (const b of ps.mods) if (a.id < b.id && Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy) === 1) { x.beginPath(); x.moveTo(px(a.cx) + cs / 2, px(a.cy) + cs / 2); x.lineTo(px(b.cx) + cs / 2, px(b.cy) + cs / 2); x.stroke(); }
  for (const m of ps.mods) {
    const D = PSM[m.t], X0 = px(m.cx) + cs * 0.12, Y0 = px(m.cy) + cs * 0.12, w = cs * 0.76;
    let fill = D.color, a = 0.85;
    if (ov === 'power') { fill = D.gen ? '#f0d24c' : m.powered ? '#7fd68a' : PSM[m.t].draw ? '#ff6a5c' : '#5a6a76'; }
    else if (ov === 'life') { fill = D.o2 ? '#7fe0c2' : D.cap ? '#9fd0ff' : m.t === 'hydro' || m.t === 'medbay' ? '#7fd68a' : '#2a3a48'; }
    else if (ov === 'cond') { const k = m.cond / 100; fill = m.wreck ? '#000' : `rgb(${Math.round(255 * (1 - k) + 60 * k)},${Math.round(80 + 150 * k)},${Math.round(80 + 60 * k)})`; }
    if (m.prog >= 0) a = 0.25; else if (!m.active && ov === 'modules') a = 0.35;
    x.fillStyle = '#121c25'; x.fillRect(X0, Y0, w, w);
    x.globalAlpha = a; x.fillStyle = fill; x.fillRect(X0 + 3, Y0 + 3, w - 6, w - 6); x.globalAlpha = 1;
    if (m.prog >= 0) { x.strokeStyle = m.waiting ? '#f0b44c' : '#6fd3e6'; x.setLineDash([5, 4]); x.lineWidth = 2; x.strokeRect(X0, Y0, w, w); x.setLineDash([]); const k = clamp(m.prog / ((D.work || 10) * (m.upg ? 1.2 : 1)), 0, 1); x.fillStyle = '#6fd3e6'; x.fillRect(X0, Y0 + w - 5, w * k, 5); }
    else { x.strokeStyle = PSUI.sel === m.id ? '#ffffff' : m.cond < 30 ? '#ff6a5c' : '#2f4d63'; x.lineWidth = PSUI.sel === m.id ? 3 : 1.5; x.strokeRect(X0, Y0, w, w); }
    x.fillStyle = '#05070b'; x.font = `700 ${Math.round(cs * 0.2)}px 'IBM Plex Mono', monospace`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(D.short + (m.mk === 2 ? '²' : ''), X0 + w / 2, Y0 + w / 2 - (ov === 'cond' || ov === 'build' ? cs * 0.08 : 0));
    if (ov === 'cond' && m.prog < 0) { x.font = `500 ${Math.round(cs * 0.15)}px 'IBM Plex Mono', monospace`; x.fillText(Math.round(m.cond) + '%', X0 + w / 2, Y0 + w / 2 + cs * 0.14); }
    if (m.wreck) { x.strokeStyle = '#ff6a5c'; x.lineWidth = 2; x.beginPath(); x.moveTo(X0, Y0); x.lineTo(X0 + w, Y0 + w); x.moveTo(X0 + w, Y0); x.lineTo(X0, Y0 + w); x.stroke(); }
  }
  x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.font = "500 13px 'IBM Plex Mono', monospace"; x.fillStyle = '#7d95a4';
  const leg = { modules: 'Faded = offline', power: 'Yellow generates · green powered · red dark', life: 'Teal air · blue berths · green food/medical', cond: 'Condition: green good → red failing', build: 'Dashed = under construction · amber = waiting for materials' }[ov];
  x.fillText(leg, 8, c.height - 8);
}
function psGridClick(ps) {
  const c = $('psGrid'); if (!c || !LAST_CLICK) return; const r = c.getBoundingClientRect(), { cs, h } = psGridGeom(ps, c);
  const gx = Math.floor((LAST_CLICK.clientX - r.left) * c.width / r.width / cs) - h, gy = Math.floor((LAST_CLICK.clientY - r.top) * c.height / r.height / cs) - h;
  const m = psAt(ps, gx, gy);
  if (PSUI.tab === 'build' && PSUI.pal && !m) { placeOrder(ps, PSUI.pal, gx, gy); return; }
  PSUI.sel = m ? m.id : null;
}
function psAction(act, d) {
  const ps = UI.ps; if (!ps) return false;
  if (!['psdemo', 'pssell', 'psabandon'].includes(act)) PSUI.confirm = null;
  const mod = id => ps.mods.find(m => m.id === +id);
  switch (act) {
    case 'pstab': PSUI.tab = d.id; PSUI.pal = null; return true;
    case 'psov': PSUI.overlay = d.id; return true;
    case 'psgrid': psGridClick(ps); return true;
    case 'pspal': PSUI.pal = PSUI.pal === d.id ? null : d.id; PSUI.sel = null; return true;
    case 'pstoggle': { const m = mod(d.id); if (m) m.on = !m.on; psTick(ps); return true; }
    case 'psrepair': { const m = mod(d.id); if (!m) return true; const mach = Math.ceil((100 - m.cond) / 20), cr = Math.round((100 - m.cond) * 40); if (ps.store.machinery >= mach && G.credits >= cr) { ps.store.machinery -= mach; G.credits -= cr; m.cond = 100; m.trip = 0; UI.notices = [`${PSM[m.t].name} repaired.`]; } return true; }
    case 'psupg': { const m = mod(d.id); if (!m || !G.bp.mk2) return true; const cr = Math.round(PSM[m.t].cost.cr * 0.8); if (G.credits < cr) { UI.notices = ['Not enough credits.']; return true; } G.credits -= cr; m.prog = 0; m.upg = true; m.paidMat = false; UI.notices = [`${PSM[m.t].name} queued for Mk II refit. It goes offline while the work is done.`]; return true; }
    case 'psdemo': {
      const m = mod(d.id); if (!m) return true;
      if (PSUI.confirm !== 'demo' + m.id) { PSUI.confirm = 'demo' + m.id; return true; }
      if (!connectedWithout(ps, m)) { UI.notices = ['Removing that would cut other modules off from the core.']; return true; }
      ps.mods = ps.mods.filter(x => x !== m); PSUI.sel = null;
      if (m.prog >= 0) { G.credits += PSM[m.t].cost.cr; if (m.paidMat) for (const [k, v] of Object.entries(matNeed(m.t))) ps.store[k] += v; UI.notices = ['Order cancelled and refunded.']; }
      else { for (const [k, v] of Object.entries(matNeed(m.t))) ps.store[k] += Math.floor(v * 0.4); UI.notices = [`${PSM[m.t].name} demolished. 40% of materials recovered to storage.`]; }
      psRespawn(ps); return true;
    }
    case 'pstier': { const nx = PS_TIERS[ps.tier], c = nx.cost; if (G.credits >= c.cr && ps.store.metals >= c.metals && ps.store.machinery >= c.machinery) { G.credits -= c.cr; ps.store.metals -= c.metals; ps.store.machinery -= c.machinery; ps.tier++; UI.notices = [`${ps.name} expanded to a ${nx.name}.`]; psRespawn(ps); } return true; }
    case 'psxfer': {
      if (!UI.psDocked) return true; const c = d.c;
      if (d.n === 'in') { const q = G.cargo[c] || 0; const room = Math.max(0, psStoreCap(ps) - STOREKEYS.reduce((a, k) => a + ps.store[k], 0)); const t = Math.min(q, Math.floor(room)); if (t > 0) { addCargo(c, -t); ps.store[c] += t; UI.notices = [`Unloaded ${t} t ${COMS[c].name.toLowerCase()}.${t < q ? ' Storage is full.' : ''}`]; } else UI.notices = ['Station storage is full.']; }
      else { const t = Math.min(Math.floor(ps.store[c]), cargoFree()); if (t > 0) { ps.store[c] -= t; addCargo(c, t); UI.notices = [`Loaded ${t} t ${COMS[c].name.toLowerCase()}.`]; } }
      return true;
    }
    case 'psauto': ps.settings.autosell[d.c] = !ps.settings.autosell[d.c]; return true;
    case 'psorder': ps.settings.orders[d.c] = clamp((ps.settings.orders[d.c] || 0) + +d.n, 0, 200); return true;
    case 'pshire': { const n = +d.n; if (UI.psDocked && G.credits >= 250 * n) { G.credits -= 250 * n; ps.crew += n; UI.notices = [`${n} crew signed on.`]; } return true; }
    case 'psfire': if (ps.crew > 0) ps.crew--; return true;
    case 'psset': ps.settings[d.id] = !ps.settings[d.id]; return true;
    case 'psmaint': ps.settings.maintThr = +d.id; return true;
    case 'psalert': if (d.id === 'auto') ps.auto = true; else { ps.auto = false; ps.alert = d.id; } return true;
    case 'psresearch': {
      const b = d.id, need = BP_RP[b]; let have = G.holdings.reduce((a, p) => a + p.rp, 0); if (have < need || G.bp[b]) return true;
      let left = need; for (const p of G.holdings) { const t = Math.min(p.rp, left); p.rp -= t; left -= t; }
      G.bp[b] = true; UI.notices = [`Research complete: ${b === 'mk2' ? 'Mk II upgrades' : PSM[b].name} blueprint unlocked.`]; return true;
    }
    case 'pssell': {
      if (PSUI.confirm !== 'sell') { PSUI.confirm = 'sell'; return true; }
      const v = Math.round(psValue(ps) * 0.55); G.credits += v; const e = psEntity(ps); if (e) e.dead = true;
      G.holdings = G.holdings.filter(p => p !== ps); log(`Sold ${ps.name} for ${fmt(v)} cr.`, 'gold'); closePS(); return true;
    }
    case 'psabandon': {
      if (PSUI.confirm !== 'abandon') { PSUI.confirm = 'abandon'; return true; }
      const sov = sovereign(ps.x, ps.y); if (sov) changeRep(sov, -5); const e = psEntity(ps); if (e) e.dead = true;
      G.holdings = G.holdings.filter(p => p !== ps);
      G.sites.push({ id: nid(), type: 'derelict', x: ps.x, y: ps.y, name: `Abandoned ${ps.name}`, mods: ps.mods.filter(m => m.prog < 0 && !m.wreck).map(m => ({ t: m.t, cx: m.cx, cy: m.cy, cond: Math.max(5, m.cond * 0.6) })) });
      spawnAmbushAt(ps.x, ps.y, 2); log(`You abandoned ${ps.name}. Scavengers are already circling.`, 'bad'); closePS(); return true;
    }
    case 'pstsave': { const T = loadTemplates(); T.push({ name: `${ps.name} layout ${T.length + 1}`, tier: ps.tier, mods: ps.mods.filter(m => m.t !== 'command').map(m => ({ t: m.t, cx: m.cx, cy: m.cy })) }); saveTemplates(T); UI.notices = ['Template saved. It is available to all your pilots in this browser.']; return true; }
    case 'pstdel': { const T = loadTemplates(); T.splice(+d.id, 1); saveTemplates(T); return true; }
    case 'pstcopy': { const t = loadTemplates()[+d.id]; const code = btoa(JSON.stringify(t)); PSUI.tmplCode = code; try { navigator.clipboard.writeText(code).then(() => { }, () => { }); } catch (e) { } UI.notices = ['Template code copied (it is also in the import box below).']; return true; }
    case 'pstimport': { const v = ($('tmplCode') || {}).value || ''; try { const t = JSON.parse(atob(v.trim())); if (!t.mods || !Array.isArray(t.mods)) throw 0; t.mods = t.mods.filter(m => PSM[m.t]); const T = loadTemplates(); T.push({ name: t.name || 'Imported template', tier: t.tier || 1, mods: t.mods }); saveTemplates(T); PSUI.tmplCode = ''; UI.notices = ['Template imported.']; } catch (e) { UI.notices = ["That code didn't parse. Copy it again from the Templates list."]; } return true; }
    case 'pstapply': {
      const t = loadTemplates()[+d.id]; if (!t) return true; let n = 0, skip = 0;
      const todo = t.mods.slice().sort((a, b) => (Math.abs(a.cx) + Math.abs(a.cy)) - (Math.abs(b.cx) + Math.abs(b.cy)));
      for (let pass = 0; pass < 3; pass++) for (const m of todo) { if (m.done) continue; if (psAt(ps, m.cx, m.cy)) { m.done = true; continue; } if (!canPlace(ps, m.t, m.cx, m.cy) && G.credits >= PSM[m.t].cost.cr) { placeOrder(ps, m.t, m.cx, m.cy, true); m.done = true; n++; } }
      skip = todo.filter(m => !m.done).length;
      UI.notices = [`Queued ${n} module${n === 1 ? '' : 's'} from the template.${skip ? ` ${skip} skipped (blueprint, law, frame size or credits).` : ''} Bring the materials to station storage.`]; return true;
    }
  }
  return false;
}
function closePS() { UI.ps = null; mode = 'play'; $('dock').hidden = true; $('hud').hidden = false; lastW = lastM = ''; updateHUD(); }

// ── Holdings tab at faction stations: property market, licenses, blueprints, shares ──
function siteTags(s) { const e = psEnv({ x: s.x, y: s.y, site: s.type === 'asteroid' ? 'asteroid' : s.site }); return [e.belt ? 'asteroid field' : 'deep space', e.nearStar ? 'near the star' : '', e.fringe ? 'Fringe' : ''].filter(Boolean).join(' · '); }
function tabHoldings(st) {
  const f = st.fac, lc = licenseCost(f);
  let h = `<div class="cols"><div style="min-width:0"><div class="sec">${FACTIONS[f].short} building license</div>`;
  h += G.licenses[f] ? `<p style="color:var(--good);margin:0">You hold a ${FACTIONS[f].name} license. You can claim and buy property in their space.</p>`
    : lc === null ? `<p style="color:var(--danger);margin:0">They won't license a pilot they consider hostile.</p>`
      : `<div class="item"><div><div class="nm">License to build in ${FACTIONS[f].name} space</div><div class="ds">${lc === 0 ? 'Waived: you have done storyline work for them.' : G.rep[f] < 0 ? 'Includes a bribe, given your standing.' : G.rep[f] < 10 ? 'Standard fee. Cheaper at Favorable standing.' : 'Discounted for a trusted pilot.'} Tax ${Math.round(FAC_LAW[f].tax * 100)}%. ${FAC_LAW[f].note}</div></div><button class="primary" data-act="hlicense" ${G.credits < lc ? 'disabled' : ''}>${lc ? fmt(lc) + ' cr' : 'Claim free'}</button></div>`;
  const shop = BP_SHOP[f] || [];
  h += `<div class="sec">Blueprints sold here</div><div class="list" style="gap:2px">${shop.map(b => `<div class="item"><div><div class="nm">${b === 'mk2' ? 'Mk II module upgrades' : PSM[b].name}</div><div class="ds">${b === 'mk2' ? '+50% output on any upgraded module.' : PSM[b].desc}</div></div>${G.bp[b] ? '<span class="tag" style="color:var(--good);border-color:var(--good)">OWNED</span>' : `<button data-act="hbp" data-id="${b}" ${G.credits < itemPrice(st, BP_PRICE[b]) || G.rep[f] < 0 ? 'disabled' : ''}>${G.rep[f] < 0 ? 'Need neutral standing' : fmt(itemPrice(st, BP_PRICE[b])) + ' cr'}</button>`}</div>`).join('')}</div>`;
  h += `<div class="sec">Your holdings</div>${G.holdings.length ? '<div class="list" style="gap:2px">' + G.holdings.map(p => `<div class="item"><div><div class="nm">${esc(p.name)}</div><div class="ds">${PS_TIERS[p.tier - 1].name} · ${p.crew} crew · ${p.lastPL ? (p.lastPL.net >= 0 ? '+' : '') + fmt(p.lastPL.net) + ' cr last minute' : 'no report yet'}${p.alerts.some(a => a[0] === 'bad') ? ' · <span style="color:var(--danger)">ALERT</span>' : ''}</div></div><button data-act="hmanage" data-id="${p.id}">Manage remotely</button></div>`).join('') + '</div>' : '<p style="color:var(--dim);margin:0">None yet.</p>'}`;
  // shares (old stakes)
  if (st.prod.length) { const k = G.stakes[st.id], lvl = k ? k.lvl : 0; h += `<div class="sec">Industry shares</div><div class="item"><div><div class="nm">${lvl ? 'Level ' + lvl + ' stake' : 'No stake'} in ${esc(st.name)}</div><div class="ds">Pays ${fmt(stakeIncome(st.id))} cr/min now. Seized if the station changes hands.</div></div><div class="btns">${lvl < 3 ? `<button data-act="stake" ${G.credits < stakeCost(st) ? 'disabled' : ''}>Buy · ${fmt(stakeCost(st))}</button>` : ''}${lvl ? `<button class="warn" data-act="unstake">Sell</button>` : ''}</div></div>`; }
  h += `</div><div style="min-width:0"><div class="sec">Property market</div><p style="color:var(--dim);font-size:12px;margin:0 0 6px">Stations for sale can be bought from here. Asteroid claims and derelicts must be claimed on site: fly there and press F. Property in faction space needs that faction's license.</p><div class="list">`;
  const sites = G.sites.slice().sort((a, b) => (a.type === 'sale' ? 0 : a.type === 'derelict' ? 1 : 2) - (b.type === 'sale' ? 0 : b.type === 'derelict' ? 1 : 2));
  for (const s of sites) {
    const sov = sovereign(s.x, s.y), lic = !sov || G.licenses[sov];
    const kind = s.type === 'sale' ? (s.auction ? 'Auction' : `For sale by ${s.owner}`) : s.type === 'derelict' ? 'Derelict station · salvage claim' : 'Asteroid claim';
    let meta = `<span>${regionName(s.x, s.y)}</span><span>${siteTags(s)}</span><span style="color:${sov ? FACTIONS[sov].color : 'var(--dim)'}">${sov ? FACTIONS[sov].short + ' space' : 'unclaimed space'}${sov && !lic ? ' · license needed' : ''}</span>`;
    if (s.mods) meta += `<span>${s.mods.length} modules · avg ${Math.round(s.mods.reduce((a, m) => a + m.cond, 0) / s.mods.length)}% condition</span>`;
    if (s.crew) meta += `<span>${s.crew} crew</span>`;
    const btn = s.type === 'sale' ? `<button class="primary" data-act="hbuy" data-id="${s.id}" ${G.credits < s.price || !lic ? 'disabled' : ''}>${!lic ? 'License needed' : 'Buy · ' + fmt(s.price) + ' cr'}</button>` : `<span class="mono" style="font-size:11px;color:var(--amber)">Claim on site · ${s.type === 'derelict' ? '6,000' : '8,000'} cr</span>`;
    h += `<div class="card"><h4>${esc(s.name)} <span style="color:var(--dim);font-weight:400;font-size:12px">${kind}</span></h4>${s.mods ? `<p style="font-size:12px">${s.mods.map(m => PSM[m.t].name).join(', ')}</p>` : ''}<div class="meta">${meta}</div><div>${btn}</div></div>`;
  }
  if (!sites.length) h += '<p style="color:var(--dim)">Nothing on the market right now.</p>';
  return h + '</div></div></div>';
}
function holdAction(act, d, st) {
  switch (act) {
    case 'hlicense': { const c = licenseCost(st.fac); if (c !== null && G.credits >= c) { G.credits -= c; G.licenses[st.fac] = true; UI.notices = [`Licensed to build in ${FACTIONS[st.fac].name} space.`]; } return true; }
    case 'hbp': { const b = d.id, c = itemPrice(st, BP_PRICE[b]); if (!G.bp[b] && G.credits >= c && G.rep[st.fac] >= 0) { G.credits -= c; G.bp[b] = true; UI.notices = [`Blueprint acquired: ${b === 'mk2' ? 'Mk II upgrades' : PSM[b].name}.`]; } return true; }
    case 'hmanage': { const ps = psById(+d.id); if (ps) { UI.returnSt = st; openPS(ps, false); } return 'stop'; }
    case 'hbuy': {
      const s = G.sites.find(x => x.id === +d.id); if (!s) return true; const sov = sovereign(s.x, s.y);
      if (sov && !G.licenses[sov]) return true; if (G.credits < s.price) return true;
      G.credits -= s.price; G.sites = G.sites.filter(x => x !== s);
      const ps = newStation(s, s.name, s.mods, s.crew); ps.store.food = 60; ps.store.machinery = 15; ps.store.metals = 20;
      UI.notices = [`You now own ${s.name}. Manage it from the Holdings tab or by docking there.`]; log(`Purchase complete: ${s.name} is yours.`, 'gold'); return true;
    }
  }
  return false;
}
function auctionTick(mins) {
  for (const s of [...G.sites]) if (s.type === 'sale' && s.auction) {
    s.price = Math.round(s.price * Math.pow(0.97, mins) / 100) * 100;
    if (s.price < siteValue(s) * 0.6) { G.sites = G.sites.filter(x => x !== s); recordNews(`Auction closed: ${s.name} sold to ${pick(NPC_OWNERS)}.`, 'gold'); }
  }
  if (G.sites.filter(s => s.type === 'sale').length < 2 && Math.random() < 0.05 * mins) { const p = randomPoint(3000); if (farFromAll(p.x, p.y, 2600)) { const mods = randomModsFor(randi(5, 8), 'deep').map(m => ({ ...m, cond: randi(45, 90) })); const s = { id: nid(), type: 'sale', site: 'deep', belt: null, x: p.x, y: p.y, owner: pick(NPC_OWNERS), name: pick(['Ridgeline', 'Quietwater', 'Harrow Point', 'Low Lantern', 'Cobalt Rest', 'Thistle Yard', 'Gannet', 'Veil']) + ' Platform', mods, crew: randi(5, 10), auction: Math.random() < 0.3 }; s.price = Math.round(siteValue(s) * (s.auction ? 1.25 : 1.1) / 100) * 100; G.sites.push(s); recordNews(`Property: ${s.name} is ${s.auction ? 'up for auction' : 'for sale'} near ${regionName(s.x, s.y)}.`, 'gold'); } }
}
function relayTick() {
  const net = G.holdings.filter(p => psCount(p, 'relay', true)); if (net.length < 2) return;
  for (const c of ['food', 'volatiles', 'machinery', 'medicine']) { const tot = net.reduce((a, p) => a + p.store[c], 0), each = tot / net.length; for (const p of net) p.store[c] = each; }
}
function holdingsMinute(mins = 1) { if (!G.holdings) return; let net = 0; for (const ps of G.holdings) net += psMinute(ps, mins) || 0; relayTick(); auctionTick(mins); return net; }
function holdingsTick() { if (!G.holdings) return; for (const ps of G.holdings) psTick(ps); }

function holdingsHUD() {
  if (!G.holdings || !G.holdings.length) return '';
  const rows = G.holdings.filter(p => p.alerts.some(a => a[0] === 'bad'));
  if (!rows.length) return '';
  return '<div class="h" style="margin-top:4px">Holdings</div>' + rows.slice(0, 3).map(p => `<div class="m"><b style="color:#ffb3a9">${esc(p.name)}</b><span>${esc(p.alerts.find(a => a[0] === 'bad')[1])}</span></div>`).join('');
}
