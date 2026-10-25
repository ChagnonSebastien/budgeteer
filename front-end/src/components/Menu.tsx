import {
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  SwipeableDrawer,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import { createContext, FC, ReactElement, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { UpdatePreferencesContext, UserContext } from '../App'
import { OnlineContext } from '../service/OnlineContext'
import UserStore from '../UserStore'
import { useRateFetchFailures } from './currencies/useRateFetchFailures'
import { IconToolsContext, PreparedIcon } from './icons/IconTools'
import { withoutTransientProps } from './shared/Layout'
import useCloseOnBack, { useNavigateFromDialog } from './shared/useCloseOnBack'
import { useElementDimensions, useWindowDimensions } from './shared/useDimensions'

interface MenuElement {
  readonly Element: FC
}

const EXPANDED_WIDTH = 240
const RAIL_WIDTH = 72

const NavCollapsedContext = createContext(false)
const UnvisitedPagesContext = createContext<string[]>([])

const NavTooltip: FC<{ title: string; children: ReactElement }> = ({ title, children }) => {
  const collapsed = useContext(NavCollapsedContext)
  return (
    <Tooltip title={collapsed ? title : ''} placement="right">
      {children}
    </Tooltip>
  )
}

const railItemSx = { justifyContent: 'center', px: 0 }

class AppPage implements MenuElement {
  constructor(
    private title: string,
    readonly url: string,
    private iconName: string,
    private keepQuery: string[],
    private useNeedsAttention: () => boolean = () => false,
  ) {}

  get Element() {
    return () => {
      const location = useLocation()
      const navigate = useNavigateFromDialog()
      const { iconTypeFromName } = useContext(IconToolsContext)
      const needsAttention = this.useNeedsAttention()
      const collapsed = useContext(NavCollapsedContext)
      const unvisited = useContext(UnvisitedPagesContext).includes(this.url)

      const Icon = iconTypeFromName(this.iconName)
      const selected = location.pathname === this.url

      return (
        <NavTooltip title={this.title}>
          <ListItemButton
            key={`menu-element-${this.title}`}
            aria-label={collapsed ? this.title : undefined}
            onClick={() => {
              const query = new URLSearchParams(location.search)
              for (const key of [...query.keys()]) {
                if (!this.keepQuery.includes(key)) query.delete(key)
              }

              navigate(`${this.url}?${query.toString()}`)
            }}
            selected={selected}
            sx={collapsed ? railItemSx : undefined}
          >
            <ListItemIcon sx={{ minWidth: collapsed ? 0 : 42, '& > .MuiBadge-root': { m: 1 } }}>
              <Badge
                color={needsAttention ? 'error' : 'primary'}
                variant="dot"
                invisible={!needsAttention && !unvisited}
                overlap="circular"
              >
                <Icon size={menuIconSize} />
              </Badge>
            </ListItemIcon>
            {!collapsed && <ListItemText primary={this.title} />}
          </ListItemButton>
        </NavTooltip>
      )
    }
  }
}

class Subsection implements MenuElement {
  constructor(private title: string) {}

  get Element() {
    return () =>
      useContext(NavCollapsedContext) ? (
        <Divider sx={{ mx: 2.5, mt: 2, mb: 1 }} />
      ) : (
        <Typography variant="label" color="text.disabled" sx={{ display: 'block', px: 3, pt: 2, pb: 0.5 }}>
          {this.title}
        </Typography>
      )
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
  element: AppPage | Subsection
}

const appPages: MenuEntry[] = [
  { guestView: false, element: new AppPage('Dashboard', '/', PreparedIcon.TbLayoutDashboard, []) },
  {
    guestView: false,
    element: new AppPage('Transactions', '/transactions', PreparedIcon.TbArrowsExchange, [
      'from',
      'to',
      'accounts',
      'categories',
    ]),
  },
  {
    guestView: true,
    element: new AppPage('Shared expenses', '/transaction-groups', PreparedIcon.TbUsersGroup, []),
  },
  { guestView: false, element: new Subsection('Analysis') },
  {
    guestView: false,
    element: new AppPage('Net Worth', '/net-worth', PreparedIcon.TbPigMoney, ['from', 'to', 'accounts']),
  },
  {
    guestView: false,
    element: new AppPage('Investments', '/investments', PreparedIcon.TbTrendingUp, []),
  },
  {
    guestView: false,
    element: new AppPage('Trends', '/trends', PreparedIcon.TbChartBar, ['categories']),
  },
  {
    guestView: false,
    element: new AppPage('Costs Analysis', '/costs', PreparedIcon.TbReportMoney, []),
  },
  { guestView: false, element: new Subsection('Setup') },
  { guestView: false, element: new AppPage('Categories', '/categories', PreparedIcon.TbCategory, []) },
  { guestView: false, element: new AppPage('Accounts', '/accounts', PreparedIcon.TbBuildingBank, []) },
  {
    guestView: false,
    element: new AppPage('Assets', '/assets', PreparedIcon.TbCoins, [], () => useRateFetchFailures().length > 0),
  },
]

const administrationPage = new AppPage('Administration', '/administration', PreparedIcon.TbUserShield, [])

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
  hasUnvisitedPages: boolean
}
export const DrawerContext = createContext<DrawerActions>({
  privacyMode: false,
  drawerWidth: 0,
  hasUnvisitedPages: false,
})

const DrawerWrapper: FC<Props> = ({ logout, children, userIsGuest = false }) => {
  const { email, is_admin: isAdmin, preferences } = useContext(UserContext)
  const updatePreferences = useContext(UpdatePreferencesContext)
  const online = useContext(OnlineContext)
  const { IconLib } = useContext(IconToolsContext)

  const [open, setOpen] = useState(false)
  const { key: locationKey, pathname } = useLocation()
  useEffect(() => setOpen(false), [locationKey])

  const visitedPages = preferences?.visitedPages
  const unvisitedPages = useMemo(
    () =>
      userIsGuest
        ? []
        : appPages.flatMap(({ element }) =>
            element instanceof AppPage && !visitedPages?.includes(element.url) ? [element.url] : [],
          ),
    [userIsGuest, visitedPages],
  )
  useEffect(() => {
    if (!unvisitedPages.includes(pathname)) return
    updatePreferences({ visitedPages: [...(visitedPages ?? []), pathname] }).catch(console.error)
  }, [pathname, unvisitedPages, visitedPages, updatePreferences])

  const iOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)

  const { width: drawerWidth, ref: setDrawerRef } = useElementDimensions(EXPANDED_WIDTH, EXPANDED_WIDTH)

  const { width: totalWidth } = useWindowDimensions()
  const [privacyMode, setPrivacyMode] = useState(userStore.getPrivacyMode())
  // Against the expanded width, so expanding the rail never flips the drawer into its mobile mode.
  const persistentDrawer = totalWidth - EXPANDED_WIDTH > 600
  const [collapsedPreference, setCollapsedPreference] = useState(userStore.getNavCollapsed())
  const collapsed = persistentDrawer && collapsedPreference
  const toggleCollapsed = () => {
    setCollapsedPreference(!collapsedPreference)
    userStore.upsertNavCollapsed(!collapsedPreference)
  }
  useCloseOnBack(!persistentDrawer && open, () => setOpen(false))

  const drawer = (
    <NavCollapsedContext.Provider value={collapsed}>
      <UnvisitedPagesContext.Provider value={unvisitedPages}>
        <Box
          ref={setDrawerRef}
          sx={{
            width: collapsed ? RAIL_WIDTH : EXPANDED_WIDTH,
            minHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{ px: collapsed ? 0 : 2.5, pt: 3, pb: 2.5, justifyContent: collapsed ? 'center' : 'flex-start' }}
          >
            <Box component="img" src="/icon.svg" alt="" sx={{ width: 36, height: 36, flexShrink: 0 }} />
            {!collapsed && (
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  {userIsGuest ? 'Shared expenses' : 'Fintrospect'}
                </Typography>
                <Typography variant="caption" color="text.disabled" noWrap title={email} sx={{ display: 'block' }}>
                  {email}
                </Typography>
              </Box>
            )}
          </Stack>

          <Box sx={{ flexGrow: 1 }}>
            {appPages
              .filter((appPage) => !userIsGuest || appPage.guestView)
              .map((appPage) => (
                <appPage.element.Element key={appPages.indexOf(appPage)} />
              ))}
          </Box>

          {/* A block wrapper: ListItemButton grows along a flex column. */}
          <Box sx={{ borderTop: 1, borderColor: 'border.subtle', pt: 1 }}>
            {!userIsGuest && isAdmin && online && <administrationPage.Element />}
            {!userIsGuest && (
              <Tooltip
                title={
                  privacyMode
                    ? 'Amounts are hidden. Click to show them again.'
                    : 'Hide amounts to show the app to friends, family or on a shared screen.'
                }
                placement="right"
              >
                <ListItemButton
                  aria-label={collapsed ? 'Presentation mode' : undefined}
                  aria-pressed={privacyMode}
                  onClick={() => {
                    const newValue = !privacyMode
                    setPrivacyMode(newValue)
                    userStore.upsertPrivacyMode(newValue)
                  }}
                  sx={collapsed ? railItemSx : undefined}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: collapsed ? 0 : 42,
                      '& svg': { m: 1 },
                      color: collapsed && privacyMode ? 'warning.main' : undefined,
                    }}
                  >
                    <IconLib.TbPresentation size={menuIconSize} />
                  </ListItemIcon>
                  {!collapsed && <ListItemText primary="Presentation mode" />}
                  {!collapsed && (
                    <Switch
                      size="small"
                      edge="end"
                      checked={privacyMode}
                      tabIndex={-1}
                      inputProps={{ 'aria-hidden': true }}
                      sx={{ pointerEvents: 'none' }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            )}

            {persistentDrawer && (
              <NavTooltip title="Expand menu">
                <ListItemButton
                  aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
                  onClick={toggleCollapsed}
                  sx={collapsed ? railItemSx : undefined}
                >
                  <ListItemIcon sx={{ minWidth: collapsed ? 0 : 42, '& svg': { m: 1 } }}>
                    {collapsed ? (
                      <IconLib.TbLayoutSidebarLeftExpand size={menuIconSize} />
                    ) : (
                      <IconLib.TbLayoutSidebarLeftCollapse size={menuIconSize} />
                    )}
                  </ListItemIcon>
                  {!collapsed && <ListItemText primary="Collapse" />}
                </ListItemButton>
              </NavTooltip>
            )}

            <Box sx={{ p: collapsed ? 1.5 : 2, display: 'flex', justifyContent: 'center' }}>
              {collapsed ? (
                <NavTooltip title="Logout">
                  <IconButton aria-label="Logout" onClick={logout}>
                    <IconLib.MdLogout size={menuIconSize} />
                  </IconButton>
                </NavTooltip>
              ) : (
                <Button fullWidth onClick={logout} variant="contained" disableElevation>
                  Logout
                </Button>
              )}
            </Box>

            {import.meta.env.VITE_COMMIT_HASH && (
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ display: 'block', textAlign: 'center', fontFamily: 'monospace', mt: -1, pb: 1 }}
              >
                {collapsed ? import.meta.env.VITE_COMMIT_HASH : `Build: ${import.meta.env.VITE_COMMIT_HASH}`}
              </Typography>
            )}
          </Box>
        </Box>
      </UnvisitedPagesContext.Provider>
    </NavCollapsedContext.Provider>
  )

  return (
    <DrawerContext.Provider
      value={{
        open: persistentDrawer ? undefined : () => setOpen(true),
        privacyMode: privacyMode,
        drawerWidth: drawerWidth,
        hasUnvisitedPages: unvisitedPages.length > 0,
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
