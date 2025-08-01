import { Context, FC, ReactNode, useCallback, useEffect, useState } from 'react'

import { BasicCrudService } from './BasicCrudService'
import Unique, { ItemType } from '../domain/model/Unique'
import { ActionType } from '../store/local/IndexedDB'

interface Store<IdType, Item extends Unique<IdType, Item>, ItemIdentifiableFields, ItemUpdatableFields> {
  getAll(): Promise<Item[]>
  create(data: ItemUpdatableFields, identifier?: ItemIdentifiableFields): Promise<Item>
  update(identity: ItemIdentifiableFields, data: Partial<ItemUpdatableFields>): Promise<void>
}

interface LocalStore<IdType, Item extends Unique<IdType, Item>, ItemIdentifiableFields, ItemUpdatableFields>
  extends Store<IdType, Item, ItemIdentifiableFields, ItemUpdatableFields> {
  createKnown(item: Item): Promise<void>
  sync(items: Item[]): Promise<void>
}

interface ReplayStore<ItemIdentifiableFields, ItemUpdatableFields> {
  saveAction(
    itemType: string,
    actionType: ActionType,
    identifier?: ItemIdentifiableFields,
    data?: Partial<ItemUpdatableFields> | ItemUpdatableFields,
  ): Promise<void>
}

export interface AugmenterProps<IdType, Item extends Unique<IdType, Item>, Augment> {
  state: Item[]
  version: number
  augment: (b: Augment) => ReactNode
}

interface Props<IdType, Item extends Unique<IdType, Item>, ItemIdentifiableFields, ItemUpdatableFields, Augmentation> {
  initialState?: Item[]
  itemName: ItemType
  longTermStore: Store<IdType, Item, ItemIdentifiableFields, ItemUpdatableFields>
  localStore: LocalStore<IdType, Item, ItemIdentifiableFields, ItemUpdatableFields>
  actionStore: ReplayStore<ItemIdentifiableFields, ItemUpdatableFields>
  children: ReactNode[] | ReactNode
  context: Context<Augmentation & BasicCrudService<IdType, Item, ItemIdentifiableFields, ItemUpdatableFields>>
  sorter: (a: Item, b: Item) => number
  Augmenter: FC<AugmenterProps<IdType, Item, Augmentation>>
  synced: boolean
  hasInternet: boolean
}

export const BasicCrudServiceWithPersistence = <
  IdType,
  Item extends Unique<IdType, Item>,
  ItemIdentifiableFields extends Unique<IdType, Item>,
  ItemUpdatableFields,
  Augmentation,
>(
  props: Props<IdType, Item, ItemIdentifiableFields, ItemUpdatableFields, Augmentation>,
) => {
  const {
    initialState,
    itemName,
    children,
    context,
    longTermStore,
    localStore,
    actionStore,
    sorter,
    Augmenter,
    synced,
    hasInternet,
  } = props

  const [state, setState] = useState<{ version: number; data: Item[] }>({ version: 0, data: initialState ?? [] })
  const [initialized, setInitialized] = useState<boolean>(typeof initialState !== 'undefined')

  useEffect(() => {
    localStore.getAll().then((items) => {
      setState((prev) => {
        const ordered = items.sort(sorter)
        if (prev.data.length != ordered.length) return { version: prev.version + 1, data: ordered }
        for (let i = 0; i < ordered.length; i += 1) {
          if (!prev.data[i].equals(ordered[i])) return { version: prev.version + 1, data: ordered }
        }
        return prev
      })
      setInitialized(true)
    })
  }, [])

  useEffect(() => {
    if (!hasInternet || !synced) return

    longTermStore.getAll().then(async (items) => {
      setState((prev) => {
        const ordered = items.sort(sorter)
        if (prev.data.length != ordered.length) return { version: prev.version + 1, data: ordered }
        for (let i = 0; i < ordered.length; i += 1) {
          if (!prev.data[i].equals(ordered[i])) return { version: prev.version + 1, data: ordered }
        }
        return prev
      })
      await localStore.sync(items)
    })
  }, [synced, hasInternet])

  const create = useCallback(
    async (data: ItemUpdatableFields, identity?: ItemIdentifiableFields): Promise<Item> => {
      let newItem: Item
      if (hasInternet) {
        newItem = await longTermStore.create(data, identity)
        await localStore.createKnown(newItem)
      } else {
        newItem = await localStore.create(data, identity)
        await actionStore.saveAction(itemName, 'create', identity, data)
      }

      setState((prevState) => ({
        data: [...prevState.data, newItem].sort(sorter),
        version: prevState.version + 1,
      }))
      return newItem
    },
    [hasInternet],
  )

  const update = useCallback(
    async (identity: ItemIdentifiableFields, data: Partial<ItemUpdatableFields>): Promise<void> => {
      if (hasInternet) {
        await longTermStore.update(identity, data)
        await localStore.update(identity, data)
      } else {
        await localStore.update(identity, data)
        await actionStore.saveAction(itemName, 'update', identity, data)
      }

      setState((prevState) => ({
        data: prevState.data.map((c) => (c.id === identity.id ? { ...c, ...data } : c)).sort(sorter),
        version: prevState.version + 1,
      }))
    },
    [hasInternet],
  )

  const deleteItem = useCallback(
    async (_uid: string): Promise<void> => {
      throw new Error('not yet supported')
    },
    [hasInternet],
  )

  return (
    <Augmenter
      version={state.version}
      state={state.data}
      augment={(b) => (
        <context.Provider
          value={{ initialized, version: state.version, state: state.data, create, update, delete: deleteItem, ...b }}
        >
          {children}
        </context.Provider>
      )}
    />
  )
}
