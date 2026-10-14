'use strict';
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const d2 = (a, b) => { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; };
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const fmt = n => Math.round(n).toLocaleString('en-US');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SECTOR_R = 18000;

const FACTIONS = {
  concord: { name: 'Concord Directorate', short: 'Concord', color: '#5fb3ff', blurb: 'The last navy in the Drift. Lawful, bureaucratic, short on ships.' },
  veyra: { name: 'Veyra Mercantile', short: 'Veyra', color: '#e8c45a', blurb: 'A trade compact that keeps the markets moving and the ledgers balanced.' },
  ashen: { name: 'Ashen Covenant', short: 'Ashen', color: '#ff7b54', blurb: 'Star-forge zealots who harvest the dying sun. At cold war with Concord.' },
  tessel: { name: 'Tessel Free Miners', short: 'Tessel', color: '#7fd68a', blurb: 'Rock-cutters and refiners. Pay well for ore, distrust everyone.' },
  pirate: { name: 'Blackmaw Raiders', short: 'Pirates', color: '#c07ae0', blurb: 'Raiders operating out of the Blackmaw warren.' },
};
// Wars are dynamic: G.wars holds the current pairs at war. Pirates fight everyone.
const AT_WAR = (a, b) => a !== b && a !== 'player' && b !== 'player' && (a === 'pirate' || b === 'pirate' || ((typeof G !== 'undefined' && G && G.wars) ? G.wars.some(w => (w[0] === a && w[1] === b) || (w[0] === b && w[1] === a)) : ((a === 'concord' && b === 'ashen') || (a === 'ashen' && b === 'concord'))));

const COMS = {
  food: { name: 'Food', base: 40 }, ore: { name: 'Ore', base: 32 }, volatiles: { name: 'Volatiles', base: 95 },
  metals: { name: 'Metals', base: 75 }, machinery: { name: 'Machinery', base: 180 }, medicine: { name: 'Medicine', base: 160 },
  luxury: { name: 'Luxury Goods', base: 320 }, weapons: { name: 'Arms', base: 260 },
};

