import { Checkbox, IconButton, ListItemText, Menu, MenuItem } from '@mui/material'
import { FC, useContext, useState } from 'react'

import useCloseOnBack from './useCloseOnBack'
import { IconToolsContext } from '../icons/IconTools'

type Props = {
  hidden: boolean
  onToggle(): void
  label: string
}

const HideUnusedMenu: FC<Props> = ({ hidden, onToggle, label }) => {
  const { IconLib } = useContext(IconToolsContext)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  useCloseOnBack(anchorEl !== null, () => setAnchorEl(null))

  return (
    <>
      <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
        <IconLib.MdSettings size="1.5rem" />
      </IconButton>
      <Menu anchorEl={anchorEl} open={anchorEl !== null} onClose={() => setAnchorEl(null)}>
        <MenuItem
          onClick={() => {
            onToggle()
            setAnchorEl(null)
          }}
          sx={{ gap: 1 }}
        >
          <Checkbox checked={hidden} size="small" />
          <ListItemText primary={label} secondary="No balance and created over a month ago" />
        </MenuItem>
      </Menu>
    </>
  )
}

export default HideUnusedMenu
