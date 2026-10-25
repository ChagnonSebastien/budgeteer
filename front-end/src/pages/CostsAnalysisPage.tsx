import { Box, IconButton } from '@mui/material'
import { decomposeColor, recomposeColor, styled, useTheme } from '@mui/material/styles'
import { differenceInDays, differenceInYears, startOfDay } from 'date-fns'
import { FC, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { UpdatePreferencesContext, UserContext } from '../App'
import { CreateCategoryNavigationState } from './CreateCategoryPage'
import { commonCategories, iconColor, TemplateGroup } from '../components/categories/commonCategories'
import CostsAnalysisSetup, { CostsSetup, CostsSetupCategoryList } from '../components/CostsAnalysisSetup'
import EarningsBreakdownChart, { Flow } from '../components/graphing/EarningsBreakdownChart'
import { IconToolsContext } from '../components/icons/IconTools'
import { DrawerContext } from '../components/Menu'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { EmptyState } from '../components/shared/Layout'
import { useToast } from '../components/shared/ToastProvider'
import { useElementDimensions } from '../components/shared/useDimensions'
import { AugmentedCategory, CategoryID } from '../domain/model/category'
import { formatSignedAmount } from '../domain/model/currency'
import { AugmentedTransaction } from '../domain/model/transaction'
import MixedAugmentation from '../service/MixedAugmentation'

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

const templateChild = (groupName: string, childName: string): TemplateGroup => {
  const group = commonCategories.find((g) => g.name === groupName)!
  return { ...group.children!.find((c) => c.name === childName)!, color: group.color }
}

const categoryTemplates: Partial<Record<CostsSetupCategoryList, TemplateGroup>> = {
  employmentCategories: templateChild('Income', 'Salary'),
  taxesCategories: templateChild('Fees and taxes', 'Taxes'),
}

interface SetupDraft extends CostsSetup {
  createdCategoryId?: CategoryID
  createdCategoryList?: CostsSetupCategoryList
}

const isSetupDraft = (state: unknown): state is SetupDraft =>
  typeof state === 'object' && state !== null && Array.isArray((state as SetupDraft).employmentCategories)

const withCreatedCategory = ({ createdCategoryId, createdCategoryList, ...setup }: SetupDraft): CostsSetup =>
  createdCategoryId !== undefined && createdCategoryList
    ? { ...setup, [createdCategoryList]: [...setup[createdCategoryList], createdCategoryId] }
    : setup

const closestList = <K extends string>(category: AugmentedCategory | undefined, lists: Record<K, CategoryID[]>) => {
  for (; category; category = category.parent as AugmentedCategory | undefined) {
    const id = category.id
    const list = (Object.keys(lists) as K[]).find((key) => lists[key].includes(id))
    if (list) return list
  }
  return undefined
}

const isInCategories = (category: AugmentedCategory | undefined, ids: CategoryID[]) =>
  closestList(category, { ids }) !== undefined

const isThisYear = (transaction: AugmentedTransaction) =>
  differenceInYears(transaction.date, startOfDay(new Date())) === 0

const CostsAnalysisPage: FC = () => {
  const {
    augmentedTransactions: transactions,
    exchangeRateOnDay,
    rootCategory,
    defaultCurrency,
  } = useContext(MixedAugmentation)
  const { privacyMode } = useContext(DrawerContext)
  const { IconLib } = useContext(IconToolsContext)
  const navigate = useNavigate()
  const location = useLocation()
  const draft = isSetupDraft(location.state) ? location.state : null

  // Get the current URL search params
  const query = new URLSearchParams(window.location.search)

  const [showSetup, setShowSetup] = useState(false)
  const [showOptions, setShowOptions] = useState(draft !== null)
  const [viewType, setViewType] = useState<'table' | 'chart'>(query.get('view') === 'chart' ? 'chart' : 'table')
  const { preferences } = useContext(UserContext)
  const updatePreferences = useContext(UpdatePreferencesContext)
  const { showToast } = useToast()
  const savedSetup: CostsSetup = {
    grossIncome: preferences?.costsGrossIncome ?? 0,
    employmentCategories: preferences?.costsEmploymentIncomeCategoryIds ?? [],
    otherIncomeCategories: preferences?.costsOtherIncomeCategoryIds ?? [],
    taxesCategories: preferences?.costsTaxesCategoryIds ?? [],
  }
  const [setup, setSetup] = useState<CostsSetup>(draft ? withCreatedCategory(draft) : savedSetup)
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
    // Otherwise a reload reopens the dialog with the stale draft.
    if (draft) navigate(`${location.pathname}${location.search}`, { replace: true })

    if (preferences?.costsEmploymentIncomeCategoryIds === undefined) setShowSetup(true)
  }, [])

  const convert = useCallback(
    (amount: number, currencyId: number) =>
      currencyId === defaultCurrency.id
        ? amount
        : amount * exchangeRateOnDay(currencyId, defaultCurrency.id, startOfDay(new Date())),
    [exchangeRateOnDay, defaultCurrency],
  )

  const { employmentIncome, investmentIncome, otherIncome } = useMemo(() => {
    const lists = {
      employmentIncome: setup.employmentCategories,
      otherIncome: setup.otherIncomeCategories,
    }
    const totals = { employmentIncome: 0, investmentIncome: 0, otherIncome: 0 }
    transactions.filter(isThisYear).forEach((transaction) => {
      const list =
        transaction.financialIncomeData !== null ? 'investmentIncome' : closestList(transaction.category, lists)
      if (!list) return
      if (transaction.receiver?.isMine)
        totals[list] += convert(transaction.receiverAmount, transaction.receiverCurrencyId)
      if (transaction.sender?.isMine) totals[list] -= convert(transaction.amount, transaction.currencyId)
    })
    return totals
  }, [setup.employmentCategories, setup.otherIncomeCategories, transactions, convert])

  const topLevelCategory = (category: AugmentedCategory) => {
    while (category.parent && category.parentId !== rootCategory.id) {
      category = category.parent as AugmentedCategory
    }
    return category
  }

  const topLevelName = (category: AugmentedCategory) => {
    const top = topLevelCategory(category)
    return top.id === rootCategory.id ? 'Uncategorized' : top.name
  }

  const monthsCovered = useMemo(() => {
    const today = startOfDay(new Date())
    const earliest = transactions
      .filter(isThisYear)
      .reduce((min, transaction) => (transaction.date < min ? transaction.date : min), today)
    return Math.min(12, Math.max(1, differenceInDays(today, earliest) / (365 / 12)))
  }, [transactions])

  const fixedCosts = useMemo(() => {
    const fixedTransactions = transactions
      .filter(isThisYear)
      .filter((value) => value.financialIncomeData === null)
      .filter((value) => value.category?.fixedCosts ?? false)
      .filter((value) => !isInCategories(value.category, setup.taxesCategories))

    const data = fixedTransactions
      .filter((value) => value.sender?.isMine ?? false)
      .reduce((previousValue, currentValue) => {
        let value = currentValue.amount
        if (currentValue.currencyId !== defaultCurrency.id) {
          value *= exchangeRateOnDay(currentValue.currencyId, defaultCurrency.id, startOfDay(new Date()))
        }

        const name = topLevelName(currentValue.category!)

        previousValue.set(name, (previousValue.get(name) ?? 0) + value)
        return previousValue
      }, new Map<string, number>())

    fixedTransactions
      .filter((value) => value.receiver?.isMine ?? false)
      .forEach((currentValue) => {
        let value = currentValue.receiverAmount
        if (currentValue.receiverCurrencyId !== defaultCurrency.id) {
          value *= exchangeRateOnDay(currentValue.receiverCurrencyId, defaultCurrency.id, startOfDay(new Date()))
        }

        const name = topLevelName(currentValue.category!)

        if (data.has(name)) {
          data.set(name, data.get(name)! - value)
        }
      })

    return data
  }, [setup.taxesCategories, transactions, exchangeRateOnDay, defaultCurrency])

  const fixedAmount = useMemo(() => {
    return [...fixedCosts.values()].reduce((previousValue, currentValue) => previousValue + currentValue, 0)
  }, [fixedCosts])

  const variableCosts = useMemo(() => {
    const fixedTransactions = transactions
      .filter(isThisYear)
      .filter((value) => value.financialIncomeData === null)
      .filter((value) => typeof value.category !== 'undefined')
      .filter((value) => !(value.category?.fixedCosts ?? false))
      .filter((value) => !isInCategories(value.category, setup.taxesCategories))

    const data = fixedTransactions
      .filter((value) => value.sender?.isMine ?? false)
      .reduce((previousValue, currentValue) => {
        let value = currentValue.amount
        if (currentValue.currencyId !== defaultCurrency.id) {
          value *= exchangeRateOnDay(currentValue.currencyId, defaultCurrency.id, new Date())
        }

        const name = topLevelName(currentValue.category!)

        previousValue.set(name, (previousValue.get(name) ?? 0) + value)
        return previousValue
      }, new Map<string, number>())

    fixedTransactions
      .filter((value) => value.receiver?.isMine ?? false)
      .forEach((currentValue) => {
        let value = currentValue.receiverAmount
        if (currentValue.receiverCurrencyId !== defaultCurrency.id) {
          value *= exchangeRateOnDay(currentValue.receiverCurrencyId, defaultCurrency.id, startOfDay(new Date()))
        }

        const name = topLevelName(currentValue.category!)

        if (data.has(name) && data.get(name)! >= value) {
          data.set(name, data.get(name)! - value)
        }
      })

    return data
  }, [setup.taxesCategories, transactions, exchangeRateOnDay, defaultCurrency])

  const variableAmount = useMemo(() => {
    return [...variableCosts.values()].reduce((previousValue, currentValue) => previousValue + currentValue, 0)
  }, [variableCosts])

  const { taxPayments, taxRefunds } = useMemo(
    () =>
      transactions
        .filter(isThisYear)
        .filter((value) => isInCategories(value.category, setup.taxesCategories))
        .reduce(
          (totals, transaction) => ({
            taxPayments:
              totals.taxPayments +
              (transaction.sender?.isMine ? convert(transaction.amount, transaction.currencyId) : 0),
            taxRefunds:
              totals.taxRefunds +
              (transaction.receiver?.isMine ? convert(transaction.receiverAmount, transaction.receiverCurrencyId) : 0),
          }),
          { taxPayments: 0, taxRefunds: 0 },
        ),
    [setup.taxesCategories, transactions, convert],
  )

  const netBorrowed = useMemo(
    () =>
      transactions
        .filter(isThisYear)
        .reduce(
          (total, transaction) =>
            total +
            (transaction.sender?.isDebt ? convert(transaction.amount, transaction.currencyId) : 0) -
            (transaction.receiver?.isDebt ? convert(transaction.receiverAmount, transaction.receiverCurrencyId) : 0),
          0,
        ),
    [transactions, convert],
  )

  const grossIncomeAmount = setup.grossIncome * Math.pow(10, defaultCurrency.decimalPoints)
  const withheldTaxes = grossIncomeAmount > 0 ? Math.max(0, grossIncomeAmount - employmentIncome) : 0
  const flows: Flow[] = [
    { id: 'Employment Income', amount: employmentIncome + withheldTaxes },
    { id: investmentIncome < 0 ? 'Investment Losses' : 'Investment Income', amount: investmentIncome },
    { id: 'Other Income', amount: otherIncome },
    { id: 'Tax Refunds', amount: taxRefunds },
    { id: 'Withheld Taxes', amount: -withheldTaxes },
    { id: 'Tax Payments', amount: -taxPayments },
  ]
  const inflows = flows.filter((flow) => flow.amount > 0)
  const outflows = flows.filter((flow) => flow.amount < 0).map((flow) => ({ ...flow, amount: -flow.amount }))
  const netIncome = flows.reduce((total, flow) => total + flow.amount, 0)

  const leftover = netIncome - variableAmount - fixedAmount
  const leftoverFlows: Flow[] = [
    { id: netBorrowed > 0 ? 'New Debt' : 'Debt Repayment', amount: -netBorrowed },
    { id: leftover + netBorrowed < 0 ? 'From Savings' : 'Investments and Savings', amount: leftover + netBorrowed },
  ]

  const exactPercentages = [fixedAmount, variableAmount, leftover].map((amount) => (100 * amount) / netIncome)
  const percentages = netIncome > 0 ? exactPercentages.map(Math.floor) : [0, 0, 0]
  const extraPercentages = exactPercentages.map((percentage) => percentage - Math.floor(percentage))

  while (netIncome > 0 && percentages.reduce((a, b) => a + b) < 100) {
    let biggestIndex = 0
    for (let i = 1; i < extraPercentages.length; i += 1) {
      if (extraPercentages[i] > extraPercentages[biggestIndex]) {
        biggestIndex = i
      }
    }
    extraPercentages[biggestIndex] = 0
    percentages[biggestIndex] += 1
  }

  const percentLabel = (index: number) => (netIncome > 0 ? `${percentages[index]}%` : 'n/a')
  const amountCells = (value: number) => (
    <>
      <AmountCell>{formatSignedAmount(defaultCurrency, value, privacyMode)}</AmountCell>
      <AmountCell>{formatSignedAmount(defaultCurrency, value / monthsCovered, privacyMode)}</AmountCell>
    </>
  )

  return (
    <ContentWithHeader
      title="Costs Analysis (Last 12 Months)"
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
        setup={setup}
        setSetup={setSetup}
        onComplete={() => {
          updatePreferences({
            costsGrossIncome: setup.grossIncome,
            costsEmploymentIncomeCategoryIds: setup.employmentCategories,
            costsOtherIncomeCategoryIds: setup.otherIncomeCategories,
            costsTaxesCategoryIds: setup.taxesCategories,
          }).catch(() => showToast('Could not save your costs analysis setup', 'error'))
          setShowSetup(false)
          setShowOptions(false)
        }}
        onDismiss={() => {
          setSetup(savedSetup)
          setShowSetup(false)
          setShowOptions(false)
        }}
        onCreateCategory={(list) => {
          const template = categoryTemplates[list]!
          const state: CreateCategoryNavigationState = {
            from: `${window.location.pathname}${window.location.search}`,
            prefill: {
              name: template.name,
              iconName: template.icon,
              iconColor,
              iconBackground: template.color,
              parentId: rootCategory.id,
              fixedCosts: false,
              ordering: 0,
            },
            returnState: { ...setup, createdCategoryList: list } satisfies SetupDraft,
          }
          navigate('/categories/new', { state })
        }}
      />

      <Box
        sx={{
          maxWidth: (t) => t.contentWidth.default,
          width: '100%',
          height: viewType === 'chart' ? '100%' : undefined,
        }}
      >
        {transactions.length === 0 ? (
          <EmptyState
            title="Find out where your income goes"
            description="Record your income and expenses to see how they split between essentials, other spending and savings."
            action={{ label: 'Record a transaction', path: '/transactions/new' }}
          />
        ) : viewType === 'chart' ? (
          <EarningsBreakdownChart
            inflows={inflows}
            outflows={outflows}
            netBorrowed={netBorrowed}
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
                  {flows
                    .filter((flow) => flow.amount !== 0)
                    .map((flow) => (
                      <tr key={flow.id}>
                        <td>{flow.id}</td>
                        {amountCells(flow.amount)}
                      </tr>
                    ))}
                  <tr>
                    <td>Net Income</td>
                    {amountCells(netIncome)}
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
                    {percentLabel(0)}
                    <BudgetBar width={percentages[0]} badness={(percentages[0] - 50) / 10} />
                  </th>
                )}
              </SectionHeader>
              <SectionHeader>
                <th>Totals</th>
                {amountCells(fixedAmount)}
              </SectionHeader>
              {[...fixedCosts.entries()].map((entry) => (
                <tr key={`fixed-${entry[0]}`}>
                  <td>{entry[0]}</td>
                  {amountCells(entry[1])}
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
                    {percentLabel(1)}
                    <BudgetBar width={percentages[1]} badness={(percentages[1] - 30) / 10} />
                  </th>
                )}
              </SectionHeader>
              <SectionHeader>
                <th>Totals</th>
                {amountCells(variableAmount)}
              </SectionHeader>
              {[...variableCosts.entries()].map((entry) => (
                <tr key={`variable-${entry[0]}`}>
                  <td>{entry[0]}</td>
                  {amountCells(entry[1])}
                </tr>
              ))}
              {!privacyMode && (
                <>
                  <SpacerRow />
                  <SectionHeader>
                    <th>Unspent Income</th>
                    <th colSpan={2}>
                      {percentLabel(2)}
                      <BudgetBar width={percentages[2]} badness={(20 - percentages[2]) / 10} />
                    </th>
                  </SectionHeader>
                  <SectionHeader>
                    <th>Totals</th>
                    {amountCells(leftover)}
                  </SectionHeader>
                  {leftoverFlows
                    .filter((flow) => flow.amount !== 0)
                    .map((flow) => (
                      <tr key={flow.id}>
                        <td>{flow.id}</td>
                        {amountCells(flow.amount)}
                      </tr>
                    ))}
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