// Hull shapes: +x is forward. Slots: x,y offset, s size (S/M), t type (B ballistic, E energy, U universal, M missile), f facing deg, arc deg.
const HULLS = {
  skiff: { name: 'Skiff', cls: 'Frigate', price: 7000, hull: 650, armor: 70, flux: 700, diss: 60, shEff: 1.0, shArc: 160, speed: 280, accel: 320, turn: 3.4, cargo: 25, r: 15, internals: 1,
    shape: [[16, 0], [-6, -10], [-12, -5], [-9, 0], [-12, 5], [-6, 10]], engines: [[-11, 0]],
    slots: [{ x: 6, y: -4, s: 'S', t: 'U', f: 0, arc: 90 }, { x: 6, y: 4, s: 'S', t: 'U', f: 0, arc: 90 }] },
  wren: { name: 'Wren', cls: 'Frigate', price: 14000, hull: 950, armor: 130, flux: 1000, diss: 80, shEff: 0.9, shArc: 200, speed: 245, accel: 300, turn: 2.9, cargo: 40, r: 18, internals: 2,
    shape: [[20, 0], [6, -8], [-4, -14], [-14, -11], [-10, 0], [-14, 11], [-4, 14], [6, 8]], engines: [[-12, -6], [-12, 6]],
    slots: [{ x: 10, y: -5, s: 'S', t: 'U', f: 0, arc: 150 }, { x: 10, y: 5, s: 'S', t: 'U', f: 0, arc: 150 }, { x: -3, y: 0, s: 'S', t: 'M', f: 0, arc: 30 }] },
  mule: { name: 'Mule', cls: 'Freighter', price: 19000, hull: 1700, armor: 160, flux: 900, diss: 70, shEff: 1.0, shArc: 160, speed: 175, accel: 160, turn: 1.7, cargo: 170, r: 26, internals: 2,
    shape: [[24, -7], [28, 0], [24, 7], [16, 12], [-22, 13], [-28, 7], [-28, -7], [-22, -13], [16, -12]], engines: [[-27, -5], [-27, 5]],
    slots: [{ x: 4, y: -12, s: 'S', t: 'U', f: -90, arc: 200 }, { x: 4, y: 12, s: 'S', t: 'U', f: 90, arc: 200 }, { x: 18, y: 0, s: 'S', t: 'M', f: 0, arc: 40 }] },
  talon: { name: 'Talon', cls: 'Destroyer', price: 52000, hull: 2500, armor: 380, flux: 2500, diss: 160, shEff: 0.8, shArc: 240, speed: 195, accel: 210, turn: 2.0, cargo: 70, r: 30, internals: 3,
    shape: [[34, 0], [18, -8], [4, -10], [-6, -22], [-22, -20], [-18, -6], [-26, 0], [-18, 6], [-22, 20], [-6, 22], [4, 10], [18, 8]], engines: [[-24, -4], [-24, 4], [-20, -16], [-20, 16]],
    slots: [{ x: 20, y: 0, s: 'M', t: 'B', f: 0, arc: 60 }, { x: 6, y: -6, s: 'M', t: 'E', f: 0, arc: 120 }, { x: -8, y: -15, s: 'S', t: 'U', f: -60, arc: 200 }, { x: -8, y: 15, s: 'S', t: 'U', f: 60, arc: 200 }, { x: 6, y: 6, s: 'S', t: 'M', f: 0, arc: 30 }] },
  halberd: { name: 'Halberd', cls: 'Cruiser', price: 135000, hull: 5200, armor: 750, flux: 5200, diss: 290, shEff: 0.7, shArc: 270, speed: 145, accel: 125, turn: 1.25, cargo: 130, r: 44, internals: 4,
    shape: [[48, 0], [36, -10], [10, -14], [0, -30], [-20, -32], [-30, -18], [-44, -14], [-40, 0], [-44, 14], [-30, 18], [-20, 32], [0, 30], [10, 14], [36, 10]], engines: [[-40, -8], [-40, 8], [-28, -26], [-28, 26]],
    slots: [{ x: 32, y: -5, s: 'M', t: 'B', f: 0, arc: 70 }, { x: 32, y: 5, s: 'M', t: 'B', f: 0, arc: 70 }, { x: 4, y: -20, s: 'M', t: 'E', f: -45, arc: 200 }, { x: 4, y: 20, s: 'M', t: 'E', f: 45, arc: 200 },
      { x: -24, y: -14, s: 'S', t: 'U', f: -120, arc: 200 }, { x: -24, y: 14, s: 'S', t: 'U', f: 120, arc: 200 }, { x: 14, y: 0, s: 'M', t: 'M', f: 0, arc: 40 }] },
};

