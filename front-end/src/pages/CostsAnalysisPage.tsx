import { IconButton } from '@mui/material'
import { differenceInYears, startOfDay } from 'date-fns'
import { FC, useContext, useEffect, useMemo, useState } from 'react'
import { default as styled } from 'styled-components'

import CostsAnalysisSetup from '../components/CostsAnalysisSetup'
import EarningsBreakdownChart from '../components/graphing/EarningsBreakdownChart'
import { IconToolsContext } from '../components/icons/IconTools'
import { DrawerContext } from '../components/Menu'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { useElementDimensions } from '../components/shared/useDimensions'
import { formatAmount } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import UserStore from '../UserStore'

const ContentContainer = styled.div<{ $viewType: 'table' | 'chart' }>`
  height: ${(props) => (props.$viewType === 'chart' ? '100%' : 'auto')};
  padding: ${(props) => (props.$viewType === 'chart' ? 0 : '1rem')};

  ${(props) =>
    props.$viewType === 'chart' &&
    `
    display: flex;
    justify-content: center;
    
    & > div {
      max-width: 100vh;
    }
  `}
`

const StyledTable = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin-top: 0.5rem;

  & > * > tr > * {
    padding: 0.5rem 1rem;
    text-align: left;
    border: none;
    position: relative;
  }
`

const HeaderRow = styled.tr`
  font-weight: 600;
  background-color: rgba(255, 255, 255, 0.03);

  th {
    padding: 0.75rem 1rem;
    color: #90caf9;
  }
