import { Network } from "@capacitor/network"
import { useCallback, useEffect, useMemo, useState } from "react"
import UserStore, { User } from "./UserStore"

const serverUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin


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
type AuthMethodStatuses = { [K in AuthMethod]: (() => void) | null };

const userStore = new UserStore(localStorage)

const useAuthentication = () => {
  const [loginMethods, setLoginMethods] = useState<AuthMethodStatuses | null>(null)

  const [user, setUser] = useState<User | null>(userStore.getUser())
  const [synced, setSynced] = useState(false)
  const [hasInternet, setHasInternet] = useState(true)

  const fetchUserInfo = useCallback(async (): Promise<Omit<User, "authMethod">> => {
    const response = await fetch(`${serverUrl}/auth/userinfo`, {credentials: "include"})

    if (!response.ok) {
      throw new Error("Unable to fetch user info")
    }

    return response.json()
  }, [])

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

        setLoginMethods({
          oidc: authMethodsResponse.oidc ? oidcLogin : null,
          userPass: authMethodsResponse.userPass ? userPassLogin : null,
        })
      })
      .catch(console.error)

  }, [hasInternet, synced])

  useEffect(() => {
    if (!hasInternet) return
    if (synced) return
    if (user !== null && user.authMethod !== "oidc") return
    if (user === null && (loginMethods === null || !loginMethods.oidc)) return

    fetchUserInfo()
      .then(async (user) => {
        setUser({...user, authMethod: "oidc"})
        userStore.upsertUser(user, "oidc")
      })
      .catch(() => {
        setUser(null)
        userStore.clear()
      })
      .finally(() => setSynced(true))

  }, [synced, hasInternet, user, loginMethods])

  const logout = useMemo(() => {
    if (user === null) return () => console.error("cannot logout if not logged in")
    return (user.authMethod === "oidc") ? oidcLogout : userPassLogout
  }, [user])

  return {authMethods: loginMethods, user, synced, hasInternet, logout}
}

export default useAuthentication
