import { IconButton } from '@mui/material'
import { differenceInYears, startOfDay } from 'date-fns'
import { FC, useContext, useEffect, useMemo, useState } from 'react'

import ContentWithHeader from '../components/ContentWithHeader'
import CostsAnalysisSetup from '../components/CostsAnalysisSetup'
import { IconToolsContext } from '../components/IconTools'
import { DrawerContext } from '../components/Menu'
import { formatFull } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { CategoryServiceContext, CurrencyServiceContext } from '../service/ServiceContext'
import UserStore from '../UserStore'
import './CostsAnalysisPage.css'

const userStore = new UserStore(localStorage)

const CostsAnalysisPage: FC = () => {
  const { augmentedTransactions: transactions, exchangeRateOnDay } = useContext(MixedAugmentation)
  const { defaultCurrency } = useContext(CurrencyServiceContext)
  const { root } = useContext(CategoryServiceContext)
  const { privacyMode } = useContext(DrawerContext)
  const { IconLib } = useContext(IconToolsContext)

  const [showSetup, setShowSetup] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [incomeCategory, setIncomeCategory] = useState<number>(userStore.getIncomeCategoryId() ?? root.id)
  const [grossIncome, setGrossIncome] = useState<number>(userStore.getGrossIncome() ?? 0)

  useEffect(() => {
    if (!userStore.getGrossIncome() || !userStore.getIncomeCategoryId()) {
      setShowSetup(true)
    }
  }, [])

  const income = useMemo(
    () =>
      transactions
        .filter((value) => differenceInYears(value.date, startOfDay(new Date())) === 0)
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
            value *= exchangeRateOnDay(currentValue.receiverCurrencyId, defaultCurrency!.id, startOfDay(new Date()))
          }
          return previousValue + value
        }, 0),
    [incomeCategory, transactions, exchangeRateOnDay, defaultCurrency],
  )

  const fixedCosts = useMemo(() => {
    const fixedTransactions = transactions
      .filter((value) => differenceInYears(value.date, startOfDay(new Date())) === 0)
      .filter((value) => value.category?.fixedCosts ?? false)

    const data = fixedTransactions
      .filter((value) => value.sender?.isMine ?? false)
      .reduce((previousValue, currentValue) => {
        let value = currentValue.amount
        if (currentValue.currencyId !== defaultCurrency?.id) {
          value *= exchangeRateOnDay(currentValue.currencyId, defaultCurrency!.id, startOfDay(new Date()))
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
          value *= exchangeRateOnDay(currentValue.receiverCurrencyId, defaultCurrency!.id, startOfDay(new Date()))
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
      .filter((value) => differenceInYears(value.date, startOfDay(new Date())) === 0)
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
          value *= exchangeRateOnDay(currentValue.receiverCurrencyId, defaultCurrency!.id, startOfDay(new Date()))
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
    <ContentWithHeader
      title="Costs Analysis"
      button="menu"
      rightButton={
        <IconButton onClick={() => setShowOptions(true)}>
          <IconLib.MdSettings />
        </IconButton>
      }
    >
      <div style={{ padding: '1rem' }}>
        <CostsAnalysisSetup
          open={showSetup || showOptions}
          grossIncome={grossIncome}
          setGrossIncome={(value) => {
            setGrossIncome(value)
            userStore.upsertGrossIncome(value)
          }}
          incomeCategory={incomeCategory}
          setIncomeCategory={(value) => {
            setIncomeCategory(value)
            userStore.upsertIncomeCategoryId(value)
          }}
          onComplete={() => {
            setShowSetup(false)
            setShowOptions(false)
          }}
        />

        <table>
          <tbody>
            {!privacyMode && (
              <>
                <tr className="header-row">
                  <th />
                  <th className="header-label">Yearly</th>
                  <th className="header-label">Monthly</th>
                </tr>
                <tr>
                  <td>Gross Income</td>
                  <td className="amount-cell">
                    {formatFull(
                      defaultCurrency,
                      grossIncome * Math.pow(10, defaultCurrency.decimalPoints),
                      privacyMode,
                    )}
                  </td>
                  <td className="amount-cell">
                    {formatFull(
                      defaultCurrency,
                      (grossIncome * Math.pow(10, defaultCurrency.decimalPoints)) / 12,
                      privacyMode,
                    )}
                  </td>
                </tr>
                <tr>
                  <td>Net Income</td>
                  <td className="amount-cell">{formatFull(defaultCurrency, income, privacyMode)}</td>
                  <td className="amount-cell">{formatFull(defaultCurrency, income / 12, privacyMode)}</td>
                </tr>
              </>
            )}
            <tr style={{ height: '1rem' }} />
            <tr className="section-header fixed-costs">
              <th>Fixed Costs</th>
              {privacyMode ? (
                <>
                  <th className="header-label">Yearly</th>
                  <th className="header-label">Monthly</th>
                </>
              ) : (
                <th colSpan={2}>
                  {!privacyMode && `${privacyMode ? 'XX' : percentages[0]}%`}
                  <div className="percentage-bar">
                    <div className="percentage-fill" style={{ width: `${percentages[0]}%` }} />
                  </div>
                </th>
              )}
            </tr>
            <tr className="section-header">
              <th>Totals</th>
              <td className="amount-cell">{formatFull(defaultCurrency, fixedAmount)}</td>
              <td className="amount-cell">{formatFull(defaultCurrency, fixedAmount / 12)}</td>
            </tr>
            {[...fixedCosts.entries()].map((entry) => (
              <tr key={`fixed-${entry[0]}`}>
                <td>{entry[0]}</td>
                <td className="amount-cell">{formatFull(defaultCurrency, entry[1])}</td>
                <td className="amount-cell">{formatFull(defaultCurrency, entry[1] / 12)}</td>
              </tr>
            ))}
            <tr style={{ height: '1rem' }} />
            <tr className="section-header variable-costs">
              <th>Variable Costs</th>
              {privacyMode ? (
                <>
                  <th className="header-label">Yearly</th>
                  <th className="header-label">Monthly</th>
                </>
              ) : (
                <th colSpan={2}>
                  {!privacyMode && `${privacyMode ? 'XX' : percentages[1]}%`}
                  <div className="percentage-bar">
                    <div className="percentage-fill" style={{ width: `${percentages[1]}%` }} />
                  </div>
                </th>
              )}
            </tr>
            <tr className="section-header">
              <th>Totals</th>
              <td className="amount-cell">{formatFull(defaultCurrency, variableAmount)}</td>
              <td className="amount-cell">{formatFull(defaultCurrency, variableAmount / 12)}</td>
            </tr>
            {[...variableCosts.entries()].map((entry) => (
              <tr key={`variable-${entry[0]}`}>
                <td>{entry[0]}</td>
                <td className="amount-cell">{formatFull(defaultCurrency, entry[1])}</td>
                <td className="amount-cell">{formatFull(defaultCurrency, entry[1] / 12)}</td>
              </tr>
            ))}
            {!privacyMode && (
              <>
                <tr style={{ height: '1rem' }} />
                <tr className="section-header investments">
                  <th>Investments</th>
                  <th colSpan={2}>
                    {privacyMode ? 'XX' : percentages[2]}%
                    <div className="percentage-bar">
                      <div className="percentage-fill" style={{ width: `${percentages[2]}%` }} />
                    </div>
                  </th>
                </tr>
                <tr>
                  <td>All</td>
                  <td className="amount-cell">
                    {formatFull(defaultCurrency, income - variableAmount - fixedAmount, privacyMode)}
                  </td>
                  <td className="amount-cell">
                    {formatFull(defaultCurrency, (income - variableAmount - fixedAmount) / 12, privacyMode)}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </ContentWithHeader>
  )
}

export default CostsAnalysisPage
