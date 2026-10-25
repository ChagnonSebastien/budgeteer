import { FC, useContext, useMemo } from 'react'

import ItemPicker from './ItemPicker'
import { EmailValidator } from './Validator'
import { Email, Person } from '../../domain/model/transactionGroup'
import { TransactionGroupServiceContext } from '../../service/ServiceContext'
import { matchesSearch, sameForSearch } from '../../utils'
import { AdditionalAccountCardProps } from '../accounts/AccountCard'
import PersonCard from '../shared/PersonCard'

interface Props {
  value: Email | null
  onPersonSelected: (newUser: { existing: boolean; id: Email | null; name: string }) => void
  labelText: string
  dialogTitle?: string
  errorText?: string
  allowNew?: boolean
  OverrideTextLabel?: FC<{ onClick(): void }>
  excludeEmails?: Email[]
}

const PersonPicker: FC<Props> = (props) => {
  const {
    value,
    onPersonSelected,
    allowNew = false,
    labelText,
    dialogTitle,
    errorText,
    OverrideTextLabel,
    excludeEmails,
  } = props
  const { knownPeople: allKnownPeople } = useContext(TransactionGroupServiceContext)
  const knownPeople = useMemo(
    () => allKnownPeople.filter((person) => !excludeEmails?.includes(person.email)),
    [allKnownPeople, excludeEmails],
  )

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
      dialogTitle={dialogTitle}
      errorText={errorText}
      searchPlaceholder={allowNew ? 'Search or create person...' : 'Search person...'}
      allowNew={allowNew}
      onNewItemSelected={handleNewPersonSelected}
      additionalItemProps={{}}
      doesStringMatchItem={(s: string, item: Person) => {
        return matchesSearch(item.email, s) || matchesSearch(item.name, s)
      }}
      doesStringMatchItemPerfectly={(s: string, item: Person) => {
        return sameForSearch(item.email, s) || sameForSearch(item.name, s)
      }}
      newItemStringValidator={new EmailValidator()}
    />
  )
}

export default PersonPicker
