import { useCallback, useEffect, useRef, useState } from "react"

export const useLeaveGuard = (active, onBrowserBack) => {
  const [pending, setPending] = useState(null)
  const onBrowserBackRef = useRef(onBrowserBack)

  // M13 — 不在渲染期间改 ref。每次渲染同步最新回调，供 popstate 闭包读取。
  useEffect(() => {
    onBrowserBackRef.current = onBrowserBack
  })

  const requestLeave = useCallback((action) => {
    if (active) setPending(() => action)
    else action()
  }, [active])

  const stay = useCallback(() => setPending(null), [])

  const leave = useCallback(() => {
    const action = pending
    setPending(null)
    action?.()
  }, [pending])

  useEffect(() => {
    if (!active) return
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = "" }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [active])

  useEffect(() => {
    if (!active) return
    // 活动期间压入一个哨兵条目，阻止浏览器返回把用户带出应用。
    // M9 — 记住压入了多少，卸载时按数量精确弹回；之前这些条目永远留在
    // 栈里，导致离开会话后返回按钮“卡住”。
    let pushed = 0
    const push = () => {
      window.history.pushState({ leaveGuard: true }, "")
      pushed += 1
    }
    push()

    const onPopState = () => {
      // 用户按了返回 —— 重新压入以留在应用内，并打开离开确认提示。
      push()
      setPending(() => () => onBrowserBackRef.current?.())
    }
    window.addEventListener("popstate", onPopState)

    return () => {
      window.removeEventListener("popstate", onPopState)
      // 静默移除：先摘监听器再回退，避免回退触发的 popstate 再开提示。
      if (pushed > 0) window.history.go(-pushed)
    }
  }, [active])

  return { requestLeave, leavePromptOpen: Boolean(pending), stay, leave }
}