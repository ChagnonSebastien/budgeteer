import { FC, useContext, useMemo } from 'react'

import { AccountList } from './AccountList'
import ItemPicker, { ItemListProps } from './ItemPicker'
import Account from '../domain/model/account'
import { AccountServiceContext } from '../service/ServiceContext'

interface Props {
  valueText: string
  onAccountSelected?: (newAccount: { existing: boolean; id: number | null; name: string }) => void
  selected?: number[]
  onMultiSelect?: (newAccounts: number[]) => void
  labelText: string
  errorText?: string
  myOwn: boolean
  allowNew?: boolean
}

const AccountPicker: FC<Props> = (props) => {
  const { valueText, onAccountSelected, labelText, errorText, myOwn, allowNew = false, onMultiSelect, selected } = props
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
  const handleAccountSelected = (id: number) => {
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

  // Render the account list
  const renderAccountList = (listProps: ItemListProps<Account>) => (
    <AccountList
      accounts={listProps.items}
      onSelect={
        onAccountSelected
          ? (selected) => {
              onAccountSelected({ existing: true, id: selected.id, name: selected.name })
              listProps.onSelect(selected.id)
            }
          : undefined
      }
      onMultiSelect={onMultiSelect}
      selected={selected}
      showZeroBalances={true}
      filterable={listProps.filterable}
      hideSearchOverlay={listProps.hideSearchOverlay}
      focusedAccount={listProps.focusedItemId}
      onFilteredAccountsChange={listProps.onFilteredItemsChange}
    />
  )

  return (
    <ItemPicker<Account>
      items={accounts}
      selectedItemId={selectedAccountId}
      onItemSelected={handleAccountSelected}
      labelText={labelText}
      errorText={errorText}
      searchPlaceholder={allowNew ? 'Search or create account...' : 'Search account...'}
      renderItemValue={() => valueText}
      renderItemList={renderAccountList}
      allowNew={allowNew}
      onNewItemSelected={handleNewAccountSelected}
    />
  )
}

export default AccountPicker
