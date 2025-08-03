import { Button } from '@mui/material'
import { createContext, FC } from 'react'

import AuthenticatedZone from './AuthenticatedZone'
import { IconToolsContext, useIconTools } from './components/icons/IconTools'
import LoadingScreen from './components/LoadingScreen'
import { Centered } from './components/shared/NoteContainer'
import User from './domain/model/user'
import useAuthentication from './useAuthentication'

export const UserContext = createContext<User>({
  name: 'name',
  default_currency: null,
  email: 'email',
  sub: 'sub',
  preferred_username: 'username',
})

const App: FC = () => {
  const { user, attemptedUserVerification, hasInternet, authMethods, logout, setDefaultCurrency } = useAuthentication()

  const iconTools = useIconTools()

  if (user !== null) {
    return (
      <IconToolsContext.Provider value={iconTools}>
        <UserContext.Provider value={user}>
          <AuthenticatedZone hasInternet={hasInternet} logout={logout} setDefaultCurrency={setDefaultCurrency} />
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
      <Button variant="contained" disableElevation onClick={authMethods.oidc!}>
        OIDC Login
      </Button>
    </Centered>
  )
}

export default App
