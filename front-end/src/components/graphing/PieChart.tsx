import { Typography } from '@mui/material'
import { ResponsiveSunburst } from '@nivo/sunburst'
import { FC, useContext, useEffect, useMemo, useState } from 'react'

import Category, { AugmentedCategory } from '../../domain/model/category'
import { formatFull } from '../../domain/model/currency'
import { AugmentedTransaction } from '../../domain/model/transaction'
import MixedAugmentation from '../../service/MixedAugmentation'
import { CategoryServiceContext } from '../../service/ServiceContext'
import { darkColors, darkTheme } from '../../utils'
import { DrawerContext } from '../Menu'
import { GraphTooltip } from './GraphStyledComponents'
import { Centered } from '../shared/Layout'

type LocalTree = {
  name: string
  loc: number | undefined
  children: LocalTree[]
}

interface Props {
  augmentedTransactions: AugmentedTransaction[]
  rootCategory: AugmentedCategory
  showIncomes: boolean
  onShowIncomesChange: (show: boolean) => void
}

const TransactionsPieChart: FC<Props> = (props) => {
  const { augmentedTransactions, rootCategory: root, showIncomes, onShowIncomesChange } = props
  const { state: categories, subCategories } = useContext(CategoryServiceContext)
  const { exchangeRateOnDay, defaultCurrency } = useContext(MixedAugmentation)
  const { privacyMode } = useContext(DrawerContext)

  const [clickedCategory, setClickedCategory] = useState<Category | null>(null)

  const differences = useMemo(() => {
    const diffs = new Map<number, number>()
    augmentedTransactions.forEach((transaction) => {
      if (transaction.categoryId === null) return

      if (transaction.sender?.isMine ?? false) {
        let convertedAmount = transaction.amount
        if (transaction.currencyId !== defaultCurrency.id) {
          convertedAmount *= exchangeRateOnDay(transaction.currencyId, defaultCurrency.id, transaction.date)
        }
        diffs.set(transaction.categoryId, (diffs.get(transaction.categoryId) ?? 0) + -convertedAmount)
      } else {
        let convertedAmount = transaction.receiverAmount
        if (transaction.receiverCurrencyId !== defaultCurrency.id) {
          convertedAmount *= exchangeRateOnDay(transaction.receiverCurrencyId, defaultCurrency.id, transaction.date)
        }
        diffs.set(transaction.categoryId, (diffs.get(transaction.categoryId) ?? 0) + convertedAmount)
      }
    })

    return diffs
  }, [categories, augmentedTransactions, exchangeRateOnDay, defaultCurrency])

  // Non-negative magnitude of a category's subtree in the currently-shown
  // direction. Income contributions count only in income view and expense
  // contributions only in expense view, so this always matches the value the
  // sunburst renders for the corresponding arc.
  const getCategoryTotal = (category: Category): number => {
    const selfAmount = differences.get(category.id) ?? 0
    const self = showIncomes ? Math.max(0, selfAmount) : Math.max(0, -selfAmount)
    const childrenAmount = (subCategories[category.id] ?? []).map(getCategoryTotal).reduce((a, b) => a + b, 0)
    return self + childrenAmount
  }

  const crunchedData = useMemo(() => {
    const buildGraph = (
      category: Category,
    ): {
      incomeTree?: LocalTree
      expenseTree?: LocalTree
      expenseTotal: number
      incomeTotal: number
    } => {
      const sub = (subCategories[category.id] ?? []).map(buildGraph)
      const childrenWithIncome = sub.filter((s) => typeof s.incomeTree !== 'undefined')
      const childrenWithExpense = sub.filter((s) => typeof s.expenseTree !== 'undefined')
      let incomeTotal = childrenWithIncome.map((s) => s.incomeTotal).reduce((a, b) => a + b, 0)
      let expenseTotal = childrenWithExpense.map((s) => s.expenseTotal).reduce((a, b) => a + b, 0)

      // Split the category's own net into non-negative income and expense
      // parts. A category that nets to an income (e.g. a reimbursement) must
      // not contribute a negative slice to the expense tree, and vice versa —
      // negative loc values make children overflow their parent arc.
      const selfAmount = differences.get(category.id) ?? 0
      const selfIncome = Math.max(0, selfAmount)
      const selfExpense = Math.max(0, -selfAmount)
      let incomeTree: LocalTree | undefined = undefined
      let expenseTree: LocalTree | undefined = undefined

      if (selfIncome > 0 || childrenWithIncome.length > 0) {
        incomeTotal += selfIncome
        incomeTree = {
          name: category.name,
          loc: selfIncome,
          children: childrenWithIncome.map((s) => s.incomeTree!),
        }
      }

      if (selfExpense > 0 || childrenWithExpense.length > 0) {
        expenseTotal += selfExpense
        expenseTree = {
          name: category.name,
          loc: selfExpense,
          children: childrenWithExpense.map((s) => s.expenseTree!),
        }
      }

      return {
        incomeTree,
        expenseTree,
        incomeTotal,
        expenseTotal,
      }
    }

    return buildGraph(root)
  }, [augmentedTransactions, differences, subCategories, root])

  useEffect(() => {
    if (
      showIncomes &&
      typeof crunchedData.incomeTree === 'undefined' &&
      typeof crunchedData.expenseTree !== 'undefined'
    ) {
      onShowIncomesChange(false)
    }
    if (
      !showIncomes &&
      typeof crunchedData.incomeTree !== 'undefined' &&
      typeof crunchedData.expenseTree === 'undefined'
    ) {
      onShowIncomesChange(true)
    }
  }, [showIncomes, crunchedData.incomeTotal, crunchedData.expenseTotal])

  const data = useMemo(() => {
    const current = showIncomes ? crunchedData.incomeTree : crunchedData.expenseTree
    if (typeof current === 'undefined') return undefined
    // A node with both its own value and children can't be rendered by the
    // sunburst, so move the root's own amount into a synthetic child. Build a
    // fresh object instead of mutating the memoized tree, which would
    // double-count on re-runs.
    if ((current.loc ?? 0) > 0) {
      return {
        ...current,
        loc: 0,
        children: [...current.children, { children: [], loc: current.loc, name: current.name }],
      }
    }
    return current
  }, [crunchedData, showIncomes])

  const sunburst = useMemo(() => {
    if (typeof data === 'undefined') {
      return (
        <Centered>
          <h4>No transaction matches your filters</h4>
        </Centered>
      )
    }

    return (
      <>
        <Centered style={{ position: 'absolute', flexDirection: 'column' }}>
          {clickedCategory ? (
            <>
              <Typography fontWeight="bold">{clickedCategory.name}</Typography>
              {!privacyMode && (
                <div>
                  {formatFull(defaultCurrency, (showIncomes ? 1 : -1) * getCategoryTotal(clickedCategory), privacyMode)}
                </div>
              )}
              <div>
                {(() => {
                  const total = showIncomes ? crunchedData.incomeTotal : crunchedData.expenseTotal
                  return total === 0 ? '0.0' : ((getCategoryTotal(clickedCategory) / total) * 100).toFixed(1)
                })()}
                %
              </div>
            </>
          ) : (
            <>
              <Typography fontWeight="bold">Total {showIncomes ? 'Income' : 'Expenses'}</Typography>
              {!privacyMode && (
                <div>
                  {formatFull(
                    defaultCurrency,
                    showIncomes ? crunchedData.incomeTotal : -crunchedData.expenseTotal,
                    privacyMode,
                  )}
                </div>
              )}
            </>
          )}
        </Centered>
        <ResponsiveSunburst
          data={data}
          margin={{ top: 20, right: 40, bottom: 20, left: 40 }}
          id="name"
          value="loc"
          cornerRadius={5}
          colors={darkColors}
          borderWidth={1}
          borderColor={{
            from: 'color',
            modifiers: [['darker', 1]],
          }}
          theme={darkTheme}
          childColor={{
            from: 'color',
            modifiers: [['brighter', 0.2]],
          }}
          onClick={({ id }) => {
            setClickedCategory((prev) => {
              const clicked = categories.find((c) => c.name === id)!
              return prev === clicked ? null : clicked
            })
          }}
          valueFormat={(data) => {
            return formatFull(defaultCurrency, data, privacyMode)
          }}
          enableArcLabels={true}
          arcLabel="id"
          arcLabelsSkipAngle={5}
          arcLabelsTextColor="white"
          tooltip={({ id, value }) => (
            <GraphTooltip style={{ whiteSpace: 'nowrap' }}>
              <div style={{ fontWeight: 'bold' }}>{id}</div>
              {!privacyMode && <div>{formatFull(defaultCurrency, value, privacyMode)}</div>}
            </GraphTooltip>
          )}
        />
      </>
    )
  }, [data, clickedCategory, privacyMode, showIncomes, crunchedData, defaultCurrency])

  return <>{sunburst}</>
}

export default TransactionsPieChart
