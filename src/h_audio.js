
// ═══════════════ Sound: procedural sound effects and adaptive music (Web Audio, no sample files) ═══════════════
const AUD = { ac: null, master: null, sfx: null, music: null, mfilter: null, noise: null, last: {}, voices: 0,
  prefs: { muted: false, sfx: 0.8, music: 0.45 }, beam: null, engine: null, combat: null, padT: 0, chord: 0, nextNote: 0, step: 0, combatLvl: 0, wasVent: false };
try { const p = JSON.parse(localStorage.getItem('driftline-audio') || 'null'); if (p) Object.assign(AUD.prefs, p); } catch (e) { }
function audSavePrefs() { try { localStorage.setItem('driftline-audio', JSON.stringify(AUD.prefs)); } catch (e) { } }
function audInit() {
  if (AUD.ac) { if (AUD.ac.state === 'suspended') AUD.ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const ac = AUD.ac = new AC();
  AUD.master = ac.createGain(); AUD.master.connect(ac.destination);
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(AUD.master);
  AUD.sfx = ac.createGain(); AUD.sfx.connect(comp);
  AUD.mfilter = ac.createBiquadFilter(); AUD.mfilter.type = 'lowpass'; AUD.mfilter.frequency.value = 5000; AUD.mfilter.connect(comp);
  AUD.music = ac.createGain(); AUD.music.connect(AUD.mfilter);
  const len = ac.sampleRate; const buf = ac.createBuffer(1, len, ac.sampleRate); const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  AUD.noise = buf;
  audApplyVol();
  // continuous voices: beam hum and engine rumble
  const bo = ac.createOscillator(); bo.type = 'sawtooth'; const bo2 = ac.createOscillator(); bo2.type = 'sine';
  const bf = ac.createBiquadFilter(); bf.type = 'lowpass'; bf.frequency.value = 1600; const bg = ac.createGain(); bg.gain.value = 0;
  const lfo = ac.createOscillator(); lfo.frequency.value = 5.5; const vib = ac.createGain(); vib.gain.value = 0; lfo.connect(vib); vib.connect(bo.frequency); lfo.start();
  bo.connect(bf); bo2.connect(bf); bf.connect(bg); bg.connect(AUD.sfx); bo.start(); bo2.start(); AUD.beam = { o: bo, o2: bo2, g: bg, f: bf, vib };
  const en = ac.createBufferSource(); en.buffer = buf; en.loop = true; const ef = ac.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 260;
  const eo = ac.createOscillator(); eo.type = 'sine'; eo.frequency.value = 52; const eg = ac.createGain(); eg.gain.value = 0;
  en.connect(ef); ef.connect(eg); eo.connect(eg); eg.connect(AUD.sfx); en.start(); eo.start(); AUD.engine = { f: ef, g: eg, o: eo };
  AUD.combat = ac.createGain(); AUD.combat.gain.value = 0; AUD.combat.connect(AUD.music);
  AUD.nextNote = ac.currentTime + 0.1;
  setInterval(audMusicTick, 90);
}
function audApplyVol() {
  if (!AUD.ac) return; const P = AUD.prefs, t = AUD.ac.currentTime;
  AUD.master.gain.setTargetAtTime(P.muted ? 0 : 1, t, 0.05);
  AUD.sfx.gain.setTargetAtTime(P.sfx, t, 0.05); AUD.music.gain.setTargetAtTime(P.music * 0.9, t, 0.05);
  document.querySelectorAll('.sndLabel').forEach(s => { s.textContent = P.muted ? 'Sound off' : 'Sound on'; });
}
function toggleMute() { audInit(); AUD.prefs.muted = !AUD.prefs.muted; audSavePrefs(); audApplyVol(); }
window.addEventListener('pointerdown', audInit, { capture: true });
window.addEventListener('keydown', e => { audInit(); if (e.code === 'KeyN' && !e.repeat && !(e.target && e.target.tagName === 'INPUT')) toggleMute(); }, { capture: true });
document.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.hasAttribute('data-snd')) { toggleMute(); return; } sUI(); });
document.addEventListener('input', e => {
  if (e.target.id === 'volSfx') { AUD.prefs.sfx = +e.target.value / 100; audSavePrefs(); audApplyVol(); }
  if (e.target.id === 'volMusic') { AUD.prefs.music = +e.target.value / 100; audSavePrefs(); audApplyVol(); }
});

