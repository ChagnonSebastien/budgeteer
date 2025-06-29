import { Context, FC, ReactNode, useCallback, useState } from 'react'

import { BasicCrudService } from './BasicCrudService'
import Unique from '../domain/model/Unique'

interface Store<IdType, T extends Unique<IdType>, ItemIdentifiableFields, ItemUpdatableFields> {
  getAll(): Promise<T[]>
  create(data: ItemUpdatableFields, identifier?: ItemIdentifiableFields): Promise<T>
  update(identity: ItemIdentifiableFields, data: Partial<ItemUpdatableFields>): Promise<void>
}

export interface AugmenterProps<IdType, T extends Unique<IdType>, Augment> {
  state: T[]
  augment: (b: Augment) => JSX.Element
}

interface Props<IdType, Item extends Unique<IdType>, ItemIdentifiableFields, ItemUpdatableFields, Augmentation> {
  initialState: Item[]
  longTermStore: Store<IdType, Item, ItemIdentifiableFields, ItemUpdatableFields>
  children: ReactNode[] | ReactNode
  context: Context<Augmentation & BasicCrudService<IdType, Item, ItemIdentifiableFields, ItemUpdatableFields>>
  sorter?: (a: Item, b: Item) => number
  Augmenter: FC<AugmenterProps<IdType, Item, Augmentation>>
}

export const BasicCrudServiceWithPersistence = <
  IdType,
  Item extends Unique<IdType>,
  ItemIdentifiableFields extends Unique<IdType>,
  ItemUpdatableFields,
  Augmentation,
>(
  props: Props<IdType, Item, ItemIdentifiableFields, ItemUpdatableFields, Augmentation>,
) => {
  const { initialState, children, context, longTermStore, sorter, Augmenter } = props

  const [state, setState] = useState<Item[]>(initialState.sort(sorter ?? ((_a: Item, _b: Item) => 0)))

  const create = useCallback(async (data: ItemUpdatableFields, identity?: ItemIdentifiableFields): Promise<Item> => {
    const newItem = await longTermStore.create(data, identity)

    setState((prevState) => [...prevState, newItem].sort(sorter ?? ((_a: Item, _b: Item) => 0)))
    return newItem
  }, [])

  const update = useCallback(
    async (identity: ItemIdentifiableFields, data: Partial<ItemUpdatableFields>): Promise<void> => {
      await longTermStore.update(identity, data)
      setState((prevState) =>
        prevState
          .map((c) => (c.id === identity.id ? { ...c, ...data } : c))
          .sort(sorter ?? ((_a: Item, _b: Item) => 0)),
      )
    },
    [],
  )

  const deleteItem = useCallback(async (_uid: string): Promise<void> => {
    throw new Error('not yet supported')
  }, [])

  return (
    <Augmenter
      state={state}
      augment={(b) => (
        <context.Provider value={{ state, create, update, delete: deleteItem, ...b }}>{children}</context.Provider>
      )}
    />
  )
}
