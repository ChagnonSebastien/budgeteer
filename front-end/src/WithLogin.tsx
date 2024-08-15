import {
  IonButton,
  IonLoading,
} from "@ionic/react"
import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport"
import { createContext, FC, useCallback, useEffect, useState } from "react"
import { CheckAuthMethodsRequest } from "./store/remote/dto/auth"
import { AuthServiceClient } from "./store/remote/dto/auth.client"

const serverUrl = import.meta.env.VITE_BACKEND_URL || "/"
const transport = new GrpcWebFetchTransport({baseUrl: serverUrl})

interface Auth {
  logout: () => Promise<void>
}

export const AuthContext = createContext<Auth>({
  logout() {
    return Promise.reject("Auth context not available")
  },
})

const fetchUserInfo = async () => {
  const response = await fetch(`${serverUrl}/userinfo`, {
    credentials: "include",
  })
  if (response.ok) {
    return await response.json()
  } else {
    return null
  }
}

const refreshToken = async () => {
  const response = await fetch(`${serverUrl}/refresh-token`, {
    method: "POST",
    credentials: "include",
  })
  return response.ok
}

interface Props {
  children: JSX.Element
}

const WithLogin: FC<Props> = ({children}) => {
  const [authClient] = useState(new AuthServiceClient(transport))
  const [authMethods, setAuthMethods] = useState<{userPass: boolean, oidc: boolean}>()
  const [user, setUser] = useState<{[property: string]: any} | null>()

  useEffect(() => {
    if (!authMethods?.oidc) return

    fetchUserInfo()
      .then((user) => {
        if (user !== null) {
          setUser(user)
          return
        }

        refreshToken()
          .then(refreshed => {
            if (refreshed) {
              fetchUserInfo()
                .then(setUser)
                .catch(() => setUser(null))
            } else {
              setUser(null)
            }
          })
          .catch(() => setUser(null))
      })
      .catch(() => setUser(null))
  }, [authMethods?.oidc])

  useEffect(() => {
    authClient.checkAuthMethods(CheckAuthMethodsRequest.create()).then(async (authMethodsResponse) => {
      setAuthMethods({
        oidc: authMethodsResponse.response.oidc,
        userPass: authMethodsResponse.response.userPass,
      })
    })
  }, [authClient])

  const logout = useCallback(async () => {
    window.location.href = `${serverUrl}/logout`
  }, [])

  if (typeof user === "undefined") {
    return <IonLoading/>
  }

  if (user === null) {
    return (
      <IonButton onClick={() => {
        window.location.href = `${serverUrl}/login`
      }}>
        Login
      </IonButton>
    )
  }

  return (
    <AuthContext.Provider value={{logout}}>
      {children}
    </AuthContext.Provider>
  )
}

export default WithLogin
