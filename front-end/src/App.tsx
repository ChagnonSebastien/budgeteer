import { Button } from '@mui/material'
import { createContext, FC } from 'react'

import AuthenticatedZone from './AuthenticatedZone'
import { IconToolsContext, useIconTools } from './components/icons/IconTools'
import LoadingScreen from './components/LoadingScreen'
import { Centered, Column } from './components/shared/Layout'
import User, { UserPreferencesPatch } from './domain/model/user'
import SplitWizeZone from './SplitWizeZone'
import useAuthentication from './useAuthentication'

export const UserContext = createContext<User>({
  name: 'name',
  default_currency: null,
  email: 'email',
  sub: 'sub',
  hidden_default_account: 1,
  authentification_method: 'oidc',
})

export const UpdatePreferencesContext = createContext<(patch: UserPreferencesPatch) => Promise<void>>(async () => {})

const App: FC = () => {
  const {
    user,
    attemptedUserVerification,
    hasInternet,
    authMethods,
    logout,
    setDefaultCurrency,
    setDisplayName,
    updatePreferences,
  } = useAuthentication()

  const iconTools = useIconTools()

  if (user !== null) {
    if (user.authentification_method === 'guest') {
      return (
        <IconToolsContext.Provider value={iconTools}>
          <UserContext.Provider value={user}>
            <SplitWizeZone hasInternet={hasInternet} logout={logout} setDisplayName={setDisplayName} />
          </UserContext.Provider>
        </IconToolsContext.Provider>
      )
    }

    return (
      <IconToolsContext.Provider value={iconTools}>
        <UserContext.Provider value={user}>
          <UpdatePreferencesContext.Provider value={updatePreferences}>
            <AuthenticatedZone hasInternet={hasInternet} logout={logout} setDefaultCurrency={setDefaultCurrency} />
          </UpdatePreferencesContext.Provider>
        </UserContext.Provider>
      </IconToolsContext.Provider>
    )
  }

  if (!hasInternet) {
    return <Centered>Internet connection required to login</Centered>
  }

  if (authMethods !== null && authMethods.oidc === null) {
    return <Centered>Only OIDC is supported as of now</Centered>
  }

  if (authMethods === null || !attemptedUserVerification) {
    return <LoadingScreen />
  }

  return (
    <Centered>
      <Column sx={{ gap: 2 }}>
        {authMethods.oidc && (
          <Button variant="contained" disableElevation onClick={authMethods.oidc}>
            OIDC Login
          </Button>
        )}
        {authMethods.userPass && (
          <Button variant="contained" disableElevation onClick={authMethods.userPass}>
            Password Login
          </Button>
        )}
        {authMethods.guest && (
          <Button variant="contained" disableElevation onClick={authMethods.guest}>
            Guest Login
          </Button>
        )}
      </Column>
    </Centered>
  )
}

export default App
