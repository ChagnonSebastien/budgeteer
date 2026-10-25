import { createContext, FC, useContext } from 'react'

import AuthenticatedZone from './AuthenticatedZone'
import { IconToolsContext, useIconTools } from './components/icons/IconTools'
import LandingPage from './components/LandingPage'
import LoadingScreen from './components/LoadingScreen'
import { Centered } from './components/shared/Layout'
import User, { hasGuestView, UserPreferencesPatch } from './domain/model/user'
import GuestZone from './GuestZone'
import { OnlineContext } from './service/OnlineContext'
import { demoReason, offlineReason, ReadOnlyContext } from './service/ReadOnlyContext'
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

export const useGuestView = () => hasGuestView(useContext(UserContext))

const App: FC = () => {
  const {
    user,
    attemptedUserVerification,
    hasInternet,
    authMethods,
    logout,
    startDemo,
    setDefaultCurrency,
    setDisplayName,
    updatePreferences,
  } = useAuthentication()

  const iconTools = useIconTools()

  if (user !== null) {
    // The demo lives only in IndexedDB, so it must never reach the server.
    const demo = user.authentification_method === 'demo'
    const readOnly = demo ? demoReason : hasInternet ? null : offlineReason

    if (hasGuestView(user)) {
      return (
        <OnlineContext.Provider value={hasInternet}>
          <ReadOnlyContext.Provider value={readOnly}>
            <IconToolsContext.Provider value={iconTools}>
              <UserContext.Provider value={user}>
                <UpdatePreferencesContext.Provider value={updatePreferences}>
                  <GuestZone logout={logout} setDisplayName={setDisplayName} />
                </UpdatePreferencesContext.Provider>
              </UserContext.Provider>
            </IconToolsContext.Provider>
          </ReadOnlyContext.Provider>
        </OnlineContext.Provider>
      )
    }

    return (
      <OnlineContext.Provider value={hasInternet && !demo}>
        <ReadOnlyContext.Provider value={readOnly}>
          <IconToolsContext.Provider value={iconTools}>
            <UserContext.Provider value={user}>
              <UpdatePreferencesContext.Provider value={updatePreferences}>
                <AuthenticatedZone logout={logout} setDefaultCurrency={setDefaultCurrency} />
              </UpdatePreferencesContext.Provider>
            </UserContext.Provider>
          </IconToolsContext.Provider>
        </ReadOnlyContext.Provider>
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
    <LandingPage
      oidcLogin={authMethods.oidc}
      userPassLogin={authMethods.userPass}
      guestLogin={authMethods.guest}
      demoLogin={startDemo}
    />
  )
}

export default App
