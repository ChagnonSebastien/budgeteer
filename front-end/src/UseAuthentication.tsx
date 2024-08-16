import { Network } from "@capacitor/network"
import { useEffect, useMemo, useState } from "react"
import UserStore, { User } from "./UserStore"

const serverUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin

const fetchUserInfo = async (): Promise<Omit<User, "authMethod">> => {
  const response = await fetch(`${serverUrl}/auth/userinfo`, {
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Unable to fetch user info")
  }

  return response.json()
}

const refreshToken = async (): Promise<Omit<User, "authMethod">> => {
  const response = await fetch(`${serverUrl}/auth/refresh-token`, {
    method: "POST",
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Unable to fetch user info")
  }

  return response.json()
}

const oidcLogin = () => {
  window.location.href = `${serverUrl}/auth/login`
}

const oidcLogout = () => {
  window.location.href = `${serverUrl}/auth/logout`
}

const userPassLogin = () => {
  throw new Error("Not implemented")
}

const userPassLogout = () => {
  throw new Error("Not implemented")
}

type AuthMethod = "oidc" | "userPass"
type AuthMethodStatuses = { [K in AuthMethod]: {login: () => void} | null };

const userStore = new UserStore(localStorage)

const useAuthentication = () => {
  const [authMethods, setAuthMethods] = useState<AuthMethodStatuses>({
    oidc: null,
    userPass: null,
  })

  const [user, setUser] = useState<User | null>(userStore.getUser())
  const [synced, setSynced] = useState(false)
  const [hasInternet, setHasInternet] = useState(false)

  useEffect(() => {
    Network.getStatus().then(status => setHasInternet(status.connected))

    const handlePromise = Network.addListener("networkStatusChange", status => {
      setHasInternet(status.connected)
    })

    return () => {
      handlePromise.then(handle => handle.remove())
    }
  }, [])

  useEffect(() => {
    if (!hasInternet || synced) return

    fetch(`${serverUrl}/auth/info`)
      .then(async (response) => {
        if (!response.ok) {
          return
        }

        const authMethodsResponse = await response.json()

        setAuthMethods({
          oidc: authMethodsResponse.oidc ? {
            login: oidcLogin,
          } : null,
          userPass: authMethodsResponse.userPass ? {
            login: () => {
              throw new Error("Not implemented")
            },
          } : null,
        })
      })
      .catch(console.error)

  }, [hasInternet, synced])

  useEffect(() => {
    if (!hasInternet) return
    if (synced) return
    if (authMethods.oidc === null) return

    refreshToken()
      .then(async (user) => {
        setUser({...user, authMethod: "oidc"})
        userStore.upsertUser(user, "oidc")
      })
      .catch(() => {
        setUser(null)
        userStore.clear()
      })
      .finally(() => setSynced(true))

  }, [authMethods.oidc, synced, hasInternet])

  const logout = useMemo(() => {
    if (user === null) return () => console.error("cannot logout if not logged in")
    return (user.authMethod === "oidc") ? oidcLogout : userPassLogout
  }, [user])

  return {authMethods, user, synced, hasInternet, logout}
}

export default useAuthentication
