// Generic SVG line chart, adapted from openGym's
// frontend/src/components/LineChart.jsx (AGPL-3.0, by DuarteSantos8).
// Adapted: i18n and fmt helpers inlined, theme vars mapped to this app
// (--acc -> --accent, --label-2 -> --text-muted, --sep-op -> --border),
// per-point effort marks (m) and RIR invert mode omitted (unused here).
//
// points: [{ t: ms, y: num, note?: str }] sorted by t.
//   note extra text for that point's tooltip (e.g. the week's set count on
//   the effort curve, where volume + effort together are the reading).
// opts: { h, unit, color, axes, goal, invert }
// invert flips the y-axis so lower values plot higher (RIR: harder sets up).

import { useLayoutEffect, useRef, useState } from "react"

import { useTranslation } from "react-i18next"

import "./LineChart.css"

const W = 340 // viewBox width; the svg stretches to its container, height comes from `h`

const fmtNum = (v) => {
  const r = Math.round(v * 10) / 10
  return String(r)
}

const fmtDay = (t, showYear, locale) => {
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString(locale || "en-US", showYear
    ? { day: "numeric", month: "short", year: "numeric" }
    : { day: "numeric", month: "short" })
}

const fmtMonth = (date, locale) => {
  return date.toLocaleDateString(locale || "en-US", { month: "short" })
}

