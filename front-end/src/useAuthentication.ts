import { Network } from '@capacitor/network'
import { useCallback, useEffect, useMemo, useState } from 'react'

import User from './domain/model/user'
import IndexedDB from './store/local/IndexedDB'
import UserStore from './UserStore'

const serverUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin

const userStore = new UserStore(localStorage)

const oidcLogin = () => {
  window.location.href = `${serverUrl}/auth/login`
}

const oidcLogout = () => {
  IndexedDB.delete()
  userStore.clear()
  window.location.href = `${serverUrl}/auth/logout`
}

const userPassLogin = () => {
  throw new Error('Not implemented')
}

const userPassLogout = () => {
  IndexedDB.delete()
  userStore.clear()
  throw new Error('Not implemented')
}

type AuthMethod = 'oidc' | 'userPass'
type AuthMethodStatuses = { [K in AuthMethod]: (() => void) | null }

const useAuthentication = () => {
  const [loginMethods, setLoginMethods] = useState<AuthMethodStatuses | null>(null)

  const [user, setUser] = useState<(User & { authMethod: AuthMethod }) | null>(userStore.getUser())
  const [userVerified, setUserVerified] = useState(false)
  const [attemptedUserVerification, setAttemptedUserVerification] = useState(false)
  const [hasInternet, setHasInternet] = useState(false)

  const setDefaultCurrency = useCallback((id: number) => {
    if (user === null) return
    setUser({ ...user, default_currency: id })
    userStore.upsertUser({ ...user, default_currency: id }, 'oidc')
  }, [])

  const fetchUserInfo = useCallback(async (): Promise<User | null> => {
    const response = await fetch(`${serverUrl}/auth/userinfo`, { credentials: 'include' })

    if (response.status === 401) {
      return null
    }

    if (!response.ok) {
      throw new Error('Unable to fetch user info')
    }

    return response.json()
  }, [])

  useEffect(() => {
    Network.getStatus().then((status) => setHasInternet(status.connected))

    const handlePromise = Network.addListener('networkStatusChange', (status) => {
      setHasInternet(status.connected)
    })

    return () => {
      handlePromise.then((handle) => handle.remove())
    }
  }, [])

  useEffect(() => {
    if (!hasInternet || userVerified) return

    fetch(`${serverUrl}/auth/info`)
      .then(async (response) => {
        if (!response.ok) {
          return
        }

        const authMethodsResponse = await response.json()

        setLoginMethods({
          oidc: authMethodsResponse.oidc ? oidcLogin : null,
          userPass: authMethodsResponse.userPass ? userPassLogin : null,
        })
      })
      .catch(console.error)
  }, [hasInternet, userVerified])

  useEffect(() => {
    if (!hasInternet) return
    if (userVerified) return
    if (user !== null && user.authMethod !== 'oidc') return
    if (user === null && (loginMethods === null || !loginMethods.oidc)) return

    fetchUserInfo()
      .then(async (user) => {
        if (user === null) {
          loginMethods!.oidc!()
          return
        }

        setUser({ ...user, authMethod: 'oidc' })
        userStore.upsertUser(user, 'oidc')
        setUserVerified(true)
      })
      .finally(() => setAttemptedUserVerification(true))
  }, [userVerified, hasInternet, user, loginMethods])

  const logout = useMemo(() => {
    if (user === null) return () => console.error('cannot logout if not logged in')
    return user.authMethod === 'oidc' ? oidcLogout : userPassLogout
  }, [user])

  return {
    authMethods: loginMethods,
    user,
    attemptedUserVerification,
    userVerified,
    hasInternet,
    logout,
    setDefaultCurrency,
  }
}

export default useAuthentication
