import { createContext, FC } from 'react'

import AuthenticatedZone from './AuthenticatedZone'
import { IconToolsContext, useIconTools } from './components/icons/IconTools'
import LandingPage from './components/LandingPage'
import LoadingScreen from './components/LoadingScreen'
import { Centered } from './components/shared/Layout'
import User, { UserPreferencesPatch } from './domain/model/user'
import GuestZone from './GuestZone'
import { OnlineContext } from './service/OnlineContext'
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
        <OnlineContext.Provider value={hasInternet}>
          <IconToolsContext.Provider value={iconTools}>
            <UserContext.Provider value={user}>
              <GuestZone logout={logout} setDisplayName={setDisplayName} />
            </UserContext.Provider>
          </IconToolsContext.Provider>
        </OnlineContext.Provider>
      )
    }

    return (
      <OnlineContext.Provider value={hasInternet}>
        <IconToolsContext.Provider value={iconTools}>
          <UserContext.Provider value={user}>
            <UpdatePreferencesContext.Provider value={updatePreferences}>
              <AuthenticatedZone logout={logout} setDefaultCurrency={setDefaultCurrency} />
            </UpdatePreferencesContext.Provider>
          </UserContext.Provider>
        </IconToolsContext.Provider>
      </OnlineContext.Provider>
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
    <LandingPage oidcLogin={authMethods.oidc} userPassLogin={authMethods.userPass} guestLogin={authMethods.guest} />
  )
}

export default App
