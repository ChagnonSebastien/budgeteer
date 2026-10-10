import { Box, SxProps, Theme } from '@mui/material'
import { FC, useLayoutEffect, useRef, useState } from 'react'

// A floating + button over the end of the scroll area: 56px button plus its 16px offset.
const floatingButtonClearance = '72px'

const ScrollEndSpacer: FC<{ sx?: SxProps<Theme> }> = ({ sx }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)
  const [hasFloatingButton, setHasFloatingButton] = useState(false)

  useLayoutEffect(() => {
    const spacer = ref.current
    const container = spacer?.parentElement
    if (!spacer || !container) return

    // Measured without the spacer's own height, otherwise showing it would keep itself shown.
    const update = () => {
      setShow(container.scrollHeight - spacer.offsetHeight > container.clientHeight + 1)
      setHasFloatingButton(
        Array.from(document.querySelectorAll('.MuiFab-root')).some((fab) => {
          const button = fab.getBoundingClientRect()
          const area = container.getBoundingClientRect()
          return button.left < area.right && button.right > area.left && button.bottom >= area.bottom - 120
        }),
      )
    }

    const resizeObserver = new ResizeObserver(update)
    const observeChildren = () => {
      resizeObserver.disconnect()
      resizeObserver.observe(container)
      for (const child of Array.from(container.children)) {
        if (child !== spacer) resizeObserver.observe(child)
      }
      update()
    }
    const mutationObserver = new MutationObserver(observeChildren)
    mutationObserver.observe(container, { childList: true })
    observeChildren()

    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [])

  const height = hasFloatingButton ? `calc(2rem + ${floatingButtonClearance})` : '2rem'
  // Full width: Firefox leaves zero-width boxes out of the scrollable area.
  return (
    <Box
      ref={ref}
      aria-hidden
      sx={[{ flexShrink: 0, alignSelf: 'stretch', height: show ? height : 0 }, ...(Array.isArray(sx) ? sx : [sx])]}
    />
  )
}

export default ScrollEndSpacer
