import { CloseReason, OpenReason } from '@mui/material'
import { SyntheticEvent, useState } from 'react'

const usePinnableSpeedDial = () => {
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)

  const onOpen = (_: SyntheticEvent<object>, reason: OpenReason) => {
    setOpen(true)
    if (reason === 'toggle') setPinned(true)
  }

  const onClose = (_: SyntheticEvent<object>, reason: CloseReason) => {
    if (reason === 'mouseLeave' && pinned) return
    // A click on a dial opened by hover pins it instead of closing it.
    if (reason === 'toggle' && !pinned) {
      setPinned(true)
      return
    }
    setOpen(false)
    setPinned(false)
  }

  return { open, onOpen, onClose }
}

export default usePinnableSpeedDial
