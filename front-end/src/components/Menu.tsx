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
import { styled } from '@mui/material/styles'
import { createContext, FC, ReactElement, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { UserContext } from '../App'
import MixedAugmentation from '../service/MixedAugmentation'
import UserStore from '../UserStore'
import { IconToolsContext, PreparedIcon } from './icons/IconTools'
import { withoutTransientProps } from './shared/Layout'
import useCloseOnBack, { useNavigateFromDialog } from './shared/useCloseOnBack'
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
      const navigate = useNavigateFromDialog()
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
          <ListItemIcon sx={{ minWidth: 42, '& svg': { m: 1 } }}>
            <Icon size={menuIconSize} />
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
      <ListItemButton disabled sx={{ pb: 0, pl: 3 }}>
        <ListItemText primary={this.title} />
      </ListItemButton>
    )
  }
}

class Separator implements MenuElement {
  get Element() {
    return () => <Divider sx={{ my: 1 }} />
  }
}

const menuIconSize = '1.3rem'

const ContentContainer = styled(
  'div',
  withoutTransientProps,
)<{ $persistentDrawer: boolean; $totalWidth: number; $drawerWidth: number }>(
  ({ $persistentDrawer, $totalWidth, $drawerWidth }) => ({
    width: $persistentDrawer ? `${$totalWidth - $drawerWidth}px` : '100%',
    height: '100%',
    marginLeft: $persistentDrawer ? `${$drawerWidth}px` : 0,
  }),
)

interface MenuEntry {
  guestView: boolean
  requires?: 'transactions' | 'financialIncome'
  hiddenInPrivacy?: boolean
  element: AppPage | Subsection | Separator
}

const appPages: MenuEntry[] = [
  { guestView: false, element: new AppPage('Dashboard', '/', PreparedIcon.TbLayoutDashboard, []) },
  { guestView: false, element: new Subsection('Data') },
  {
    guestView: false,
    element: new AppPage('Transactions', '/transactions', PreparedIcon.TbArrowsExchange, [
      'from',
      'to',
      'accounts',
      'categories',
    ]),
  },
  { guestView: false, element: new AppPage('Categories', '/categories', PreparedIcon.TbCategory, []) },
  { guestView: false, element: new AppPage('Accounts', '/accounts', PreparedIcon.TbBuildingBank, []) },
  { guestView: false, element: new AppPage('Currencies', '/currencies', PreparedIcon.TbCoins, []) },
  { guestView: false, requires: 'transactions', element: new Subsection('Analysis') },
  {
    guestView: false,
    requires: 'transactions',
    element: new AppPage('Balances', '/balances', PreparedIcon.TbScale, ['from', 'to', 'accounts']),
  },
  {
    guestView: false,
    requires: 'transactions',
    element: new AppPage('Trends', '/trends', PreparedIcon.TbChartBar, ['categories']),
  },
  {
    guestView: false,
    requires: 'transactions',
    hiddenInPrivacy: true,
    element: new AppPage('Costs Analysis', '/costs', PreparedIcon.TbReportMoney, []),
  },
  {
    guestView: false,
    requires: 'financialIncome',
    element: new AppPage('Investments', '/investments', PreparedIcon.TbTrendingUp, []),
  },
  { guestView: false, element: new Subsection('Shared expenses') },
  { guestView: true, element: new AppPage('Groups', '/transaction-groups', PreparedIcon.TbUsersGroup, []) },
  { guestView: true, element: new Separator() },
]

const userStore = new UserStore(localStorage)

interface Props {
  children: ReactElement
  userIsGuest?: boolean
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

const DrawerWrapper: FC<Props> = ({ logout, children, userIsGuest = false }) => {
  const { augmentedTransactions } = useContext(MixedAugmentation)
  const hasFinancialIncome = useMemo(
    () => augmentedTransactions.some((t) => t.financialIncomeData !== null),
    [augmentedTransactions],
  )
  const { email } = useContext(UserContext)
  const { IconLib } = useContext(IconToolsContext)

  const [open, setOpen] = useState(false)
  const { key: locationKey } = useLocation()
  useEffect(() => setOpen(false), [locationKey])

  const iOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)

  const { width: drawerWidth, ref: setDrawerRef } = useElementDimensions(240, 240)

  const { width: totalWidth } = useWindowDimensions()
  const [privacyMode, setPrivacyMode] = useState(userStore.getPrivacyMode())
  const persistentDrawer = totalWidth - drawerWidth > 600
  useCloseOnBack(!persistentDrawer && open, () => setOpen(false))

  const drawer = (
    <div ref={setDrawerRef}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, letterSpacing: '0.05em', mb: 0.5 }}>
          {userIsGuest ? 'Shared expenses' : 'Fintrospect'}
        </Typography>
        <Typography variant="body2" color="text.disabled">
          {email}
        </Typography>
      </Box>

      {appPages
        .filter((appPage) => !userIsGuest || appPage.guestView)
        .filter(
          (appPage) =>
            (!privacyMode || !appPage.hiddenInPrivacy) &&
            (!appPage.requires ||
              (appPage.requires === 'transactions' ? augmentedTransactions.length > 0 : hasFinancialIncome)),
        )
        .map((appPage) => (
          <appPage.element.Element key={appPages.indexOf(appPage)} />
        ))}

      {!userIsGuest && (
        <div>
          <ListItemButton
            onClick={() => {
              const newValue = !privacyMode
              setPrivacyMode(newValue)
              userStore.upsertPrivacyMode(newValue)
            }}
            disableRipple
            sx={{
              py: 1,
              px: 2,
              '&:hover': {
                backgroundColor: 'transparent',
              },
            }}
          >
            <ListItemIcon sx={{ '& svg': { m: 1 } }}>
              {privacyMode ? (
                <IconLib.MdVisibilityOff size={menuIconSize} />
              ) : (
                <IconLib.MdVisibility size={menuIconSize} />
              )}
            </ListItemIcon>
            <ListItemText primary="Privacy Mode" />
            <Switch edge="end" checked={privacyMode} />
          </ListItemButton>
        </div>
      )}
      <Box sx={{ p: 2 }}>
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