// ── building blocks ──
function audOK(key, gap) { if (!AUD.ac || AUD.prefs.muted || AUD.ac.state !== 'running') return false; const t = AUD.ac.currentTime; if (key && AUD.last[key] && t - AUD.last[key] < gap) return false; if (AUD.voices > 28) return false; if (key) AUD.last[key] = t; return true; }
function spatial(x, y) {
  if (x == null) return { v: 1, p: 0 };
  const dx = x - cam.x, dy = y - cam.y, d = Math.hypot(dx, dy);
  if (d > 2800) return { v: 0, p: 0 };
  return { v: 1 / (1 + (d / 650) ** 2), p: clamp(dx / 900, -1, 1) };
}
function out(vol, pan, dur) {
  const ac = AUD.ac, g = ac.createGain(); g.gain.value = 0;
  if (pan) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(AUD.sfx); } else g.connect(AUD.sfx);
  AUD.voices++; setTimeout(() => { AUD.voices--; }, (dur + 0.1) * 1000);
  return g;
}
function envG(g, t, peak, a, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function tone(dest, type, f0, f1, t, dur) { const o = AUD.ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); o.connect(dest); o.start(t); o.stop(t + dur + 0.05); return o; }
function noise(dest, t, dur, ftype, f0, f1, q) {
  const ac = AUD.ac, s = ac.createBufferSource(); s.buffer = AUD.noise; s.loop = true;
  const f = ac.createBiquadFilter(); f.type = ftype; f.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur); if (q) f.Q.value = q;
  s.connect(f); f.connect(dest); s.start(t, Math.random() * 0.8); s.stop(t + dur + 0.05);
}

