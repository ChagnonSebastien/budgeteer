import {
  Box,
  Button,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  SwipeableDrawer,
  Switch,
  Typography,
} from '@mui/material'
import { createContext, FC, ReactElement, useContext, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import { IconToolsContext, PreparedIcon } from './icons/IconTools'
import { UserContext } from '../App'
import UserStore from '../UserStore'

import '../styles/menu-tailwind.css'

const ContentContainer = styled.div<{ $persistentDrawer: boolean; $totalWidth: number; $drawerWidth: number }>`
  width: ${(props) => (props.$persistentDrawer ? `${props.$totalWidth - props.$drawerWidth}px` : '100%')};
  height: 100%;
  margin-left: ${(props) => (props.$persistentDrawer ? `${props.$drawerWidth}px` : 0)};
`

interface AppPage {
  title: string
  url: string
  iconName: string
  keepQuery: string[]
}

const appPages: AppPage[] = [
  {
    title: 'Dashboard',
    url: '/',
    iconName: PreparedIcon.TbLayoutDashboardFilled,
    keepQuery: [],
  },
  {
    title: 'Transactions',
    url: '/transactions',
    iconName: PreparedIcon.TbArrowsExchange,
    keepQuery: ['from', 'to', 'accounts', 'categories'],
  },
  {
    title: 'Categories',
    url: '/categories',
    iconName: PreparedIcon.MdCategory,
    keepQuery: [],
  },
  {
    title: 'Accounts',
    url: '/accounts',
    iconName: PreparedIcon.MdAccountBalance,
    keepQuery: [],
  },
  {
    title: 'Account Balances',
    url: '/accounts/graph',
    iconName: PreparedIcon.FaScaleUnbalanced,
    keepQuery: ['from', 'to', 'accounts', 'groupBy'],
  },
  {
    title: 'Currencies',
    url: '/currencies',
    iconName: PreparedIcon.BsCurrencyExchange,
    keepQuery: [],
  },
  {
    title: 'Currency Balances',
    url: '/currencies/graph',
    iconName: PreparedIcon.FaScaleUnbalanced,
    keepQuery: ['from', 'to', 'accounts'],
  },
  {
    title: 'Trends',
    url: '/trends',
    iconName: PreparedIcon.BiSolidBarChartAlt2,
    keepQuery: ['categories'],
  },
  {
    title: 'Costs Analysis',
    url: '/costs',
    iconName: PreparedIcon.BsFileEarmarkSpreadsheet,
    keepQuery: [],
  },
]

const userStore = new UserStore(localStorage)

interface Props {
  children: ReactElement

  logout(): void
}

type DrawerActions = {
  open?(): void
  privacyMode: boolean
  drawerWidth: number
}
export const DrawerContext = createContext<DrawerActions>({
  privacyMode: false,
  drawerWidth: 0,
})

const DrawerWrapper: FC<Props> = ({ logout, children }) => {
  const location = useLocation()
  const query = new URLSearchParams(location.search)
  const navigate = useNavigate()

  const { email } = useContext(UserContext)
  const { IconLib, iconTypeFromName } = useContext(IconToolsContext)

  const [open, setOpen] = useState(false)

  const iconStyle = { margin: '0.5rem', fontSize: '1.3rem' }

  const iOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)

  const [drawerWidth, setDrawerWidth] = useState(240)
  const [totalWidth, setTotalWidth] = useState(window.innerWidth)
  const [privacyMode, setPrivacyMode] = useState(userStore.getPrivacyMode())
  const persistentDrawer = totalWidth - drawerWidth > 600

  useEffect(() => {
    const callback = () => setTotalWidth(window.innerWidth)
    window.addEventListener('resize', callback)
    return () => window.removeEventListener('resize', callback)
  }, [])

  const drawer = (
    <div
      ref={(ref) => {
        if (ref != null) setDrawerWidth(ref.scrollWidth)
      }}
    >
      <Box className="menu-header">
        <Typography variant="h6" className="menu-title">
          Budget App
        </Typography>
        <Typography className="menu-email">{email}</Typography>
      </Box>
      <List className="menu-list">
        {appPages.map((appPage, index) => {
          const Icon = iconTypeFromName(appPage.iconName)
          const selected = location.pathname === appPage.url
          return (
            <ListItemButton
              key={index}
              onClick={() => {
                for (const key of [...query.keys()]) {
                  if (!appPage.keepQuery.includes(key)) query.delete(key)
                }

                navigate(`${appPage.url}?${query.toString()}`)
              }}
              selected={selected}
              className={`menu-item ${selected ? 'selected' : ''}`}
            >
              <ListItemIcon className={`menu-item-icon ${selected ? 'text-primary-500' : ''}`}>
                <Icon style={iconStyle} />
              </ListItemIcon>
              <ListItemText primary={appPage.title} className="menu-item-text" />
            </ListItemButton>
          )
        })}
      </List>
      <Box p="1rem">
        <Button fullWidth onClick={logout} variant="contained" disableElevation className="menu-logout-button">
          Logout
        </Button>
      </Box>
      <Divider className="menu-divider" />
      <List className="menu-list">
        <ListItemButton
          onClick={() => {
            const newValue = !privacyMode
            setPrivacyMode(newValue)
            userStore.upsertPrivacyMode(newValue)
          }}
          className="menu-privacy-item"
        >
          <ListItemIcon className={`menu-privacy-icon ${privacyMode ? 'active' : ''}`}>
            {privacyMode ? <IconLib.MdVisibilityOff style={iconStyle} /> : <IconLib.MdVisibility style={iconStyle} />}
          </ListItemIcon>
          <ListItemText primary="Privacy Mode" className={`menu-privacy-text ${privacyMode ? 'active' : ''}`} />
          <Switch edge="end" checked={privacyMode} className="menu-privacy-switch" />
        </ListItemButton>
      </List>
    </div>
  )

  return (
    <DrawerContext.Provider
      value={{
        open: persistentDrawer ? undefined : () => setOpen(true),
        privacyMode: privacyMode,
        drawerWidth: drawerWidth,
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

      <ContentContainer $persistentDrawer={persistentDrawer} $totalWidth={totalWidth} $drawerWidth={drawerWidth}>
        {children}
      </ContentContainer>
    </DrawerContext.Provider>
  )
}

export default DrawerWrapper
