import { FC, useMemo } from "react"
import Account from "../domain/model/account"
import { AugmenterProps } from "./BasicCrudServiceWithPersistence"

export interface AccountPersistenceAugmentation {
  readonly myOwnAccounts: Account[]
  readonly otherAccounts: Account[]
}

export const AccountPersistenceAugmenter: FC<AugmenterProps<Account, AccountPersistenceAugmentation>> = (props) => {
  const {augment, state} = props

  const myOwnAccounts = useMemo(() => {
    return state.filter(a => a.isMine)
  }, [state])

  const otherAccounts = useMemo(() => {
    return state.filter(a => !a.isMine)
  }, [state])

  return augment({myOwnAccounts, otherAccounts})
}