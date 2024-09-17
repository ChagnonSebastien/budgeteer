import {
  Box,
  Button,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  SwipeableDrawer,
  Typography,
} from '@mui/material'
import { createContext, FC, ReactElement, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './Menu.css'

import { IconToolsContext } from './IconTools'
import { UserContext } from '../App'

interface AppPage {
  title: string
  url: string
  iconName: string
}

const appPages: AppPage[] = [
  {
    title: 'Transactions',
    url: '/transactions',
    iconName: 'TbArrowsExchange',
  },
  {
    title: 'Categories',
    url: '/categories',
    iconName: 'MdCategory',
  },
  {
    title: 'Accounts',
    url: '/accounts',
    iconName: 'MdAccountBalance',
  },
  {
    title: 'Account Balances',
    url: '/accounts/graph',
    iconName: 'MdAccountBalance',
  },
  {
    title: 'Currencies',
    url: '/currencies',
    iconName: 'BsCurrencyExchange',
  },
  {
    title: 'Costs Analysis',
    url: '/costs',
    iconName: 'BiSolidFileImport',
  },
]

interface Props {
  children: ReactElement

  logout(): void
}

type DrawerActions = { open?(): void }
export const DrawerContext = createContext<DrawerActions>({})

const DrawerWrapper: FC<Props> = ({ logout, children }) => {
  const location = useLocation()
  const navigate = useNavigate()

  const { email } = useContext(UserContext)
  const { iconTypeFromName } = useContext(IconToolsContext)

  const [open, setOpen] = useState(false)

  const iconStyle = { margin: '0.5rem' }

  const iOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)

  const [drawerWidth, setDrawerWidth] = useState(240)
  const [totalWidth, setTotalWidth] = useState(window.innerWidth)
  const persistentDrawer = totalWidth - drawerWidth > 600

  useEffect(() => {
    const callback = () => setTotalWidth(window.innerWidth)
    window.addEventListener('resize', callback)
    return () => window.removeEventListener('resize', callback)
  }, [])

  const drawer = (
    <div
      ref={(ref) => {
        if (ref) setDrawerWidth(ref.scrollWidth)
      }}
    >
      <Box p="1rem">
        <Typography variant="h6">Budget App</Typography>
        <Typography color="grey">{email}</Typography>
      </Box>
      <List>
        {appPages.map((appPage, index) => {
          const Icon = iconTypeFromName(appPage.iconName)
          return (
            <ListItemButton
              key={index}
              onClick={() => navigate(appPage.url)}
              selected={location.pathname === appPage.url}
            >
              <ListItemIcon>
                <Icon style={iconStyle} />
              </ListItemIcon>
              <ListItemText>{appPage.title}</ListItemText>
            </ListItemButton>
          )
        })}
      </List>
      <Box p="1rem">
        <Button fullWidth onClick={logout} variant="contained" disableElevation>
          Logout
        </Button>
      </Box>
    </div>
  )

  return (
    <DrawerContext.Provider
      value={{
        open: persistentDrawer ? undefined : () => setOpen(true),
      }}
    >
      {persistentDrawer ? (
        <Drawer open variant="permanent">
          {drawer}
        </Drawer>
      ) : (
        <SwipeableDrawer
          disableBackdropTransition={!iOS}
          disableDiscovery={iOS}
          open={open}
          onClose={() => setOpen(false)}
          onOpen={() => setOpen(true)}
          variant="temporary"
        >
          {drawer}
        </SwipeableDrawer>
      )}

      <div
        style={{
          width: persistentDrawer ? `${totalWidth - drawerWidth}px` : '100%',
          height: '100%',
          marginLeft: persistentDrawer ? `${drawerWidth}px` : 0,
        }}
      >
        {children}
      </div>
    </DrawerContext.Provider>
  )
}

export default DrawerWrapper
