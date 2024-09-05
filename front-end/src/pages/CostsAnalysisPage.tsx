import { IonInput, IonPage } from '@ionic/react'
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

  const fixedCosts = useMemo(
    () =>
      transactions
        .filter((value) => differenceInYears(value.date, new Date()) === 0)
        .filter((value) => value.category?.fixedCosts ?? false)
        .filter((value) => value.sender?.isMine ?? false)
        .reduce((previousValue, currentValue) => {
          let value = currentValue.amount
          if (currentValue.currencyId !== defaultCurrency?.id) {
            value *= exchangeRateOnDay(currentValue.currencyId, defaultCurrency!.id, new Date())
          }
          return previousValue + value
        }, 0),
    [incomeCategory, transactions, exchangeRateOnDay, defaultCurrency],
  )

  const variableCosts = useMemo(
    () =>
      transactions
        .filter((value) => differenceInYears(value.date, new Date()) === 0)
        .filter((value) => typeof value.category !== 'undefined')
        .filter((value) => !(value.category?.fixedCosts ?? false))
        .filter((value) => value.sender?.isMine ?? false)
        .reduce((previousValue, currentValue) => {
          let value = currentValue.amount
          if (currentValue.currencyId !== defaultCurrency?.id) {
            value *= exchangeRateOnDay(currentValue.currencyId, defaultCurrency!.id, new Date())
          }
          return previousValue + value
        }, 0),
    [incomeCategory, transactions, exchangeRateOnDay, defaultCurrency],
  )

  if (defaultCurrency === null) {
    return null
  }

  return (
    <IonPage>
      <ContentWithHeader title="Costs Analysis" button="menu">
        <div style={{ padding: '2rem 1rem' }}>
          <IonInput
            type="text"
            value={grossIncome}
            onIonInput={(ev) => {
              const parsed = parseInt(ev.detail.value as string)
              if (isNaN(parsed)) {
                setGrossIncome(0)
              } else {
                setGrossIncome(parsed)
              }
            }}
            labelPlacement="stacked"
            errorText="No error"
            label="Gross Income"
          />

          <CategoryPicker
            categoryId={incomeCategory}
            setCategoryId={setIncomeCategory}
            labelText="Select your net income category"
          />

          <div style={{ height: '1rem' }} />

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
              <tr style={{ fontWeight: 'bold' }}>
                <td>Fixed Costs</td>
                <td colSpan={2}>{((100 * fixedCosts) / income).toFixed(0)}%</td>
              </tr>
              <tr>
                <td>All</td>
                <td>{formatFull(defaultCurrency, fixedCosts)}</td>
                <td>{formatFull(defaultCurrency, fixedCosts / 12)}</td>
              </tr>
              <tr style={{ fontWeight: 'bold' }}>
                <td>Variable Costs</td>
                <td colSpan={2}>{((100 * variableCosts) / income).toFixed(0)}%</td>
              </tr>
              <tr>
                <td>All</td>
                <td>{formatFull(defaultCurrency, variableCosts)}</td>
                <td>{formatFull(defaultCurrency, variableCosts / 12)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ContentWithHeader>
    </IonPage>
  )
}

export default CostsAnalysisPage
