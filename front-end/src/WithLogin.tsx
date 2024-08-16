import { Network } from "@capacitor/network"
import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport"
import { createContext, FC, useCallback, useContext, useEffect, useState } from "react"
import { CheckAuthMethodsRequest } from "./store/remote/dto/auth"
import { AuthServiceClient } from "./store/remote/dto/auth.client"
import UserContext from "./UserContext"
import { User } from "./UserContext"

const serverUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin
const transport = new GrpcWebFetchTransport({baseUrl: serverUrl})
const authClient = new AuthServiceClient(transport)

type AuthMethod = "userPass" | "oidc"
type AuthMethodStatuses = { [K in AuthMethod]: {login: () => void, logout: () => void} | null };

interface Auth {
  user: User | null
  synced: boolean
  hasInternet: boolean

  authMethods: AuthMethodStatuses,
}

export const AuthContext = createContext<Auth>({
  user: null,
  synced: false,
  hasInternet: false,
  authMethods: {
    oidc: null,
    userPass: null,
  },
})

const fetchUserInfo = async () => {
  const response = await fetch(`${serverUrl}/auth/userinfo`, {
    credentials: "include",
  })
  if (response.ok) {
    return await response.json()
  } else {
    return null
  }
}

const refreshToken = async () => {
  const response = await fetch(`${serverUrl}/auth/refresh-token`, {
    method: "POST",
    credentials: "include",
  })
  if (response.ok) {
    return await response.json()
  } else {
    return null
  }
}

interface Props {
  children: JSX.Element
}

const WithLogin: FC<Props> = ({children}) => {
  const [authMethods, setAuthMethods] = useState<AuthMethodStatuses>({
    oidc: null,
    userPass: null,
  })

  const userContext = useContext(UserContext)
  const [user, setUser] = useState<User | null>(userContext.getUser())
  console.log("user", user)
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

    authClient
      .checkAuthMethods(CheckAuthMethodsRequest.create())
      .then(authMethodsResponse => {
        console.log(authMethodsResponse)
        setAuthMethods({
          oidc: authMethodsResponse.response.oidc ? {
            login: oidcLogin,
            logout: oidcLogout,
          } : null,
          userPass: authMethodsResponse.response.userPass ? {
            login: () => {
              throw new Error("Not implemented")
            },
            logout: () => {
              throw new Error("Not implemented")
            },
          } : null,
        })
      })
      .catch(console.error)
  }, [hasInternet, synced])

  useEffect(() => {
    console.log("hasInternet", hasInternet)
    if (!hasInternet) return
    console.log("synced", synced)
    if (synced) return
    console.log("authMethods.oidc", authMethods.oidc)
    if (authMethods.oidc === null) return

    refreshToken()
      .then(async (user) => {
        setSynced(true)

        if (user === null) {
          setUser(null)
          userContext.clearUser()
          return
        }

        setUser(user)
        userContext.upsertUser(user)
      })
  }, [authMethods.oidc, synced, hasInternet])


  const oidcLogin = useCallback(() => {
    window.location.href = `${serverUrl}/auth/login`
  }, [])

  const oidcLogout = useCallback(() => {
    userContext.clearUser()
    window.location.href = `${serverUrl}/auth/logout`
  }, [])

  return (
    <AuthContext.Provider value={{authMethods, user, synced, hasInternet}}>
      {children}
    </AuthContext.Provider>
  )
}

export default WithLogin
