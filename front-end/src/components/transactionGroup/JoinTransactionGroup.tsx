import { Button, Typography } from '@mui/material'
import { FC, useContext, useMemo, useState } from 'react'

import { UserContext } from '../../App'
import { CategoryID } from '../../domain/model/category'
import { CurrencyID } from '../../domain/model/currency'
import TransactionGroup from '../../domain/model/transactionGroup'
import {
  CategoryServiceContext,
  CurrencyServiceContext,
  TransactionGroupServiceContext,
  TransactionServiceContext,
  UnconfirmedTransactionServiceContext,
} from '../../service/ServiceContext'
import CategoryPicker from '../categories/CategoryPicker'
import CurrencyPicker from '../currencies/CurrencyPicker'
import FormWrapper from '../shared/FormWrapper'
import { Column } from '../shared/Layout'
import { useToast } from '../shared/ToastProvider'

interface Props {
  transactionGroup: TransactionGroup
}

const JoinTransactionGroup: FC<Props> = ({ transactionGroup }) => {
  const { authentification_method } = useContext(UserContext)
  const { update: updateTransactionGroup, refresh: refreshTransactionGroups } =
    useContext(TransactionGroupServiceContext)
  const { refresh: refreshTransactions } = useContext(TransactionServiceContext)
  const { refresh: refreshUnconfirmedTransactions } = useContext(UnconfirmedTransactionServiceContext)
  const { state: currencies } = useContext(CurrencyServiceContext)
  const { tentativeRoot } = useContext(CategoryServiceContext)
  const { showToast } = useToast()

  const isGuest = authentification_method === 'guest'

  const matchingCurrencies = useMemo(
    () => currencies.filter((c) => c.decimalPoints === transactionGroup.originalCurrencyDecimalPoints),
    [currencies, transactionGroup.originalCurrencyDecimalPoints],
  )

  const [currency, setCurrency] = useState<CurrencyID | null>(null)
  const [category, setCategory] = useState<CategoryID | null>(tentativeRoot?.id ?? null)
  const [error, setError] = useState('')

  const join = async (fields: { currency?: CurrencyID; category?: CategoryID }) => {
    // Updating any personal property of the group accepts the invitation.
    await updateTransactionGroup({ id: transactionGroup.id }, { hidden: false, ...fields })
    // The group's transactions only reach members, so they were not fetched before joining.
    await Promise.all([refreshTransactionGroups(), refreshTransactions(), refreshUnconfirmedTransactions()])
    showToast(`Joined ${transactionGroup.name}`)
  }

  const intro = (
    <Typography>
      You were invited to <b>{transactionGroup.name}</b>. Amounts in this group are in{' '}
      <b>{transactionGroup.originalCurrency}</b>.
    </Typography>
  )

  if (isGuest) {
    return (
      <Column style={{ gap: '1rem', alignItems: 'start' }}>
        {intro}
        <Button variant="contained" onClick={() => join({})}>
          Join group
        </Button>
      </Column>
    )
  }

  return (
    <Column style={{ gap: '1rem' }}>
      {intro}
      <FormWrapper
        onSubmit={async () => {
          if (currency === null || category === null) {
            setError('Choose a currency and a category')
            return
          }
          await join({ currency, category })
        }}
        submitText="Join group"
      >
        <CurrencyPicker
          selectedCurrencyId={currency}
          setSelectedCurrencyId={setCurrency}
          labelText={`Your currency (${transactionGroup.originalCurrencyDecimalPoints} decimals)`}
          currencies={matchingCurrencies}
          errorText={error && currency === null ? error : undefined}
        />
        <CategoryPicker
          selectedConfig={{
            mode: 'single',
            onSelectItem: setCategory,
            selectedItem: category,
          }}
          labelText="Category"
        />
      </FormWrapper>
    </Column>
  )
}

export default JoinTransactionGroup
