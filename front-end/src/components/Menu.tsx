import {
  Box,
  Button,
  Drawer,
  FormControlLabel,
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
import './Menu.css'

import { IconToolsContext } from './IconTools'
import { UserContext } from '../App'

interface AppPage {
  title: string
  url: string
  iconName: string
  keepQuery: string[]
}

const appPages: AppPage[] = [
  {
    title: 'Transactions',
    url: '/transactions',
    iconName: 'TbArrowsExchange',
    keepQuery: ['from', 'to', 'account', 'category'],
  },
  {
    title: 'Categories',
    url: '/categories',
    iconName: 'MdCategory',
    keepQuery: [],
  },
  {
    title: 'Accounts',
    url: '/accounts',
    iconName: 'MdAccountBalance',
    keepQuery: [],
  },
  {
    title: 'Account Balances',
    url: '/accounts/graph',
    iconName: 'MdAccountBalance',
    keepQuery: ['from', 'to', 'account', 'groupBy'],
  },
  {
    title: 'Currencies',
    url: '/currencies',
    iconName: 'BsCurrencyExchange',
    keepQuery: [],
  },
  {
    title: 'Trends',
    url: '/trends',
    iconName: 'BiSolidFileImport',
    keepQuery: [],
  },
  {
    title: 'Costs Analysis',
    url: '/costs',
    iconName: 'BiSolidFileImport',
    keepQuery: [],
  },
]

interface Props {
  children: ReactElement

  logout(): void
}

type DrawerActions = { open?(): void; anonymity: boolean }
export const DrawerContext = createContext<DrawerActions>({
  anonymity: false,
})

const DrawerWrapper: FC<Props> = ({ logout, children }) => {
  const location = useLocation()
  const query = new URLSearchParams(location.search)
  const navigate = useNavigate()

  const { email } = useContext(UserContext)
  const { iconTypeFromName } = useContext(IconToolsContext)

  const [open, setOpen] = useState(false)

  const iconStyle = { margin: '0.5rem' }

  const iOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)

  const [drawerWidth, setDrawerWidth] = useState(240)
  const [totalWidth, setTotalWidth] = useState(window.innerWidth)
  const [anonymity, setAnonymity] = useState(false)
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
              onClick={() => {
                for (const key of [...query.keys()]) {
                  if (!appPage.keepQuery.includes(key)) query.delete(key)
                }

                navigate(`${appPage.url}?${query.toString()}`)
              }}
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
      <Box p="1rem">
        <FormControlLabel
          control={<Switch onChange={(ev) => setAnonymity(ev.target.checked)} />}
          label="Anonymous Mode"
        />
      </Box>
    </div>
  )

  return (
    <DrawerContext.Provider
      value={{
        open: persistentDrawer ? undefined : () => setOpen(true),
        anonymity,
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
