import { Button } from '@mui/material'
import { createContext, FC } from 'react'

import AuthenticatedZone from './AuthenticatedZone'
import { IconToolsContext, useIconTools } from './components/IconTools'
import LoadingScreen from './components/LoadingScreen'
import User from './domain/model/user'
import useAuthentication from './useAuthentication'

import './App.css'

export const UserContext = createContext<User>({
  name: 'name',
  default_currency: null,
  email: 'email',
  sub: 'sub',
  preferred_username: 'username',
})

const App: FC = () => {
  const { user, synced, hasInternet, authMethods, logout, setDefaultCurrency } = useAuthentication()

  const iconTools = useIconTools()

  if (user !== null) {
    if (!hasInternet || synced) {
      return (
        <IconToolsContext.Provider value={iconTools}>
          <UserContext.Provider value={user}>
            <AuthenticatedZone logout={logout} setDefaultCurrency={setDefaultCurrency} />
          </UserContext.Provider>
        </IconToolsContext.Provider>
      )
    } else {
      return <LoadingScreen />
    }
  }

  if (!hasInternet) {
    return <div className="centered">Internet connection required on first use</div>
  }

  if (authMethods !== null && authMethods.oidc === null) {
    return <div className="centered">Only OIDC is supported as of now</div>
  }

  if (authMethods === null || !synced) {
    return <LoadingScreen />
  }

  return (
    <div className="centered">
      <Button variant={'contained'} disableElevation onClick={authMethods.oidc!}>
        OIDC Login
      </Button>
    </div>
  )
}

export default App
