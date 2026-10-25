import { FC, useContext, useMemo } from 'react'

import { Tooltip } from './AggregatedDiffChart'
import LineChart, { Bucket as LineBucket } from './LineChart'
import { useNetWorthChartData } from './NetWorthChart'
import { DateNavigation } from './TimerangeGraphUtils'
import Account from '../../domain/model/account'
import { formatFull } from '../../domain/model/currency'
import { AugmentedTransaction } from '../../domain/model/transaction'
import MixedAugmentation from '../../service/MixedAugmentation'
import { AccountServiceContext } from '../../service/ServiceContext'
import { darkColors } from '../../utils'
import { DrawerContext } from '../Menu'
import useTimerangeSegmentation, { dateAxisLabels } from '../shared/useTimerangeSegmentation'

interface Props {
  filterByAccounts?: number[]
  fromDate: Date
  toDate: Date
  navigation?: DateNavigation
}

const NET_WORTH = 'Net Worth'
const ASSETS = 'Holdings'
const LIABILITIES = 'Debts'

const ownAccount = (account: Account) => account
const sender = (transaction: AugmentedTransaction) => transaction.sender
const receiver = (transaction: AugmentedTransaction) => transaction.receiver
const accountKey = (account?: Account) => account && String(account.id)

const sum = (values: Record<string, { amount: number }>) =>
  Object.values(values).reduce((total, { amount }) => total + amount, 0)

const NetWorthHistoryChart: FC<Props> = ({ fromDate, toDate, filterByAccounts, navigation }) => {
  const { augmentedTransactions, defaultCurrency } = useContext(MixedAugmentation)
  const { myOwnAccounts } = useContext(AccountServiceContext)
  const { privacyMode } = useContext(DrawerContext)

  const accounts = useMemo(() => {
    if (typeof filterByAccounts === 'undefined') return myOwnAccounts
    const filtered = myOwnAccounts.filter((account) => filterByAccounts.includes(account.id))
    return filtered.length === 0 ? myOwnAccounts : filtered
  }, [myOwnAccounts, filterByAccounts])

  const { showLabelEveryFactor, timeseriesIteratorGenerator } = useTimerangeSegmentation(fromDate, toDate, 'dense')
  const timeseriesIterator = useMemo(
    () => timeseriesIteratorGenerator(augmentedTransactions),
    [timeseriesIteratorGenerator, augmentedTransactions],
  )

  const assets = useNetWorthChartData(timeseriesIterator, ownAccount, sender, receiver, accountKey, accounts, 'active')
  const liabilities = useNetWorthChartData(
    timeseriesIterator,
    ownAccount,
    sender,
    receiver,
    accountKey,
    accounts,
    'passive',
  )

  const series = useMemo<LineBucket[]>(
    () =>
      assets.data.map((bucket, i) => {
        const assetsTotal = sum(bucket.values)
        const liabilitiesTotal = sum(liabilities.data[i].values)
        return {
          date: bucket.date,
          values: {
            [NET_WORTH]: { amount: assetsTotal - liabilitiesTotal },
            [ASSETS]: { amount: assetsTotal },
            [LIABILITIES]: { amount: liabilitiesTotal },
          },
        }
      }),
    [assets.data, liabilities.data],
  )

  const isEmpty = assets.groups.size === 0 && liabilities.groups.size === 0

  const dateVisibility = useMemo(
    () =>
      dateAxisLabels(
        series.map((bucket) => bucket.date),
        showLabelEveryFactor,
      ),
    [series, showLabelEveryFactor],
  )

  return (
    <LineChart
      data={series}
      datasetsLabels={[NET_WORTH, ASSETS, LIABILITIES]}
      signFillDataset={NET_WORTH}
      valueFormat={(value) => formatFull(defaultCurrency, value, privacyMode)}
      margin={{ top: 30, right: 25, bottom: 80, left: 60 }}
      xAxisConfig={{
        format: (date) => dateVisibility.get(date.getTime()) ?? '',
        tickSize: 5,
        tickPadding: 8,
      }}
      yAxisConfig={{
        nice: true,
        grid: !privacyMode,
        tickSize: privacyMode ? 0 : 5,
        tickPadding: 5,
        format: (i) =>
          privacyMode
            ? ''
            : ((i as number) / Math.pow(10, defaultCurrency.decimalPoints)).toLocaleString(undefined, {
                notation: 'compact',
              }),
      }}
      colors={darkColors}
      navigation={navigation}
      emptyMessage={isEmpty ? 'No balance recorded for this period' : undefined}
      stackTooltip={(tooltipProps) => <Tooltip tooltipProps={tooltipProps} labels={assets.labels} />}
    />
  )
}

export default NetWorthHistoryChart
