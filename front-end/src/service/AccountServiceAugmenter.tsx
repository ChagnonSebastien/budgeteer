import { FC, useMemo } from 'react'

import { AugmenterProps } from './BasicCrudServiceWithPersistence'
import Account, { AccountID } from '../domain/model/account'

export interface AccountPersistenceAugmentation {
  readonly myOwnAccounts: Account[]
  readonly otherAccounts: Account[]
}

export const AccountPersistenceAugmenter: FC<AugmenterProps<AccountID, Account, AccountPersistenceAugmentation>> = (
  props,
) => {
  const { augment, state } = props

  const myOwnAccounts = useMemo(() => {
    return state.filter((a) => a.isMine)
  }, [state])

  const otherAccounts = useMemo(() => {
    return state.filter((a) => !a.isMine)
  }, [state])

  return augment({ myOwnAccounts, otherAccounts })
}
