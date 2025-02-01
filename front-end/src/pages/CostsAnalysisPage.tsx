import { Stack, TextField } from '@mui/material'
import { differenceInYears } from 'date-fns'
import { FC, useContext, useMemo, useState } from 'react'

import CategoryPicker from '../components/CategoryPicker'
import ContentWithHeader from '../components/ContentWithHeader'
import { DrawerContext } from '../components/Menu'
import { formatFull } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { CategoryServiceContext, CurrencyServiceContext } from '../service/ServiceContext'
import './CostsAnalysisPage.css'
import UserStore from '../UserStore'

const userStore = new UserStore(localStorage)

const CostsAnalysisPage: FC = () => {
  const { augmentedTransactions: transactions, exchangeRateOnDay } = useContext(MixedAugmentation)
  const { defaultCurrency } = useContext(CurrencyServiceContext)
  const { root } = useContext(CategoryServiceContext)
  const { privacyMode } = useContext(DrawerContext)

  const [incomeCategory, setIncomeCategory] = useState<number>(userStore.getIncomeCategoryId() ?? root.id)
  const [grossIncome, setGrossIncome] = useState<number>(userStore.getGrossIncome() ?? 0)

  const income = useMemo(
    () =>
      transactions
        .filter((value) => differenceInYears(value.date, new Date()) === 0)
        .filter((value) => value.categoryId !== null)
        .filter((value) => {
          let category = value.category
          while (typeof category !== 'undefined') {
            if (category.id === incomeCategory) return true
            category = category.parent
          }
          return false
        })
        .filter((value) => value.receiver?.isMine ?? false)
        .reduce((previousValue, currentValue) => {
          let value = currentValue.receiverAmount
          if (currentValue.receiverCurrencyId !== defaultCurrency?.id) {
            value *= exchangeRateOnDay(currentValue.receiverCurrencyId, defaultCurrency!.id, new Date())
          }
          return previousValue + value
        }, 0),
    [incomeCategory, transactions, exchangeRateOnDay, defaultCurrency],
  )

  const fixedCosts = useMemo(() => {
    const fixedTransactions = transactions
      .filter((value) => differenceInYears(value.date, new Date()) === 0)
      .filter((value) => value.category?.fixedCosts ?? false)

    const data = fixedTransactions
      .filter((value) => value.sender?.isMine ?? false)
      .reduce((previousValue, currentValue) => {
        let value = currentValue.amount
        if (currentValue.currencyId !== defaultCurrency?.id) {
          value *= exchangeRateOnDay(currentValue.currencyId, defaultCurrency!.id, new Date())
        }

        let category = currentValue.category!
        while (category.parentId !== root.id) {
          category = category.parent!
        }

        previousValue.set(category.name, (previousValue.get(category.name) ?? 0) + value)
        return previousValue
      }, new Map<string, number>())

    fixedTransactions
      .filter((value) => value.receiver?.isMine ?? false)
      .forEach((currentValue) => {
        let value = currentValue.receiverAmount
        if (currentValue.receiverCurrencyId !== defaultCurrency?.id) {
          value *= exchangeRateOnDay(currentValue.receiverCurrencyId, defaultCurrency!.id, new Date())
        }

        let category = currentValue.category!
        while (category.parentId !== root.id) {
          category = category.parent!
        }

        if (data.has(category.name)) {
          data.set(category.name, data.get(category.name)! - value)
        }
      })

    return data
  }, [incomeCategory, transactions, exchangeRateOnDay, defaultCurrency])

  const fixedAmount = useMemo(() => {
    return [...fixedCosts.values()].reduce((previousValue, currentValue) => previousValue + currentValue, 0)
  }, [fixedCosts])

  const variableCosts = useMemo(() => {
    const fixedTransactions = transactions
      .filter((value) => differenceInYears(value.date, new Date()) === 0)
      .filter((value) => typeof value.category !== 'undefined')
      .filter((value) => !(value.category?.fixedCosts ?? false))

    const data = fixedTransactions
      .filter((value) => value.sender?.isMine ?? false)
      .reduce((previousValue, currentValue) => {
        let value = currentValue.amount
        if (currentValue.currencyId !== defaultCurrency?.id) {
          value *= exchangeRateOnDay(currentValue.currencyId, defaultCurrency!.id, new Date())
        }

        let category = currentValue.category!
        if (category.id !== root.id) {
          while (category.parentId !== root.id) {
            category = category.parent!
          }
        }

        previousValue.set(category.name, (previousValue.get(category.name) ?? 0) + value)
        return previousValue
      }, new Map<string, number>())

    fixedTransactions
      .filter((value) => value.receiver?.isMine ?? false)
      .forEach((currentValue) => {
        let value = currentValue.receiverAmount
        if (currentValue.receiverCurrencyId !== defaultCurrency?.id) {
          value *= exchangeRateOnDay(currentValue.receiverCurrencyId, defaultCurrency!.id, new Date())
        }

        let category = currentValue.category!
        while (category.parentId !== root.id) {
          category = category.parent!
        }

        if (data.has(category.name) && data.get(category.name)! >= value) {
          data.set(category.name, data.get(category.name)! - value)
        }
      })

    return data
  }, [incomeCategory, transactions, exchangeRateOnDay, defaultCurrency])

  const variableAmount = useMemo(() => {
    return [...variableCosts.values()].reduce((previousValue, currentValue) => previousValue + currentValue, 0)
  }, [variableCosts])

  if (defaultCurrency === null) {
    return null
  }

  const percentages = [
    Math.floor((100 * fixedAmount) / income),
    Math.floor((100 * variableAmount) / income),
    Math.floor((100 * (income - variableAmount - fixedAmount)) / income),
  ]

  const extraPercentages = [
    ((100 * fixedAmount) / income) % 1,
    ((100 * variableAmount) / income) % 1,
    ((100 * (income - variableAmount - fixedAmount)) / income) % 1,
  ]

  while (percentages.reduce((a, b) => a + b) < 100) {
    let biggestIndex = 0
    for (let i = 1; i < extraPercentages.length; i += 1) {
      if (extraPercentages[i] > extraPercentages[biggestIndex]) {
        biggestIndex = i
      }
    }
    extraPercentages[biggestIndex] = 0
    percentages[biggestIndex] += 1
  }

  return (
    <ContentWithHeader title="Costs Analysis" button="menu">
      <Stack spacing="1rem" style={{ padding: '2rem 1rem' }}>
        <TextField
          type="text"
          value={privacyMode ? '<redacted>' : grossIncome}
          sx={{ width: '100%' }}
          onChange={(ev) => {
            if (privacyMode) return

            const parsed = parseInt(ev.target.value as string)
            if (isNaN(parsed)) {
              setGrossIncome(0)
              userStore.upsertGrossIncome(0)
            } else {
              setGrossIncome(parsed)
              userStore.upsertGrossIncome(parsed)
            }
          }}
          variant="standard"
          label="Gross Income"
        />

        <CategoryPicker
          categoryId={incomeCategory}
          setCategoryId={(id) => {
            setIncomeCategory(id)
            userStore.upsertIncomeCategoryId(id)
          }}
          labelText="Select your net income category"
        />

        <table>
          <thead>
            <tr style={{ background: '#FFF1' }}>
              <th />
              <th>Yearly</th>
              <th>Monthly</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Gross Income</td>
              <td>
                {formatFull(defaultCurrency, grossIncome * Math.pow(10, defaultCurrency.decimalPoints), privacyMode)}
              </td>
              <td>
                {formatFull(
                  defaultCurrency,
                  (grossIncome * Math.pow(10, defaultCurrency.decimalPoints)) / 12,
                  privacyMode,
                )}
              </td>
            </tr>
            <tr>
              <td>Net Income</td>
              <td>{formatFull(defaultCurrency, income, privacyMode)}</td>
              <td>{formatFull(defaultCurrency, income / 12, privacyMode)}</td>
            </tr>
            <tr style={{ height: '1rem' }} />
            <tr style={{ background: '#FFF1' }}>
              <th>Fixed Costs</th>
              <th colSpan={2}>{privacyMode ? 'XX' : percentages[0]}%</th>
            </tr>
            <tr style={{ background: '#FFF1' }}>
              <th>Totals</th>
              <td>{formatFull(defaultCurrency, fixedAmount)}</td>
              <td>{formatFull(defaultCurrency, fixedAmount / 12)}</td>
            </tr>
            {[...fixedCosts.entries()].map((entry) => (
              <tr key={`fixed-${entry[0]}`}>
                <td>{entry[0]}</td>
                <td>{formatFull(defaultCurrency, entry[1])}</td>
                <td>{formatFull(defaultCurrency, entry[1] / 12)}</td>
              </tr>
            ))}
            <tr style={{ height: '1rem' }} />
            <tr style={{ background: '#FFF1' }}>
              <th>Variable Costs</th>
              <th colSpan={2}>{privacyMode ? 'XX' : percentages[1]}%</th>
            </tr>
            <tr style={{ background: '#FFF1' }}>
              <th>Totals</th>
              <td>{formatFull(defaultCurrency, variableAmount)}</td>
              <td>{formatFull(defaultCurrency, variableAmount / 12)}</td>
            </tr>
            {[...variableCosts.entries()].map((entry) => (
              <tr key={`variable-${entry[0]}`}>
                <td>{entry[0]}</td>
                <td>{formatFull(defaultCurrency, entry[1])}</td>
                <td>{formatFull(defaultCurrency, entry[1] / 12)}</td>
              </tr>
            ))}
            <tr style={{ height: '1rem' }} />
            <tr style={{ background: '#FFF1' }}>
              <th>Investments</th>
              <th colSpan={2}>{privacyMode ? 'XX' : percentages[2]}%</th>
            </tr>
            <tr>
              <td>All</td>
              <td>{formatFull(defaultCurrency, income - variableAmount - fixedAmount, privacyMode)}</td>
              <td>{formatFull(defaultCurrency, (income - variableAmount - fixedAmount) / 12, privacyMode)}</td>
            </tr>
          </tbody>
        </table>
      </Stack>
    </ContentWithHeader>
  )
}

export default CostsAnalysisPage
