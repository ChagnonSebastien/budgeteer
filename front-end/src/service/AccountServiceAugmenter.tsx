import { FC, useMemo } from 'react'

import { AugmenterProps } from './BasicCrudServiceWithPersistence'
import Account, { AccountDeletionOptions, AccountDeletionResult, AccountID } from '../domain/model/account'
import AccountRemoteStore from '../store/remote/AccountRemoteStore'

export interface AccountPersistenceAugmentation {
  readonly myOwnAccounts: Account[]
  readonly otherAccounts: Account[]
  readonly augmentedVersion: number
  deleteAccount(id: AccountID, options: AccountDeletionOptions): Promise<AccountDeletionResult>
}

const unsupported = () => Promise.reject(new Error('deleting accounts requires the full app'))

export const makeAccountPersistenceAugmenter = (
  remoteStore?: AccountRemoteStore,
): FC<AugmenterProps<AccountID, Account, AccountPersistenceAugmentation>> => {
  const deleteAccount = remoteStore
    ? (id: AccountID, options: AccountDeletionOptions) => remoteStore.deleteAccount(id, options)
    : unsupported

  const AccountPersistenceAugmenter: FC<AugmenterProps<AccountID, Account, AccountPersistenceAugmentation>> = (
    props,
  ) => {
    const { augment, state, version } = props

    const augmentedData = useMemo(() => {
      const myOwnAccounts = state.filter((a) => a.isMine)
      const otherAccounts = state.filter((a) => !a.isMine)
      return { myOwnAccounts, otherAccounts, augmentedVersion: version, deleteAccount }
    }, [state, version])

    return augment(augmentedData)
  }
  return AccountPersistenceAugmenter
}

export const AccountPersistenceAugmenter = makeAccountPersistenceAugmenter()
