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

interface GainChartProps {
  fromDate: Date
  toDate: Date
  navigation?: DateNavigation
}

const ownAccount = (account: Account) => account
const sender = (transaction: AugmentedTransaction) => transaction.sender
const receiver = (transaction: AugmentedTransaction) => transaction.receiver
const total = () => 'Total'

const InvestmentGainLineChart: FC<GainChartProps> = ({ fromDate, toDate, navigation }) => {
  const { augmentedTransactions, defaultCurrency } = useContext(MixedAugmentation)
  const { myOwnAccounts } = useContext(AccountServiceContext)
  const { privacyMode } = useContext(DrawerContext)

  const { showLabelEveryFactor, timeseriesIteratorGenerator } = useTimerangeSegmentation(fromDate, toDate, 'dense')

  const timeseriesIterator = useMemo(
    () => timeseriesIteratorGenerator(augmentedTransactions),
    [timeseriesIteratorGenerator, augmentedTransactions],
  )

  const { data, labels } = useNetWorthChartData(
    timeseriesIterator,
    ownAccount,
    sender,
    receiver,
    total,
    myOwnAccounts,
    'all',
  )

  const gainSeries = useMemo<LineBucket[]>(
    () =>
      data.map((bucket, i) => ({
        date: labels[i],
        values: Object.keys(bucket.values).reduce<
          Record<
            string,
            {
              amount: number
            }
          >
        >((prev, key) => {
          const { amount, baseline = 0 } = bucket.values[key] || { amount: 0, baseline: 0 }
          prev[key] = { amount: amount - baseline }
          return prev
        }, {}),
      })),
    [data, labels],
  )

  const isEmpty = gainSeries.every((bucket) => Object.values(bucket.values).every(({ amount }) => amount === 0))

  const dateVisibility = useMemo(() => dateAxisLabels(labels, showLabelEveryFactor), [labels, showLabelEveryFactor])

  return (
    <LineChart
      data={gainSeries}
      valueFormat={(value) => `${formatFull(defaultCurrency, value, privacyMode)}`}
      margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
      xAxisConfig={{
        format: (date) => dateVisibility.get(date.getTime()) ?? '',
        grid: true,
      }}
      yAxisConfig={{
        tickSize: privacyMode ? 0 : 5,
        nice: true,
        format: (i) =>
          privacyMode
            ? ''
            : ((i as number) / Math.pow(10, defaultCurrency.decimalPoints)).toLocaleString(undefined, {
                notation: 'compact',
              }),
        grid: !privacyMode,
        reference: 0,
      }}
      colors={darkColors}
      navigation={navigation}
      emptyMessage={isEmpty ? 'No gains or losses for this period' : undefined}
      stackTooltip={(tooltipProps) => <Tooltip tooltipProps={tooltipProps} labels={labels} />}
    />
  )
}

export default InvestmentGainLineChart