export const LineChart = ({ points, h = 150, unit = "", color = "var(--accent)", axes = true, goal = null, invert = false, locale }) => {
  const { t, i18n } = useTranslation()
  const resolvedLocale = locale || (i18n?.language?.toLowerCase?.().startsWith("zh") ? "zh-CN" : "en-US")
  const svgRef = useRef(null)
  const wrapRef = useRef(null)
  const tipRef = useRef(null)
  const [hover, setHover] = useState(null) // { x, y, t, v }

  // A new dataset has different coordinates and meaning, so never carry the previous
  // point selection into it (render-phase reset, re-rendered before commit).
  const [seenPoints, setSeenPoints] = useState(points)
  if (seenPoints !== points) {
    setSeenPoints(points)
    if (hover !== null) setHover(null)
  }

  // The tooltip is placed after layout, from its measured size, because the chart
  // lives in an overflow-clipped box: a fixed half-width offset hangs the label off
  // the edge on the first and last point, and the clip then eats it.
  // Writing straight to the node's style keeps this off the render path — hover
  // fires on every mouse move.
  useLayoutEffect(() => {
    const tip = tipRef.current
    const wrap = wrapRef.current
    if (!hover || !tip || !wrap) return
    const cw = wrap.clientWidth
    const ch = wrap.clientHeight
    const tw = tip.offsetWidth
    const th = tip.offsetHeight
    const M = 4 // breathing room against the clip
    const cx = (hover.x / W) * cw
    const cy = (hover.y / h) * ch
    tip.style.left = `${Math.max(M, Math.min(cw - tw - M, cx - tw / 2))}px`
    // Parked at the top, but dropped below the point when the point sits high
    // enough that the label would cover the very value it is reporting.
    tip.style.top = `${cy < th + 14 ? Math.min(ch - th - M, cy + 14) : M}px`
  })

  if (!points || points.length === 0) return <div className="empty small">{t("chart.empty")}</div>
  const H = h
  const P = { l: axes ? 34 : 8, r: 12, t: 10, b: axes ? 22 : 8 }
  const single = points.length === 1
  const pts = single ? [points[0], points[0]] : points
  const ys = pts.map((p) => p.y)
  let ymin = Math.min(...ys)
  let ymax = Math.max(...ys)
  if (goal != null && Number.isFinite(goal)) {
    ymin = Math.min(ymin, goal)
    ymax = Math.max(ymax, goal)
  }
  if (ymin === ymax) {
    ymin -= 1
    ymax += 1
  }
  const pad = (ymax - ymin) * 0.12
  ymin -= pad
  ymax += pad
  const t0 = pts[0].t
  const t1 = pts[pts.length - 1].t || t0 + 1
  const X = (t) => (t1 === t0 ? (P.l + W - P.r) / 2 : P.l + ((t - t0) / (t1 - t0)) * (W - P.l - P.r))
  const Y = (y) => {
    const f = (y - ymin) / (ymax - ymin)
    const g = invert ? f : 1 - f
    return P.t + g * (H - P.t - P.b)
  }

  const gridlines = []
  if (axes) {
    const range = ymax - ymin
    const raw = range / 3
    const pow = Math.pow(10, Math.floor(Math.log10(raw)))
    let step = 10 * pow
    for (const m of [1, 2, 2.5, 5, 10]) {
      if (raw <= m * pow) {
        step = m * pow
        break
      }
    }
    for (let v0 = Math.ceil(ymin / step) * step; v0 <= ymax + 1e-9; v0 += step) {
      // Snapped to the step, so adding it up never drifts, and `|| 0` turns the -0
      // that Math.ceil gives a range just under zero into a plain 0.
      const v = (Math.round(v0 / step) * step) || 0
      const y = Y(v)
      gridlines.push(
        <g key={`y${v}`}>
          <line x1={P.l} y1={y} x2={W - P.r} y2={y} stroke="var(--border)" strokeWidth="1" strokeDasharray="2 4" />
          <text x={P.l - 5} y={y + 3.5} textAnchor="end" fontSize="9.5" fill="var(--text-muted)">
            {fmtNum(v)}
          </text>
        </g>,
      )
    }
    const d0 = new Date(t0)
    const d1 = new Date(t1)
    const ticks = []
    let m = new Date(d0.getFullYear(), d0.getMonth() + 1, 1)
    while (m <= d1) {
      ticks.push({ t: +m, txt: fmtMonth(m, resolvedLocale) })
      m = new Date(m.getFullYear(), m.getMonth() + 1, 1)
    }
    if (ticks.length === 0 && !single) {
      // Sub-month span: a single centered month label instead of day+month ticks.
      const mid = t0 + (t1 - t0) / 2
      ticks.push({ t: mid, txt: fmtMonth(new Date(mid), resolvedLocale), anchor: "middle" })
    }
    const every = Math.max(1, Math.ceil(ticks.length / 7))
    ticks.forEach((tk, i) => {
      if (i % every) return
      const x = X(tk.t)
      gridlines.push(
        <g key={`x${i}`}>
          <line x1={x} y1={P.t} x2={x} y2={H - P.b} stroke="var(--border)" strokeWidth="1" strokeDasharray="2 4" />
          <text x={x} y={H - 7} textAnchor={tk.anchor || "middle"} fontSize="9.5" fill="var(--text-muted)">
            {tk.txt}
          </text>
        </g>,
      )
    })
  }

  const poly = pts.map((p) => `${X(p.t).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" ")
  const last = pts[pts.length - 1]
  const gid = `g${Math.round(t0 % 1e7)}_${H}`
  const showYear = new Set(points.map((p) => new Date(p.t).getFullYear())).size > 1
  const hoverPts = points.map((p) => ({ x: X(p.t), y: Y(p.y), t: p.t, v: p.y, note: p.note }))

  const onMove = (e) => {
    const c = e.touches ? e.touches[0] : e
    if (!c || c.clientX === undefined) return
    const r = svgRef.current.getBoundingClientRect()
    const w = r.width || W
    const vx = ((c.clientX - r.left) / w) * W
    let best = hoverPts[0]
    hoverPts.forEach((p) => {
      if (Math.abs(p.x - vx) < Math.abs(best.x - vx)) best = p
    })
    setHover(best)
  }

  return (
    <div
      className="chart-i"
      ref={wrapRef}
      onMouseMove={onMove}
      onMouseDown={onMove}
      onMouseLeave={() => setHover(null)}
      onTouchStart={onMove}
      onTouchMove={onMove}
    >
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ aspectRatio: `${W}/${H}` }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity=".28" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridlines}
        {goal != null && Number.isFinite(goal) && (
          <>
            <line x1={P.l} y1={Y(goal)} x2={W - P.r} y2={Y(goal)} stroke="var(--goal-strong)" strokeWidth="1.6" strokeDasharray="7 4" />
            <text x={W - P.r - 2} y={Y(goal) - 5} textAnchor="end" fontSize="9.5" fontWeight="700" fill="var(--goal-strong)">
              {fmtNum(goal)}
            </text>
          </>
        )}
        <polygon points={`${P.l},${H - P.b} ${poly} ${X(last.t).toFixed(1)},${H - P.b}`} fill={`url(#${gid})`} />
        <polyline points={poly} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={X(last.t)} cy={Y(last.y)} r="4" fill={color} />
        {hover && (
          <g>
            <line x1={hover.x} y1={P.t} x2={hover.x} y2={H - P.b} stroke="var(--text-muted)" strokeWidth="1" strokeDasharray="3 3" />
            <line x1={P.l} y1={hover.y} x2={W - P.r} y2={hover.y} stroke="var(--text-muted)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={hover.x} cy={hover.y} r="5" fill={color} stroke="var(--bg-elev)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover && (
        <div className="ctip" ref={tipRef}>
          {fmtDay(hover.t, showYear, resolvedLocale)} · {fmtNum(hover.v)}
          {unit ? ` ${unit}` : ""}{hover.note ? ` · ${hover.note}` : ""}
        </div>
      )}
    </div>
  )
}
