
// ───────────────────────── Station captains ─────────────────────────
const CAPTAINS = {
  meridian: { name: 'Commander Ilse Varrow', title: 'Station Commander',
    look: { skin: '#e0b08a', hair: '#2a2622', style: 'bun', eyes: '#3b6fa0', acc: 'earpiece', coat: '#28456a' },
    cold: 'State your business and keep it short.', neutral: "Meridian Hold control. You're cleared to dock, freelancer.", warm: 'Good to see a reliable hull. The Directorate remembers its friends.',
    need: "Quartermaster says we're down to {n} tons of {c}. That's a problem I'd like solved.", fine: 'Supply is holding. For once.',
    surplus: "We're sitting on too much {c}. Take it off our hands.", work: 'Contracts are posted. The Directorate pays on time.',
    hunt: 'Every raider you burn is one less report on my desk.', refit: "Our armory stocks Directorate-standard hardware. Don't ask for anything fancy.",
    yard: 'The yards can turn out a Talon or a Halberd if your credit is good.', noyard: '', service: 'Dock crews are standing by.',
    lore: "Meridian Hold is the Directorate's last real fortress in the Drift. We keep the lanes open and the paperwork moving. Mostly the paperwork.", bye: 'Fly straight.' },
  lantern: { name: 'Factor Odessa Quill', title: 'Chief Factor',
    look: { skin: '#8d5a3b', hair: '#e2c97e', style: 'long', eyes: '#4a2e1c', acc: 'monocle', coat: '#6b5520' },
    cold: "Your credit is good. Your reputation isn't. Be quick.", neutral: 'Welcome to the Exchange. Everything here has a price, including advice.', warm: 'My favorite hauler! Sit, sit. Let me show you the ledgers.',
    need: 'Between us, we have only {n} tons of {c} left. I will pay handsomely, and I never say that.', fine: 'The ledgers balance. It makes me nervous.',
    surplus: '{c} is practically falling off the shelves. Buy low, darling.', work: 'Contracts, contracts. Every one of them is profitable for somebody.',
    hunt: 'Pirates are bad for business. Bounties are very good for business.', refit: 'Our armory carries quality energy weapons and the finest cargo holds.',
    yard: "The Exchange yard sells Mules, Wrens and Skiffs. Practical hulls for practical people.", noyard: '', service: 'Repairs are billed by the hour. The hours are short.',
    lore: 'Lantern Exchange sets the price of nearly everything in the Drift. Veyra keeps the markets open because a closed market makes nobody rich.', bye: 'May your margins be wide.' },
  greenhaven: { name: 'Steward Bram Holloway', title: 'Harvest Steward',
    look: { skin: '#d39a74', hair: '#8a5a2e', style: 'short', beard: true, eyes: '#3d5a2e', coat: '#4d6b3a' },
    cold: "Folks here don't trust you much. Mind yourself.", neutral: 'Welcome to Greenhaven. Wipe your boots, the hydroponics are sensitive.', warm: 'There you are! Come in, the soy-bread is fresh.',
    need: "We're near out of {c}, only {n} tons. The growers can't keep going without it.", fine: 'Harvest is good and the stores are full. Small mercies.',
    surplus: "The silos are bursting with {c}. Take some before it spoils.", work: 'I posted what we need. Honest work for honest pay.',
    hunt: 'Raiders keep hitting the grain haulers. If you can stop them, the whole Drift eats better.', refit: "Our armory is small. Farmers don't need much, until they do.",
    yard: '', noyard: "We don't build ships here. Lantern Exchange or Meridian Hold will sort you out.", service: 'Our mechanics are better with harvesters than warships, but they try.',
    lore: 'Greenhaven feeds half the Drift. Without our food the forges at Cinder go cold and the Directorate starves in its towers.', bye: 'Safe travels, friend.' },
  cinder: { name: 'Ember-Abbot Saro Venn', title: 'Keeper of the Forge',
    look: { skin: '#b07a58', style: 'hood', hood: '#3a1a14', eyes: '#ff9a3d', acc: 'scar', coat: '#5a2416' },
    cold: 'The flame tolerates you. Barely.', neutral: 'Walk in the light of the dying star, traveler. Trade if you must.', warm: 'Kindled one. The Covenant has been waiting for you.',
    need: 'The forge-crews burn for want of {c}. Only {n} tons remain. Bring more and be blessed.', fine: 'The forges are fed. The rite continues.',
    surplus: 'The forge has made more {c} than the faithful need. Take it.', work: 'The Covenant asks, and the Covenant rewards.',
    hunt: 'Those who befoul the sun-lanes deserve the fire.', refit: 'Our weapons are forged in starlight. Heavy beams. Torpedoes. Faith made solid.',
    yard: 'We build Talons for the faithful, and Skiffs for the hasty.', noyard: '', service: 'Our smiths will mend your hull.',
    lore: "Cinder Spire draws plasma from the sun itself. The Concord calls us zealots. They are correct, and it makes us very good at what we do.", bye: 'Go in flame.' },
  deepcut: { name: 'Foreman Tuck Marrin', title: 'Refinery Foreman',
    look: { skin: '#c58c64', hair: '#5a5a5a', style: 'bald', beard: true, eyes: '#2e2e2e', acc: 'goggles', coat: '#3d5a3a' },
    cold: "Don't touch anything. Don't break anything. What do you want?", neutral: "Deepcut. Mind the slag chutes.", warm: 'Hey, it\'s our favorite rock-hauler. Coffee\'s terrible, have some.',
    need: 'Smelters are starving. {n} tons of {c} left. Bring me more.', fine: 'Smelters are fed. Line is moving.',
    surplus: "Got a mountain of {c} in the yard. Make me an offer.", work: 'Jobs on the board. Mostly hauling rocks. Sometimes shooting at people who steal rocks.',
    hunt: 'Pirates steal our ore. You shoot pirates. We get along.', refit: 'Mining gear, drills, refineries. Built to last.',
    yard: 'We\'ve got Mules and Wrens. Nothing fancy. Nothing that breaks.', noyard: '', service: 'We patch hulls all day. Yours is no different.',
    lore: "Deepcut turns rock into metal. Every hull in the Drift has some of our steel in it. Nobody says thank you.", bye: 'Don\'t get holed.' },
  rook: { name: 'Chief Nell Ostrander', title: 'Prospector Chief',
    look: { skin: '#e8c0a0', hair: '#c4492e', style: 'mohawk', eyes: '#2f6b4a', acc: 'eyepatch', coat: '#355a40' },
    cold: "You've got some nerve showing up here.", neutral: "Rook's Hollow. We dig, we sell, we don't ask questions.", warm: 'Ha! Look who it is. Pull up a crate.',
    need: "We're down to {n} tons of {c}. Out here that's a real problem.", fine: 'Got what we need for now. Feels weird.',
    surplus: "Got more {c} than we can move. Cheap, if you're buying.", work: "Board's posted. Out here everything's a job.",
    hunt: "Raiders squat in the belt and jump our claims. Feel free to ruin their day.", refit: 'Mining lasers, scatter guns, extra magazines. Frontier basics.',
    yard: '', noyard: 'No yard here, rock-rat. Deepcut has Mules. Meridian has warships.', service: 'Repairs are cheap. Our welders are not gentle.',
    lore: "Rook's Hollow is the first rock you hit coming out of the belt. Everything here started as a claim marker and a bad idea.", bye: 'Watch the rocks.' },
  vigil: { name: 'Warden Caius Fenn', title: 'Frontier Warden',
    look: { skin: '#6e4a35', hair: '#cfcfcf', style: 'short', beard: true, eyes: '#3a3a3a', acc: 'visor', coat: '#2a3d5c' },
    cold: "I've read your file. Don't make me add to it.", neutral: "Vigil Station. Edge of the map, edge of the law.", warm: "Good. Someone I can count on. Come in.",
    need: 'Resupply is late again. {n} tons of {c} to last the month. Help us out.', fine: 'Stores are full. First time this year.',
    surplus: "We've got spare {c}. Take it. We're short on everything else.", work: "Frontier work. It's dangerous, and it pays like it.",
    hunt: "Blackmaw raiders pass through here constantly. I'll sign every bounty you bring me.", refit: 'Missiles and heavy rails. Out here you fight at range.',
    yard: 'We can fit you with a Wren or a Talon. Military surplus.', noyard: '', service: "Our docks have seen worse than your hull. Probably.",
    lore: 'Vigil Station watches the far reach. Most people out here are running from something. I try not to ask what.', bye: "Keep your shields up." },
};

