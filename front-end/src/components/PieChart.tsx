import { Switch } from '@mui/material'
import { ResponsiveSunburst } from '@nivo/sunburst'
import { FC, useContext, useEffect, useMemo, useState } from 'react'

import Category, { AugmentedCategory } from '../domain/model/category'
import { formatFull } from '../domain/model/currency'
import { AugmentedTransaction } from '../domain/model/transaction'
import MixedAugmentation from '../service/MixedAugmentation'
import { CategoryServiceContext, CurrencyServiceContext } from '../service/ServiceContext'
import { darkColors, darkTheme } from '../utils'

type LocalTree = {
  name: string
  loc: number | undefined
  children: LocalTree[]
}

interface Props {
  augmentedTransactions: AugmentedTransaction[]
  rootCategory: AugmentedCategory
}

const TransactionsPieChart: FC<Props> = (props) => {
  const { augmentedTransactions, rootCategory: root } = props
  const { state: categories, subCategories } = useContext(CategoryServiceContext)
  const { defaultCurrency } = useContext(CurrencyServiceContext)
  const { exchangeRateOnDay } = useContext(MixedAugmentation)

  const [showIncomes, setShowIncomes] = useState(false)
  const [clickedCategory, setClickedCategory] = useState<Category | null>(null)

  const differences = useMemo(() => {
    const diffs = new Map<number, number>()
    if (defaultCurrency === null) return diffs

    augmentedTransactions.forEach((transaction) => {
      if (transaction.categoryId === null) return

      if (transaction.sender?.isMine ?? false) {
        let convertedAmount = transaction.amount
        if (transaction.currencyId !== defaultCurrency.id) {
          convertedAmount *= exchangeRateOnDay(transaction.currencyId, defaultCurrency?.id, transaction.date)
        }
        diffs.set(transaction.categoryId, (diffs.get(transaction.categoryId) ?? 0) + -convertedAmount)
      } else {
        let convertedAmount = transaction.receiverAmount
        if (transaction.receiverCurrencyId !== defaultCurrency.id) {
          convertedAmount *= exchangeRateOnDay(transaction.receiverCurrencyId, defaultCurrency?.id, transaction.date)
        }
        diffs.set(transaction.categoryId, (diffs.get(transaction.categoryId) ?? 0) + convertedAmount)
      }
    })

    return diffs
  }, [categories, augmentedTransactions])

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

      const selfAmount = differences.get(category.id) ?? 0
      let incomeTree: LocalTree | undefined = undefined
      let expenseTree: LocalTree | undefined = undefined

      if (selfAmount > 0 || childrenWithIncome.length > 0) {
        incomeTotal += selfAmount
        incomeTree = {
          name: category.name,
          loc: selfAmount,
          children: childrenWithIncome.map((s) => s.incomeTree!),
        }
      }

      if (selfAmount < 0 || childrenWithExpense.length > 0) {
        expenseTotal -= selfAmount
        expenseTree = {
          name: category.name,
          loc: 0 - selfAmount,
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
  }, [augmentedTransactions])

  useEffect(() => {
    if (
      showIncomes &&
      typeof crunchedData.incomeTree === 'undefined' &&
      typeof crunchedData.expenseTree !== 'undefined'
    ) {
      setShowIncomes(false)
    }
    if (
      !showIncomes &&
      typeof crunchedData.incomeTree !== 'undefined' &&
      typeof crunchedData.expenseTree === 'undefined'
    ) {
      setShowIncomes(true)
    }
  }, [showIncomes, crunchedData.incomeTotal, crunchedData.expenseTotal])

  const data = useMemo(() => {
    const current = showIncomes ? crunchedData.incomeTree : crunchedData.expenseTree
    if ((current?.loc ?? 0) > 0) {
      current?.children.push({
        children: [],
        loc: current!.loc,
        name: current!.name,
      })
      current!.loc = 0
    }
    return current
  }, [crunchedData, showIncomes])

  const sunburst = useMemo(() => {
    if (defaultCurrency === null || typeof data === 'undefined') {
      return (
        <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <h4>No transaction matches your filters</h4>
        </div>
      )
    }

    return (
      <>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div style={{ fontWeight: 'bold' }}>{clickedCategory?.name}</div>
        </div>
        <ResponsiveSunburst
          data={data}
          margin={{ top: 20, right: 60, bottom: 20, left: 60 }}
          id="name"
          value="loc"
          cornerRadius={5}
          colors={darkColors}
          borderWidth={1}
          borderColor={{
            from: 'color',
            modifiers: [['darker', 0.5]],
          }}
          theme={darkTheme}
          childColor={{
            from: 'color',
            modifiers: [['brighter', 0.2]],
          }}
          onClick={({ id }) => {
            setClickedCategory(categories.find((c) => c.name === id)!)
          }}
          valueFormat={(data) => {
            return formatFull(defaultCurrency, data)
          }}
          enableArcLabels={true}
          arcLabel="id"
          arcLabelsSkipAngle={5}
          arcLabelsTextColor="white"
          tooltip={({ id, formattedValue }) => (
            <div
              style={{
                backgroundColor: '#fff',
                color: 'darkslategrey',
                padding: '0.5rem',
                boxShadow: '0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)',
              }}
            >
              <div style={{ fontWeight: 'bold' }}>{id}</div>
              <div>{formattedValue}</div>
            </div>
          )}
        />
      </>
    )
  }, [data, clickedCategory])

  return (
    <>
      {typeof crunchedData.expenseTree === typeof crunchedData.incomeTree && (
        <div
          style={{
            position: 'absolute',
            right: '1rem',
            top: '1rem',
            display: 'flex',
            alignItems: 'center',
            zIndex: 1,
          }}
        >
          <div>Expenses</div>
          <Switch
            checked={showIncomes}
            onChange={(ev) => {
              setClickedCategory(null)
              setShowIncomes(ev.target.checked)
            }}
          />
          <div>Incomes</div>
        </div>
      )}

      {sunburst}
    </>
  )
}

export default TransactionsPieChart
