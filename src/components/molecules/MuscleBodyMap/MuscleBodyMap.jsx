// Body map rendered exactly like openGym's BodyMap (AGPL-3.0, by DuarteSantos8):
// div.bodymap.tappable > svg.bm-v (front + back) > path.bm-sil (silhouette) +
// path.bm-m.l0-l4 (muscles, heat-shaded). Geometry is vendored in
// ../lib/body-paths.js (MuscleMap by Melih Colpan, MIT — see file header) and
// lazy-loaded so it stays out of the main bundle.

import { useEffect, useState } from "react"

import { localizedMuscleLabel,MUSCLES } from "../../../lib/muscleMap.js"

import "./MuscleBodyMap.css"

const INERT = ["head", "hair", "neck", "hands", "feet", "knees", "ankles"]

let CACHE = null
let PENDING = null

const useBodyPaths = () => {
  const [paths, setPaths] = useState(CACHE)
  useEffect(() => {
    if (CACHE) return
    let alive = true
    PENDING = PENDING || import("../../../lib/body-paths.js").then((m) => (CACHE = m.default))
    PENDING.then((p) => { if (alive) setPaths(p) }).catch(() => {})
    return () => { alive = false }
  }, [])
  return paths
}

const STATES = new Set(["ready", "recovering", "fatigued"])

const View = ({ view, levels, states, onSelect, selected }) => {
  const activate = (event, slug) => {
    if (event.key !== "Enter" && event.key !== " ") return
    if (event.key === " ") event.preventDefault()
    onSelect(slug)
  }
  return (
    <svg className="bm-v" viewBox={view.vb} role={onSelect ? "group" : "img"}>
      {INERT.map((slug) => (view.p[slug] || []).map((d, i) => (
        <path key={slug + i} className="bm-sil" d={d} />
      )))}
      {MUSCLES.map((slug) => (view.p[slug] || []).map((d, i) => (
        <path
          key={slug + i}
          className={"bm-m l" + (levels[slug] || 0) + (STATES.has(states[slug]) ? " st-" + states[slug] : "") + (selected === slug ? " sel" : "")}
          d={d}
          onClick={onSelect ? () => onSelect(slug) : undefined}
          onMouseDown={onSelect ? (e) => e.preventDefault() : undefined}
          onKeyDown={onSelect ? (event) => activate(event, slug) : undefined}
          role={onSelect ? "button" : undefined}
          tabIndex={onSelect ? 0 : undefined}
          aria-label={onSelect ? localizedMuscleLabel(slug) : undefined}
          aria-pressed={onSelect ? selected === slug : undefined}
        >
          <title>{localizedMuscleLabel(slug)}</title>
        </path>
      )))}
    </svg>
  )
}

/**
 * <MuscleBodyMap levels={{ chest: 3, … }} side="front" />
 * `levels` are shade steps 0-4 per muscle slug. `states` optionally carries
 * exact fatigue states ('ready' | 'recovering' | 'fatigued') rendered as
 * green / amber / red via `st-*` classes. `side` shows one view at a
 * time ('front' | 'back'). `modeClass` switches the heat scale: '' (volume,
 * blue), 'hm-fatigue' (fatigue views, red/amber with green ready states).
 */
export const MuscleBodyMap = ({ levels = {}, states = {}, selected = null, onSelect, modeClass = "", side = "front" }) => {
  const paths = useBodyPaths()
  const g = paths && paths.male
  const view = g ? (side === "back" ? g.back : g.front) : null
  return (
    <div className={`bodymap tappable ${modeClass}`.trim()}>
      {view ? (
        <View view={view} levels={levels} states={states} onSelect={onSelect} selected={selected} />
      ) : (
        <div className="bm-ph" aria-hidden="true" />
      )}
    </div>
  )
}