const PORTRAITS = {};
function shadeHex(hex, f) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const k = v => clamp(Math.round(v * f), 0, 255);
  return `rgb(${k(r)},${k(g)},${k(b)})`;
}
function makePortrait(id, L, fc) {
  if (PORTRAITS[id]) return PORTRAITS[id];
  const W = 24, H = 28, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const px = (i, j, col) => { x.fillStyle = col; x.fillRect(i, j, 1, 1); };
  const cx = 11.5, cy = 12, rx = 5.6, ry = 7;
  const inHead = (i, j, a = 0, b = 0) => ((i + 0.5 - cx) / (rx + a)) ** 2 + ((j + 0.5 - cy) / (ry + b)) ** 2 <= 1;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) px(i, j, j < 4 ? '#0c141c' : (i + j) % 2 ? '#0e1822' : '#101b26');
  x.globalAlpha = 0.16; x.fillStyle = fc; x.fillRect(0, 0, W, H); x.globalAlpha = 1;
  const hair = L.hair || '#222', hood = L.hood;
  // hood or long hair behind head
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    if (L.style === 'hood' && (inHead(i, j, 2.4, 2.2) || (j > cy && j < 22 && Math.abs(i + 0.5 - cx) < rx + 2.4))) px(i, j, hood);
    if (L.style === 'long' && (inHead(i, j, 1.6, 1.2) || (j >= cy && j < cy + 9 && Math.abs(i + 0.5 - cx) <= rx + 1.6))) px(i, j, shadeHex(hair, 0.8));
  }
  // body
  for (let j = 20; j < H; j++) { const hw = 6 + (j - 20) * 0.9; for (let i = 0; i < W; i++) if (Math.abs(i + 0.5 - 12) <= hw) px(i, j, shadeHex(L.coat, i < 12 ? 1 : 0.75)); }
  for (let j = 20; j < 24; j++) for (let i = 0; i < W; i++) if (Math.abs(i + 0.5 - 12) < 2.6 - (j - 20) * 0.6) px(i, j, '#15191e');
  px(16, 23, fc); px(17, 23, fc); px(16, 24, shadeHex(fc.length === 7 ? fc : '#888888', 0.7));
  for (let j = 21; j < H; j++) px(12, j, shadeHex(L.coat, 0.55));
  // neck
  for (let j = 17; j < 21; j++) for (let i = 10; i < 14; i++) px(i, j, shadeHex(L.skin, 0.78));
  // ears
  if (L.style !== 'hood' && L.style !== 'long') { px(5, 12, shadeHex(L.skin, 0.85)); px(5, 13, shadeHex(L.skin, 0.75)); px(18, 12, shadeHex(L.skin, 0.75)); px(18, 13, shadeHex(L.skin, 0.65)); }
  // head
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (inHead(i, j)) {
    let f = 1; if (i + 0.5 > cx + 2.5) f = 0.84; if (j > cy + 4) f *= 0.92; if (i + 0.5 < cx - 3.5 && j < cy) f = 1.06;
    px(i, j, shadeHex(L.skin, f));
  }
  // hair on top
  const top = (i, j) => inHead(i, j, 0.8, 0.8) && (j + 0.5 < cy - 2.6 || (j + 0.5 < cy + 1 && Math.abs(i + 0.5 - cx) > rx - 1.2));
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    if ((L.style === 'short' || L.style === 'bun' || L.style === 'long') && top(i, j)) px(i, j, (i + j) % 3 ? hair : shadeHex(hair, 1.2));
    if (L.style === 'bun' && (i + 0.5 - cx) ** 2 + (j + 0.5 - (cy - 8.2)) ** 2 < 5.5) px(i, j, shadeHex(hair, 0.9));
    if (L.style === 'mohawk') { if (Math.abs(i + 0.5 - cx) < 1.6 && j >= cy - 10 && j < cy - 2 && (inHead(i, j, 1.5, 3) )) px(i, j, (j % 2) ? hair : shadeHex(hair, 1.25)); else if (inHead(i, j) && j + 0.5 < cy - 2.6) px(i, j, shadeHex(L.skin, 0.8)); }
    if (L.style === 'hood' && inHead(i, j, 1.4, 1.4) && !inHead(i, j, -0.6, -0.2) && j < cy + 3) px(i, j, shadeHex(hood, 1.5));
    if (L.style === 'hood' && inHead(i, j) && j + 0.5 < cy - 4) px(i, j, shadeHex(hood, 1.2));
  }
  if (L.style === 'bald') { px(9, 6, shadeHex(L.skin, 1.18)); px(10, 6, shadeHex(L.skin, 1.12)); }
  // beard
  if (L.beard) for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (inHead(i, j, 0.3, 0.6) && (j >= 15 || (j >= 13 && Math.abs(i + 0.5 - cx) > 3.6))) px(i, j, (i + j) % 2 ? hair : shadeHex(hair, 0.85));
  // face
  const browC = L.style === 'hood' ? '#2a1a14' : shadeHex(hair, 0.8);
  px(8, 10, browC); px(9, 10, browC); px(14, 10, browC); px(15, 10, browC);
  px(8, 12, '#e8e4dc'); px(9, 12, L.eyes); px(14, 12, L.eyes); px(15, 12, '#d8d4cc');
  px(12, 14, shadeHex(L.skin, 0.78)); px(12, 15, shadeHex(L.skin, 0.7)); px(11, 15, shadeHex(L.skin, 0.88));
  for (let i = 10; i < 14; i++) px(i, 17, i === 10 || i === 13 ? '#6a3a33' : '#8a4a40');
  // accessories
  const A = L.acc;
  if (A === 'visor') { for (let i = 7; i < 17; i++) { px(i, 11, '#b8f6ff'); px(i, 12, '#4fd0e6'); } px(6, 11, '#2a3a46'); px(6, 12, '#2a3a46'); px(17, 11, '#2a3a46'); px(17, 12, '#2a3a46'); }
  if (A === 'eyepatch') { [[14, 11], [15, 11], [14, 12], [15, 12], [14, 13]].forEach(p => px(p[0], p[1], '#111')); px(16, 10, '#222'); px(17, 9, '#222'); [[13, 10], [12, 10], [11, 9], [10, 9], [9, 8], [8, 8]].forEach(p => px(p[0], p[1], '#222')); }
  if (A === 'scar') { [[8, 9], [9, 11], [9, 13], [10, 14]].forEach(p => px(p[0], p[1], '#c27a70')); }
  if (A === 'goggles') { for (let i = 6; i < 18; i++) { px(i, 7, '#4a3a28'); px(i, 8, '#5a4630'); } [[8, 7], [9, 7], [8, 8], [9, 8], [14, 7], [15, 7], [14, 8], [15, 8]].forEach(p => px(p[0], p[1], '#e0b04c')); px(9, 7, '#fff1c4'); px(15, 7, '#fff1c4'); }
  if (A === 'earpiece') { px(4, 11, '#2a3a46'); px(5, 11, '#6fd3e6'); px(5, 12, '#6fd3e6'); px(5, 13, '#2a3a46'); }
  if (A === 'monocle') { [[13, 11], [16, 11], [13, 13], [16, 13], [14, 10], [15, 10], [14, 14], [15, 14]].forEach(p => px(p[0], p[1], '#e0b04c')); px(16, 15, '#a07a30'); px(16, 16, '#a07a30'); }
  PORTRAITS[id] = c; c.url = c.toDataURL(); return c;
}
function needsSummary(st) {
  const ns = stationNeeds(st);
  const short = ns.filter(n => n.r < 0.6).slice(0, 3), sur = ns.filter(n => n.r > 1.3).reverse().slice(0, 3);
  const nm = n => `${COMS[n.c].name.toLowerCase()} (${n.stock} t)`;
  let s = short.length ? `We're short on ${short.map(nm).join(', ')}.` : "Nothing's running low right now.";
  s += sur.length ? ` We've got plenty of ${sur.map(nm).join(', ')}.` : '';
  return s + ' The emptier the shelf, the more I pay.';
}

