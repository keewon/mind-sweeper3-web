const Sound = (() => {
  let ctx = null;
  let muted = true; // default off

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function setMuted(v) { muted = v; }
  function isMuted() { return muted; }

  // Cascade: C-E-G ascending arpeggio, note count scales with cells opened
  function cascade(cellCount) {
    if (muted) return;
    const ac = getCtx();
    const now = ac.currentTime;
    const vol = 0.1;
    // C D E F G A B repeating up across octaves
    const pattern = [261.6, 293.7, 329.6, 349.2, 392.0, 440.0, 493.9]; // C4 D4 E4 F4 G4 A4 B4
    const noteCount = Math.min(Math.max(3, cellCount), 8);
    const dur = 0.08;

    for (let i = 0; i < noteCount; i++) {
      const octaveShift = Math.floor(i / 7);
      const freq = pattern[i % 7] * Math.pow(2, octaveShift);

      const osc = ac.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;

      const gain = ac.createGain();
      const start = now + i * dur;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.015);
      gain.gain.setValueAtTime(vol, start + dur * 0.6);
      gain.gain.linearRampToValueAtTime(0, start + dur + 0.05);

      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(start);
      osc.stop(start + dur + 0.05);
    }
  }

  // Win: 솔솔솔도~~ (Prince of Persia item pickup style)
  function win() {
    if (muted) return;
    const ac = getCtx();
    const now = ac.currentTime;
    const vol = 0.1;
    // G4 G4 G4 C5~~
    const notes = [
      [392, 0.12], // 솔
      [392, 0.12], // 솔
      [392, 0.12], // 솔
      [523, 0.8],  // 도~~
    ];

    let t = now;
    notes.forEach(([freq, dur]) => {
      const osc = ac.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;

      const gain = ac.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.015);
      gain.gain.setValueAtTime(vol, t + dur * 0.6);
      gain.gain.linearRampToValueAtTime(0, t + dur + 0.05);

      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t);
      osc.stop(t + dur + 0.05);
      t += dur;
    });
  }

  // Lose: 라솔라~~ 솔파미레, 도#~~레~~ (same triangle tone as cascade)
  function lose() {
    if (muted) return;
    const ac = getCtx();
    const now = ac.currentTime;
    const vol = 0.1;
    const notes = [
      [440,   0.15], // 라
      [392,   0.15], // 솔
      [440,   0.45], // 라~~
      [392,   0.15], // 솔
      [349.2, 0.15], // 파
      [329.6, 0.15], // 미
      [293.7, 0.20], // 레,
      [277.2, 0.45], // 도#~~
      [293.7, 0.45], // 레~~
    ];

    let t = now;
    notes.forEach(([freq, dur]) => {
      const osc = ac.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;

      const gain = ac.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.015);
      gain.gain.setValueAtTime(vol, t + dur * 0.6);
      gain.gain.linearRampToValueAtTime(0, t + dur + 0.05);

      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t);
      osc.stop(t + dur + 0.05);
      t += dur;
    });
  }

  return { cascade, win, lose, setMuted, isMuted };
})();