// dtype: kin (2x vs shields, .5x vs armor), he (.5x vs shields, 2x vs armor), en (1x)
const WEAPONS = {
  autocannon: { name: 'Light Autocannon', t: 'B', s: 'S', price: 1200, dt: 'kin', dmg: 26, cd: 0.22, spd: 1000, range: 700, flux: 14, spread: 3, color: '#ffd27a', len: 9 },
  scatter: { name: 'Scatter Gun', t: 'B', s: 'S', price: 1500, dt: 'kin', dmg: 15, pellets: 6, cd: 0.95, spd: 850, range: 430, flux: 45, spread: 14, color: '#ffe0a0', len: 5 },
  lightlaser: { name: 'Tactical Laser', t: 'E', s: 'S', price: 1900, dt: 'en', beam: true, dps: 105, range: 600, fps: 70, color: '#ff5f7a', w: 2 },
  mininglaser: { name: 'Mining Laser', t: 'E', s: 'S', price: 900, dt: 'en', beam: true, dps: 40, mine: 4, range: 460, fps: 18, color: '#8affd4', w: 2 },
  ionpulse: { name: 'Ion Pulser', t: 'E', s: 'S', price: 2400, dt: 'en', dmg: 34, cd: 0.32, spd: 1200, range: 650, flux: 30, spread: 1, color: '#7ab8ff', len: 12 },
  swarm: { name: 'Swarm Rack', t: 'M', s: 'S', price: 2300, dt: 'he', dmg: 150, cd: 1.5, ammo: 18, spd: 520, range: 1100, flux: 0, missile: true, homing: 3.2, color: '#ffb070' },
  railgun: { name: 'Hypervelocity Rail', t: 'B', s: 'M', price: 6800, dt: 'kin', dmg: 190, cd: 1.2, spd: 2100, range: 1100, flux: 140, spread: 0.5, color: '#c8f0ff', len: 26 },
  mauler: { name: 'Heavy Mauler', t: 'B', s: 'M', price: 5400, dt: 'he', dmg: 75, cd: 0.45, spd: 900, range: 820, flux: 58, spread: 2, color: '#ffa04a', len: 12 },
  lancer: { name: 'Pulse Lancer', t: 'E', s: 'M', price: 6200, dt: 'en', dmg: 58, cd: 0.27, spd: 1300, range: 760, flux: 50, spread: 1.5, color: '#b88aff', len: 14 },
  lumen: { name: 'Lumen Beam', t: 'E', s: 'M', price: 9000, dt: 'en', beam: true, dps: 270, range: 860, fps: 200, color: '#ff4fd8', w: 4 },
  deepbore: { name: 'Deep Bore Drill', t: 'E', s: 'M', price: 4300, dt: 'en', beam: true, dps: 85, mine: 5, range: 540, fps: 38, color: '#54ffc0', w: 4 },
  breaker: { name: 'Breaker Torpedo', t: 'M', s: 'M', price: 7200, dt: 'he', dmg: 950, cd: 5.5, ammo: 4, spd: 380, range: 1300, flux: 0, missile: true, homing: 1.1, color: '#ff6a4a', big: true },
};
// Rare relic weapons: never sold, only found in the Fringe.
WEAPONS.voidlance = { name: 'Void Lance', t: 'E', s: 'M', price: 22000, dt: 'en', beam: true, dps: 420, range: 1000, fps: 190, color: '#9d7bff', w: 5, rare: true };
WEAPONS.gravcannon = { name: 'Grav Cannon', t: 'B', s: 'M', price: 20000, dt: 'he', dmg: 340, cd: 1.1, spd: 1400, range: 1050, flux: 150, spread: 0.6, color: '#d3a6ff', len: 22, rare: true };
WEAPONS.shardgun = { name: 'Shard Projector', t: 'U', s: 'S', price: 9000, dt: 'kin', dmg: 22, pellets: 5, cd: 0.5, spd: 1200, range: 600, flux: 30, spread: 8, color: '#a8f0ff', len: 7, rare: true };
const TYPE_NAME = { B: 'Ballistic', E: 'Energy', U: 'Universal', M: 'Missile' };
const SIZE_NAME = { S: 'Small', M: 'Medium' };
function fits(slot, wid) {
  const W = WEAPONS[wid]; if (!W) return false;
  if (slot.s === 'S' && W.s === 'M') return false;
  if (slot.t === 'M') return W.t === 'M';
  if (W.t === 'M') return false;
  return slot.t === 'U' || slot.t === W.t;
}

HULLS.brood = { name: 'Brood', cls: 'Carrier', price: 62000, hull: 3200, armor: 300, flux: 2400, diss: 150, shEff: 0.9, shArc: 220, speed: 125, accel: 120, turn: 0.95, cargo: 90, r: 36, internals: 2,
  shape: [[34, -6], [38, 0], [34, 6], [20, 18], [-30, 18], [-38, 10], [-38, -10], [-30, -18], [20, -18]], engines: [[-36, -8], [-36, 8]],
  slots: [{ x: 10, y: -14, s: 'S', t: 'U', f: -90, arc: 200 }, { x: 10, y: 14, s: 'S', t: 'U', f: 90, arc: 200 }, { x: 26, y: 0, s: 'M', t: 'M', f: 0, arc: 40 }], carrier: true };
HULLS.fighter = { name: 'Fighter', cls: 'Fighter', price: 1200, hull: 140, armor: 0, flux: 300, diss: 60, shEff: 1, shArc: 0, speed: 390, accel: 600, turn: 5.5, cargo: 0, r: 7, internals: 0,
  shape: [[9, 0], [-5, -6], [-3, 0], [-5, 6]], engines: [[-4, 0]], slots: [{ x: 4, y: 0, s: 'S', t: 'U', f: 0, arc: 30 }], noBuy: true };
