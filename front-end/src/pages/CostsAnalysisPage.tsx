import { Box, IconButton, Typography } from '@mui/material'
import { decomposeColor, recomposeColor, styled, useTheme } from '@mui/material/styles'
import { differenceInYears, startOfDay } from 'date-fns'
import { FC, useContext, useEffect, useMemo, useState } from 'react'

import { UpdatePreferencesContext, UserContext } from '../App'
import CostsAnalysisSetup from '../components/CostsAnalysisSetup'
import EarningsBreakdownChart from '../components/graphing/EarningsBreakdownChart'
import { IconToolsContext } from '../components/icons/IconTools'
import { DrawerContext } from '../components/Menu'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { useToast } from '../components/shared/ToastProvider'
import { useElementDimensions } from '../components/shared/useDimensions'
import { AugmentedCategory } from '../domain/model/category'
import { formatAmount } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import UserStore from '../UserStore'

const StyledTable = styled('table')(({ theme }) => ({
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: 0,
  marginTop: theme.spacing(1),
  '& > * > tr > *': {
    padding: theme.spacing(1, 2),
    textAlign: 'left',
    border: 'none',
    position: 'relative',
  },
  // 'anywhere' would also shrink the column's minimum width, one letter per line in Firefox.
  '& > * > tr > :first-of-type': {
    overflowWrap: 'break-word',
  },
  [theme.breakpoints.down('sm')]: {
    fontSize: '0.85rem',
    '& > * > tr > *': {
      padding: theme.spacing(0.75, 1),
    },
  },
}))

const HeaderRow = styled('tr')(({ theme }) => ({
  fontWeight: 600,
  backgroundColor: theme.palette.surface.muted,
  th: {
    padding: theme.spacing(1.5, 2),
    color: theme.palette.intent.edit,
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(1, 1),
    },
  },
}))

const SectionHeader = styled('tr')(({ theme }) => ({
  fontWeight: 600,
  color: theme.palette.intent.edit,
  backgroundColor: theme.palette.surface.muted,
  th: {
    paddingTop: theme.spacing(2),
  },
  '& + tr': {
    borderBottom: `1px solid ${theme.palette.border.subtle}`,
  },
}))

const mixColors = (from: string, to: string, ratio: number) => {
  const [a, b] = [decomposeColor(from).values, decomposeColor(to).values]
  return recomposeColor({
    type: 'rgb',
    values: [0, 1, 2].map((i) => Math.floor(a[i] + (b[i] - a[i]) * ratio)) as [number, number, number],
  })
}

const BudgetBar: FC<{ width: number; badness: number }> = ({ width, badness }) => {
  const theme = useTheme()
  const ratio = Math.min(1, Math.max(0, badness))
  return (
    <Box sx={{ height: 3, bgcolor: 'border.subtle', borderRadius: (t) => t.radius.sm, mt: 0.5, overflow: 'hidden' }}>
      <Box
        sx={{
          height: '100%',
          width: `${width}%`,
          bgcolor: mixColors(theme.palette.money.gain, theme.palette.money.loss, ratio),
          transition: 'width 300ms ease-in',
        }}
      />
    </Box>
  )
}

// '&&' outranks the table's left-aligned cell rule.
const AmountCell = styled('td')({
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
  '&&': { textAlign: 'right' },
})

const HeaderCell = styled('th')({
  whiteSpace: 'nowrap',
  '&&': { textAlign: 'right' },
})

