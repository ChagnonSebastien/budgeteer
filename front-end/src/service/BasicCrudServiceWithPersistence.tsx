import { Context, FC, ReactNode, useCallback, useState } from "react"
import Unique from "../domain/model/Unique"
import { BasicCrudService } from "./BasicCrudService"

interface Store<T extends Unique> {
  getAll(): Promise<T[]>

  create(data: Omit<T, "id">): Promise<T>
}

export interface AugmenterProps<T extends Unique, A> {
  state: T[]
  setState: (state: T[]) => void
  longTermStore: Store<T>
  augment: (b: A) => JSX.Element
}

interface Props<T extends Unique, A> {
  initialState: T[]
  longTermStore: Store<T>
  children: ReactNode[] | ReactNode
  context: Context<A & BasicCrudService<T>>
  sorter?: (a: T, b: T) => number
  Augmenter: FC<AugmenterProps<T, A>>
}

export const BasicCrudServiceWithPersistence = <T extends Unique, A>(props: Props<T, A>) => {
  const {initialState, children, context, longTermStore, sorter, Augmenter} = props

  const [state, setState] = useState<T[]>(initialState)

  const create = useCallback(async (data: Omit<T, "id">): Promise<T> => {
    const newItem = await longTermStore.create(data)

    setState(prevState => ([...prevState, newItem].sort(sorter ?? ((_a: T, _b: T) => 0))))
    return newItem
  }, [])

  return (
    <Augmenter state={state} setState={setState} longTermStore={longTermStore} augment={(b) => (
      <context.Provider value={{...b, state, create}}>
        {children}
      </context.Provider>
    )}/>
  )
}