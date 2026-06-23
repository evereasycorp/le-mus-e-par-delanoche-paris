/**
 * Ambiance sonore procédurale du Musée — WebAudio, sans dépendance externe,
 * 100 % libre de droits (synthèse locale).
 *
 *  - Ambient : bruit rose filtré (low-pass + très légère modulation) →
 *              souffle architectural d'un grand bâtiment de pierre.
 *  - Footstep : burst de bruit filtré + enveloppe percussive + courte
 *              réverbération → pas discret sur marbre.
 */

import { useEffect, useRef } from "react";

type AudioBundle = {
  ctx: AudioContext;
  master: GainNode;
  ambientGain: GainNode;
  reverb: ConvolverNode;
};

let shared: AudioBundle | null = null;
let ambientStarted = false;

function ensureContext(): AudioBundle | null {
  if (shared) return shared;
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();

  const master = ctx.createGain();
  master.gain.value = 0.85;
  master.connect(ctx.destination);

  // Petit convolver pour évoquer la réverbération d'un grand hall.
  const reverb = ctx.createConvolver();
  reverb.buffer = buildImpulseResponse(ctx, 1.6, 2.4);
  reverb.connect(master);

  const ambientGain = ctx.createGain();
  ambientGain.gain.value = 0; // démarre silencieux, on fade-in

  shared = { ctx, master, ambientGain, reverb };
  return shared;
}

function buildImpulseResponse(ctx: AudioContext, duration: number, decay: number) {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * duration);
  const impulse = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

function startAmbient(bundle: AudioBundle) {
  if (ambientStarted) return;
  ambientStarted = true;
  const { ctx, ambientGain, master } = bundle;

  // --- Pink noise via filtered white noise ---
  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  let b0 = 0,
    b1 = 0,
    b2 = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.963 * b1 + white * 0.299574;
    b2 = 0.57 * b2 + white * 1.0792;
    data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.11;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  noise.loop = true;

  // Filtrage : low-pass doux → souffle feutré
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 340;
  lp.Q.value = 0.4;

  // Légère modulation très lente (respiration du bâtiment)
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.06;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.015;
  lfo.connect(lfoGain).connect(ambientGain.gain);
  lfo.start();

  noise.connect(lp).connect(ambientGain).connect(master);
  noise.start();

  // Fade-in extrêmement progressif (4 s) jusqu'à un niveau très discret.
  const now = ctx.currentTime;
  ambientGain.gain.setValueAtTime(0, now);
  ambientGain.gain.linearRampToValueAtTime(0.04, now + 4);
}

/**
 * Pas discret sur marbre — burst de bruit filtré + petite réverb.
 */
export function playFootstep() {
  const bundle = ensureContext();
  if (!bundle) return;
  if (bundle.ctx.state === "suspended") bundle.ctx.resume().catch(() => {});

  const { ctx, master, reverb } = bundle;
  const now = ctx.currentTime;

  const len = Math.floor(ctx.sampleRate * 0.12);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.8);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;

  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 220;
  bp.Q.value = 0.9;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

  const wet = ctx.createGain();
  wet.gain.value = 0.5;

  src.connect(bp).connect(gain);
  gain.connect(master);
  gain.connect(wet).connect(reverb);
  src.start(now);
  src.stop(now + 0.18);
}

/**
 * Hook React : déclenche l'ambient audio au premier clic / touch utilisateur
 * (autoplay policy navigateur) et l'arrête quand le composant est démonté.
 */
export function useMuseumAudio(enabled: boolean) {
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const handler = () => {
      if (startedRef.current) return;
      const bundle = ensureContext();
      if (!bundle) return;
      if (bundle.ctx.state === "suspended") bundle.ctx.resume().catch(() => {});
      startAmbient(bundle);
      startedRef.current = true;
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
    window.addEventListener("pointerdown", handler, { once: false });
    window.addEventListener("keydown", handler, { once: false });

    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
  }, [enabled]);

  useEffect(() => {
    // Quand on quitte la visite, on coupe doucement l'ambiance.
    return () => {
      if (!shared) return;
      const { ctx, ambientGain } = shared;
      try {
        const now = ctx.currentTime;
        ambientGain.gain.cancelScheduledValues(now);
        ambientGain.gain.setValueAtTime(ambientGain.gain.value, now);
        ambientGain.gain.linearRampToValueAtTime(0, now + 0.6);
      } catch {
        /* ignore */
      }
    };
  }, []);
}
