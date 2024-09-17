import { Stack, TextField } from '@mui/material'
import { differenceInYears } from 'date-fns'
import { FC, useContext, useMemo, useState } from 'react'

import CategoryPicker from '../components/CategoryPicker'
import ContentWithHeader from '../components/ContentWithHeader'
import { formatFull } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { CategoryServiceContext, CurrencyServiceContext } from '../service/ServiceContext'

import './CostsAnalysisPage.css'

const CostsAnalysisPage: FC = () => {
  const { augmentedTransactions: transactions, exchangeRateOnDay } = useContext(MixedAugmentation)
  const { defaultCurrency } = useContext(CurrencyServiceContext)
  const { root } = useContext(CategoryServiceContext)

  const [incomeCategory, setIncomeCategory] = useState<number>(root.id)
  const [grossIncome, setGrossIncome] = useState<number>(0)

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

  return (
    <ContentWithHeader title="Costs Analysis" button="menu">
      <Stack spacing="1rem" style={{ padding: '2rem 1rem' }}>
        <TextField
          type="text"
          value={grossIncome}
          sx={{ width: '100%' }}
          onChange={(ev) => {
            const parsed = parseInt(ev.target.value as string)
            if (isNaN(parsed)) {
              setGrossIncome(0)
            } else {
              setGrossIncome(parsed)
            }
          }}
          variant="standard"
          label="Gross Income"
        />

        <CategoryPicker
          categoryId={incomeCategory}
          setCategoryId={setIncomeCategory}
          labelText="Select your net income category"
        />

        <table>
          <thead>
            <tr>
              <th />
              <th>Yearly</th>
              <th>Monthly</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Gross Income</td>
              <td>{formatFull(defaultCurrency, grossIncome * Math.pow(10, defaultCurrency.decimalPoints))}</td>
              <td>{formatFull(defaultCurrency, (grossIncome * Math.pow(10, defaultCurrency.decimalPoints)) / 12)}</td>
            </tr>
            <tr>
              <td>Net Income</td>
              <td>{formatFull(defaultCurrency, income)}</td>
              <td>{formatFull(defaultCurrency, income / 12)}</td>
            </tr>
            <tr style={{ height: '1rem' }} />
            <tr>
              <th>Fixed Costs</th>
              <th colSpan={2}>{((100 * fixedAmount) / income).toFixed(0)}%</th>
            </tr>
            {[...fixedCosts.entries()].map((entry) => (
              <tr key={`fixed-${entry[0]}`}>
                <td>{entry[0]}</td>
                <td>{formatFull(defaultCurrency, entry[1])}</td>
                <td>{formatFull(defaultCurrency, entry[1] / 12)}</td>
              </tr>
            ))}
            <tr style={{ height: '1rem' }} />
            <tr>
              <th>Variable Costs</th>
              <th colSpan={2}>{((100 * variableAmount) / income).toFixed(0)}%</th>
            </tr>
            {[...variableCosts.entries()].map((entry) => (
              <tr key={`variable-${entry[0]}`}>
                <td>{entry[0]}</td>
                <td>{formatFull(defaultCurrency, entry[1])}</td>
                <td>{formatFull(defaultCurrency, entry[1] / 12)}</td>
              </tr>
            ))}
            <tr style={{ height: '1rem' }} />
            <tr>
              <th>Investments</th>
              <th colSpan={2}>{(100 - (100 * (variableAmount + fixedAmount)) / income).toFixed(0)}%</th>
            </tr>
            <tr>
              <td>All</td>
              <td>{formatFull(defaultCurrency, income - variableAmount - fixedAmount)}</td>
              <td>{formatFull(defaultCurrency, (income - variableAmount - fixedAmount) / 12)}</td>
            </tr>
          </tbody>
        </table>
      </Stack>
    </ContentWithHeader>
  )
}

export default CostsAnalysisPage
