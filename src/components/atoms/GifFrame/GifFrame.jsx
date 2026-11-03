import { useEffect, useRef, useState } from "react"

// 缓存:同一个 GIF 只提取一次第一帧
const frameCache = new Map()
const CANVAS_FLAG = "__canvas__"

// blob:/data: 和同源地址不需要 CORS
const needsCors = (url) => {
  if (/^(blob:|data:)/.test(url)) return false
  try {
    return new URL(url, window.location.href).origin !== window.location.origin
  } catch {
    return false
  }
}

const loadFirstFrame = async (url) => {
  const img = new Image()
  if (needsCors(url)) img.crossOrigin = "anonymous"
  img.src = url
  if (typeof img.decode === "function") {
    await img.decode()
  } else {
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
    })
  }
  const canvas = document.createElement("canvas")
  canvas.width = img.naturalWidth || 100
  canvas.height = img.naturalHeight || 100
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height)
  // 跨域且没有 CORS 头时会在这里抛错
  return canvas.toDataURL("image/png")
}

const GifCanvas = ({ src, alt = "" }) => {
  const ref = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    const img = new Image()
    img.src = src
    img
      .decode()
      .then(() => {
        if (!alive || !ref.current) return
        const canvas = ref.current
        canvas.width = img.naturalWidth || 100
        canvas.height = img.naturalHeight || 100
        canvas.getContext("2d").drawImage(img, 0, 0)
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [src])

  if (failed) return <img className="gif-frame" src={src} alt={alt} loading="lazy" />

  return (
    <canvas
      ref={ref}
      className="gif-frame"
      role="img"
      aria-label={alt}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover", // 如果你的 img 用的是 contain,这里改成 contain
        display: "block",
      }}
    />
  )
}

export const GifFrame = ({ src, alt = "" }) => {
  const [state, setState] = useState({
    src,
    frame: src ? frameCache.get(src) ?? null : null,
  })

  if (state.src !== src) {
    setState({ src, frame: frameCache.get(src) ?? null })
  }

  useEffect(() => {
    if (!src || frameCache.has(src) || state.frame) return undefined
    let alive = true
    loadFirstFrame(src)
      .then((dataUrl) => {
        frameCache.set(src, dataUrl)
        if (alive) setState({ src, frame: dataUrl })
      })
      .catch((err) => {
        console.warn("GifFrame 提取失败,改用 canvas 显示:", src, err)
        frameCache.set(src, CANVAS_FLAG)
        if (alive) setState({ src, frame: CANVAS_FLAG })
      })
    return () => {
      alive = false
    }
  }, [src, state.frame])

  if (!src) return null
  if (state.frame === CANVAS_FLAG) return <GifCanvas src={src} alt={alt} />
  if (state.frame) return <img className="gif-frame" src={state.frame} alt={alt} />
  return null
}