// Captains for stations that changed hands in a war.
const FAC_VOICE = {
  concord: { title: 'Occupation Governor', names: ['Governor Ines Halloran', 'Major Dov Achterberg', 'Captain Rhea Solberg'], coat: '#28456a',
    cold: 'This station is under Directorate administration. Keep your hands where I can see them.', neutral: 'Directorate administration. Papers in order? Good.', warm: 'A friend of the Directorate. Welcome aboard.',
    need: 'Supply lines are still a mess after the handover. {n} tons of {c} left.', fine: 'Supply is stable under new management.', surplus: 'Excess {c} in the stores. Buy it.',
    work: 'The Directorate has work posted.', hunt: 'Bounties are honored here, same as anywhere under Concord law.', refit: 'Standard-issue hardware only.', yard: 'The yard builds Directorate hulls now.', noyard: 'No yard here.', service: 'Crews standing by.', bye: 'Fly straight.' },
  veyra: { title: 'Acting Factor', names: ['Factor Lio Brandt', 'Factor Seva Marchetti', 'Factor Emeka Hale'], coat: '#6b5520',
    cold: "We don't care who you shot. We care that you pay.", neutral: 'Under Mercantile management, everything is open for business.', warm: 'A valued partner! Come in.',
    need: "We're thin on {c}: {n} tons. Bring some and name your price.", fine: 'The books balance.', surplus: 'Plenty of {c}. Make an offer.',
    work: 'Contracts posted.', hunt: 'Bounties keep the lanes clear and the prices low.', refit: 'Quality goods, fair prices.', yard: 'The yard now sells Mercantile hulls.', noyard: 'No yard here.', service: 'Repairs are billed fairly.', bye: 'Profitable travels.' },
  ashen: { title: 'Forge-Warden', names: ['Forge-Warden Cael Ostrava', 'Ember-Sister Iona Vey', 'Forge-Warden Tamsin Holt'], coat: '#5a2416',
    cold: 'The Covenant holds this place now. Do not test us.', neutral: 'This station burns for the Covenant now. Trade, if you must.', warm: 'Kindled one. The Covenant welcomes you to its newest hearth.',
    need: 'The new forge-crews want {c}. Only {n} tons remain.', fine: 'The hearth is fed.', surplus: 'More {c} than the faithful need. Take it.',
    work: 'The Covenant asks, and rewards.', hunt: 'Burn the raiders.', refit: 'Forged in starlight.', yard: 'The yard builds Covenant hulls now.', noyard: 'No yard here.', service: 'Our smiths will mend you.', bye: 'Go in flame.' },
  tessel: { title: 'Claim Boss', names: ['Boss Hendrik Varga', 'Boss Ama Kowalczyk', 'Boss Jory Teague'], coat: '#3d5a3a',
    cold: "New management. Same rules: don't break anything.", neutral: 'Free Miners run this rock now. Mind the dust.', warm: 'Good hauler! Come on in.',
    need: 'Running low on {c}. {n} tons left.', fine: 'Got what we need.', surplus: 'Too much {c}. Cheap.',
    work: 'Board is posted.', hunt: 'Pirates steal ore. Shoot pirates.', refit: 'Mining gear and basics.', yard: 'We sell Mules and Wrens here now.', noyard: 'No yard here.', service: 'Welders are on shift.', bye: "Don't get holed." },
};
const LOOK_SKIN = ['#e8c0a0', '#e0b08a', '#d39a74', '#c58c64', '#b07a58', '#8d5a3b', '#6e4a35'];
const LOOK_HAIR = ['#2a2622', '#5a3a22', '#8a5a2e', '#c4492e', '#e2c97e', '#cfcfcf', '#3a3a48', '#6b2f4a'];
const LOOK_EYES = ['#3b6fa0', '#3d5a2e', '#4a2e1c', '#2e2e2e', '#6a4a8a', '#2f6b4a'];
function randomLook(coat) {
  return { skin: pick(LOOK_SKIN), hair: pick(LOOK_HAIR), style: pick(['short', 'short', 'long', 'bun', 'mohawk', 'bald', 'hood']), beard: Math.random() < 0.3,
    eyes: pick(LOOK_EYES), acc: pick([null, null, null, 'visor', 'scar', 'eyepatch', 'goggles', 'earpiece', 'monocle']), coat, hood: pick(['#2a2030', '#3a1a14', '#1d2a3a']) };
}
function genCaptain(fac) { const V = FAC_VOICE[fac]; return { name: pick(V.names), look: randomLook(V.coat) }; }
function capKey(st) { return st.fac === (st.origFac || st.fac) ? st.id : st.id + '_' + st.fac; }
function captainOf(st) {
  if (!st.origFac || st.fac === st.origFac) return { ...CAPTAINS[st.id], key: st.id };
  const k = capKey(st); if (!G.capt[k]) G.capt[k] = genCaptain(st.fac);
  const V = FAC_VOICE[st.fac];
  return { ...V, ...G.capt[k], title: V.title, key: k, lore: `${st.name} belongs to the ${FACTIONS[st.fac].name} now. Until recently it answered to the ${FACTIONS[st.origFac].name}, and plenty of the crew still do.` };
}
function captainCanvas(st) { const C = captainOf(st); return makePortrait('cap_' + C.key, C.look, FACTIONS[st.fac].color); }
function capLine(st, key) {
  const C = captainOf(st); const needs = stationNeeds(st);
  if (key === 'need') { const n = needs[0]; return n.r < 0.6 ? C.need.replace('{c}', COMS[n.c].name.toLowerCase()).replace('{n}', n.stock) : C.fine; }
  if (key === 'surplus') { const s = needs[needs.length - 1]; return s.r > 1.3 ? C.surplus.replace('{c}', COMS[s.c].name.toLowerCase()) : ''; }
  if (key === 'greet') { const v = G.rep[st.fac]; return v < 0 ? C.cold : v >= 15 ? C.warm : C.neutral; }
  if (key === 'yard') return st.yard.length ? C.yard : (C.noyard || 'No shipyard here.');
  if (key === 'port') return 'Haulers come and go all day. Some will trade with you directly, and all of them gossip.';
  if (key === 'fleet') return 'Need hulls or crew? Good officers are hard to find. Keep them alive.';
  if (key === 'pilot') return "A pilot's record follows them everywhere in the Drift.";
  if (key === 'invest') return `Want a place of your own? You'll need our license to build in ${FACTIONS[st.fac].short} space, and the right blueprints.`;
  return C[key] || '';
}
function portraitImg(st, cls) { const c = captainCanvas(st); return `<img class="${cls}" src="${c.url}" alt="Portrait of ${esc(captainOf(st).name)}" width="24" height="28">`; }
function capBar(st, tab) {
  const C = captainOf(st);
  const line = tab === 'market' ? [capLine(st, 'need'), capLine(st, 'surplus')].filter(Boolean).join(' ')
    : capLine(st, { port: 'port', contracts: 'work', bounties: 'hunt', refit: 'refit', shipyard: 'yard', services: 'service', fleet: 'fleet', pilot: 'pilot', invest: 'invest' }[tab] || 'fine');
  return `<div class="capbar">${portraitImg(st, 'cap-sm')}<div style="min-width:0"><div class="who" style="color:${FACTIONS[st.fac].color}">${esc(C.name)}</div><div class="say">“${esc(line)}”</div></div><button data-act="tab" data-id="talk">Talk</button></div>`;
}

