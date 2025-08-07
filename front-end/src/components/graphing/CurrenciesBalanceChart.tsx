import { FC, useCallback, useContext, useMemo } from 'react'

import NetWorthChart, { useNetWorthChartData } from './NetWorthChart'
import Account from '../../domain/model/account'
import Currency, { CurrencyID } from '../../domain/model/currency'
import MixedAugmentation from '../../service/MixedAugmentation'
import { AccountServiceContext, CurrencyServiceContext } from '../../service/ServiceContext'
import useTimerangeSegmentation from '../shared/useTimerangeSegmentation'

export type GroupType = 'currency' | 'risk' | 'type' | 'none'

interface Props {
  filterByAccounts?: number[]
  fromDate: Date
  toDate: Date
  groupBy: GroupType
  baselineConfig?: 'none' | 'showIndividualBaselines' | 'showGlobalBaseline'
  scale?: 'absolute' | 'cropped-absolute' | 'relative'
}

const CurrenciesBalanceChart: FC<Props> = (props) => {
  const { fromDate, toDate, filterByAccounts, groupBy, baselineConfig = 'none', scale = 'absolute' } = props

  const { augmentedTransactions } = useContext(MixedAugmentation)
  const { myOwnAccounts } = useContext(AccountServiceContext)
  const { state: currencies } = useContext(CurrencyServiceContext)

  const group = useCallback(
    (currency?: Currency) => {
      if (typeof currency === 'undefined') return 'Total'

      switch (groupBy) {
        case 'currency':
          return currency.name
        case 'risk':
          return currency.risk !== '' ? currency.risk : 'Unknown'
        case 'type':
          return currency.type !== '' ? currency.type : 'Unknown'
        case 'none':
          return 'Total'
      }
    },
    [groupBy],
  )

  const accounts = useMemo(() => {
    const prefilter = myOwnAccounts.filter((account) => account?.type !== 'Credit Card')

    if (typeof filterByAccounts === 'undefined') {
      return prefilter
    }

    const filtered = prefilter.filter((account) => filterByAccounts?.includes(account.id))
    return filtered.length === 0 ? prefilter : filtered
  }, [myOwnAccounts, filterByAccounts])

  const { showLabelEveryFactor, timeseriesIteratorGenerator } = useTimerangeSegmentation(fromDate, toDate, 'dense')

  const timeseriesIterator = useMemo(
    () => timeseriesIteratorGenerator(augmentedTransactions),
    [timeseriesIteratorGenerator, augmentedTransactions],
  )

  const getInitialAmountIdentifier = (_account: Account, currencyId?: CurrencyID) => {
    return currencies.find((c) => c.id === currencyId)
  }

  const { data, labels, groups } = useNetWorthChartData(
    timeseriesIterator,
    getInitialAmountIdentifier,
    (transaction) => transaction.currency,
    (transaction) => transaction.receiverCurrency,
    group,
    accounts,
    (transaction) => transaction.financialIncomeCurrency,
  )

  return (
    <NetWorthChart
      scale={scale}
      baselineConfig={baselineConfig}
      groups={groups}
      labels={labels}
      data={data}
      showLabelEveryFactor={showLabelEveryFactor}
    />
  )
}

export default CurrenciesBalanceChart
