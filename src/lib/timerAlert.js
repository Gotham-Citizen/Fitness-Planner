// Global rest-timer alert primitives (openGym-style: sound, vibrate, flash).
// Shared by RestTimer (fires on countdown end) and the Training preferences
// "Test alert" button so both play the exact same alert.

export const TIMER_SOUNDS = ["beep", "chime", "bell"]

// Legacy 'off' values are still accepted (mapped to silent) so old profiles
// keep working; new writes use timerPlaySound instead.
export const normalizeTimerSound = (value) => {
  const v = String(value ?? "").trim().toLowerCase()
  if (v === "off") return "off"
  return TIMER_SOUNDS.includes(v) ? v : "beep"
}

/** Effective sound for the timer: 'off' when muted by toggle or legacy value. */
export const resolveAlertSound = (playOn, sound) => {
  if (!playOn) return "off"
  const s = normalizeTimerSound(sound)
  return s === "off" ? "off" : s
}

export const isAlertSoundOn = (playOn, sound) => {
  return resolveAlertSound(playOn, sound) !== "off"
}

const playTone = (ctx, { freq, at, dur, type = "sine", peak = 0.4 }) => {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.001, at)
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.05)
  gain.gain.exponentialRampToValueAtTime(0.001, at + dur)
  osc.start(at)
  osc.stop(at + dur + 0.05)
}

export const playTimerSound = (sound) => {
  if (normalizeTimerSound(sound) === "off") return
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const t = ctx.currentTime
    if (sound === "chime") {
      playTone(ctx, { freq: 660, at: t, dur: 0.35 })
      playTone(ctx, { freq: 990, at: t + 0.22, dur: 0.5 })
    } else if (sound === "bell") {
      playTone(ctx, { freq: 520, at: t, dur: 1.1, type: "triangle", peak: 0.5 })
      playTone(ctx, { freq: 1040, at: t, dur: 0.7, type: "sine", peak: 0.2 })
    } else {
      playTone(ctx, { freq: 880, at: t, dur: 0.6 })
    }
    setTimeout(() => {
      try {
        ctx.close()
      } catch {
        // ignore
      }
    }, 1600)
  } catch {
    // audio unavailable — vibrate/flash still fire
  }
}

export const vibrateTimerAlert = () => {
  try {
    navigator.vibrate?.([200, 100, 200])
  } catch {
    // ignore (desktop browsers have no vibrator)
  }
}