// ── Captain memory ──
function memOf(k) { return G.mem[k] || (G.mem[k] = { favors: 0, slights: 0, notes: [] }); }
function remember(target, kind, note) {
  if (!target || !G) return;
  const keys = STN[target] ? [capKey(STN[target])] : STATIONS.filter(s => s.fac === target).map(capKey);
  for (const k of keys) {
    const M = memOf(k);
    if (kind === 'favor') M.favors++;
    else { M.slights++; if (note && !M.notes.includes(note)) { M.notes.push(note); if (M.notes.length > 5) M.notes.splice(M.notes.findIndex(n => !n.startsWith('!')), 1); } }
  }
}
function memoryLine(st) {
  const M = G.mem[capKey(st)]; if (!M) return '';
  const b = M.notes.find(n => n.startsWith('!')); if (b) return b.slice(1);
  const last = M.notes.filter(n => !n.startsWith('!')).pop();
  if (M.slights >= 3 && M.slights > M.favors) return `That's ${M.slights} marks against your name here. ${last || ''}`.trim();
  if (M.favors >= 3) return `You've done ${M.favors} jobs for this station. That counts for something with me.`;
  if (M.slights >= 1 && last) return `I haven't forgotten. ${last}`;
  return '';
}

// ── Personal requests that conflict with each other ──
const DILEMMAS = [
  { id: 'vigil', sides: {
    a: { st: 'cinder', title: 'Embers for the Faithful', kind: 'drop', com: 'weapons', qty: 15, at: () => ({ x: STN.vigil.x + 2300, y: STN.vigil.y + 1700 }), reward: 13000, rep: 10, fx: { rep: { concord: -8 } },
      ask: 'A personal matter, kindled one. There are faithful hiding near Vigil Station. They need arms. Bring them 15 tons, and the Directorate must never know.',
      betray: "!You armed the Covenant's agitators on my doorstep. I know it was you. Don't expect favors here." },
    b: { st: 'vigil', title: 'The Runner Mirel', kind: 'bounty', at: () => ({ x: STN.vigil.x + 1900, y: STN.vigil.y + 1300 }), leader: ['wren', 'ashen', 'Ash-Sister Mirel'], fleet: [['skiff', 'ashen']], reward: 9500, rep: 10, fx: { rep: { ashen: -10 } },
      ask: "Off the record: the Covenant is running guns to agitators near my station. Their runner flies a Wren and calls herself Ash-Sister Mirel. Stop her before the guns land.",
      betray: '!Mirel burned because of you. The flame remembers, and so do I.' } } },
  { id: 'grain', sides: {
    a: { st: 'greenhaven', title: 'Harvester Overhaul', kind: 'procure', com: 'machinery', qty: 25, dest: 'greenhaven', reward: 7000, rep: 8, fx: { boost: ['greenhaven', 'food', 1.6] },
      ask: "The harvesters are breaking down faster than we can fix them. Factor Quill won't fund repairs. She says scarcity is good for prices. Bring me 25 tons of machinery and we'll prove her wrong.",
      betray: "!You bankrolled Holloway's harvest miracle. Food prices are in the gutter, darling. I won't forget it." },
    b: { st: 'lantern', title: 'An Unfortunate Accident', kind: 'bounty', at: () => ({ x: STN.greenhaven.x + 1500, y: STN.greenhaven.y - 900 }), leader: ['mule', 'veyra', 'Harvest Barge Ceres'], fleet: [], reward: 16000, rep: 6, fx: { boost: ['greenhaven', 'food', 0.6], crash: ['greenhaven', 'food'] },
      ask: "Something delicate. Greenhaven's new harvest barge is about to flood the market with cheap food. If it met with an accident, I'd be very grateful. Very.",
      betray: '!Somebody gutted our harvest barge. Folks here say it was you. Don\'t expect a warm meal at Greenhaven.' } } },
  { id: 'claim', sides: {
    a: { st: 'rook', title: 'Drone Down', kind: 'bounty', at: () => ({ x: STN.rook.x - 2000, y: STN.rook.y + 1600 }), leader: ['wren', 'tessel', 'Survey Drone K-7'], fleet: [], reward: 8500, rep: 8, fx: {},
      ask: "Deepcut's survey drone keeps re-tagging our claims as theirs. Shoot it down. Marrin will howl. Let him.",
      betray: '!You shot down my survey drone. Months of claim data, gone. We are not friends.' },
    b: { st: 'deepcut', title: 'The Assay', kind: 'procure', com: 'volatiles', qty: 20, dest: 'deepcut', reward: 8000, rep: 8, fx: {},
      ask: 'Ostrander thinks she owns the whole belt. Bring me 20 tons of volatiles and I can file the assay that proves otherwise.',
      betray: '!You helped Marrin steal our claims with a stack of paperwork. Coward\'s way, rock-rat.' } } },
];
function dilemmaFor(st) {
  if (st.fac !== st.origFac || G.rep[st.fac] < 0) return null;
  for (const D of DILEMMAS) { if (G.dilemma[D.id]) continue; for (const k in D.sides) if (D.sides[k].st === st.id) return { D, side: k, S: D.sides[k] }; }
  return null;
}
function dilemmaMission(D, side) {
  const S = D.sides[side], st = STN[S.st];
  const m = { id: nid(), kind: S.kind, fac: st.fac, from: st.id, title: S.title, desc: S.ask, reward: S.reward, rep: S.rep, dilemma: { id: D.id, side }, hostileFleet: true };
  if (S.at) { const p = S.at(); m.x = p.x; m.y = p.y; }
  if (S.kind === 'drop' || S.kind === 'procure') { m.com = S.com; m.qty = S.qty; }
  if (S.dest) m.dest = S.dest;
  if (S.kind === 'bounty') { m.leader = S.leader; m.fleet = S.fleet; }
  return m;
}
function resolveDilemma(m) {
  const D = DILEMMAS.find(d => d.id === m.dilemma.id); if (!D) return;
  const side = m.dilemma.side, other = side === 'a' ? 'b' : 'a', S = D.sides[side], O = D.sides[other];
  G.dilemma[D.id] = side;
  if (S.fx.rep) for (const f in S.fx.rep) changeRep(f, S.fx.rep[f]);
  if (S.fx.boost) { const [sid, c, k] = S.fx.boost; G.econBoost[sid] = G.econBoost[sid] || {}; G.econBoost[sid][c] = k; }
  if (S.fx.crash) { const [sid, c] = S.fx.crash; G.stations[sid].stock[c] = Math.floor(G.stations[sid].stock[c] * 0.3); }
  const ok = memOf(S.st); ok.favors += 2;
  const bad = memOf(O.st); bad.slights += 2; bad.notes.push(S.betray);
  log(`${CAPTAINS[O.st].name} will hear about this.`, 'bad');
}