// ── effects ──
function sShot(W, s, x, y) {
  const me = s && s.isPlayer, sp = me ? { v: 1, p: 0 } : spatial(x, y); if (sp.v < 0.04) return;
  const kind = W.missile ? (W.big ? 'torp' : 'msl') : W.dt === 'en' ? 'en' : W.spd > 1800 ? 'rail' : W.pellets ? 'scat' : W.s === 'M' ? 'heavy' : 'kin';
  if (!audOK(me ? 'p' + kind : 'a' + kind, me ? 0.03 : 0.045)) return;
  const t = AUD.ac.currentTime, v = sp.v * (me ? 1 : 0.55);
  if (kind === 'kin') { const g = out(v, sp.p, 0.12); envG(g, t, 0.22 * v, 0.002, 0.08); noise(g, t, 0.1, 'bandpass', 2200, 900, 0.9); const g2 = out(v, sp.p, 0.1); envG(g2, t, 0.18 * v, 0.002, 0.07); tone(g2, 'triangle', 150, 55, t, 0.08); }
  else if (kind === 'heavy') { const g = out(v, sp.p, 0.2); envG(g, t, 0.3 * v, 0.003, 0.16); noise(g, t, 0.18, 'bandpass', 1100, 300, 0.8); const g2 = out(v, sp.p, 0.2); envG(g2, t, 0.3 * v, 0.003, 0.16); tone(g2, 'sine', 110, 38, t, 0.16); }
  else if (kind === 'scat') { const g = out(v, sp.p, 0.2); envG(g, t, 0.32 * v, 0.002, 0.17); noise(g, t, 0.18, 'lowpass', 3000, 600); }
  else if (kind === 'rail') { const g = out(v, sp.p, 0.3); envG(g, t, 0.18 * v, 0.002, 0.26); tone(g, 'sawtooth', 2400, 160, t, 0.26); const g2 = out(v, sp.p, 0.1); envG(g2, t, 0.25 * v, 0.001, 0.06); noise(g2, t, 0.07, 'highpass', 3500); }
  else if (kind === 'en') { const g = out(v, sp.p, 0.18); envG(g, t, 0.1 * v, 0.003, 0.14); const lp = AUD.ac.createBiquadFilter(); lp.frequency.value = 3200; lp.connect(g); tone(lp, 'square', W.s === 'M' ? 760 : 1000, W.s === 'M' ? 170 : 320, t, 0.14); }
  else { const big = kind === 'torp'; const g = out(v, sp.p, big ? 0.7 : 0.4); envG(g, t, (big ? 0.28 : 0.18) * v, 0.04, big ? 0.6 : 0.32); noise(g, t, big ? 0.65 : 0.36, 'bandpass', big ? 200 : 400, big ? 900 : 2200, 1.2); }
}
function sBoom(x, y, r) {
  const sp = spatial(x, y); if (sp.v < 0.03) return;
  const small = r < 12; if (!audOK(small ? 'boomS' : 'boomL', small ? 0.04 : 0.06)) return;
  const t = AUD.ac.currentTime, v = sp.v, dur = 0.35 + Math.min(1.6, r / 30), pk = Math.min(1, 0.25 + r / 50) * v;
  const g = out(v, sp.p, dur); envG(g, t, pk * 0.8, 0.005, dur); noise(g, t, dur, 'lowpass', 2400, 140, 0.7);
  const g2 = out(v, sp.p, dur); envG(g2, t, pk, 0.005, dur * 0.9); tone(g2, 'sine', 90, 28, t, dur);
  if (r > 25) { const g3 = out(v, sp.p, dur + 0.4); envG(g3, t + 0.12, pk * 0.5, 0.05, dur); noise(g3, t + 0.12, dur, 'lowpass', 500, 80); }
}
function sHitPlayer(shield) {
  if (!audOK(shield ? 'pshield' : 'phull', 0.09)) return; const t = AUD.ac.currentTime;
  if (shield) { const g = out(1, 0, 0.2); envG(g, t, 0.07, 0.003, 0.16); tone(g, 'sine', 1500, 900, t, 0.16); const g2 = out(1, 0, 0.1); envG(g2, t, 0.05, 0.002, 0.06); noise(g2, t, 0.07, 'highpass', 5000); }
  else { const g = out(1, 0, 0.25); envG(g, t, 0.3, 0.003, 0.2); noise(g, t, 0.22, 'lowpass', 900, 200); const g2 = out(1, 0, 0.2); envG(g2, t, 0.25, 0.003, 0.16); tone(g2, 'sine', 85, 40, t, 0.16); }
}
function sHitMark() { if (!audOK('mark', 0.07)) return; const t = AUD.ac.currentTime, g = out(1, 0, 0.05); envG(g, t, 0.035, 0.001, 0.035); tone(g, 'triangle', 1700, 1500, t, 0.035); }
function sOverload() { if (!audOK('ovl', 1)) return; const t = AUD.ac.currentTime, g = out(1, 0, 0.8); envG(g, t, 0.2, 0.005, 0.7); const lp = AUD.ac.createBiquadFilter(); lp.frequency.value = 1800; lp.connect(g); tone(lp, 'sawtooth', 420, 50, t, 0.7); for (let i = 0; i < 5; i++) { const gc = out(1, 0, 0.06); envG(gc, t + i * 0.09, 0.12, 0.001, 0.04); noise(gc, t + i * 0.09, 0.05, 'bandpass', 3000, 3000, 2); } }
function sVent() { if (!audOK('vent', 0.5)) return; const t = AUD.ac.currentTime, g = out(1, 0, 1.2); envG(g, t, 0.12, 0.08, 1.0); noise(g, t, 1.1, 'highpass', 1500, 4000); }
function sNotes(freqs, type, gap, peak, decay, key, mgap) { if (!audOK(key, mgap)) return; const t = AUD.ac.currentTime; freqs.forEach((f, i) => { const g = out(1, 0, decay + gap * i + 0.1); envG(g, t + i * gap, peak, 0.005, decay); tone(g, type, f, f, t + i * gap, decay); }); }
function sPickup() { sNotes([880, 1320], 'sine', 0.06, 0.06, 0.12, 'pick', 0.08); }
function sChime() { sNotes([660, 880, 1320], 'sine', 0.07, 0.055, 0.45, 'chime', 0.35); }
function sAlert() { sNotes([880, 660], 'square', 0.1, 0.035, 0.08, 'alert', 1.2); }
function sUI() { if (!audOK('ui', 0.03)) return; const t = AUD.ac.currentTime, g = out(1, 0, 0.04); envG(g, t, 0.03, 0.001, 0.025); tone(g, 'sine', 1900, 1700, t, 0.025); }
function sScan() { if (!audOK('scan', 1)) return; const t = AUD.ac.currentTime; [0, 0.32, 0.64].forEach((d, i) => { const g = out(1, 0, 0.7 + d); envG(g, t + d, 0.14 / (i + 1), 0.005, 0.55); tone(g, 'sine', 1250, 620, t + d, 0.55); }); }
function sDock(inward) {
  if (!audOK('dock', 0.4)) return; const t = AUD.ac.currentTime;
  const g = out(1, 0, 0.4); envG(g, t, 0.28, 0.005, 0.32); tone(g, 'sine', 130, 48, t, 0.32);
  if (inward) [440, 554, 659].forEach((f, i) => { const g2 = out(1, 0, 1.4); envG(g2, t + 0.08 + i * 0.05, 0.03, 0.05, 1.2); tone(g2, 'sine', f, f, t + 0.08 + i * 0.05, 1.25); });
  else { const g3 = out(1, 0, 0.7); envG(g3, t, 0.12, 0.1, 0.5); noise(g3, t, 0.6, 'bandpass', 300, 1400, 1); }
}

