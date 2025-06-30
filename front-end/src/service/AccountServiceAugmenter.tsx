import { FC, useMemo } from 'react'

import { AugmenterProps } from './BasicCrudServiceWithPersistence'
import Account, { AccountID } from '../domain/model/account'

export interface AccountPersistenceAugmentation {
  readonly myOwnAccounts: Account[]
  readonly otherAccounts: Account[]
  readonly augmentedVersion: number
}

export const AccountPersistenceAugmenter: FC<AugmenterProps<AccountID, Account, AccountPersistenceAugmentation>> = (
  props,
) => {
  const { augment, state, version } = props

  const augmentedData = useMemo(() => {
    const myOwnAccounts = state.filter((a) => a.isMine)
    const otherAccounts = state.filter((a) => !a.isMine)
    const augmentedVersion = version
    return { myOwnAccounts, otherAccounts, augmentedVersion }
  }, [state, version])

  return augment(augmentedData)
}