// ── Talk screen ──
function talkOptions(st) {
  const o = [['tab', 'market', "Let's trade.", 'Market'], ['say', 'needs', "What's in short supply?", ''], ['tab', 'port', "Who's in port?", 'Port'], ['tab', 'contracts', 'Got any work for me?', 'Contracts'], ['tab', 'bounties', "Who's worth hunting?", 'Bounties']];
  if (dilemmaFor(st)) o.push(['say', 'dilemma', 'You mentioned a personal matter?', 'Request']);
  o.push(['tab', 'refit', 'My ship needs work.', 'Refit'], ['tab', 'fleet', "I'm looking for crew and wingmen.", 'Fleet'], ['tab', 'invest', "I want to buy or build a station.", 'Holdings'], ['tab', 'services', 'Patch me up.', 'Services'],
    ['tab', 'shipyard', 'Show me your hulls.', 'Shipyard'], ['tab', 'pilot', 'How am I doing as a pilot?', 'Pilot'], ['say', 'lore', 'Tell me about this place.', ''], ['undock', '', 'Farewell.', 'Undock']);
  return o;
}
function tabTalk(st) {
  const C = captainOf(st), f = FACTIONS[st.fac];
  let lines, extra = '';
  if (UI.say === 'needs') lines = [needsSummary(st)];
  else if (UI.say === 'lore') lines = [C.lore];
  else if (UI.say === 'dilemma') {
    const dm = dilemmaFor(st);
    if (dm) {
      const other = dm.D.sides[dm.side === 'a' ? 'b' : 'a'];
      lines = [dm.S.ask];
      extra = `<div class="card" style="margin-bottom:14px;max-width:560px"><div class="meta"><span class="rw">${fmt(dm.S.reward)} cr</span><span>+${dm.S.rep} ${f.short} standing</span></div><p style="font-size:12px">Accepting this closes off ${esc(CAPTAINS[other.st].name)}'s request at ${esc(STN[other.st].name)}, and they will remember who you sided with.</p><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="primary" data-act="dilemma" data-id="${dm.D.id}" data-side="${dm.side}">I'll do it.</button><button data-act="say" data-id="">Not now.</button></div></div>`;
    } else lines = ['That matter is settled.'];
  } else {
    lines = [capLine(st, 'greet')];
    const mem = memoryLine(st); if (mem) lines.push(mem);
    if (UI.notices.length) lines.push(G.rep[st.fac] >= 0 ? 'Cargo checks out. Payment is on its way to your account.' : 'Delivery received. Payment sent.');
    const inbound = Wd.ships.filter(s => !s.dead && s.role === 'assault' && s.goal === st.id);
    if (inbound.length) lines.push(`We have a ${FACTIONS[inbound[0].fac].short} strike group bearing down on us. Station control is at ${Math.round(G.control[st.id])}%. Check the contract board.`);
    else lines.push(capLine(st, 'need'));
  }
  let h = `<div class="talk"><div class="portrait">${portraitImg(st, 'cap-lg')}<div class="cname" style="color:${f.color}">${esc(C.name)}</div><div class="ctitle">${esc(C.title)} · ${esc(st.name)}</div></div>`;
  h += `<div class="dialog" style="--fc:${f.color}"><div class="speech">${lines.filter(Boolean).map(l => `<p>“${esc(l)}”</p>`).join('')}</div>${extra}<div class="choices">`;
  talkOptions(st).forEach(([act, id, text, hint], i) => {
    const a = act === 'tab' ? `data-act="tab" data-id="${id}"` : act === 'say' ? `data-act="say" data-id="${id}"` : 'data-act="undock"';
    h += `<button class="choice" ${a}><span class="n">${i < 9 ? i + 1 : ''}</span><span>${esc(text)}</span>${hint ? `<span class="hint">${hint}</span>` : ''}</button>`;
  });
  return h + '</div></div></div>';
}

