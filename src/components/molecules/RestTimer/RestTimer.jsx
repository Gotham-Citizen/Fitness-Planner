import { useCallback, useEffect, useRef, useState } from "react"

import { useTranslation } from "react-i18next"

import { normalizeTimerSound, playTimerSound, vibrateTimerAlert } from "../../../lib/timerAlert.js"

import "./RestTimer.css"

import { Button } from "../../atoms/index.js"

const PRESETS = [30, 60, 90, 120, 180, 300]
const DEFAULT_SECS = 60

const loadEnabled = (exerciseId) => {
  try {
    const v = localStorage.getItem(`rest-enabled-${exerciseId}`)
    return v === null ? true : v === "1"
  } catch {
    return true
  }
}

const loadSecs = (exerciseId) => {
  try {
    const v = parseInt(localStorage.getItem(`rest-secs-${exerciseId}`), 10)
    return Number.isFinite(v) && v >= 5 && v <= 1800 ? v : DEFAULT_SECS
  } catch {
    return DEFAULT_SECS
  }
}

const formatClock = (totalSecs) => {
  const s = Math.max(0, Math.round(totalSecs))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, "0")}`
}

// Global rest-timer alert (Training preferences, account-synced):
// sound 'off'|'beep'|'chime'|'bell', vibrate on/off, flash on/off.
export const RestTimer = ({ exerciseId, initialSecs, initialEnabled, readOnly = false, onFinish, onStart, apiRef, ref, sound, vibrate, flash }) => {
  const { t } = useTranslation()
  const effectiveRef = apiRef ?? ref
  const [localEnabled, setLocalEnabled] = useState(() => loadEnabled(exerciseId))
  const [localSecs, setLocalSecs] = useState(() => loadSecs(exerciseId))
  const controlledEnabled = initialEnabled !== undefined ? Boolean(initialEnabled) : null
  const controlledSecs = (() => {
    if (initialSecs === undefined) return null
    const n = Number(initialSecs)
    return Number.isFinite(n) ? Math.min(1800, Math.max(5, Math.round(n))) : DEFAULT_SECS
  })()
  const enabled = controlledEnabled ?? localEnabled
  const secs = controlledSecs ?? localSecs
  const alertSound = normalizeTimerSound(sound)
  const alertVibrate = vibrate === undefined ? true : Boolean(vibrate)
  const alertFlash = flash === undefined ? false : Boolean(flash)
  const [remaining, setRemaining] = useState(null)
  const [justDone, setJustDone] = useState(false)
  const [flashing, setFlashing] = useState(false)
  const intervalRef = useRef(null)
  const remainingRef = useRef(null)
  const alertRef = useRef({ sound: alertSound, vibrate: alertVibrate, flash: alertFlash })
  const onFinishRef = useRef(onFinish)
  const onStartRef = useRef(onStart)

  useEffect(() => {
    alertRef.current = { sound: alertSound, vibrate: alertVibrate, flash: alertFlash }
  }, [alertSound, alertVibrate, alertFlash])

  useEffect(() => {
    onFinishRef.current = onFinish
  })

  useEffect(() => {
    onStartRef.current = onStart
  })

  const notifyDone = () => {
    try {
      onFinishRef.current?.()
    } catch {
      // parent unavailable — timer display still resolves
    }
  }

  const notifyStart = () => {
    try {
      onStartRef.current?.()
    } catch {
      // ignore
    }
  }

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const start = useCallback((s) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setJustDone(false)
    setFlashing(false)
    remainingRef.current = s
    setRemaining(s)
    intervalRef.current = setInterval(() => {
      const next = Math.max(0, (remainingRef.current ?? 1) - 1)
      remainingRef.current = next
      setRemaining(next)
      if (next <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        const alert = alertRef.current
        playTimerSound(alert.sound)
        if (alert.vibrate) vibrateTimerAlert()
        if (alert.flash) {
          setFlashing(true)
          setTimeout(() => setFlashing(false), 1300)
        }
        setJustDone(true)
        notifyDone()
        setTimeout(() => setJustDone(false), 6000)
      }
    }, 1000)
  }, [])

  // Starts a rest countdown. Returns false when the timer is off
  // (caller should proceed immediately instead of waiting).
  const startTimer = useCallback(() => {
    if (!enabled) return false
    start(secs)
    notifyStart()
    return true
  }, [enabled, secs, start])

  useEffect(() => {
    if (!effectiveRef) return
    const api = { start: startTimer, stop }
    if (typeof effectiveRef === "function") {
      effectiveRef(api)
      return () => {
        try {
          effectiveRef(null)
        } catch {
          // ignore
        }
      }
    }
    const target = effectiveRef
    /* eslint-disable-next-line react-hooks/immutability -- ref object populated intentionally */
    target.current = api
    return () => {
      try {
        if (target.current === api) target.current = null
      } catch {
        // ignore
      }
    }
  }, [effectiveRef, startTimer, stop])

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  const toggle = () => {
    if (readOnly || initialEnabled !== undefined) return
    const next = !enabled
    setLocalEnabled(next)
    try {
      localStorage.setItem(`rest-enabled-${exerciseId}`, next ? "1" : "0")
    } catch {
      // ignore
    }
    if (!next) {
      stop()
      setRemaining(null)
      setJustDone(false)
      setFlashing(false)
      notifyDone()
    }
  }

  const chooseSecs = (s) => {
    if (readOnly || initialSecs !== undefined) return
    if (!Number.isFinite(s) || s < 5 || s > 1800) return
    setLocalSecs(s)
    try {
      localStorage.setItem(`rest-secs-${exerciseId}`, String(s))
    } catch {
      // ignore
    }
  }

  const addTime = () => {
    if (remaining === null) {
      start(secs)
      notifyStart()
      return
    }
    const next = remaining + 15
    remainingRef.current = next
    setRemaining(next)
  }

  const skip = () => {
    stop()
    setRemaining(null)
    setJustDone(false)
    setFlashing(false)
    notifyDone()
  }

  const progress = remaining === null || secs <= 0 ? 0 : Math.min(1, remaining / secs)

  if (readOnly && !(enabled && (remaining !== null || justDone || flashing))) return null

  return (
    <div className="rest-timer">
      {flashing && <div className="rest-flash-overlay" aria-hidden="true" />}
      {!readOnly && (
      <div className="rest-timer-row">
        <button
          type="button"
          className={`rest-toggle ${enabled ? "is-on" : ""}`}
          onClick={toggle}
          aria-pressed={enabled}
          aria-label={t("rest.restAria", { state: enabled ? t("rest.on") : t("rest.off") })}
          title={enabled ? t("rest.restTitleOn") : t("rest.restTitleOff")}
        >
          ⏱ {enabled ? t("rest.on") : t("rest.off")}
        </button>
        {enabled && (
          <div className="rest-presets" role="group" aria-label={t("rest.restDuration")}>
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                className={`rest-preset ${secs === p ? "is-selected" : ""}`}
                onClick={() => chooseSecs(p)}
                aria-pressed={secs === p}
              >
                {p >= 60 ? `${p / 60}${t("rest.minUnit")}` : `${p}${t("rest.secUnit")}`}
              </button>
            ))}
            <input
              className="rest-custom"
              type="number"
              min="5"
              max="1800"
              value={secs}
              onChange={(e) => chooseSecs(parseInt(e.target.value, 10))}
              aria-label={t("rest.customRest")}
              title={t("rest.customRest")}
            />
          </div>
        )}
      </div>
      )}
      {enabled && (remaining !== null || justDone) && (
        <div className={`rest-countdown ${justDone ? "is-done" : ""}`}>
          <span className="rest-clock" role="timer">
            {justDone ? t("rest.done") : formatClock(remaining ?? secs)}
          </span>
          {!justDone && (
            <div className="rest-bar" aria-hidden="true">
              <div className="rest-bar-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          )}
          <div className="rest-countdown-actions">
            {!justDone && (
              <>
                <Button variant="ghost" size="rest-small" onClick={addTime}>
                  {t("rest.add15")}
                </Button>
                <Button variant="ghost" size="rest-small" onClick={skip}>
                  {t("rest.skip")}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
