import { FC, useCallback, useContext, useMemo } from 'react'

import NetWorthChart, { useBalanceChartData } from './NetWorthChart'
import { DateNavigation } from './TimerangeGraphUtils'
import Account from '../../domain/model/account'
import { CurrencyID } from '../../domain/model/currency'
import { AccountServiceContext } from '../../service/ServiceContext'

export type GroupType = 'financialInstitution' | 'accountType' | 'account' | 'none'

interface Props {
  filterByAccounts?: number[]
  fromDate: Date
  toDate: Date
  groupBy: GroupType
  baselineConfig?: 'none' | 'showIndividualBaselines' | 'showGlobalBaseline'
  scale?: 'absolute' | 'cropped-absolute' | 'relative'
  type?: 'passive' | 'active'
  navigation?: DateNavigation
}

const AccountsBalanceChart: FC<Props> = (props) => {
  const {
    fromDate,
    toDate,
    filterByAccounts,
    groupBy,
    baselineConfig = 'none',
    scale = 'absolute',
    type = 'active',
    navigation,
  } = props

  const { myOwnAccounts } = useContext(AccountServiceContext)

  const group = useCallback(
    (account?: Account) => {
      if (typeof account === 'undefined') return undefined

      switch (groupBy) {
        case 'account':
          return account.name
        case 'financialInstitution':
          return account.financialInstitution ?? 'Other'
        case 'accountType':
          return account.type ?? 'Other'
        case 'none':
          return 'Total'
      }
    },
    [groupBy],
  )

  const accounts = useMemo(() => {
    if (typeof filterByAccounts === 'undefined') {
      return myOwnAccounts
    }

    const filtered = myOwnAccounts.filter((account) => filterByAccounts?.includes(account.id))
    return filtered.length === 0 ? myOwnAccounts : filtered
  }, [myOwnAccounts, filterByAccounts])

  const getInitialAmountIdentifier = (account: Account, _currencyId: CurrencyID) => {
    return account
  }

  const { data, labels, groups, showLabelEveryFactor, colorReference } = useBalanceChartData(
    fromDate,
    toDate,
    getInitialAmountIdentifier,
    (transaction) => transaction.sender,
    (transaction) => transaction.receiver,
    group,
    accounts,
    type,
  )

  return (
    <NetWorthChart
      scale={scale}
      baselineConfig={baselineConfig}
      groups={groups}
      labels={labels}
      data={data}
      showLabelEveryFactor={showLabelEveryFactor}
      navigation={navigation}
      colorReference={colorReference}
    />
  )
}

export default AccountsBalanceChart