// ── Lore fragments found in data caches ──
const LORE = [
  { id: 'l1', title: 'The Long Dimming', text: 'The star at the heart of the Drift began to fail two centuries ago. The first colonists called it Halcyon\'s Lamp. Their grandchildren stopped calling it anything.' },
  { id: 'l2', title: 'Directorate Charter, Article 9', text: '"Where the Directorate cannot protect, it shall license others to protect in its name." Every bounty board in the Drift exists because of one tired clause.' },
  { id: 'l3', title: 'Forge-Hymn Fragment', text: 'Take the light before it leaves us. Bind it in steel. When the last star dies, we will still be burning.' },
  { id: 'l4', title: 'Mercantile Ledger 1', text: 'Line 1: Ownership of all goods in transit shall be determined by the last party to touch them. Line 2: See line 1.' },
  { id: 'l5', title: "Prospector's Log, Day 412", text: 'Rock is rock. But some rocks hum when you cut them, and those ones pay triple. Nobody at Deepcut will say why.' },
  { id: 'l6', title: 'Blackmaw Recruitment Notice', text: 'No papers. No past. No questions. Bring your own hull and your own reasons.' },
  { id: 'l7', title: 'Fringe Survey, Incomplete', text: 'Beyond the Outer Ring the sensors go strange. Contacts appear and vanish. Survey team 4 reports a structure older than the colony. Transmission ends.' },
  { id: 'l8', title: 'The Precursor Question', text: 'Somebody was here before us. They built things that still draw power from nothing we can measure. The relics do not want to be found, and yet they keep being found.' },
];
