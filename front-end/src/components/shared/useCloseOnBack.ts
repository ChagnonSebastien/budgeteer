import { useCallback, useEffect, useRef } from 'react'
import { NavigateOptions, To, useNavigate } from 'react-router-dom'

const MARKER = 'closeOnBackDepth'

const openEntries: { close: () => void }[] = []
let pushedDepth = 0
let ignoredPops = 0
let reconcileScheduled = false
let urlChangedUnderDialog: string | null = null
let afterDialogEntriesRemoved: (() => void) | null = null

const currentDepth = (): number => window.history.state?.usr?.[MARKER] ?? 0
const currentUrl = () => `${window.location.pathname}${window.location.search}${window.location.hash}`

// Popping a dialog entry restores the URL of the entry below, which predates changes made while it was open.
const carryUrlDown = () => {
  if (urlChangedUnderDialog === null) return
  const url = urlChangedUnderDialog
  if (pushedDepth === 0) urlChangedUnderDialog = null
  if (currentUrl() === url) return

  window.history.replaceState(window.history.state, '', url)
  ignoredPops += 1
  // Lets the router pick up the replaced URL.
  window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }))
}

const reconcile = () => {
  reconcileScheduled = false
  // The user navigated away while a dialog was open: our entries are buried, leave them.
  if (pushedDepth > 0 && currentDepth() !== pushedDepth) {
    pushedDepth = 0
    urlChangedUnderDialog = null
  }

  while (pushedDepth < openEntries.length) {
    pushedDepth += 1
    const state = window.history.state ?? {}
    window.history.pushState({ ...state, usr: { ...state.usr, [MARKER]: pushedDepth } }, '')
  }
  if (pushedDepth > openEntries.length) {
    const steps = pushedDepth - openEntries.length
    pushedDepth = openEntries.length
    ignoredPops += 1
    window.history.go(-steps)
  }
}

const scheduleReconcile = () => {
  if (reconcileScheduled) return
  reconcileScheduled = true
  queueMicrotask(reconcile)
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (ignoredPops > 0) {
      ignoredPops -= 1
      const pending = afterDialogEntriesRemoved
      afterDialogEntriesRemoved = null
      carryUrlDown()
      // After every popstate listener, the router's included, has seen this pop.
      if (pending) setTimeout(pending, 0)
      return
    }
    const depth = currentDepth()
    if (depth >= pushedDepth) return

    pushedDepth = depth
    openEntries
      .slice(depth)
      .reverse()
      .forEach((entry) => entry.close())
    carryUrlDown()
    scheduleReconcile()
  })
}

export const hasCloseOnBackOpen = () => openEntries.length > 0

const leaveDialogEntriesThen = (action: () => void) => {
  if (pushedDepth === 0 || currentDepth() !== pushedDepth) return action()
  // Navigating on top of dialog entries would bury them under the new page, costing an extra back press.
  const steps = pushedDepth
  pushedDepth = 0
  afterDialogEntriesRemoved = action
  ignoredPops += 1
  window.history.go(-steps)
}

export const useNavigateFromDialog = () => {
  const navigate = useNavigate()
  return useCallback(
    (to: To | number, options?: NavigateOptions) =>
      leaveDialogEntriesThen(() => (typeof to === 'number' ? navigate(to) : navigate(to, options))),
    [navigate],
  )
}

export const noteUrlChangeUnderDialog = (url: string) => {
  urlChangedUnderDialog = url
}

const useCloseOnBack = (open: boolean, onClose: () => void) => {
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const entry = { close: () => onCloseRef.current() }
    openEntries.push(entry)
    scheduleReconcile()
    return () => {
      openEntries.splice(openEntries.indexOf(entry), 1)
      scheduleReconcile()
    }
  }, [open])
}

export default useCloseOnBack
