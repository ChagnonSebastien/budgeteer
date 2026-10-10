import { useMediaQuery } from '@mui/material'
import { useContext } from 'react'

import { DrawerContext } from '../Menu'

const wideContentWidth = 1200

const useWideLayout = () => {
  const { drawerWidth } = useContext(DrawerContext)
  return useMediaQuery(`(min-width:${wideContentWidth + drawerWidth}px)`, { noSsr: true })
}

export default useWideLayout
