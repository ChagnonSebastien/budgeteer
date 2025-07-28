import { FC, useContext, useMemo } from 'react'

import { AccountCard, AdditionalAccountCardProps } from './AccountCard'
import GroupedAccountList from './GroupedAccountList'
import Account, { AccountID } from '../../domain/model/account'
import { AccountServiceContext } from '../../service/ServiceContext'
import ItemPicker from '../inputs/ItemPicker'

interface Props {
  valueText: string
  onAccountSelected?: (newAccount: { existing: boolean; id: AccountID | null; name: string }) => void
  selected?: AccountID[]
  onMultiSelect?: (newAccounts: AccountID[]) => void
  labelText: string
  errorText?: string
  myOwn: boolean
  allowNew?: boolean
}

const AccountPicker: FC<Props> = (props) => {
  const { valueText, onAccountSelected, myOwn, allowNew = false, labelText, errorText } = props
  const { myOwnAccounts, otherAccounts } = useContext(AccountServiceContext)
  const accounts = useMemo(() => {
    return myOwn ? myOwnAccounts : otherAccounts
  }, [myOwn, myOwnAccounts, otherAccounts])

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
      items={accounts}
      ItemListComponent={GroupedAccountList}
      ItemComponent={AccountCard}
      selectedItemId={selectedAccountId}
      onSelectItem={handleAccountSelected}
      labelText={labelText}
      errorText={errorText}
      searchPlaceholder={allowNew ? 'Search or create account...' : 'Search account...'}
      itemDisplayText={(account) => account?.name ?? ''}
      allowNew={allowNew}
      onNewItemSelected={handleNewAccountSelected}
      additionalItemProps={{}}
    />
  )
}

export default AccountPicker
