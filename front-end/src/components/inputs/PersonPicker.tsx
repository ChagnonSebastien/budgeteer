import { FC, useContext } from 'react'

import ItemPicker from './ItemPicker'
import { EmailValidator } from './Validator'
import { Email, Person } from '../../domain/model/transactionGroup'
import { TransactionGroupServiceContext } from '../../service/ServiceContext'
import { AdditionalAccountCardProps } from '../accounts/AccountCard'
import PersonCard from '../shared/PersonCard'

interface Props {
  value: Email | null
  onPersonSelected: (newUser: { existing: boolean; id: Email | null; name: string }) => void
  validateNewItemString?(s: string): boolean
  labelText: string
  errorText?: string
  allowNew?: boolean
  OverrideTextLabel?: FC<{ onClick(): void }>
}

const PersonPicker: FC<Props> = (props) => {
  const {
    value,
    onPersonSelected,
    allowNew = false,
    labelText,
    errorText,
    OverrideTextLabel,
    validateNewItemString,
  } = props
  const { knownPeople } = useContext(TransactionGroupServiceContext)

  const handleAccountSelected = (email: Email) => {
    if (onPersonSelected) {
      const account = knownPeople.find((a) => a.id === email)
      if (account) {
        onPersonSelected({
          existing: true,
          id: account.id,
          name: account.name,
        })
      }
    }
  }

  // Handle new account creation
  const handleNewPersonSelected = (name: string) => {
    if (onPersonSelected && allowNew) {
      const existingAccount = knownPeople.find((a) => a.name.toLowerCase() === name.toLowerCase())
      onPersonSelected({
        existing: !!existingAccount,
        id: existingAccount?.id ?? null,
        name: existingAccount?.name ?? name,
      })
    }
  }

  return (
    <ItemPicker<Email, Person, AdditionalAccountCardProps>
      items={knownPeople}
      ItemComponent={PersonCard}
      OverrideTextLabel={OverrideTextLabel}
      selectedItemId={value}
      onSelectItem={handleAccountSelected}
      labelText={labelText}
      errorText={errorText}
      searchPlaceholder={allowNew ? 'Search or create person...' : 'Search person...'}
      allowNew={allowNew}
      onNewItemSelected={handleNewPersonSelected}
      additionalItemProps={{}}
      doesStringMatchItem={(s: string, item: Person) => {
        return item.email.toLowerCase().includes(s.toLowerCase()) || item.name.toLowerCase().includes(s.toLowerCase())
      }}
      doesStringMatchItemPerfectly={(s: string, item: Person) => {
        return item.email.toLowerCase() === s.toLowerCase() || item.name.toLowerCase() === s.toLowerCase()
      }}
      newItemStringValidator={new EmailValidator()}
    />
  )
}

export default PersonPicker
