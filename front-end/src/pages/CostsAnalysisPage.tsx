import { IconButton } from '@mui/material'
import { differenceInYears, startOfDay } from 'date-fns'
import { FC, useContext, useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'

import ContentWithHeader from '../components/ContentWithHeader'
import CostsAnalysisSetup from '../components/CostsAnalysisSetup'
import EarningsBreakdownChart from '../components/EarningsBreakdownChart'
import { IconToolsContext } from '../components/IconTools'
import { DrawerContext } from '../components/Menu'
import { formatAmount } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { CategoryServiceContext, CurrencyServiceContext } from '../service/ServiceContext'
import UserStore from '../UserStore'
import '../styles/costs-analysis-page-tailwind.css'

const ContentContainer = styled.div<{ viewType: 'table' | 'chart' }>`
  height: ${(props) => (props.viewType === 'chart' ? '100%' : 'auto')};
  padding: ${(props) => (props.viewType === 'chart' ? 0 : '1rem')};

  ${(props) =>
    props.viewType === 'chart' &&
    `
    display: flex;
    justify-content: center;
    
    & > div {
      max-width: 100vh;
    }
  `}
`

const userStore = new UserStore(localStorage)

const CostsAnalysisPage: FC = () => {
  const { augmentedTransactions: transactions, exchangeRateOnDay } = useContext(MixedAugmentation)
  const { defaultCurrency } = useContext(CurrencyServiceContext)
  const { root } = useContext(CategoryServiceContext)
  const { privacyMode } = useContext(DrawerContext)
  const { IconLib } = useContext(IconToolsContext)

  const [showSetup, setShowSetup] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [viewType, setViewType] = useState<'table' | 'chart'>('table')
  const [incomeCategory, setIncomeCategory] = useState<number>(userStore.getIncomeCategoryId() ?? root.id)
  const [grossIncome, setGrossIncome] = useState<number>(userStore.getGrossIncome() ?? 0)
  const [contentRef, setContentRef] = useState<HTMLDivElement | null>(null)

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
        <>
          {viewType === 'table' ? (
            <IconButton
              onClick={() => {
                setViewType('chart')
              }}
            >
              <IconLib.TbChartSankey size="1.5rem" />
            </IconButton>
          ) : (
            <IconButton
              onClick={() => {
                setViewType('table')
              }}
            >
              <IconLib.BsFileEarmarkText size="1.5rem" />
            </IconButton>
          )}
          <IconButton onClick={() => setShowOptions(true)}>
            <IconLib.MdSettings />
          </IconButton>
        </>
      }
      contentMaxWidth={viewType === 'chart' ? '100%' : '50rem'}
      contentOverflowY={viewType === 'chart' ? 'hidden' : 'scroll'}
      contentPadding="0"
      setContentRef={setContentRef}
    >
      <ContentContainer viewType={viewType}>
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

        {viewType === 'chart' ? (
          <EarningsBreakdownChart
            grossIncome={grossIncome * Math.pow(10, defaultCurrency.decimalPoints)}
            netIncome={income}
            fixedCosts={fixedCosts}
            variableCosts={variableCosts}
            contentRef={contentRef}
          />
        ) : (
          <table>
            <tbody>
              {!privacyMode && (
                <>
                  <tr className="header-row">
                    <th />
                    <th className="header-label">Yearly ({defaultCurrency.symbol})</th>
                    <th className="header-label">Monthly ({defaultCurrency.symbol})</th>
                  </tr>
                  <tr>
                    <td>Gross Income</td>
                    <td className="amount-cell">
                      {formatAmount(
                        defaultCurrency,
                        grossIncome * Math.pow(10, defaultCurrency.decimalPoints),
                        privacyMode,
                      )}
                    </td>
                    <td className="amount-cell">
                      {formatAmount(
                        defaultCurrency,
                        (grossIncome * Math.pow(10, defaultCurrency.decimalPoints)) / 12,
                        privacyMode,
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td>Net Income</td>
                    <td className="amount-cell">{formatAmount(defaultCurrency, income, privacyMode)}</td>
                    <td className="amount-cell">{formatAmount(defaultCurrency, income / 12, privacyMode)}</td>
                  </tr>
                </>
              )}
              <tr style={{ height: '1rem' }} />
              <tr className="section-header fixed-costs">
                <th>Fixed Costs</th>
                {privacyMode ? (
                  <>
                    <th className="header-label">Yearly ({defaultCurrency.symbol})</th>
                    <th className="header-label">Monthly ({defaultCurrency.symbol})</th>
                  </>
                ) : (
                  <th colSpan={2}>
                    {!privacyMode && `${privacyMode ? 'XX' : percentages[0]}%`}
                    <div className="percentage-bar">
                      <div
                        className="percentage-fill"
                        style={{
                          width: `${percentages[0]}%`,
                          backgroundColor:
                            percentages[0] < 50
                              ? '#4caf50' // Green if < 50%
                              : percentages[0] > 60
                                ? '#f44336' // Red if > 60%
                                : `rgb(${Math.floor(76 + ((244 - 76) * (percentages[0] - 50)) / 10)}, ${Math.floor(175 + ((67 - 175) * (percentages[0] - 50)) / 10)}, ${Math.floor(80 + ((54 - 80) * (percentages[0] - 50)) / 10)})`, // Gradient from green to red
                        }}
                      />
                    </div>
                  </th>
                )}
              </tr>
              <tr className="section-header">
                <th>Totals</th>
                <td className="amount-cell">{formatAmount(defaultCurrency, fixedAmount)}</td>
                <td className="amount-cell">{formatAmount(defaultCurrency, fixedAmount / 12)}</td>
              </tr>
              {[...fixedCosts.entries()].map((entry) => (
                <tr key={`fixed-${entry[0]}`}>
                  <td>{entry[0]}</td>
                  <td className="amount-cell">{formatAmount(defaultCurrency, entry[1])}</td>
                  <td className="amount-cell">{formatAmount(defaultCurrency, entry[1] / 12)}</td>
                </tr>
              ))}
              <tr style={{ height: '1rem' }} />
              <tr className="section-header variable-costs">
                <th>Variable Costs</th>
                {privacyMode ? (
                  <>
                    <th className="header-label">Yearly ({defaultCurrency.symbol})</th>
                    <th className="header-label">Monthly ({defaultCurrency.symbol})</th>
                  </>
                ) : (
                  <th colSpan={2}>
                    {!privacyMode && `${privacyMode ? 'XX' : percentages[1]}%`}
                    <div className="percentage-bar">
                      <div
                        className="percentage-fill"
                        style={{
                          width: `${percentages[1]}%`,
                          backgroundColor:
                            percentages[1] < 30
                              ? '#4caf50' // Green if < 30%
                              : percentages[1] > 40
                                ? '#f44336' // Red if > 40%
                                : `rgb(${Math.floor(76 + ((244 - 76) * (percentages[1] - 30)) / 10)}, ${Math.floor(175 + ((67 - 175) * (percentages[1] - 30)) / 10)}, ${Math.floor(80 + ((54 - 80) * (percentages[1] - 30)) / 10)})`, // Gradient from green to red
                        }}
                      />
                    </div>
                  </th>
                )}
              </tr>
              <tr className="section-header">
                <th>Totals</th>
                <td className="amount-cell">{formatAmount(defaultCurrency, variableAmount)}</td>
                <td className="amount-cell">{formatAmount(defaultCurrency, variableAmount / 12)}</td>
              </tr>
              {[...variableCosts.entries()].map((entry) => (
                <tr key={`variable-${entry[0]}`}>
                  <td>{entry[0]}</td>
                  <td className="amount-cell">{formatAmount(defaultCurrency, entry[1])}</td>
                  <td className="amount-cell">{formatAmount(defaultCurrency, entry[1] / 12)}</td>
                </tr>
              ))}
              {!privacyMode && (
                <>
                  <tr style={{ height: '1rem' }} />
                  <tr className="section-header investments">
                    <th>Investments & Savings</th>
                    <th colSpan={2}>
                      {privacyMode ? 'XX' : percentages[2]}%
                      <div className="percentage-bar">
                        <div
                          className="percentage-fill"
                          style={{
                            width: `${percentages[2]}%`,
                            backgroundColor:
                              percentages[2] > 20
                                ? '#4caf50' // Green if > 20%
                                : percentages[2] < 10
                                  ? '#f44336' // Red if < 10%
                                  : `rgb(${Math.floor(76 + ((244 - 76) * (20 - percentages[2])) / 10)}, ${Math.floor(175 + ((67 - 175) * (20 - percentages[2])) / 10)}, ${Math.floor(80 + ((54 - 80) * (20 - percentages[2])) / 10)})`, // Gradient from green to red
                          }}
                        />
                      </div>
                    </th>
                  </tr>
                  <tr>
                    <td>All</td>
                    <td className="amount-cell">
                      {formatAmount(defaultCurrency, income - variableAmount - fixedAmount, privacyMode)}
                    </td>
                    <td className="amount-cell">
                      {formatAmount(defaultCurrency, (income - variableAmount - fixedAmount) / 12, privacyMode)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        )}
      </ContentContainer>
    </ContentWithHeader>
  )
}

export default CostsAnalysisPage