`

const SectionHeader = styled.tr`
  font-weight: 600;
  color: #90caf9;
  background-color: rgba(255, 255, 255, 0.03);

  th {
    padding-top: 1rem;
  }

  & + tr {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
`

const PercentageBar: React.FC<{ width: number; color: string }> = ({ width, color }) => (
  <div
    style={{
      height: '3px',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '2px',
      marginTop: '0.25rem',
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        height: '100%',
        width: `${width}%`,
        backgroundColor: color,
        transition: 'width 300ms ease-in',
      }}
    />
  </div>
)

const AmountCell = styled.td`
  font-family: 'Roboto Mono', monospace;
  text-align: right;
`

const HeaderCell = styled.th`
  text-align: right;
`

const SpacerRow = styled.tr`
  height: 1rem;
`

const userStore = new UserStore(localStorage)

const CostsAnalysisPage: FC = () => {
  const {
    augmentedTransactions: transactions,
    exchangeRateOnDay,
    rootCategory,
    defaultCurrency,
  } = useContext(MixedAugmentation)
  const { privacyMode } = useContext(DrawerContext)
  const { IconLib } = useContext(IconToolsContext)

  // Get the current URL search params
  const query = new URLSearchParams(window.location.search)

  const [showSetup, setShowSetup] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [viewType, setViewType] = useState<'table' | 'chart'>(query.get('view') === 'chart' ? 'chart' : 'table')
  const [incomeCategory, setIncomeCategory] = useState<number>(userStore.getIncomeCategoryId() ?? rootCategory.id)
  const [grossIncome, setGrossIncome] = useState<number>(userStore.getGrossIncome() ?? 0)
  const { ref: setContentRef, ...dimensions } = useElementDimensions(0, 0)

  // Update URL when viewType changes
  const updateViewTypeInUrl = (newViewType: 'table' | 'chart') => {
    const newQuery = new URLSearchParams(window.location.search)
    if (newViewType === 'table') {
      newQuery.delete('view')
    } else {
      newQuery.set('view', newViewType)
    }

    // Update the URL without reloading the page
    const newUrl = `${window.location.pathname}?${newQuery.toString()}`
    window.history.pushState({ path: newUrl }, '', newUrl)
  }

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
          if (currentValue.receiverCurrencyId !== defaultCurrency.id) {
            value *= exchangeRateOnDay(currentValue.receiverCurrencyId, defaultCurrency.id, startOfDay(new Date()))
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
        if (currentValue.currencyId !== defaultCurrency.id) {
          value *= exchangeRateOnDay(currentValue.currencyId, defaultCurrency.id, startOfDay(new Date()))
        }

        let category = currentValue.category!
        while (category.parentId !== rootCategory.id) {
          category = category.parent!
        }

        previousValue.set(category.name, (previousValue.get(category.name) ?? 0) + value)
        return previousValue
      }, new Map<string, number>())

    fixedTransactions
      .filter((value) => value.receiver?.isMine ?? false)
      .forEach((currentValue) => {
        let value = currentValue.receiverAmount
        if (currentValue.receiverCurrencyId !== defaultCurrency.id) {
          value *= exchangeRateOnDay(currentValue.receiverCurrencyId, defaultCurrency.id, startOfDay(new Date()))
        }

        let category = currentValue.category!
        while (category.parentId !== rootCategory.id) {
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
        if (currentValue.currencyId !== defaultCurrency.id) {
          value *= exchangeRateOnDay(currentValue.currencyId, defaultCurrency.id, new Date())
        }

        let category = currentValue.category!
        if (category.id !== rootCategory.id) {
          while (category.parentId !== rootCategory.id) {
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
        if (currentValue.receiverCurrencyId !== defaultCurrency.id) {
          value *= exchangeRateOnDay(currentValue.receiverCurrencyId, defaultCurrency.id, startOfDay(new Date()))
        }

        let category = currentValue.category!
        while (category.parentId !== rootCategory.id) {
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
                updateViewTypeInUrl('chart')
              }}
            >
              <IconLib.TbChartSankey size="1.5rem" />
            </IconButton>
          ) : (
            <IconButton
              onClick={() => {
                setViewType('table')
                updateViewTypeInUrl('table')
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
      contentOverflowY={viewType === 'chart' ? 'hidden' : 'auto'}
      contentPadding="0"
      setContentRef={setContentRef}
    >
      <ContentContainer $viewType={viewType}>
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
            dimensions={dimensions}
          />
        ) : (
          <StyledTable>
            <tbody>
              {!privacyMode && (
                <>
                  <HeaderRow>
                    <th />
                    <HeaderCell>Yearly ({defaultCurrency.symbol})</HeaderCell>
                    <HeaderCell>Monthly ({defaultCurrency.symbol})</HeaderCell>
                  </HeaderRow>
                  <tr>
                    <td>Gross Income</td>
                    <AmountCell>
                      {formatAmount(
                        defaultCurrency,
                        grossIncome * Math.pow(10, defaultCurrency.decimalPoints),
                        privacyMode,
                      )}
                    </AmountCell>
                    <AmountCell>
                      {formatAmount(
                        defaultCurrency,
                        (grossIncome * Math.pow(10, defaultCurrency.decimalPoints)) / 12,
                        privacyMode,
                      )}
                    </AmountCell>
                  </tr>
                  <tr>
                    <td>Net Income</td>
                    <AmountCell>{formatAmount(defaultCurrency, income, privacyMode)}</AmountCell>
                    <AmountCell>{formatAmount(defaultCurrency, income / 12, privacyMode)}</AmountCell>
                  </tr>
                </>
              )}
              <SpacerRow />
              <SectionHeader>
                <th>Fixed Costs</th>
                {privacyMode ? (
                  <>
                    <HeaderCell>Yearly ({defaultCurrency.symbol})</HeaderCell>
                    <HeaderCell>Monthly ({defaultCurrency.symbol})</HeaderCell>
                  </>
                ) : (
                  <th colSpan={2}>
                    {!privacyMode && `${privacyMode ? 'XX' : percentages[0]}%`}
                    <PercentageBar
                      width={percentages[0]}
                      color={
                        percentages[0] < 50
                          ? '#4caf50' // Green if < 50%
                          : percentages[0] > 60
                            ? '#f44336' // Red if > 60%
                            : `rgb(${Math.floor(76 + ((244 - 76) * (percentages[0] - 50)) / 10)}, ${Math.floor(175 + ((67 - 175) * (percentages[0] - 50)) / 10)}, ${Math.floor(80 + ((54 - 80) * (percentages[0] - 50)) / 10)})` // Gradient from green to red
                      }
                    />
                  </th>
                )}
              </SectionHeader>
              <SectionHeader>
                <th>Totals</th>
                <AmountCell>{formatAmount(defaultCurrency, fixedAmount)}</AmountCell>
                <AmountCell>{formatAmount(defaultCurrency, fixedAmount / 12)}</AmountCell>
              </SectionHeader>
              {[...fixedCosts.entries()].map((entry) => (
                <tr key={`fixed-${entry[0]}`}>
                  <td>{entry[0]}</td>
                  <AmountCell>{formatAmount(defaultCurrency, entry[1])}</AmountCell>
                  <AmountCell>{formatAmount(defaultCurrency, entry[1] / 12)}</AmountCell>
                </tr>
              ))}
              <SpacerRow />
              <SectionHeader>
                <th>Variable Costs</th>
                {privacyMode ? (
                  <>
                    <HeaderCell>Yearly ({defaultCurrency.symbol})</HeaderCell>
                    <HeaderCell>Monthly ({defaultCurrency.symbol})</HeaderCell>
                  </>
                ) : (
                  <th colSpan={2}>
                    {!privacyMode && `${privacyMode ? 'XX' : percentages[1]}%`}
                    <PercentageBar
                      width={percentages[1]}
                      color={
                        percentages[1] < 30
                          ? '#4caf50' // Green if < 30%
                          : percentages[1] > 40
                            ? '#f44336' // Red if > 40%
                            : `rgb(${Math.floor(76 + ((244 - 76) * (percentages[1] - 30)) / 10)}, ${Math.floor(175 + ((67 - 175) * (percentages[1] - 30)) / 10)}, ${Math.floor(80 + ((54 - 80) * (percentages[1] - 30)) / 10)})` // Gradient from green to red
                      }
                    />
                  </th>
                )}
              </SectionHeader>
              <SectionHeader>
                <th>Totals</th>
                <AmountCell>{formatAmount(defaultCurrency, variableAmount)}</AmountCell>
                <AmountCell>{formatAmount(defaultCurrency, variableAmount / 12)}</AmountCell>
              </SectionHeader>
              {[...variableCosts.entries()].map((entry) => (
                <tr key={`variable-${entry[0]}`}>
                  <td>{entry[0]}</td>
                  <AmountCell>{formatAmount(defaultCurrency, entry[1])}</AmountCell>
                  <AmountCell>{formatAmount(defaultCurrency, entry[1] / 12)}</AmountCell>
                </tr>
              ))}
              {!privacyMode && (
                <>
                  <SpacerRow />
                  <SectionHeader>
                    <th>Investments & Savings</th>
                    <th colSpan={2}>
                      {privacyMode ? 'XX' : percentages[2]}%
                      <PercentageBar
                        width={percentages[2]}
                        color={
                          percentages[2] > 20
                            ? '#4caf50' // Green if > 20%
                            : percentages[2] < 10
                              ? '#f44336' // Red if < 10%
                              : `rgb(${Math.floor(76 + ((244 - 76) * (20 - percentages[2])) / 10)}, ${Math.floor(175 + ((67 - 175) * (20 - percentages[2])) / 10)}, ${Math.floor(80 + ((54 - 80) * (20 - percentages[2])) / 10)})` // Gradient from green to red
                        }
                      />
                    </th>
                  </SectionHeader>
                  <tr>
                    <td>All</td>
                    <AmountCell>
                      {formatAmount(defaultCurrency, income - variableAmount - fixedAmount, privacyMode)}
                    </AmountCell>
                    <AmountCell>
                      {formatAmount(defaultCurrency, (income - variableAmount - fixedAmount) / 12, privacyMode)}
                    </AmountCell>
                  </tr>
                </>
              )}
            </tbody>
          </StyledTable>
        )}
      </ContentContainer>
    </ContentWithHeader>
  )
}

export default CostsAnalysisPage