HULLS.outpost = { name: 'Outpost', cls: 'Outpost', price: 30000, hull: 6500, armor: 950, flux: 2000, diss: 160, shEff: 0.8, shArc: 360, speed: 0, accel: 0, turn: 0, cargo: 0, r: 40, internals: 0,
  shape: [[40, 0], [20, -34], [-20, -34], [-40, 0], [-20, 34], [20, 34]], engines: [],
  slots: [{ x: 22, y: 0, s: 'M', t: 'U', f: 0, arc: 360 }, { x: -12, y: -18, s: 'M', t: 'U', f: 0, arc: 360 }, { x: -12, y: 18, s: 'M', t: 'U', f: 0, arc: 360 }], noBuy: true };
const MODS = {
  bulkheads: { name: 'Reinforced Bulkheads', price: 3000, desc: '+35% armor, +20% hull, -5% speed', apply: s => { s.armor *= 1.35; s.hull *= 1.2; s.speed *= 0.95; } },
  holds: { name: 'Expanded Holds', price: 2500, desc: '+60% cargo capacity', apply: s => { s.cargo = Math.round(s.cargo * 1.6); } },
  capacitors: { name: 'Flux Capacitors', price: 2800, desc: '+30% flux capacity', apply: s => { s.flux *= 1.3; } },
  vents: { name: 'Flux Vents', price: 3200, desc: '+35% flux dissipation', apply: s => { s.diss *= 1.35; } },
  hardshield: { name: 'Hardened Shields', price: 3600, desc: '-20% flux taken by shields, +30° arc', apply: s => { s.shEff *= 0.8; s.shArc = Math.min(360, s.shArc + 30); } },
  drives: { name: 'Augmented Drives', price: 3000, desc: '+18% top speed, +25% turn rate', apply: s => { s.speed *= 1.18; s.accel *= 1.15; s.turn *= 1.25; } },
  refinery: { name: 'Ore Refinery', price: 2400, desc: '+60% ore and volatiles from mining', apply: s => { s.mineMul *= 1.6; } },
  tractor: { name: 'Tractor Array', price: 1500, desc: '2.5x cargo pickup range', apply: s => { s.tractor *= 2.5; } },
  targeting: { name: 'Targeting Core', price: 4200, desc: '+20% weapon range', apply: s => { s.rangeMul *= 1.2; } },
  magazines: { name: 'Expanded Magazines', price: 2000, desc: '+60% missile ammo', apply: s => { s.ammoMul *= 1.6; } },
};

// Stations. prod = exports (cheap), cons = imports (pay well).
const STATIONS = [
  { id: 'meridian', name: 'Meridian Hold', fac: 'concord', x: 3600, y: -2400, prod: ['machinery', 'weapons'], cons: ['food', 'metals', 'luxury'],
    yard: ['wren', 'talon', 'halberd'], armory: ['autocannon', 'railgun', 'mauler', 'swarm', 'lightlaser', 'bulkheads', 'capacitors', 'targeting'],
    planet: { dx: -520, dy: -340, r: 260, c1: '#2c6fa3', c2: '#0b1d33', name: 'Halcyon' } },
  { id: 'lantern', name: 'Lantern Exchange', fac: 'veyra', x: -5200, y: 4400, prod: ['luxury', 'medicine'], cons: ['food', 'volatiles', 'machinery'],
    yard: ['skiff', 'wren', 'mule'], armory: ['lightlaser', 'ionpulse', 'lancer', 'mininglaser', 'holds', 'tractor', 'drives', 'vents'],
    planet: { dx: 620, dy: 480, r: 430, c1: '#c9906b', c2: '#3a1f1a', name: 'Opaline', bands: true } },
  { id: 'greenhaven', name: 'Greenhaven', fac: 'veyra', x: -10600, y: -3400, prod: ['food'], cons: ['machinery', 'medicine', 'luxury'],
    yard: [], armory: ['autocannon', 'scatter', 'holds', 'tractor'],
    planet: { dx: -380, dy: 300, r: 240, c1: '#4f9a5c', c2: '#10261a', name: 'Verdance' } },
  { id: 'cinder', name: 'Cinder Spire', fac: 'ashen', x: 10600, y: 6200, prod: ['weapons', 'volatiles'], cons: ['food', 'medicine', 'luxury'],
    yard: ['skiff', 'talon', 'brood'], armory: ['lumen', 'lancer', 'breaker', 'scatter', 'hardshield', 'vents', 'capacitors'],
    planet: { dx: 420, dy: -380, r: 220, c1: '#c2482f', c2: '#2a0b08', name: 'Embrae' } },
  { id: 'deepcut', name: 'Deepcut Refinery', fac: 'tessel', x: 6600, y: -10600, prod: ['metals'], cons: ['ore', 'volatiles', 'food'],
    yard: ['mule', 'wren'], armory: ['mininglaser', 'deepbore', 'refinery', 'tractor', 'bulkheads', 'autocannon'],
    planet: { dx: 300, dy: 360, r: 160, c1: '#8a8a8a', c2: '#1a1a1d', name: 'Shale' } },
  { id: 'rook', name: "Rook's Hollow", fac: 'tessel', x: -2200, y: -12800, prod: ['ore', 'volatiles'], cons: ['food', 'machinery', 'medicine'],
    yard: [], armory: ['mininglaser', 'autocannon', 'scatter', 'magazines', 'refinery'], planet: null },
  { id: 'vigil', name: 'Vigil Station', fac: 'concord', x: -11600, y: 10000, prod: [], cons: ['weapons', 'medicine', 'food', 'machinery'],
    yard: ['wren', 'talon'], armory: ['swarm', 'breaker', 'railgun', 'magazines', 'vents', 'hardshield', 'ionpulse'],
    planet: { dx: -300, dy: -420, r: 190, c1: '#5a6fb8', c2: '#0e1430', name: 'Pale Watch' } },
];
const STN = Object.fromEntries(STATIONS.map(s => [s.id, s]));
const BLACKMAW = { x: 13800, y: -9400, name: 'Blackmaw' };

