import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'dyornal.pageTurnSound';

/**
 * A short page-turn sound, synthesised rather than loaded from a file.
 *
 * A real recording would be a binary asset to ship and license; filtered noise
 * with a fast decay reads as paper convincingly enough at this length. The
 * preference is remembered, and the AudioContext is created on first use
 * because browsers refuse to start one before a user gesture.
 */
export function usePageTurn() {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'on';
    } catch {
      // Private browsing and blocked site data both throw here; silence is the
      // safer default when the preference cannot be read.
      return false;
    }
  });

  const contextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
    } catch {
      // Not persisting is acceptable; the toggle still works for this session.
    }
  }, [enabled]);

  const play = useCallback(() => {
    if (!enabled) return;
    try {
      const context = (contextRef.current ??= new AudioContext());
      if (context.state === 'suspended') void context.resume();

      const duration = 0.18;
      const frames = Math.floor(context.sampleRate * duration);
      const buffer = context.createBuffer(1, frames, context.sampleRate);
      const channel = buffer.getChannelData(0);

      // Noise under a decaying envelope — the rustle of a sheet being lifted.
      for (let i = 0; i < frames; i += 1) {
        const t = i / frames;
        channel[i] = (Math.random() * 2 - 1) * (1 - t) ** 3;
      }

      const source = context.createBufferSource();
      source.buffer = buffer;

      // Band-pass keeps it in the range paper actually occupies; without it the
      // noise reads as static.
      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2400;
      filter.Q.value = 0.7;

      const gain = context.createGain();
      gain.gain.value = 0.09;

      source.connect(filter).connect(gain).connect(context.destination);
      source.start();
    } catch {
      // Audio is a flourish; never let it break page navigation.
    }
  }, [enabled]);

  return { enabled, setEnabled, play };
}
