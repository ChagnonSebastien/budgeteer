import { FC, useContext, useMemo } from 'react'

import ItemPicker from './ItemPicker'
import Account, { AccountID } from '../../domain/model/account'
import MixedAugmentation from '../../service/MixedAugmentation'
import { AccountServiceContext } from '../../service/ServiceContext'
import AccountCard, { AdditionalAccountCardProps } from '../accounts/AccountCard'
import GroupedAccountList from '../accounts/GroupedAccountList'

interface Props {
  valueText: string
  onAccountSelected?: (newAccount: { existing: boolean; id: AccountID | null; name: string }) => void
  itemDisplayText?: (item: Account | undefined) => string
  labelText: string
  errorText?: string
  myOwn: boolean
  allowNew?: boolean
}

const AccountPicker: FC<Props> = (props) => {
  const {
    valueText,
    onAccountSelected,
    myOwn,
    allowNew = false,
    labelText,
    errorText,
    itemDisplayText = (item) => item?.name ?? '',
  } = props
  const { myOwnAccounts, otherAccounts } = useContext(AccountServiceContext)
  const { augmentedTransactions: transactions } = useContext(MixedAugmentation)
  const accounts = useMemo(() => {
    return myOwn ? myOwnAccounts : otherAccounts
  }, [myOwn, myOwnAccounts, otherAccounts])

  // Order accounts by how recently they were transacted with, matching the
  // ordering used in the full account list.
  const orderedAccounts = useMemo(() => {
    const visited = new Set<AccountID>()
    const ordered = new Array<Account>()

    for (const transaction of transactions) {
      for (const id of [transaction.senderId, transaction.receiverId]) {
        if (id === null || visited.has(id)) continue
        const account = accounts.find((a) => a.id === id)
        if (typeof account !== 'undefined') {
          ordered.push(account)
          visited.add(id)
        }
      }
    }

    for (const account of accounts) {
      if (!visited.has(account.id)) ordered.push(account)
    }

    return ordered
  }, [accounts, transactions])

  // Get the selected account ID from valueText if possible
  const selectedAccountId = useMemo(() => {
    if (!onAccountSelected) return null
    const account = accounts.find((a) => a.name === valueText)
    return account?.id ?? null
  }, [accounts, valueText, onAccountSelected])

  // Handle account selection
  const handleAccountSelected = (id: AccountID) => {
    if (onAccountSelected) {
      const account = accounts.find((a) => a.id === id)
      if (account) {
        onAccountSelected({
          existing: true,
          id: account.id,
          name: account.name,
        })
      }
    }
  }

  // Handle new account creation
  const handleNewAccountSelected = (name: string) => {
    if (onAccountSelected && allowNew) {
      const existingAccount = accounts.find((a) => a.name.toLowerCase() === name.toLowerCase())
      onAccountSelected({
        existing: !!existingAccount,
        id: existingAccount?.id ?? null,
        name: existingAccount?.name ?? name,
      })
    }
  }

  return (
    <ItemPicker<AccountID, Account, AdditionalAccountCardProps>
      variant="dropdown"
      items={orderedAccounts}
      ItemListComponent={GroupedAccountList}
      ItemComponent={AccountCard}
      selectedItemId={selectedAccountId}
      onSelectItem={handleAccountSelected}
      labelText={labelText}
      errorText={errorText}
      searchPlaceholder={allowNew ? 'Search or create account...' : 'Search account...'}
      itemDisplayText={itemDisplayText}
      allowNew={allowNew}
      onNewItemSelected={handleNewAccountSelected}
      additionalItemProps={{}}
    />
  )
}

export default AccountPicker