// ── adaptive music: ambient pad always, combat pulse when hostiles are close ──
const PROG = [[45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59], [40, 47, 52, 55]];
const mf = m => 440 * 2 ** ((m - 69) / 12);
function audMusicTick() {
  const ac = AUD.ac; if (!ac || ac.state !== 'running') return;
  const t = ac.currentTime;
  if (t >= AUD.padT) {
    const ch = PROG[AUD.chord++ % PROG.length], dur = 10;
    const lp = ac.createBiquadFilter(); lp.frequency.value = 650; lp.Q.value = 0.6; const g = ac.createGain(); lp.connect(g); g.connect(AUD.music);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 3); g.gain.setValueAtTime(0.05, t + dur - 1); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 2.5);
    ch.forEach(m => [-6, 6].forEach(c => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mf(m); o.detune.value = c; o.connect(lp); o.start(t); o.stop(t + dur + 2.6); }));
    AUD.padT = t + dur - 1; AUD.root = ch[0];
  }
  const beat = 60 / 104 / 2;
  while (AUD.nextNote < t + 0.25) {
    const n = AUD.nextNote, i = AUD.step++;
    if (AUD.combatLvl > 0.02) {
      const root = (AUD.root || 45) - 12, pat = [0, 0, 7, 0, 10, 0, 7, 12];
      const g = ac.createGain(); g.connect(AUD.combat); const lp = ac.createBiquadFilter(); lp.frequency.value = 520; lp.connect(g);
      envG(g, n, 0.12, 0.004, beat * 0.9); tone(lp, 'square', mf(root + pat[i % 8]), mf(root + pat[i % 8]), n, beat * 0.9);
      if (i % 2 === 0) { const k = ac.createGain(); k.connect(AUD.combat); envG(k, n, 0.32, 0.002, 0.2); tone(k, 'sine', 130, 42, n, 0.2); }
      else { const h = ac.createGain(); h.connect(AUD.combat); envG(h, n, 0.05, 0.001, 0.04); noise(h, n, 0.05, 'highpass', 7000); }
    }
    AUD.nextNote += beat;
  }
}
function audioFrame() {
  if (!AUD.ac || AUD.ac.state !== 'running') return;
  const t = AUD.ac.currentTime, p = player;
  const flying = mode === 'play' && p && !p.dead;
  // engine rumble
  const thr = flying ? p.thrustVis : 0;
  AUD.engine.g.gain.setTargetAtTime(thr * (p && p.burn ? 0.16 : 0.09), t, 0.08);
  AUD.engine.f.frequency.setTargetAtTime(p && p.burn ? 900 : 260, t, 0.2);
  AUD.engine.o.frequency.setTargetAtTime(p && p.burn ? 70 : 52, t, 0.2);
  // beam hum
  const beams = flying ? p.ws.filter(w => w && w.firing) : [];
  const mining = beams.some(w => WEAPONS[w.id].mine);
  // Tactical laser gets a soft, rounded tone; mining and heavy beams keep their grittier buzz.
  const heavy = beams.some(w => WEAPONS[w.id].s === 'M' && !WEAPONS[w.id].mine), soft = beams.length && !mining && !heavy;
  const wave = soft ? 'sine' : 'sawtooth'; if (AUD.beam.o.type !== wave) AUD.beam.o.type = wave;
  AUD.beam.f.frequency.setTargetAtTime(soft ? 380 : 1600, t, 0.05);
  AUD.beam.g.gain.setTargetAtTime(beams.length ? (soft ? 0.014 + 0.004 * beams.length : 0.05 + 0.012 * beams.length) : 0, t, soft ? 0.09 : 0.03);
  const bf = mining ? 520 : heavy ? 210 : 147;
  AUD.beam.o.frequency.setTargetAtTime(bf, t, 0.05); AUD.beam.o2.frequency.setTargetAtTime(soft ? bf * 0.5 : bf * 2.01, t, 0.05);
  AUD.beam.vib.gain.setTargetAtTime(soft ? 1.5 : 0, t, 0.1);
  // vent
  if (flying && p.venting && !AUD.wasVent) sVent(); AUD.wasVent = !!(p && p.venting);
  // combat intensity and docked muffling
  let threat = 0;
  if (flying) for (const s of Wd.ships) if (!s.dead && !isPS(s) && hostile(p, s) && !isHidden(s, p) && d2(s, p) < 1700 * 1700) { threat = 1; break; }
  AUD.combatLvl += ((threat ? 1 : 0) - AUD.combatLvl) * 0.02;
  AUD.combat.gain.setTargetAtTime(AUD.combatLvl * 0.9, t, 0.3);
  AUD.mfilter.frequency.setTargetAtTime(mode === 'dock' ? 900 : mode === 'title' ? 2200 : 5000, t, 0.4);
}

