import { Alert, Button, Stack, Typography } from '@mui/material'
import { FC, useContext, useMemo, useState } from 'react'

import { UserContext } from '../../App'
import { CategoryID } from '../../domain/model/category'
import { CurrencyID, RateAutoupdateSettings } from '../../domain/model/currency'
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
import AppDialog from '../shared/AppDialog'
import FormWrapper from '../shared/FormWrapper'
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
  const { state: currencies, create: createCurrency } = useContext(CurrencyServiceContext)
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
  const [addingCurrency, setAddingCurrency] = useState(false)

  const addGroupCurrency = async () => {
    setAddingCurrency(true)
    try {
      const created = await createCurrency({
        name: transactionGroup.originalCurrency,
        symbol: transactionGroup.originalCurrencySymbol,
        decimalPoints: transactionGroup.originalCurrencyDecimalPoints,
        risk: '',
        type: '',
        rateAutoupdateSettings: new RateAutoupdateSettings('', false),
      })
      setCurrency(created.id)
      showToast(`${created.name} added to your currencies`)
    } catch {
      showToast('Could not add the currency', 'error')
    } finally {
      setAddingCurrency(false)
    }
  }

  const groupCurrencyLabel = `${transactionGroup.originalCurrency} (${transactionGroup.originalCurrencySymbol})`
  const lookAlikes = currencies.filter(
    (c) =>
      c.decimalPoints === transactionGroup.originalCurrencyDecimalPoints ||
      c.name.toLowerCase() === transactionGroup.originalCurrency.toLowerCase(),
  )
  const [confirmingCurrency, setConfirmingCurrency] = useState(false)
  const requestGroupCurrency = () => (lookAlikes.length > 0 ? setConfirmingCurrency(true) : addGroupCurrency())

  const join = async (fields: { currency?: CurrencyID; category?: CategoryID }) => {
    // Updating any personal property of the group accepts the invitation.
    await updateTransactionGroup({ id: transactionGroup.id }, { hidden: false, ...fields })
    // The group's transactions only reach members, so they were not fetched before joining.
    await Promise.all([refreshTransactionGroups(), refreshTransactions(), refreshUnconfirmedTransactions()])
    showToast(`Joined ${transactionGroup.name}`)
  }

  const intro = (
    <Typography>
      You were invited to <b>{transactionGroup.name}</b>. Amounts in this group are in <b>{groupCurrencyLabel}</b>.
      {!isGuest && ' Pick the currency you track it in, or add a copy of it to your currencies.'}
    </Typography>
  )

  if (isGuest) {
    return (
      <Stack sx={{ gap: 2, alignItems: 'start' }}>
        {intro}
        <Button variant="contained" onClick={() => join({})}>
          Join group
        </Button>
      </Stack>
    )
  }

  return (
    <Stack sx={{ gap: 2 }}>
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
        {matchingCurrencies.length === 0 ? (
          <Alert
            severity="info"
            action={
              <Button color="inherit" size="small" disabled={addingCurrency} onClick={requestGroupCurrency}>
                Add it
              </Button>
            }
          >
            None of your currencies uses {transactionGroup.originalCurrencyDecimalPoints} decimals. Add{' '}
            {groupCurrencyLabel} to your currencies?
          </Alert>
        ) : (
          <CurrencyPicker
            selectedCurrencyId={currency}
            setSelectedCurrencyId={setCurrency}
            labelText={`Your currency (${transactionGroup.originalCurrencyDecimalPoints} decimals)`}
            currencies={matchingCurrencies}
            errorText={error && currency === null ? error : undefined}
            additionalActions={
              <Button disabled={addingCurrency} onClick={requestGroupCurrency}>
                Add {transactionGroup.originalCurrency}
              </Button>
            }
          />
        )}
        <CategoryPicker
          selectedConfig={{
            mode: 'single',
            onSelectItem: setCategory,
            selectedItem: category,
          }}
          labelText="Category"
        />
      </FormWrapper>
      <AppDialog
        open={confirmingCurrency}
        onClose={() => setConfirmingCurrency(false)}
        title={`Add ${groupCurrencyLabel} to your currencies?`}
        maxWidth="xs"
        actions={
          <>
            <Button color="inherit" onClick={() => setConfirmingCurrency(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                setConfirmingCurrency(false)
                addGroupCurrency()
              }}
            >
              Add anyway
            </Button>
          </>
        }
      >
        <Typography color="text.secondary">
          You already have {lookAlikes.map((c) => `${c.name} (${c.symbol})`).join(', ')}. If one of them is the currency
          this group uses, pick it instead of adding a duplicate.
        </Typography>
      </AppDialog>
    </Stack>
  )
}

export default JoinTransactionGroup