const BELTS = [
  { name: "Rook's Belt", x: -3400, y: -10600, r: 1959, n: 119, rich: 0.15 },
  { name: 'Ashfall Drift', x: 9000, y: -5400, r: 1680, n: 93, rich: 0.28 },
  { name: 'Cinder Shoal', x: 12600, y: 2800, r: 1190, n: 54, rich: 0.2 },
  { name: 'Outer Ring', ring: 15400, w: 500, n: 230, rich: 0.1 },
];

const STARTS = [
  { id: 'freelancer', name: 'Freelancer', blurb: 'A combat-fitted Wren out of Meridian Hold. Good for early bounties.', station: 'meridian', credits: 3000,
    cfg: { hull: 'wren', weapons: ['autocannon', 'lightlaser', 'swarm'], mods: ['capacitors', null] } },
  { id: 'prospector', name: 'Prospector', blurb: "A Wren with mining lasers and a refinery, docked at Rook's Hollow next to the belt.", station: 'rook', credits: 2500,
    cfg: { hull: 'wren', weapons: ['mininglaser', 'autocannon', 'swarm'], mods: ['refinery', 'tractor'] } },
  { id: 'hauler', name: 'Hauler', blurb: 'A Mule freighter with 170 tons of hold at Lantern Exchange. Trade first, fight later.', station: 'lantern', credits: 6000,
    cfg: { hull: 'mule', weapons: ['autocannon', 'autocannon', 'swarm'], mods: ['holds', null] } },
];