// ── hooks into the game (wrap existing functions) ──
{
  const _spawnProj = spawnProj; spawnProj = function (s, W, x, y, a) { const r = _spawnProj.apply(this, arguments); try { sShot(W, s, x, y); } catch (e) { } return r; };
  const _explosion = explosion; explosion = function (x, y, r) { _explosion.apply(this, arguments); try { sBoom(x, y, r); } catch (e) { } };
  const _applyHit = applyHit; applyHit = function (t, dmg, dtype, fx, fy, owner) {
    const f0 = t.flux, o0 = t.overload; _applyHit.apply(this, arguments);
    try { if (t.isPlayer) { sHitPlayer(t.flux > f0); if (o0 <= 0 && t.overload > 0) sOverload(); } else if (owner && owner.isPlayer) sHitMark(); } catch (e) { }
  };
  const _log = log; log = function (msg, cls) { _log.apply(this, arguments); try { if (cls === 'gold') sChime(); else if (cls === 'bad') sAlert(); else if (/^\+/.test(msg)) sPickup(); } catch (e) { } };
  const _doScan = doScan; doScan = function () { const before = Wd.scanCd || 0; _doScan.apply(this, arguments); try { if (before <= 0) sScan(); } catch (e) { } };
  const _openDock = openDock; openDock = function () { _openDock.apply(this, arguments); try { sDock(true); } catch (e) { } };
  const _openOutpost = openOutpost; openOutpost = function () { _openOutpost.apply(this, arguments); try { sDock(true); } catch (e) { } };
  const _undock = undock; undock = function () { const was = mode; _undock.apply(this, arguments); try { if (was === 'dock') sDock(false); } catch (e) { } };
  const _update = update; update = function (dt) { _update.apply(this, arguments); try { audioFrame(); } catch (e) { } };
  setInterval(() => { if (mode !== 'play') try { audioFrame(); } catch (e) { } }, 200);
}

document.querySelectorAll('.sndLabel').forEach(s => { s.textContent = AUD.prefs.muted ? 'Sound off' : 'Sound on'; });
