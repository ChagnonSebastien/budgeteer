import { Context, FC, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { BasicCrudService } from './BasicCrudService'
import Unique, { ItemType } from '../domain/model/Unique'
import { ActionType } from '../store/local/IndexedDB'

interface Store<IdType, Item extends Unique<IdType, Item>, ItemIdentifiableFields, ItemUpdatableFields> {
  getAll(): Promise<Item[]>
  create(data: ItemUpdatableFields, identifier?: ItemIdentifiableFields): Promise<Item>
  update(identity: ItemIdentifiableFields, data: Partial<ItemUpdatableFields>): Promise<void>
  // Optional: only entities that support deletion implement this.
  delete?(identity: ItemIdentifiableFields): Promise<void>
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

const MemoizedProvider = <Value, Base extends object, Augmentation>({
  context,
  base,
  augmentation,
  children,
}: {
  context: Context<Value>
  base: Base
  augmentation: Augmentation
  children: ReactNode
}) => {
  const value = useMemo(() => ({ ...base, ...augmentation }) as Value, [base, augmentation])
  return <context.Provider value={value}>{children}</context.Provider>
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
  // A fresh IndexedDB can resolve after the remote fetch; its stale read must not overwrite it.
  const remoteLoaded = useRef(false)

  useEffect(() => {
    localStore.getAll().then((items) => {
      setInitialized(true)
      if (remoteLoaded.current) return
      setState((prev) => {
        const ordered = items.sort(sorter)
        if (prev.data.length != ordered.length) return { version: prev.version + 1, data: ordered }
        for (let i = 0; i < ordered.length; i += 1) {
          if (!prev.data[i].equals(ordered[i])) return { version: prev.version + 1, data: ordered }
        }
        return prev
      })
    })
  }, [])

  const refresh = useCallback(async (): Promise<void> => {
    const items = await longTermStore.getAll()
    remoteLoaded.current = true
    setState((prev) => {
      const ordered = items.sort(sorter)
      if (prev.data.length != ordered.length) return { version: prev.version + 1, data: ordered }
      for (let i = 0; i < ordered.length; i += 1) {
        if (!prev.data[i].equals(ordered[i])) return { version: prev.version + 1, data: ordered }
      }
      return prev
    })
    await localStore.sync(items)
  }, [])

  useEffect(() => {
    if (!hasInternet || !synced) return

    refresh()
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
        // Keep the prototype: a spread would drop methods like equals and hasJoined.
        data: prevState.data
          .map((c) => (c.id === identity.id ? Object.assign(Object.create(Object.getPrototypeOf(c)), c, data) : c))
          .sort(sorter),
        version: prevState.version + 1,
      }))
    },
    [hasInternet],
  )

  const deleteItem = useCallback(
    async (identity: ItemIdentifiableFields): Promise<void> => {
      if (!longTermStore.delete || !localStore.delete) {
        throw new Error(`deletion is not supported for ${itemName}`)
      }

      if (hasInternet) {
        await longTermStore.delete(identity)
        await localStore.delete(identity)
      } else {
        await localStore.delete(identity)
        await actionStore.saveAction(itemName, 'delete', identity)
      }

      setState((prevState) => ({
        data: prevState.data.filter((item) => item.id !== identity.id),
        version: prevState.version + 1,
      }))
    },
    [hasInternet],
  )

  const baseValue = useMemo(
    () => ({ initialized, version: state.version, state: state.data, create, update, delete: deleteItem, refresh }),
    [initialized, state.version, state.data, create, update, deleteItem, refresh],
  )

  return (
    <Augmenter
      version={state.version}
      state={state.data}
      augment={(augmentation) => (
        <MemoizedProvider context={context} base={baseValue} augmentation={augmentation}>
          {children}
        </MemoizedProvider>
      )}
    />
  )
}
