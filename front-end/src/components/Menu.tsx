import {
  Box,
  Button,
  Divider,
  Drawer,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  SwipeableDrawer,
  Switch,
  Typography,
} from '@mui/material'
import { createContext, FC, ReactElement, useContext, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { default as styled } from 'styled-components'

import { UserContext } from '../App'
import UserStore from '../UserStore'
import { IconToolsContext, PreparedIcon } from './icons/IconTools'
import { useElementDimensions, useWindowDimensions } from './shared/useDimensions'

interface MenuElement {
  readonly Element: FC
}

class AppPage implements MenuElement {
  constructor(
    private title: string,
    private url: string,
    private iconName: string,
    private keepQuery: string[],
  ) {}

  get Element() {
    return () => {
      const location = useLocation()
      const navigate = useNavigate()
      const { iconTypeFromName } = useContext(IconToolsContext)

      const Icon = iconTypeFromName(this.iconName)
      const selected = location.pathname === this.url

      return (
        <ListItemButton
          key={`menu-element-${this.title}`}
          onClick={() => {
            const query = new URLSearchParams(location.search)
            for (const key of [...query.keys()]) {
              if (!this.keepQuery.includes(key)) query.delete(key)
            }

            navigate(`${this.url}?${query.toString()}`)
          }}
          selected={selected}
        >
          <ListItemIcon style={{ minWidth: '42px' }}>
            <Icon style={{ margin: '0.5rem', fontSize: '1.3rem' }} />
          </ListItemIcon>
          <ListItemText primary={this.title} />
        </ListItemButton>
      )
    }
  }
}

class Subsection implements MenuElement {
  constructor(private title: string) {}

  get Element() {
    return () => (
      <ListItemButton disabled sx={{ paddingBottom: 0, paddingLeft: '1.5rem' }}>
        <ListItemText primary={this.title} />
      </ListItemButton>
    )
  }
}

class Separator implements MenuElement {
  get Element() {
    return () => <Divider sx={{ margin: '0.5rem 0' }} />
  }
}

const ContentContainer = styled.div<{ $persistentDrawer: boolean; $totalWidth: number; $drawerWidth: number }>`
  width: ${(props) => (props.$persistentDrawer ? `${props.$totalWidth - props.$drawerWidth}px` : '100%')};
  height: 100%;
  margin-left: ${(props) => (props.$persistentDrawer ? `${props.$drawerWidth}px` : 0)};
`

const appPages = [
  new AppPage('Dashboard', '/', PreparedIcon.TbLayoutDashboardFilled, []),
  new Subsection('Data'),
  new AppPage('Transactions', '/transactions', PreparedIcon.TbArrowsExchange, ['from', 'to', 'accounts', 'categories']),
  new AppPage('Categories', '/categories', PreparedIcon.MdCategory, []),
  new AppPage('Accounts', '/accounts', PreparedIcon.MdAccountBalance, []),
  new AppPage('Currencies', '/currencies', PreparedIcon.BsCurrencyExchange, []),
  new Subsection('Analysis'),
  new AppPage('Balances', '/balances', PreparedIcon.FaScaleUnbalanced, ['from', 'to', 'accounts']),
  new AppPage('Trends', '/trends', PreparedIcon.BiSolidBarChartAlt2, ['categories']),
  new AppPage('Costs Analysis', '/costs', PreparedIcon.BsFileEarmarkSpreadsheet, []),
  new Separator(),
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
  const { email } = useContext(UserContext)
  const { IconLib } = useContext(IconToolsContext)

  const [open, setOpen] = useState(false)

  const iconStyle = { margin: '0.5rem', fontSize: '1.3rem' }

  const iOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)

  const { width: drawerWidth, ref: setDrawerRef } = useElementDimensions(240, 240)

  const { width: totalWidth } = useWindowDimensions()
  const [privacyMode, setPrivacyMode] = useState(userStore.getPrivacyMode())
  const persistentDrawer = totalWidth - drawerWidth > 600

  const drawer = (
    <div ref={setDrawerRef}>
      <Box style={{ padding: '1.5rem' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
          Budget App
        </Typography>
        <Typography sx={{ color: 'gray', fontSize: '0.875rem' }}>{email}</Typography>
      </Box>

      {appPages.map((appPage) => (
        <appPage.Element />
      ))}

      <div>
        <ListItemButton
          onClick={() => {
            const newValue = !privacyMode
            setPrivacyMode(newValue)
            userStore.upsertPrivacyMode(newValue)
          }}
          disableRipple
          sx={{
            padding: '0.5rem 1rem',
            '&:hover': {
              backgroundColor: 'transparent',
            },
          }}
        >
          <ListItemIcon>
            {privacyMode ? <IconLib.MdVisibilityOff style={iconStyle} /> : <IconLib.MdVisibility style={iconStyle} />}
          </ListItemIcon>
          <ListItemText primary="Privacy Mode" />
          <Switch edge="end" checked={privacyMode} />
        </ListItemButton>
      </div>
      <Box style={{ padding: '1rem' }}>
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
