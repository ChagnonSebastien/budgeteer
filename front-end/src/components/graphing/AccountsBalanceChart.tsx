import { FC, useCallback, useContext, useMemo } from 'react'

import NetWorthChart, { useNetWorthChartData } from './NetWorthChart'
import Account from '../../domain/model/account'
import { CurrencyID } from '../../domain/model/currency'
import MixedAugmentation from '../../service/MixedAugmentation'
import { AccountServiceContext } from '../../service/ServiceContext'
import useTimerangeSegmentation from '../shared/useTimerangeSegmentation'

export type GroupType = 'financialInstitution' | 'type' | 'account' | 'none'

interface Props {
  filterByAccounts?: number[]
  fromDate: Date
  toDate: Date
  groupBy: GroupType
  baselineConfig?: 'none' | 'showIndividualBaselines' | 'showGlobalBaseline'
  scale?: 'absolute' | 'cropped-absolute' | 'relative'
}

const AccountsBalanceChart: FC<Props> = (props) => {
  const { fromDate, toDate, filterByAccounts, groupBy, baselineConfig = 'none', scale = 'absolute' } = props

  const { augmentedTransactions } = useContext(MixedAugmentation)
  const { myOwnAccounts } = useContext(AccountServiceContext)

  const group = useCallback(
    (account?: Account) => {
      if (typeof account === 'undefined') return undefined

      switch (groupBy) {
        case 'account':
          return account.name
        case 'financialInstitution':
          return account.financialInstitution ?? 'Other'
        case 'type':
          return account.type ?? 'Other'
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

  const getInitialAmountIdentifier = (account: Account, _currencyId: CurrencyID) => {
    return account
  }

  const { data, labels, groups } = useNetWorthChartData(
    timeseriesIterator,
    getInitialAmountIdentifier,
    (transaction) => transaction.sender,
    (transaction) => transaction.receiver,
    group,
    accounts,
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

export default AccountsBalanceChart
