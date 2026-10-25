import { Network } from '@capacitor/network'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { seedDemo } from './demo/seedDemo'
import User, { AuthMethod, UserPreferences, UserPreferencesPatch } from './domain/model/user'
import IndexedDB from './store/local/IndexedDB'
import UserStore from './UserStore'

const serverUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin

const userStore = new UserStore(localStorage)

const oidcLogin = () => {
  window.location.href = `${serverUrl}/auth/login`
}

const clearLocalSession = async () => {
  try {
    await IndexedDB.clearAll()
  } catch (error) {
    console.error('clearing local data', error)
    await IndexedDB.delete().catch(console.error)
  }
  localStorage.clear()
}

const postLogout = async () => {
  try {
    const response = await fetch(`${serverUrl}/auth/logout`, { method: 'POST', credentials: 'include' })
    const { redirect } = (await response.json()) as { redirect: string }
    window.location.href = redirect
  } catch (error) {
    console.error('logging out', error)
    window.location.href = '/'
  }
}

const oidcLogout = async () => {
  await clearLocalSession()
  await postLogout()
}

const userPassLogin = () => {
  throw new Error('Not implemented')
}

const userPassLogout = async () => {
  await clearLocalSession()
  throw new Error('Not implemented')
}

const guestLogin = () => {
  window.location.href = '/guest.html'
}

const guestLogout = async () => {
  await clearLocalSession()
  await postLogout()
}

const demoLogout = async () => {
  await clearLocalSession()
  window.location.href = '/'
}

type AuthMethodStatuses = { [K in Exclude<AuthMethod, 'demo'>]: (() => void) | null }

const useAuthentication = () => {
  const [loginMethods, setLoginMethods] = useState<AuthMethodStatuses | null>(null)

  const [user, setUser] = useState<User | null>(userStore.getUser())
  const [userVerified, setUserVerified] = useState(user?.authentification_method === 'demo')
  const [attemptedUserVerification, setAttemptedUserVerification] = useState(false)
  const [hasInternet, setHasInternet] = useState(navigator.onLine)

  const setDefaultCurrency = useCallback((id: number) => {
    setUser((prev) => {
      if (prev === null) return prev
      const updated = { ...prev, default_currency: id }
      userStore.upsertUser(updated)
      return updated
    })
  }, [])

  const setDisplayName = useCallback(async (name: string) => {
    const response = await fetch(`${serverUrl}/auth/display-name`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name }),
    })
    if (!response.ok) throw new Error('could not save your name')

    setUser((prev) => {
      if (prev === null) return prev
      const updated = { ...prev, name, display_name: name }
      userStore.upsertUser(updated)
      return updated
    })
  }, [])

  const startDemo = useCallback(async () => {
    await clearLocalSession()
    const demoUser = await seedDemo()
    userStore.upsertUser(demoUser)
    setUser(demoUser)
    setUserVerified(true)
  }, [])

  const updatePreferences = useCallback(async (patch: UserPreferencesPatch) => {
    setUser((prev) => {
      if (prev === null) return prev
      const preferences = Object.fromEntries(
        Object.entries({ ...prev.preferences, ...patch }).filter(([, value]) => value !== null),
      ) as UserPreferences
      const updated = { ...prev, preferences }
      userStore.upsertUser(updated)
      return updated
    })
    if (userStore.getUser()?.authentification_method === 'demo') return

    const response = await fetch(`${serverUrl}/auth/preferences`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(patch),
    })
    if (!response.ok) throw new Error('could not save your preferences')
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
          guest: authMethodsResponse.guest ? guestLogin : null,
        })
      })
      .catch(console.error)
  }, [hasInternet, userVerified])

  useEffect(() => {
    if (!hasInternet) return
    if (userVerified) return
    if (user === null && (loginMethods === null || !loginMethods.oidc)) return

    let amountAuthMethods = 0
    let onlyLoginMethod: () => void
    if (loginMethods !== null) {
      if (loginMethods.oidc) {
        amountAuthMethods += 1
        onlyLoginMethod = loginMethods.oidc
      }
      if (loginMethods.userPass) {
        amountAuthMethods += 1
        onlyLoginMethod = loginMethods.userPass
      }
      if (loginMethods.guest) {
        amountAuthMethods += 1
        onlyLoginMethod = loginMethods.guest
      }
    }

    fetchUserInfo()
      .then(async (userResponse) => {
        if (userResponse === null) {
          await clearLocalSession()
          if (amountAuthMethods === 1) {
            onlyLoginMethod()
          }
          if (user !== null) {
            switch (user.authentification_method) {
              case 'oidc':
                oidcLogin()
                break
              case 'userPass':
                userPassLogin()
                break
              case 'guest':
                guestLogin()
                break
              default:
                console.error('cannot login - unsupported auth method')
            }
          }
          return
        }

        const cachedUser: User | null = userStore.getUser()
        if (cachedUser === null || cachedUser.email !== userResponse.email) {
          await clearLocalSession()
          if (cachedUser !== null) {
            userStore.upsertUser(userResponse)
            window.location.reload()
            return
          }
        }

        setUser({ ...userResponse })
        userStore.upsertUser(userResponse)
        setUserVerified(true)
      })
      .finally(() => setAttemptedUserVerification(true))
  }, [userVerified, hasInternet, user, loginMethods])

  const logout = useMemo(() => {
    if (user === null) return () => console.error('cannot logout if not logged in')
    switch (user.authentification_method) {
      case 'oidc':
        return oidcLogout
      case 'userPass':
        return userPassLogout
      case 'guest':
        return guestLogout
      case 'demo':
        return demoLogout
      default:
        console.error('cannot logout - unsupported auth method')
        return () => {}
    }
  }, [user])

  return {
    authMethods: loginMethods,
    user,
    attemptedUserVerification,
    userVerified,
    hasInternet,
    logout,
    startDemo,
    setDefaultCurrency,
    setDisplayName,
    updatePreferences,
  }
}

export default useAuthentication
