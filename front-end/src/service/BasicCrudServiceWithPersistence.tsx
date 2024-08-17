import { Context, FC, ReactNode, useCallback, useState } from "react"
import Unique from "../domain/model/Unique"
import { BasicCrudService } from "./BasicCrudService"

interface Store<T extends Unique> {
  getAll(): Promise<T[]>

  create(data: Omit<T, "id">): Promise<T>

  update(id: number, data: Partial<Omit<T, "id">>): Promise<void>
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

  const [state, setState] = useState<T[]>(initialState.sort(sorter ?? ((_a: T, _b: T) => 0)))

  const create = useCallback(async (data: Omit<T, "id">): Promise<T> => {
    const newItem = await longTermStore.create(data)

    setState(prevState => ([...prevState, newItem].sort(sorter ?? ((_a: T, _b: T) => 0))))
    return newItem
  }, [])

  const update = useCallback(async (id: number, data: Partial<Omit<T, "id">>): Promise<void> => {
    await longTermStore.update(id, data)
    setState(prevState => (prevState.map(c => c.id === id ? {...c, ...data} : c).sort(sorter ?? ((_a: T, _b: T) => 0))))
  }, [])

  return (
    <Augmenter state={state} setState={setState} longTermStore={longTermStore} augment={(b) => (
      <context.Provider value={{...b, state, create, update}}>
        {children}
      </context.Provider>
    )}/>
  )
}