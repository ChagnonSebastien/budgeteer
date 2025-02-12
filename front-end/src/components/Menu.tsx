import {
  alpha,
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

import { IconToolsContext, PreparedIcon } from './IconTools'
import { UserContext } from '../App'
import UserStore from '../UserStore'

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
    title: 'Currencies',
    url: '/currencies',
    iconName: PreparedIcon.BsCurrencyExchange,
    keepQuery: [],
  },
  {
    title: 'Account Balances',
    url: '/accounts/graph',
    iconName: PreparedIcon.FaScaleUnbalanced,
    keepQuery: ['from', 'to', 'accounts', 'groupBy'],
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
      <Box
        p="1.5rem"
        sx={{
          background: (theme) => `linear-gradient(${alpha(theme.palette.primary.main, 0.05)}, transparent)`,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            letterSpacing: '0.5px',
            mb: 1,
          }}
        >
          Budget App
        </Typography>
        <Typography
          sx={{
            color: (theme) => alpha(theme.palette.common.white, 0.6),
            fontSize: '0.9rem',
          }}
        >
          {email}
        </Typography>
      </Box>
      <List sx={{ px: '0.5rem', py: '0.5rem' }}>
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
              sx={{
                borderRadius: '8px',
                mb: 0.5,
                transition: 'all 0.2s',
                '&.Mui-selected': {
                  backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.15),
                  '&:hover': {
                    backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.2),
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'primary.main',
                  },
                  '& .MuiTypography-root': {
                    fontWeight: 500,
                    color: 'primary.main',
                  },
                },
                '&:hover': {
                  backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: '42px',
                  color: (theme) => (selected ? theme.palette.primary.main : alpha(theme.palette.common.white, 0.7)),
                  transition: 'color 0.2s',
                }}
              >
                <Icon style={iconStyle} />
              </ListItemIcon>
              <ListItemText
                primary={appPage.title}
                sx={{
                  '& .MuiTypography-root': {
                    transition: 'color 0.2s, font-weight 0.2s',
                  },
                }}
              />
            </ListItemButton>
          )
        })}
      </List>
      <Box p="1rem">
        <Button
          fullWidth
          onClick={logout}
          variant="contained"
          disableElevation
          sx={{
            py: '0.8rem',
            textTransform: 'none',
            fontWeight: 500,
            borderRadius: '8px',
            transition: 'all 0.2s',
            opacity: 0.9,
            '&:hover': {
              opacity: 1,
            },
          }}
        >
          Logout
        </Button>
      </Box>
      <Divider sx={{ opacity: 0.1 }} />
      <List sx={{ px: '0.5rem' }}>
        <ListItemButton
          onClick={() => {
            const newValue = !privacyMode
            setPrivacyMode(newValue)
            userStore.upsertPrivacyMode(newValue)
          }}
          sx={{
            borderRadius: '8px',
            py: 1.5,
            transition: 'background-color 0.2s',
            '&:hover': {
              backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: '42px',
              color: (theme) => (privacyMode ? theme.palette.primary.main : alpha(theme.palette.common.white, 0.7)),
              transition: 'color 0.2s',
            }}
          >
            {privacyMode ? <IconLib.MdVisibilityOff style={iconStyle} /> : <IconLib.MdVisibility style={iconStyle} />}
          </ListItemIcon>
          <ListItemText
            primary="Privacy Mode"
            sx={{
              '& .MuiTypography-root': {
                fontWeight: 500,
                color: (theme) => (privacyMode ? theme.palette.primary.main : 'inherit'),
                transition: 'color 0.2s',
              },
            }}
          />
          <Switch
            edge="end"
            checked={privacyMode}
            sx={{
              width: 42,
              height: 24,
              padding: 0,
              '& .MuiSwitch-switchBase': {
                padding: 0,
                margin: '2px',
                transition: 'transform 0.2s',
                '&.Mui-checked': {
                  transform: 'translateX(18px)',
                  color: (theme) => alpha(theme.palette.primary.main, 0.9),
                  '& + .MuiSwitch-track': {
                    opacity: 0.3,
                    backgroundColor: (theme) => theme.palette.primary.main,
                  },
                },
              },
              '& .MuiSwitch-track': {
                borderRadius: 12,
                opacity: 0.1,
                backgroundColor: (theme) => theme.palette.common.white,
              },
              '& .MuiSwitch-thumb': {
                width: 20,
                height: 20,
                backgroundColor: (theme) => alpha(theme.palette.common.white, 0.9),
              },
            }}
          />
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
