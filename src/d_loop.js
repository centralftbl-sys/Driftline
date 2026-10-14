
// ───────────────────────── Main update ─────────────────────────
let shieldOn = false, ventReq = false, hudT = 0;
function playerControls() {
  const c = player.c, k = keys;
  c.thrust = ((k.KeyW || k.ArrowUp) ? 1 : 0) - ((k.KeyS || k.ArrowDown) ? 1 : 0);
  c.dir = null;
  if (steerMode === 'direct') {
    let x = ((k.KeyD || k.ArrowRight) ? 1 : 0) - ((k.KeyA || k.ArrowLeft) ? 1 : 0), y = -c.thrust;
    const L = Math.hypot(x, y); if (L) { x /= L; y /= L; }
    c.dir = { x, y }; c.turn = 0; c.strafe = 0;
    c.turnTo = Math.atan2(mouse.wy - player.y, mouse.wx - player.x); // nose follows the cursor
  } else if (steerMode === 'cursor') {
    c.turnTo = Math.atan2(mouse.wy - player.y, mouse.wx - player.x); c.turn = 0;
    c.strafe = ((k.KeyD || k.KeyE) ? 1 : 0) - ((k.KeyA || k.KeyQ) ? 1 : 0);
  } else {
    c.turnTo = null; c.turn = ((k.KeyD || k.ArrowRight) ? 1 : 0) - ((k.KeyA || k.ArrowLeft) ? 1 : 0);
    c.strafe = (k.KeyE ? 1 : 0) - (k.KeyQ ? 1 : 0);
  }
  c.burn = !!(k.ShiftLeft || k.ShiftRight);
  if (c.burn) shieldOn = false;
  c.aimX = mouse.wx; c.aimY = mouse.wy; c.fire = mouse.down; c.fireM = !!k.Space; c.shield = shieldOn;
  c.vent = ventReq; if (ventReq) shieldOn = false; ventReq = false;
}
function collisions(dt) {
  const S = Wd.ships;
  for (let i = 0; i < S.length; i++) {
    const a = S[i]; if (a.dead) continue;
    for (let j = i + 1; j < S.length; j++) {
      const b = S[j]; if (b.dead) continue;
      const rr = a.st.r + b.st.r, dx = b.x - a.x, dy = b.y - a.y;
      if (Math.abs(dx) > rr || Math.abs(dy) > rr) continue;
      const d = Math.hypot(dx, dy) || 1; if (d >= rr) continue;
      const nx = dx / d, ny = dy / d, ov = rr - d;
      const fa = a.role === 'outpost', fb = b.role === 'outpost'; // outposts are anchored: only the other ship moves
      if (fa && fb) continue;
      const wa = fa ? 0 : fb ? 1 : 0.5, wb = fb ? 0 : fa ? 1 : 0.5;
      a.x -= nx * ov * wa; a.y -= ny * ov * wa; b.x += nx * ov * wb; b.y += ny * ov * wb;
      const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rv < 0) { const k = (fa || fb) ? 1.3 : 0.5; if (!fa) { a.vx += nx * rv * k * (fb ? 1 : 1); a.vy += ny * rv * k; } if (!fb) { b.vx -= nx * rv * k; b.vy -= ny * rv * k; } }
    }
    if (a.role === 'outpost') { a.vx = a.vy = 0; continue; }
    for (const as of Wd.asteroids) {
      const rr = a.st.r * 0.85 + as.r * 0.9, dx = a.x - as.x, dy = a.y - as.y;
      if (Math.abs(dx) > rr || Math.abs(dy) > rr) continue;
      const d = Math.hypot(dx, dy) || 1; if (d >= rr) continue;
      const nx = dx / d, ny = dy / d;
      a.x = as.x + nx * rr; a.y = as.y + ny * rr;
      const vn = a.vx * nx + a.vy * ny;
      if (vn < 0) {
        a.vx -= nx * vn * 1.4; a.vy -= ny * vn * 1.4;
        if (-vn > 140) { applyHit(a, -vn * 0.12, 'kin', as.x, as.y, null); damageAsteroid(as, -vn * 0.2, null, false); spark(a.x - nx * a.st.r, a.y - ny * a.st.r, '#c8b8a0', 4); }
      }
    }
  }
}
function updateProjectiles(dt) {
  const P = Wd.proj;
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i]; p.life -= dt;
    if (p.missile) {
      if (p.target && !p.target.dead) { const want = Math.atan2(p.target.y - p.y, p.target.x - p.x); p.a += clamp(angDiff(p.a, want), -p.homing * dt, p.homing * dt); }
      const sp = Math.hypot(p.vx, p.vy); const ns = sp + (p.spd - sp) * Math.min(1, dt * 3);
      p.vx = Math.cos(p.a) * ns; p.vy = Math.sin(p.a) * ns;
      if (Math.random() < dt * 40) part(p.x, p.y, rand(-15, 15), rand(-15, 15), 0.6, '#4a4f58', p.big ? 6 : 3.5, 'smoke');
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    let dead = p.life <= 0;
    if (!dead) for (const t of Wd.ships) {
      if (t === p.owner || t.dead) continue;
      const dx = t.x - p.x, dy = t.y - p.y, R = t.st.r * (t.shield ? 1.25 : 0.9) + p.r;
      if (Math.abs(dx) > 300 || Math.abs(dy) > 300) continue;
      const dd = dx * dx + dy * dy;
      if (dd < 90000 && hostile(p.owner, t)) t.danger = Math.max(t.danger, 0.6);
      if (dd < R * R && canHit(p.owner, t)) {
        applyHit(t, p.dmg, p.dt, p.x - p.vx * 0.02, p.y - p.vy * 0.02, p.owner);
        if (p.missile) explosion(p.x, p.y, p.big ? 14 : 6); else spark(p.x, p.y, p.color, 3);
        dead = true; break;
      }
    }
    if (!dead) for (const as of Wd.asteroids) {
      const dx = as.x - p.x, dy = as.y - p.y;
      if (Math.abs(dx) > as.r || Math.abs(dy) > as.r) continue;
      if (dx * dx + dy * dy < as.r * as.r * 0.8) {
        damageAsteroid(as, p.dmg * (p.missile ? 0.8 : 0.5), p.owner, false);
        if (p.missile) explosion(p.x, p.y, p.big ? 12 : 5); else spark(p.x, p.y, '#c8b8a0', 2);
        dead = true; break;
      }
    }
    if (dead) { if (p.missile && p.life <= 0) spark(p.x, p.y, '#ffb070', 4); P[i] = P[P.length - 1]; P.pop(); }
  }
}
function updateWorldBits(dt) {
  for (const a of Wd.asteroids) { a.x += a.vx * dt; a.y += a.vy * dt; a.rot += a.vr * dt; a.vx *= 1 - dt * 0.05; a.vy *= 1 - dt * 0.05; }
  const PK = Wd.pickups;
  const tr = 170 * (player ? player.st.tractor : 1);
  let fullMsg = false;
  for (let i = PK.length - 1; i >= 0; i--) {
    const p = PK[i]; p.life -= dt; p.rot += dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - dt * 1.5; p.vy *= 1 - dt * 1.5;
    if (player && !player.dead) {
      const dx = player.x - p.x, dy = player.y - p.y, d = Math.hypot(dx, dy);
      const fresh = p.noPick && Wd.t < p.noPick; // just-ejected cargo drifts clear before the tractor grabs it again
      const blocked = (p.kind === 'com' && cargoFree() <= 0) || fresh;
      if (d < tr && !blocked) { p.vx += dx / d * 900 * dt; p.vy += dy / d * 900 * dt; }
      if (d < player.st.r + 16 && !fresh) {
        if (p.kind === 'credits') { G.credits += p.qty; log(`+${fmt(p.qty)} cr salvaged`, 'gold'); p.qty = 0; }
        else if (p.kind === 'mod') { G.stash.mods[p.id] = (G.stash.mods[p.id] || 0) + 1; log(`Recovered ${MODS[p.id].name} (stash)`, 'gold'); p.qty = 0; }
        else if (p.kind === 'weapon') { G.stash.weapons[p.id] = (G.stash.weapons[p.id] || 0) + 1; log(`Recovered ${WEAPONS[p.id].name} (stash)`, 'gold'); p.qty = 0; }
        else { const take = Math.min(p.qty, cargoFree()); if (take > 0) { addCargo(p.id, take); p.qty -= take; log(`+${take} ${COMS[p.id].name}`); } else fullMsg = true; }
      }
    }
    if (p.qty <= 0 || p.life <= 0) { PK[i] = PK[PK.length - 1]; PK.pop(); }
  }
  if (fullMsg && Wd.t - (Wd.fullT || -9) > 4) { Wd.fullT = Wd.t; log('Cargo hold full', 'bad'); }
  const PR = Wd.parts;
  for (let i = PR.length - 1; i >= 0; i--) {
    const p = PR[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - dt * 1.2; p.vy *= 1 - dt * 1.2;
    if (p.life <= 0) { PR[i] = PR[PR.length - 1]; PR.pop(); }
  }
}
function update(dt) {
  Wd.t += dt; G.time += dt; Wd.beams.length = 0;
  playerControls();
  for (const s of Wd.ships) if (!s.dead && !s.isPlayer) aiUpdate(s, dt);
  for (const s of Wd.ships) if (!s.dead) updateShip(s, dt);
  collisions(dt);
  updateDepth(dt);
  updateProjectiles(dt);
  updateWorldBits(dt);
  Wd.ships = Wd.ships.filter(s => !s.dead);
  population(dt);
  Wd.saveT -= dt; if (Wd.saveT <= 0) { Wd.saveT = 45; saveGame(); }
  const lead = 0.22 / cam.zoom;
  const tx = player.x + (mouse.x - VW / 2) * lead, ty = player.y + (mouse.y - VH / 2) * lead;
  cam.x += (tx - cam.x) * Math.min(1, dt * 5); cam.y += (ty - cam.y) * Math.min(1, dt * 5);
  hudT -= dt; if (hudT <= 0) { hudT = 0.1; updateHUD(); }
}

// ───────────────────────── Rendering ─────────────────────────
const cv = document.getElementById('view'), ctx = cv.getContext('2d');
let VW = 800, VH = 600, DPR = 1;
function resize() { DPR = Math.min(2, window.devicePixelRatio || 1); VW = cv.clientWidth || innerWidth; VH = cv.clientHeight || innerHeight; cv.width = VW * DPR; cv.height = VH * DPR; }
window.addEventListener('resize', resize);
function updateMouseWorld() { mouse.wx = cam.x + (mouse.x - VW / 2) / cam.zoom; mouse.wy = cam.y + (mouse.y - VH / 2) / cam.zoom; }

function drawStars(t) {
  const layers = Wd ? Wd.stars : (drawStars.s || (drawStars.s = makeStars()));
  const px = Wd ? cam.x : t * 30, py = Wd ? cam.y : t * 12;
  layers.forEach((L, li) => {
    const f = 0.04 + li * 0.05;
    ctx.fillStyle = li === 2 ? '#e8f2ff' : li === 1 ? '#a9bfd6' : '#6d7f96';
    for (const s of L) {
      let x = (s[0] - px * f) % 2048; if (x < 0) x += 2048;
      let y = (s[1] - py * f) % 2048; if (y < 0) y += 2048;
      for (let ox = x; ox < VW; ox += 2048) for (let oy = y; oy < VH; oy += 2048) ctx.fillRect(ox, oy, s[2], s[2]);
    }
  });
}
function inView(x, y, r) {
  const hw = VW / 2 / cam.zoom + r, hh = VH / 2 / cam.zoom + r;
  return Math.abs(x - cam.x) < hw && Math.abs(y - cam.y) < hh;
}
function drawSun() {
  if (!inView(0, 0, 2400)) return;
  let g = ctx.createRadialGradient(0, 0, 200, 0, 0, 2400);
  g.addColorStop(0, 'rgba(255,140,70,0.45)'); g.addColorStop(0.3, 'rgba(200,70,40,0.14)'); g.addColorStop(1, 'rgba(120,30,20,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 2400, 0, TAU); ctx.fill();
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, 420);
  g.addColorStop(0, '#fff4dc'); g.addColorStop(0.5, '#ffc27a'); g.addColorStop(0.85, '#ff7a3a'); g.addColorStop(1, 'rgba(255,90,40,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 420, 0, TAU); ctx.fill();
}
function drawPlanet(px, py, P) {
  if (!inView(px, py, P.r + 50)) return;
  const la = Math.atan2(-py, -px);
  const g = ctx.createRadialGradient(px + Math.cos(la) * P.r * 0.45, py + Math.sin(la) * P.r * 0.45, P.r * 0.1, px, py, P.r * 1.05);
  g.addColorStop(0, P.c1); g.addColorStop(0.7, P.c2); g.addColorStop(1, '#020305');
  ctx.save(); ctx.beginPath(); ctx.arc(px, py, P.r, 0, TAU); ctx.fillStyle = g; ctx.fill();
  if (P.bands) { ctx.clip(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#fff1e0'; for (let i = -4; i <= 4; i++) { ctx.fillRect(px - P.r, py + i * P.r * 0.2, P.r * 2, P.r * 0.07); } }
  ctx.restore();
  ctx.strokeStyle = 'rgba(160,200,230,0.18)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, py, P.r + 2, la - 1.2, la + 1.2); ctx.stroke();
  label(P.name, px, py + P.r + 22, '#5f7686', 11);
}
function label(text, x, y, color, size) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1 / cam.zoom, 1 / cam.zoom);
  ctx.font = `500 ${size}px 'IBM Plex Mono', monospace`; ctx.textAlign = 'center'; ctx.fillStyle = color; ctx.fillText(text, 0, 0); ctx.restore();
}
function drawStation(st) {
  if (st.planet) drawPlanet(st.x + st.planet.dx, st.y + st.planet.dy, st.planet);
  if (!inView(st.x, st.y, 200)) return;
  const col = FACTIONS[st.fac].color, t = Wd.t * 0.12;
  ctx.save(); ctx.translate(st.x, st.y);
  if (player && d2(player, st) < 700 * 700) { ctx.setLineDash([8, 10]); ctx.strokeStyle = 'rgba(111,211,230,0.35)'; ctx.lineWidth = 1.5 / cam.zoom; ctx.beginPath(); ctx.arc(0, 0, 260, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
  ctx.rotate(t);
  ctx.lineWidth = 9; ctx.strokeStyle = '#1b2833'; ctx.beginPath(); ctx.arc(0, 0, 74, 0, TAU); ctx.stroke();
  ctx.lineWidth = 1.5; ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(0, 0, 79, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 69, 0, TAU); ctx.stroke();
  for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate(i * TAU / 4); ctx.fillStyle = '#22313d'; ctx.fillRect(20, -4, 50, 8); ctx.fillStyle = '#2b3d4b'; ctx.fillRect(58, -10, 22, 20); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.strokeRect(58, -10, 22, 20); ctx.restore(); }
  for (let i = 0; i < 12; i++) { const a = i * TAU / 12; const on = Math.floor(Wd.t * 2 + i) % 3 === 0; ctx.fillStyle = on ? col : '#3a4a55'; ctx.fillRect(Math.cos(a) * 74 - 1.5, Math.sin(a) * 74 - 1.5, 3, 3); }
  ctx.rotate(-t * 2.5);
  ctx.fillStyle = '#1a2733'; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = i * TAU / 6; ctx.lineTo(Math.cos(a) * 26, Math.sin(a) * 26); } ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = col; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(Wd.t * 3); ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  ctx.restore();
  label(st.name.toUpperCase(), st.x, st.y + 112, col, 13);
  label(FACTIONS[st.fac].name, st.x, st.y + 128, '#6f8797', 10);
  if (player && d2(player, st) < 1500 * 1500) {
    const pc = captainCanvas(st);
    ctx.save(); ctx.translate(st.x, st.y + 150); ctx.scale(1 / cam.zoom, 1 / cam.zoom); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0a1119'; ctx.fillRect(-25, 0, 50, 58); ctx.drawImage(pc, -24, 1, 48, 56);
    ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.strokeRect(-24.5, 0.5, 49, 57);
    ctx.font = "500 10px 'IBM Plex Mono', monospace"; ctx.textAlign = 'center'; ctx.fillStyle = '#9fb3c0'; ctx.fillText(captainOf(st).name, 0, 72);
    ctx.restore();
  }
  drawStationStatus(st);
}
function drawBlackmaw() {
  const b = BLACKMAW; if (!inView(b.x, b.y, 260)) return;
  ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Wd.t * 0.05);
  ctx.fillStyle = '#140f19'; ctx.strokeStyle = '#7a3f96'; ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0; i < 18; i++) { const a = i * TAU / 18, r = i % 2 ? 90 : 150 + (i % 4) * 12; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c07ae0';
  for (let i = 0; i < 9; i++) { const a = i * TAU / 9; if ((Math.floor(Wd.t * 1.5) + i) % 2) ctx.fillRect(Math.cos(a) * 70 - 2, Math.sin(a) * 70 - 2, 4, 4); }
  ctx.fillStyle = '#2a1533'; ctx.beginPath(); ctx.arc(0, 0, 40, 0, TAU); ctx.fill(); ctx.strokeStyle = '#c07ae0'; ctx.stroke();
  ctx.restore();
  label('BLACKMAW', b.x, b.y + 190, '#c07ae0', 13); label('Raider warren · hostile', b.x, b.y + 206, '#7c5f8b', 10);
}
function drawAsteroid(a) {
  ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot);
  const n = a.pts.length; ctx.beginPath();
  for (let i = 0; i < n; i++) { const an = i * TAU / n, r = a.r * a.pts[i]; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
  ctx.closePath();
  const v = Math.floor(70 * a.shade); ctx.fillStyle = `rgb(${v + 22},${v + 14},${v + 4})`; ctx.fill();
  ctx.strokeStyle = `rgb(${v + 50},${v + 40},${v + 28})`; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(a.r * 0.25, a.r * 0.2, a.r * 0.55, 0, TAU); ctx.fill();
  if (a.rich) { ctx.fillStyle = '#5ff0d4'; for (let i = 0; i < 4; i++) { const an = i * 1.7, r = a.r * 0.45; ctx.beginPath(); ctx.moveTo(Math.cos(an) * r, Math.sin(an) * r); ctx.lineTo(Math.cos(an + .3) * r * 1.5, Math.sin(an + .3) * r * 1.5); ctx.lineTo(Math.cos(an - .2) * r * 1.3, Math.sin(an - .2) * r * 1.3); ctx.fill(); } }
  if (a.mined > 0 && a.hp < a.maxhp) { ctx.rotate(-a.rot); ctx.fillStyle = 'rgba(138,255,212,.8)'; ctx.fillRect(-a.r, -a.r - 8, a.r * 2 * (a.hp / a.maxhp), 2); }
  ctx.restore();
}
function shipColor(s) { return s.isPlayer ? '#6fd3e6' : s.side === 'player' ? '#9fe8c8' : FACTIONS[s.fac].color; }
function drawShip(s) {
  if (s.psId) return drawPS(s);
  const H = s.H, col = shipColor(s);
  ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a);
  if (s.thrustVis > 0.05) for (const e of H.engines) {
    const L = (8 + s.st.r * 0.6) * s.thrustVis * rand(0.85, 1.15);
    const g = ctx.createLinearGradient(e[0], 0, e[0] - L, 0);
    g.addColorStop(0, s.burn ? '#e6fbff' : '#fff1c4'); g.addColorStop(0.4, s.burn ? '#6fd3e6' : '#ff9a3d'); g.addColorStop(1, 'rgba(255,80,30,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(e[0], e[1] - 3); ctx.lineTo(e[0] - L, e[1]); ctx.lineTo(e[0], e[1] + 3); ctx.fill();
  }
  ctx.beginPath(); for (const p of H.shape) ctx.lineTo(p[0], p[1]); ctx.closePath();
  ctx.fillStyle = s.hitFlash > 0 ? '#e9eef2' : '#141e27'; ctx.fill();
  ctx.lineWidth = 1.6; ctx.strokeStyle = col; ctx.stroke();
  ctx.beginPath(); for (const p of H.shape) ctx.lineTo(p[0] * 0.55 - 2, p[1] * 0.45); ctx.closePath();
  ctx.globalAlpha = 0.28; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1;
  ctx.restore();
  for (const w of s.ws) {
    if (!w) continue; const W = WEAPONS[w.id];
    ctx.save(); ctx.translate(w.wx, w.wy); ctx.rotate(w.wa);
    ctx.fillStyle = W.missile ? '#d98a5a' : '#b9c7d1';
    const L = W.s === 'M' ? 14 : 9; ctx.fillRect(-3, -2, L, 4);
    ctx.fillStyle = '#2a3a46'; ctx.beginPath(); ctx.arc(0, 0, W.s === 'M' ? 4.5 : 3, 0, TAU); ctx.fill();
    ctx.restore();
  }
  if (s.elite) { ctx.save(); ctx.strokeStyle = 'rgba(255,106,92,.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -Wd.t * 20; ctx.beginPath(); ctx.arc(s.x, s.y, s.st.r * 1.7, 0, TAU); ctx.stroke(); ctx.restore(); }
  if (s.shield) {
    const half = s.st.shArc * Math.PI / 360, R = s.st.r * 1.3;
    ctx.save(); ctx.translate(s.x, s.y);
    ctx.globalAlpha = 0.12 + (s.shieldHit > 0 ? 0.18 : 0); ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, s.shA - half, s.shA + half); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.85; ctx.strokeStyle = s.shieldHit > 0 ? '#ffffff' : col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, R, s.shA - half, s.shA + half); ctx.stroke();
    ctx.restore();
  }
  if (!s.isPlayer) {
    const show = s.hp < s.st.hull || s.leader || s.elite || (player && hostile(player, s) && d2(player, s) < 1600 * 1600);
    if (show) {
      ctx.save(); ctx.translate(s.x, s.y); ctx.scale(1 / cam.zoom, 1 / cam.zoom);
      const w = 40, y = -s.st.r * cam.zoom - 14;
      ctx.fillStyle = 'rgba(10,17,25,.8)'; ctx.fillRect(-w / 2, y, w, 4);
      ctx.fillStyle = hostile(player, s) ? '#ff6a5c' : '#9fb3c0'; ctx.fillRect(-w / 2, y, w * (s.hp / s.st.hull), 4);
      if (s.flux > 0) { ctx.fillStyle = '#c07ae0'; ctx.fillRect(-w / 2, y + 5, w * (s.flux / s.st.flux), 2); }
      if ((s.leader || s.elite) && s.name) { ctx.font = "600 11px 'IBM Plex Mono', monospace"; ctx.textAlign = 'center'; ctx.fillStyle = s.elite ? '#ff6a5c' : '#f0b44c'; ctx.fillText(s.elite ? '★ ' + s.name : s.name, 0, y - 6); }
      ctx.restore();
    }
  }
}
function drawProjectiles() {
  for (const p of Wd.proj) {
    if (!inView(p.x, p.y, 40)) continue;
    if (p.missile) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.fillStyle = '#d8d0c4'; ctx.fillRect(-p.r, -p.r * 0.35, p.r * 2, p.r * 0.7);
      ctx.fillStyle = p.color; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(-p.r - 2, 0, p.r * 0.7, 0, TAU); ctx.fill();
      ctx.restore();
    } else {
      const sp = p.spd || 1, L = p.len;
      ctx.strokeStyle = p.color; ctx.lineWidth = p.dmg > 100 ? 3 : 2;
      ctx.beginPath(); ctx.moveTo(p.x - p.vx / sp * L, p.y - p.vy / sp * L); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
  }
}
function drawBeams() {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const b of Wd.beams) {
    ctx.strokeStyle = b.color; ctx.globalAlpha = 0.35; ctx.lineWidth = b.w * 3 * rand(0.8, 1.2);
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    ctx.globalAlpha = 0.95; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, b.w * 0.5);
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    if (b.hit) { ctx.fillStyle = b.color; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(b.x2, b.y2, b.w * 2.5 * rand(0.7, 1.3), 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}
function drawParticles() {
  for (const p of Wd.parts) {
    if (!inView(p.x, p.y, p.size)) continue;
    const k = p.life / p.max;
    if (p.kind === 'smoke') { ctx.globalAlpha = k * 0.35; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.6 - k * 0.6), 0, TAU); ctx.fill(); }
    else if (p.kind === 'flash') { ctx.globalAlpha = k; const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size); g.addColorStop(0, p.color); g.addColorStop(1, 'rgba(255,160,60,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill(); }
    else { ctx.globalAlpha = Math.min(1, k * 1.5); ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
  }
  ctx.globalAlpha = 1;
}
function drawPickups() {
  for (const p of Wd.pickups) {
    if (!inView(p.x, p.y, 20)) continue;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    const blink = p.life < 15 && Math.floor(p.life * 4) % 2;
    ctx.globalAlpha = blink ? 0.4 : 1;
    if (p.kind === 'credits') { ctx.fillStyle = '#f0b44c'; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(5, 0); ctx.lineTo(0, 6); ctx.lineTo(-5, 0); ctx.fill(); }
    else if (p.kind === 'weapon' || p.kind === 'mod') { ctx.strokeStyle = p.kind === 'mod' ? '#9be8ff' : '#ff9be0'; ctx.lineWidth = 2; ctx.strokeRect(-6, -6, 12, 12); ctx.fillStyle = '#ff9be0'; ctx.fillRect(-2, -2, 4, 4); }
    else { ctx.fillStyle = p.id === 'ore' ? '#9a8b76' : p.id === 'volatiles' ? '#5ff0d4' : '#7fd68a'; ctx.fillRect(-5, -5, 10, 10); ctx.strokeStyle = '#0b1219'; ctx.lineWidth = 1.5; ctx.strokeRect(-5, -5, 10, 10); }
    ctx.restore();
  }
}
function missionPoint(m) {
  if (m.kind === 'drop') return { x: m.x, y: m.y };
  if (m.kind === 'kill' || m.kind === 'bounty') {
    const ships = Wd.ships.filter(s => s.tag === m.tag && (m.kind === 'kill' || s.leader));
    if (ships.length && player && ships.some(s => d2(s, player) < 3000 * 3000)) return { x: ships[0].x, y: ships[0].y, live: true };
    return { x: m.x, y: m.y };
  }
  const st = STN[m.dest]; return { x: st.x, y: st.y };
}
function drawIndicators() {
  const pts = [];
  for (const m of G.missions) { const p = missionPoint(m); pts.push({ ...p, color: '#f0b44c', text: m.title }); }
  for (const s of Wd.ships) if (s.mayday && !s.dead) pts.push({ x: s.x, y: s.y, color: '#ff9f43', text: 'MAYDAY ' + s.shipName });
  for (const s of Wd.ships) if (!s.isPlayer && hostile(player, s) && !isHidden(s, player) && d2(player, s) < 2600 * 2600) pts.push({ x: s.x, y: s.y, color: '#ff6a5c', small: true });
  for (const p of pts) {
    const sx = (p.x - cam.x) * cam.zoom + VW / 2, sy = (p.y - cam.y) * cam.zoom + VH / 2;
    const m = 34;
    if (sx > m && sx < VW - m && sy > m && sy < VH - m) {
      if (!p.small) { ctx.strokeStyle = p.color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(sx, sy - 12); ctx.lineTo(sx + 12, sy); ctx.lineTo(sx, sy + 12); ctx.lineTo(sx - 12, sy); ctx.closePath(); ctx.stroke(); }
      continue;
    }
    const a = Math.atan2(sy - VH / 2, sx - VW / 2);
    const k = Math.min((VW / 2 - m) / Math.abs(Math.cos(a) || 1e-6), (VH / 2 - m) / Math.abs(Math.sin(a) || 1e-6));
    const ex = VW / 2 + Math.cos(a) * k, ey = VH / 2 + Math.sin(a) * k;
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(a);
    ctx.fillStyle = p.color; ctx.globalAlpha = p.small ? 0.7 : 1;
    const s = p.small ? 5 : 8; ctx.beginPath(); ctx.moveTo(s * 1.4, 0); ctx.lineTo(-s, -s); ctx.lineTo(-s * 0.4, 0); ctx.lineTo(-s, s); ctx.fill();
    ctx.restore();
    if (!p.small) {
      const dist = Math.hypot(p.x - player.x, p.y - player.y);
      ctx.font = "500 11px 'IBM Plex Mono', monospace"; ctx.fillStyle = p.color; ctx.textAlign = 'center';
      const ty = clamp(ey - Math.sin(a) * 22, 20, VH - 10); let tx = clamp(ex - Math.cos(a) * 28, 60, VW - 60);
      if (ty < 440) tx = Math.min(tx, VW - 340); if (ty > VH - 190) tx = clamp(tx, 400, VW - 300);
      ctx.fillText(`${p.text.length > 22 ? p.text.slice(0, 21) + '…' : p.text} · ${(dist / 1000).toFixed(1)}k`, tx, ty);
    }
  }
}
function drawCrosshair() {
  const x = mouse.x, y = mouse.y;
  ctx.strokeStyle = 'rgba(111,211,230,0.9)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 16, y); ctx.lineTo(x - 11, y); ctx.moveTo(x + 11, y); ctx.lineTo(x + 16, y); ctx.moveTo(x, y - 16); ctx.lineTo(x, y - 11); ctx.moveTo(x, y + 11); ctx.lineTo(x, y + 16); ctx.stroke();
}
function render(now) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#05070b'; ctx.fillRect(0, 0, VW, VH);
  drawStars(now / 1000);
  if (!Wd || !player) return;
  updateMouseWorld();
  ctx.save(); ctx.translate(VW / 2, VH / 2); ctx.scale(cam.zoom, cam.zoom); ctx.translate(-cam.x, -cam.y);
  ctx.globalAlpha = 0.5;
  for (const n of Wd.nebula) { if (!inView(n.x, n.y, n.r)) continue; const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r); g.addColorStop(0, n.c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
  drawSun();
  for (const st of STATIONS) drawStation(st);
  drawBlackmaw();
  for (const a of Wd.asteroids) if (inView(a.x, a.y, a.r)) drawAsteroid(a);
  drawPickups(); drawDepthWorld();
  for (const s of Wd.ships) if (!s.dead && inView(s.x, s.y, 80) && !isHidden(s, player)) drawShip(s);
  drawProjectiles(); drawBeams(); drawParticles();
  ctx.restore();
  if (mode === 'play') { drawIndicators(); drawCrosshair(); }
}

// ───────────────────────── HUD ─────────────────────────
const $ = id => document.getElementById(id);
let lastW = '', lastM = '';
function nearestStation(maxD) { let best = null, bd = maxD * maxD; for (const s of STATIONS) { const dd = d2(player, s); if (dd < bd) { bd = dd; best = s; } } return best; }
function updateHUD() {
  const p = player, st = p.st;
  $('hCredits').textContent = fmt(G.credits) + ' cr';
  const ns = nearestStation(1800);
  $('hNear').textContent = ns ? ns.name : regionName(p.x, p.y);
  $('hSpeed').textContent = Math.round(Math.hypot(p.vx, p.vy)) + ' su/s';
  $('hSteer').textContent = { direct: 'WASD', relative: 'Relative', cursor: 'Cursor' }[steerMode];
  const bar = (b, v, cur, max) => { $(b).style.width = clamp(cur / max * 100, 0, 100) + '%'; $(v).textContent = `${fmt(cur)}/${fmt(max)}`; };
  bar('bHull', 'vHull', Math.max(0, p.hp), st.hull); bar('bArmor', 'vArmor', p.armor, st.armor); bar('bFlux', 'vFlux', p.flux, st.flux); bar('bCargo', 'vCargo', cargoUsed(), cargoCap());
  $('shipState').textContent = p.overload > 0 ? `OVERLOADED ${p.overload.toFixed(1)}s` : p.engOut > 0 ? `ENGINES CRIPPLED ${Math.ceil(p.engOut)}s` : p.venting ? 'VENTING FLUX' : p.burn ? 'BURN DRIVE' : p.shield ? 'SHIELDS UP' : p.opRepair > 0 ? 'OUTPOST REPAIR FIELD' : p.armorRegen ? 'ARMOR REPAIRING' : '';
  $('shipState').style.color = p.overload > 0 ? 'var(--danger)' : 'var(--amber)';
  const wl = p.ws.map((w, i) => w ? `<div><b>${esc(WEAPONS[w.id].name)}${w.wear ? ' <span style="color:var(--amber)">' + '▪'.repeat(w.wear) + '</span>' : ''}</b><span>${w.off > 0 ? '<span style="color:var(--danger)">OFFLINE ' + Math.ceil(w.off) + 's</span>' : WEAPONS[w.id].missile ? w.ammo + ' left' : WEAPONS[w.id].beam ? 'beam' : WEAPONS[w.id].t === 'B' ? 'ballistic' : 'energy'}</span></div>` : '').join('');
  if (wl !== lastW) { $('wlist').innerHTML = wl || '<div>No weapons fitted</div>'; lastW = wl; }
  let mh = '<div class="h">Contracts</div>';
  if (!G.missions.length) mh += '<div class="m"><span>None. Dock at a station to find work.</span></div>';
  for (const m of G.missions) {
    const pt = missionPoint(m); const dist = (Math.hypot(pt.x - p.x, pt.y - p.y) / 1000).toFixed(1);
    let s = '';
    if (m.kind === 'kill') s = `${m.remaining} hostile${m.remaining > 1 ? 's' : ''} · ${dist}k`;
    else if (m.kind === 'bounty') s = `Bounty ${fmt(m.reward)} cr · ${dist}k`;
    else if (m.kind === 'deliver') s = `To ${STN[m.dest].name} · ${dist}k`;
    else if (m.kind === 'drop') s = `${G.cargo[m.com] || 0}/${m.qty} ${COMS[m.com].name.toLowerCase()} → drop point · ${dist}k`;
    else s = `${G.cargo[m.com] || 0}/${m.qty} ${COMS[m.com].name.toLowerCase()} → ${STN[m.dest].name}`;
    mh += `<div class="m"><b>${esc(m.title)}</b><span>${esc(s)}</span></div>`;
  }
  mh += holdingsHUD();
  if (mh !== lastM) { $('hudMissions').innerHTML = mh; lastM = mh; }
  $('prompt').innerHTML = interactPrompt();
  updateDepthHUD();
  drawMini();
}
const mini = $('mini'), mctx = mini.getContext('2d');
function drawMini() {
  const W = 192, R = 3600, k = (W / 2) / R;
  mctx.clearRect(0, 0, W, W);
  const tx = x => W / 2 + (x - player.x) * k, ty = y => W / 2 + (y - player.y) * k;
  mctx.strokeStyle = 'rgba(111,211,230,.12)'; mctx.beginPath(); mctx.arc(W / 2, W / 2, W / 2 - 4, 0, TAU); mctx.stroke(); mctx.beginPath(); mctx.arc(W / 2, W / 2, W / 4, 0, TAU); mctx.stroke();
  mctx.fillStyle = 'rgba(160,150,130,.35)';
  for (const a of Wd.asteroids) { const x = tx(a.x), y = ty(a.y); if (x > 0 && x < W && y > 0 && y < W) mctx.fillRect(x, y, 1.5, 1.5); }
  for (const s of STATIONS) { const x = tx(s.x), y = ty(s.y); if (x > -5 && x < W + 5 && y > -5 && y < W + 5) { mctx.fillStyle = FACTIONS[s.fac].color; mctx.fillRect(x - 3.5, y - 3.5, 7, 7); } }
  { const x = tx(BLACKMAW.x), y = ty(BLACKMAW.y); mctx.fillStyle = '#c07ae0'; if (x > -5 && x < W + 5 && y > -5 && y < W + 5) { mctx.beginPath(); mctx.arc(x, y, 5, 0, TAU); mctx.fill(); } }
  { const x = tx(0), y = ty(0); mctx.fillStyle = '#ff9a3d'; mctx.beginPath(); mctx.arc(x, y, 6, 0, TAU); mctx.fill(); }
  for (const s of Wd.ships) {
    if (s.isPlayer || isHidden(s, player)) continue; const x = tx(s.x), y = ty(s.y); if (x < 0 || x > W || y < 0 || y > W) continue;
    mctx.fillStyle = s.side === 'player' ? '#9fe8c8' : hostile(player, s) ? '#ff6a5c' : s.tag ? '#f0b44c' : '#8aa2b2'; const z = s.elite ? 6 : 3; mctx.fillRect(x - z / 2, y - z / 2, z, z);
  }
  for (const m of G.missions) { const p = missionPoint(m); let x = tx(p.x), y = ty(p.y); x = clamp(x, 4, W - 4); y = clamp(y, 4, W - 4); mctx.strokeStyle = '#f0b44c'; mctx.lineWidth = 1.5; mctx.strokeRect(x - 4, y - 4, 8, 8); }
  drawMiniDepth(tx, ty, W);
  mctx.save(); mctx.translate(W / 2, W / 2); mctx.rotate(player.a); mctx.fillStyle = '#6fd3e6'; mctx.beginPath(); mctx.moveTo(6, 0); mctx.lineTo(-4, -4); mctx.lineTo(-4, 4); mctx.fill(); mctx.restore();
}

// ───────────────────────── Sector map ─────────────────────────
const mapCv = $('mapCanvas'), mapCtx = mapCv.getContext('2d');
function drawMap() {
  if (typeof CON !== 'undefined' && CON.tab !== 'map') return;
  const r = mapCv.getBoundingClientRect(); if (!r.width || !r.height) return; const dpr = Math.min(2, devicePixelRatio || 1);
  if (mapCv.width !== Math.round(r.width * dpr)) { mapCv.width = Math.round(r.width * dpr); mapCv.height = Math.round(r.height * dpr); }
  const c = mapCtx, W = r.width, H = r.height; c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.fillStyle = '#070c12'; c.fillRect(0, 0, W, H);
  const k = Math.min(W, H) / 2 / (SECTOR_R * 1.04), ox = W / 2, oy = H / 2;
  const X = x => ox + x * k, Y = y => oy + y * k;
  c.strokeStyle = 'rgba(111,211,230,.07)'; c.lineWidth = 1;
  for (let i = 4000; i <= 16000; i += 4000) { c.beginPath(); c.arc(ox, oy, i * k, 0, TAU); c.stroke(); }
  c.strokeStyle = 'rgba(111,211,230,.25)'; c.setLineDash([4, 6]); c.beginPath(); c.arc(ox, oy, SECTOR_R * k, 0, TAU); c.stroke(); c.setLineDash([]);
  const g = c.createRadialGradient(ox, oy, 0, ox, oy, 900 * k); g.addColorStop(0, '#ffcf8a'); g.addColorStop(.4, '#ff7a3a'); g.addColorStop(1, 'rgba(255,80,40,0)');
  c.fillStyle = g; c.beginPath(); c.arc(ox, oy, 900 * k, 0, TAU); c.fill();
  c.font = "500 11px 'IBM Plex Mono', monospace"; c.textAlign = 'center';
  for (const b of BELTS) {
    c.fillStyle = 'rgba(170,150,120,.5)';
    if (b.ring) { c.strokeStyle = 'rgba(170,150,120,.18)'; c.lineWidth = b.w * 2 * k; c.beginPath(); c.arc(ox, oy, b.ring * k, 0, TAU); c.stroke(); c.lineWidth = 1; c.fillText(b.name.toUpperCase(), ox, Y(-b.ring) + 4); }
    else { c.fillStyle = 'rgba(170,150,120,.12)'; c.beginPath(); c.arc(X(b.x), Y(b.y), b.r * k, 0, TAU); c.fill(); c.fillStyle = 'rgba(200,180,150,.7)'; c.fillText(b.name.toUpperCase(), X(b.x), Y(b.y) + 4); }
  }
  c.fillStyle = 'rgba(200,180,150,.25)'; for (const a of Wd.asteroids) c.fillRect(X(a.x), Y(a.y), 1, 1);
  for (const s of STATIONS) {
    const col = FACTIONS[s.fac].color, x = X(s.x), y = Y(s.y);
    if (s.planet) { c.fillStyle = s.planet.c1; c.globalAlpha = .5; c.beginPath(); c.arc(X(s.x + s.planet.dx), Y(s.y + s.planet.dy), Math.max(3, s.planet.r * k), 0, TAU); c.fill(); c.globalAlpha = 1; }
    c.fillStyle = col; c.fillRect(x - 5, y - 5, 10, 10); c.strokeStyle = '#05070b'; c.strokeRect(x - 5, y - 5, 10, 10);
    c.fillStyle = '#d4e6ef'; c.font = "600 12px 'Saira', sans-serif"; c.fillText(s.name, x, y - 11);
    c.fillStyle = col; c.font = "500 10px 'IBM Plex Mono', monospace"; c.fillText(`${FACTIONS[s.fac].short} · ${repLabel(G.rep[s.fac])}${s.yard.length ? ' · shipyard' : ''}`, x, y + 18);
  }
  c.fillStyle = '#c07ae0'; c.beginPath(); c.arc(X(BLACKMAW.x), Y(BLACKMAW.y), 6, 0, TAU); c.fill();
  c.font = "600 12px 'Saira', sans-serif"; c.fillText('Blackmaw', X(BLACKMAW.x), Y(BLACKMAW.y) - 11);
  c.font = "500 10px 'IBM Plex Mono', monospace"; c.fillText('raider warren', X(BLACKMAW.x), Y(BLACKMAW.y) + 18);
  for (const m of G.missions) {
    const p = missionPoint(m), x = X(p.x), y = Y(p.y);
    c.strokeStyle = '#f0b44c'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y - 9); c.lineTo(x + 9, y); c.lineTo(x, y + 9); c.lineTo(x - 9, y); c.closePath(); c.stroke();
    c.fillStyle = '#f0b44c'; c.font = "500 11px 'IBM Plex Mono', monospace"; c.textAlign = 'left'; c.fillText(m.title, x + 13, y + 4); c.textAlign = 'center';
    c.setLineDash([3, 5]); c.strokeStyle = 'rgba(240,180,76,.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(X(player.x), Y(player.y)); c.lineTo(x, y); c.stroke(); c.setLineDash([]);
  }
  drawMapDepth(c, X, Y);
  for (const s of Wd.ships) if (!s.isPlayer && hostile(player, s) && !isHidden(s, player)) { c.fillStyle = 'rgba(255,106,92,.7)'; c.fillRect(X(s.x) - 1.5, Y(s.y) - 1.5, 3, 3); }
  for (const s of Wd.ships) if (s.elite) { c.fillStyle = '#ff6a5c'; c.font = "600 14px 'Saira', sans-serif"; c.textAlign = 'center'; c.fillText('★', X(s.x), Y(s.y) + 5); c.font = "500 10px 'IBM Plex Mono', monospace"; c.fillText(s.name, X(s.x), Y(s.y) + 18); }
  c.save(); c.translate(X(player.x), Y(player.y)); c.rotate(player.a); c.fillStyle = '#6fd3e6'; c.beginPath(); c.moveTo(10, 0); c.lineTo(-6, -6); c.lineTo(-3, 0); c.lineTo(-6, 6); c.fill(); c.restore();
  c.textAlign = 'left'; c.font = "500 11px 'IBM Plex Mono', monospace"; c.fillStyle = '#7d95a4';
  c.fillText('Grid rings every 4,000 su. ★ marks elite raiders. Dashed ring is the sector edge.', 14, H - 14);
}