const SpacerRow = styled('tr')(({ theme }) => ({
  height: theme.spacing(2),
}))

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
  const { preferences } = useContext(UserContext)
  const updatePreferences = useContext(UpdatePreferencesContext)
  const { showToast } = useToast()
  const savedGrossIncome = preferences?.costsGrossIncome ?? userStore.getGrossIncome()
  const legacyIncomeCategory = preferences?.costsIncomeCategoryId ?? userStore.getIncomeCategoryId()
  const savedIncomeCategories =
    preferences?.costsIncomeCategoryIds ?? (legacyIncomeCategory !== null ? [legacyIncomeCategory] : [])
  const [incomeCategories, setIncomeCategories] = useState<number[]>(savedIncomeCategories)
  const [grossIncome, setGrossIncome] = useState<number>(savedGrossIncome ?? 0)
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
    if (!savedGrossIncome || savedIncomeCategories.length === 0) {
      setShowSetup(true)
    } else if (preferences?.costsGrossIncome === undefined || preferences?.costsIncomeCategoryIds === undefined) {
      // Uploads values still only kept in this browser's storage.
      updatePreferences({
        costsGrossIncome: savedGrossIncome,
        costsIncomeCategoryIds: savedIncomeCategories,
        costsIncomeCategoryId: null,
      }).catch(console.error)
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
            if (incomeCategories.includes(category.id)) return true
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
    [incomeCategories, transactions, exchangeRateOnDay, defaultCurrency],
  )

  const topLevelCategory = (category: AugmentedCategory) => {
    while (category.parent && category.parentId !== rootCategory.id) {
      category = category.parent as AugmentedCategory
    }
    return category
  }

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

        const category = topLevelCategory(currentValue.category!)

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

        const category = topLevelCategory(currentValue.category!)

        if (data.has(category.name)) {
          data.set(category.name, data.get(category.name)! - value)
        }
      })

    return data
  }, [incomeCategories, transactions, exchangeRateOnDay, defaultCurrency])

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

        const category = topLevelCategory(currentValue.category!)

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

        const category = topLevelCategory(currentValue.category!)

        if (data.has(category.name) && data.get(category.name)! >= value) {
          data.set(category.name, data.get(category.name)! - value)
        }
      })

    return data
  }, [incomeCategories, transactions, exchangeRateOnDay, defaultCurrency])

  const variableAmount = useMemo(() => {
    return [...variableCosts.values()].reduce((previousValue, currentValue) => previousValue + currentValue, 0)
  }, [variableCosts])

  const percentages =
    income > 0
      ? [
          Math.floor((100 * fixedAmount) / income),
          Math.floor((100 * variableAmount) / income),
          Math.floor((100 * (income - variableAmount - fixedAmount)) / income),
        ]
      : [0, 0, 0]

  const extraPercentages = [
    ((100 * fixedAmount) / income) % 1,
    ((100 * variableAmount) / income) % 1,
    ((100 * (income - variableAmount - fixedAmount)) / income) % 1,
  ]

  while (income > 0 && percentages.reduce((a, b) => a + b) < 100) {
    let biggestIndex = 0
    for (let i = 1; i < extraPercentages.length; i += 1) {
      if (extraPercentages[i] > extraPercentages[biggestIndex]) {
        biggestIndex = i
      }
    }
    extraPercentages[biggestIndex] = 0
    percentages[biggestIndex] += 1
  }

  if (privacyMode) {
    return (
      <ContentWithHeader title="Costs Analysis" action="menu" withPadding>
        <Typography color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
          Costs Analysis is hidden while privacy mode is on.
        </Typography>
      </ContentWithHeader>
    )
  }

  return (
    <ContentWithHeader
      title="Costs Analysis"
      action="menu"
      withPadding
      withScrolling={viewType === 'table'}
      setContentRef={setContentRef}
      rightContent={
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
    >
      <CostsAnalysisSetup
        open={showSetup || showOptions}
        grossIncome={grossIncome}
        setGrossIncome={setGrossIncome}
        incomeCategories={incomeCategories}
        setIncomeCategories={setIncomeCategories}
        onComplete={() => {
          updatePreferences({
            costsGrossIncome: grossIncome,
            costsIncomeCategoryIds: incomeCategories,
            costsIncomeCategoryId: null,
          }).catch(() => showToast('Could not save your costs analysis setup', 'error'))
          setShowSetup(false)
          setShowOptions(false)
        }}
      />

      <Box
        sx={{
          maxWidth: (t) => t.contentWidth.default,
          width: '100%',
          height: viewType === 'chart' ? '100%' : undefined,
        }}
      >
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
                <th>Essential Expenses</th>
                {privacyMode ? (
                  <>
                    <HeaderCell>Yearly ({defaultCurrency.symbol})</HeaderCell>
                    <HeaderCell>Monthly ({defaultCurrency.symbol})</HeaderCell>
                  </>
                ) : (
                  <th colSpan={2}>
                    {!privacyMode && `${privacyMode ? 'XX' : percentages[0]}%`}
                    <BudgetBar width={percentages[0]} badness={(percentages[0] - 50) / 10} />
                  </th>
                )}
              </SectionHeader>
              <SectionHeader>
                <th>Totals</th>
                <AmountCell>{formatAmount(defaultCurrency, fixedAmount, privacyMode)}</AmountCell>
                <AmountCell>{formatAmount(defaultCurrency, fixedAmount / 12, privacyMode)}</AmountCell>
              </SectionHeader>
              {[...fixedCosts.entries()].map((entry) => (
                <tr key={`fixed-${entry[0]}`}>
                  <td>{entry[0]}</td>
                  <AmountCell>{formatAmount(defaultCurrency, entry[1], privacyMode)}</AmountCell>
                  <AmountCell>{formatAmount(defaultCurrency, entry[1] / 12, privacyMode)}</AmountCell>
                </tr>
              ))}
              <SpacerRow />
              <SectionHeader>
                <th>Other Expenses</th>
                {privacyMode ? (
                  <>
                    <HeaderCell>Yearly ({defaultCurrency.symbol})</HeaderCell>
                    <HeaderCell>Monthly ({defaultCurrency.symbol})</HeaderCell>
                  </>
                ) : (
                  <th colSpan={2}>
                    {!privacyMode && `${privacyMode ? 'XX' : percentages[1]}%`}
                    <BudgetBar width={percentages[1]} badness={(percentages[1] - 30) / 10} />
                  </th>
                )}
              </SectionHeader>
              <SectionHeader>
                <th>Totals</th>
                <AmountCell>{formatAmount(defaultCurrency, variableAmount, privacyMode)}</AmountCell>
                <AmountCell>{formatAmount(defaultCurrency, variableAmount / 12, privacyMode)}</AmountCell>
              </SectionHeader>
              {[...variableCosts.entries()].map((entry) => (
                <tr key={`variable-${entry[0]}`}>
                  <td>{entry[0]}</td>
                  <AmountCell>{formatAmount(defaultCurrency, entry[1], privacyMode)}</AmountCell>
                  <AmountCell>{formatAmount(defaultCurrency, entry[1] / 12, privacyMode)}</AmountCell>
                </tr>
              ))}
              {!privacyMode && (
                <>
                  <SpacerRow />
                  <SectionHeader>
                    <th>Investments & Savings</th>
                    <th colSpan={2}>
                      {privacyMode ? 'XX' : percentages[2]}%
                      <BudgetBar width={percentages[2]} badness={(20 - percentages[2]) / 10} />
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
      </Box>
    </ContentWithHeader>
  )
}

export default CostsAnalysisPage
