import { useEffect, useCallback } from "react";

let notificationAudioContext: AudioContext | null = null;
let isAudioUnlocked = false;

function unlockAudio() {
  if (isAudioUnlocked) return;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;

  notificationAudioContext ??= new AudioContextClass();
  if (notificationAudioContext.state === "suspended") {
    void notificationAudioContext.resume();
  }
  
  const oscillator = notificationAudioContext.createOscillator();
  const gain = notificationAudioContext.createGain();
  gain.gain.value = 0;
  oscillator.connect(gain);
  gain.connect(notificationAudioContext.destination);
  oscillator.start(0);
  oscillator.stop(0.01);

  isAudioUnlocked = true;
  document.removeEventListener("click", unlockAudio);
  document.removeEventListener("touchstart", unlockAudio);
  document.removeEventListener("keydown", unlockAudio);
}

export function useNotificationSound() {
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.addEventListener("click", unlockAudio);
      document.addEventListener("touchstart", unlockAudio);
      document.addEventListener("keydown", unlockAudio);
    }
    return () => {
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    notificationAudioContext ??= new AudioContextClass();
    void notificationAudioContext.resume().then(() => {
      const audioContext = notificationAudioContext;
      if (!audioContext) return;

      const now = audioContext.currentTime;
      [880, 1174, 1568].forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const start = now + index * 0.12;
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.4);
      });
    });
  }, []);

  return { playNotificationSound };
}