// Faction storylines: 3 steps each, gated by reputation.
const STORY = {
  concord: [
    { title: 'Writ of Passage', need: 0, kind: 'kill', at: [8600, -5000], fleet: [['skiff', 'pirate'], ['skiff', 'pirate'], ['wren', 'pirate']], reward: 6000, rep: 10,
      desc: 'Blackmaw raiders have been hitting ore haulers in the Ashfall Drift. Directorate Command is short on hulls and will pay a freelancer to clear them. Three ships, light armament.' },
    { title: 'Silent Manifest', need: 10, kind: 'deliver', dest: 'lantern', qty: 8, cargoName: 'Sealed evidence', reward: 7500, rep: 10,
      desc: 'Eight crates of sealed evidence for the Veyra arbitration court at Lantern Exchange. Do not open them. Do not get boarded.' },
    { title: 'The Ossory Writ', need: 25, kind: 'bounty', at: [12200, -7800], leader: ['halberd', 'pirate', 'Mother Ossory'], fleet: [['talon', 'pirate'], ['wren', 'pirate'], ['wren', 'pirate']], reward: 32000, rep: 20, gift: { weapon: 'railgun' },
      desc: 'Mother Ossory runs Blackmaw from the bridge of a stolen Halberd cruiser. The Directorate has signed a writ for her death. Bring a real ship.' },
  ],
  veyra: [
    { title: 'Fresh Margins', need: 0, kind: 'procure', dest: 'cinder', com: 'food', qty: 20, reward: 4200, rep: 8,
      desc: 'The Covenant pays double for food and hates to admit it. Bring 20 tons of food to Cinder Spire and the Mercantile takes a cut of the goodwill.' },
    { title: 'Convoy Insurance', need: 10, kind: 'kill', at: [-8000, 400], fleet: [['skiff', 'pirate'], ['skiff', 'pirate'], ['wren', 'pirate'], ['wren', 'pirate']], reward: 9500, rep: 10,
      desc: 'A raiding party is parked on the Greenhaven lane, picking off grain haulers. Our underwriters would rather pay you than pay claims.' },
    { title: 'Exclusive Terms', need: 25, kind: 'procure', dest: 'meridian', com: 'luxury', qty: 25, reward: 19000, rep: 20, gift: { mod: 'holds' },
      desc: 'Concord officers have expensive tastes. Deliver 25 crates of luxury goods to Meridian Hold and seal the Mercantile’s exclusive supply contract.' },
  ],
  ashen: [
    { title: 'Ash Tithe', need: 0, kind: 'procure', dest: 'cinder', com: 'medicine', qty: 15, reward: 5200, rep: 8,
      desc: 'The forge-crews burn. Bring 15 units of medicine to Cinder Spire as tithe and the Covenant will remember your name.' },
    { title: 'The Quiet Ledger', need: 10, kind: 'bounty', at: [4800, 4600], leader: ['talon', 'concord', 'CDS Quiet Ledger'], fleet: [['wren', 'concord']], reward: 15000, rep: 15,
      desc: 'A Concord survey ship is charting the Spire’s defenses. Destroy the Quiet Ledger. The Directorate will not forgive this.' },
    { title: 'Ember Rite', need: 25, kind: 'kill', at: [12600, -6600], fleet: [['talon', 'pirate'], ['wren', 'pirate'], ['wren', 'pirate'], ['skiff', 'pirate'], ['skiff', 'pirate']], reward: 27000, rep: 20, gift: { weapon: 'lumen' },
      desc: 'Blackmaw has fouled the sun-lanes long enough. Burn their forward picket at the edge of the warren and the rite is complete.' },
  ],
  tessel: [
    { title: 'Core Sample', need: 0, kind: 'procure', dest: 'deepcut', com: 'ore', qty: 30, reward: 3600, rep: 8,
      desc: 'Deepcut’s smelters are running cold. Bring 30 tons of ore. Mine it yourself or buy it at Rook’s Hollow, we don’t care which.' },
    { title: 'Claim Jumpers', need: 10, kind: 'kill', at: [-4800, -9400], fleet: [['skiff', 'pirate'], ['wren', 'pirate'], ['wren', 'pirate']], reward: 8500, rep: 10,
      desc: 'Raiders are squatting in Rook’s Belt and stripping our marked claims. Run them off. Permanently.' },
    { title: 'Deep Vein', need: 25, kind: 'procure', dest: 'deepcut', com: 'volatiles', qty: 25, reward: 16000, rep: 20, gift: { weapon: 'deepbore' },
      desc: 'Rich crystal asteroids carry volatiles. Bring 25 tons to Deepcut and the Free Miners will hand you the keys to a Deep Bore Drill.' },
  ],
};

const PIRATE_FIRST = ['Kessrin', 'Vado', 'Marl', 'Iska', 'Dunmore', 'Teague', 'Sorrel', 'Hask', 'Brine', 'Oletta', 'Corvin', 'Pell', 'Rusk', 'Yarrow', 'Tamsin'];
const PIRATE_NICK = ['Gravetooth', 'the Lantern-Eater', 'Two-Flux', 'Cold Hands', 'the Tithe', 'Ashjaw', 'Blacklight', 'the Quiet', 'Saltmouth', 'Ninefold', 'Hollowpoint'];
const PIRATE_LAST = ['Vale', 'Oduya', 'Marrow', 'Sennet', 'Crake', 'Lisle', 'Varga', 'Hume', 'Strand', 'Okafor', 'Reyes'];
