import { Context, createContext, ReactNode, useContext, useState } from "react"
import Unique from "../domain/model/Unique"

interface Repository<T> {
  getAll(): Promise<T[]>
}

interface Props<T> {
  initialState: T[]
  longTermRepository: Repository<T>
  children: ReactNode[] | ReactNode
  context: Context<{
    state: T[]
  }>
}


const WithPersistence = <T extends Unique>(props: Props<T>) => {
  const {initialState, children, context} = props

  const [state, _setState] = useState<T[]>(initialState)

  return (
    <context.Provider value={{
      state: state,
    }}>
      {children}
    </context.Provider>
  )
}