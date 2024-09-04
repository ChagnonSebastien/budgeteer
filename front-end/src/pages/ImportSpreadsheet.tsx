import { IonButton, IonPage } from '@ionic/react'
import { parse as papaparse } from 'papaparse'
import { ChangeEventHandler, FC, useContext, useRef } from 'react'

import ContentWithHeader from '../components/ContentWithHeader'
import Account from '../domain/model/account'
import Transaction from '../domain/model/transaction'
import {
  AccountServiceContext,
  CategoryServiceContext,
  CurrencyServiceContext,
  TransactionServiceContext,
} from '../service/ServiceContext'

const ImportSpreadsheet: FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { state: categories, create: createCategory, root: rootCategory } = useContext(CategoryServiceContext)
  const { state: currencies, create: createCurrency } = useContext(CurrencyServiceContext)
  const { state: accounts, create: createAccount, update: updateAccount } = useContext(AccountServiceContext)
  const { create: createTransaction } = useContext(TransactionServiceContext)

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange: ChangeEventHandler<HTMLInputElement> = async (event) => {
    if (!event.target.files?.length) {
      return
    }

    const file = event.target.files[0]
    if (file) {
      const transactionPromises: Promise<Transaction>[] = []

      papaparse(file, {
        header: true,
        complete: async (results: {
          data: {
            Account: string
            Category: string
            Currency: string
            Date: string
            'From/To': string
            Notes: string
            Value: string
            Currency_rec: string
            Value_rec: string
          }[]
        }) => {
          const newCurrencies = [...currencies]
          const newCategories = [...categories]
          let newAccounts = [...accounts]

          for (let i = 0; i < results.data.length; i++) {
            const line = results.data[i]

            if (!line.Currency) {
              break
            }

            let currency = newCurrencies.find((c) => c.symbol === line.Currency)
            if (typeof currency === 'undefined') {
              currency = await createCurrency({
                name: line.Currency,
                symbol: line.Currency,
                decimalPoints: line.Value.split('.')[1].length,
                exchangeRates: {},
              })
              newCurrencies.push(currency)
            }

            let receiver_currency = newCurrencies.find((c) => c.symbol === line.Currency_rec)
            if (typeof receiver_currency === 'undefined') {
              receiver_currency = await createCurrency({
                name: line.Currency_rec,
                symbol: line.Currency_rec,
                decimalPoints: line.Value_rec.split('.')[1].length,
                exchangeRates: {},
              })
              newCurrencies.push(receiver_currency)
            }

            let category = newCategories.find((c) => c.name === line.Category)
            if (
              typeof category === 'undefined' &&
              !(line.Category === 'Transfer between accounts' || line.Category === 'Credit card bill')
            ) {
              category = await createCategory({
                name: line.Category,
                parentId: rootCategory.id,
                iconName: 'BsQuestionLg',
                iconColor: '#2F4F4F',
                iconBackground: 'rgb(255, 165, 0)',
              })
              newCategories.push(category)
            }

            let account = newAccounts.find((a) => a.name === line.Account)
            if (typeof account === 'undefined') {
              account = await createAccount({
                name: line.Account,
                initialAmounts: [],
                isMine: true,
                type: null,
                financialInstitution: null,
              })
              newAccounts.push(account)
            } else if (!account.isMine) {
              await updateAccount(account.id, {
                ...account,
                isMine: true,
              })
              newAccounts = newAccounts.map((a) =>
                a.id === account!.id
                  ? new Account(
                      account!.id,
                      account!.name,
                      account!.initialAmounts,
                      true,
                      account!.type,
                      account!.financialInstitution,
                    )
                  : a,
              )
            }

            let fromto: Account | undefined
            if (line['From/To'] != '') {
              fromto = newAccounts.find((a) => a.name === line['From/To'])
              if (typeof fromto === 'undefined') {
                fromto = await createAccount({
                  name: line['From/To'],
                  initialAmounts: [],
                  isMine: false,
                  type: null,
                  financialInstitution: null,
                })
                newAccounts.push(fromto)
              }
            }

            const amount = Number.parseInt(line.Value.replace('.', ''))
            const receiver_amount = Number.parseInt(line.Value_rec.replace('.', ''))
            const date = new Date(line.Date)
            const note = line.Notes

            let sender: Account | undefined
            let receiver: Account | undefined
            if (amount < 0) {
              sender = account
              receiver = fromto
            } else {
              sender = fromto
              receiver = account
            }

            transactionPromises.push(
              createTransaction({
                amount: Math.abs(amount),
                receiverAmount: Math.abs(receiver_amount),
                currencyId: currency.id,
                receiverCurrencyId: receiver_currency.id,
                categoryId: category?.id ?? null,
                date,
                senderId: sender?.id ?? null,
                receiverId: receiver?.id ?? null,
                note,
              }),
            )
          }
        },
        error: (error) => {
          console.error('Error parsing CSV:', error)
        },
      })
    }
  }

  return (
    <IonPage>
      <ContentWithHeader title="Import Spreadsheet" button="return">
        <IonButton expand="block" onClick={handleButtonClick}>
          Upload CSV
        </IonButton>
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
      </ContentWithHeader>
    </IonPage>
  )
}

export default ImportSpreadsheet
