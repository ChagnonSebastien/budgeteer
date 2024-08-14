import {
  IonButton,
  IonPage,
} from "@ionic/react"
import { ChangeEventHandler, FC, useContext, useRef } from "react"
import { parse as papaparse } from "papaparse"
import ContentWithHeader from "../components/ContentWithHeader"
import Account from "../domain/model/account"
import Transaction from "../domain/model/transaction"
import {
  AccountServiceContext,
  CategoryPersistenceContext,
  CurrencyServiceContext,
  TransactionServiceContext,
} from "../service/ServiceContext"

const ImportSpreadsheet: FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {state: categories, create: createCategory, root: rootCategory} = useContext(CategoryPersistenceContext)
  const {state: currencies, create: createCurrency} = useContext(CurrencyServiceContext)
  const {state: accounts, create: createAccount} = useContext(AccountServiceContext)
  const {create: createTransaction} = useContext(TransactionServiceContext)

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
            Account: string,
            Category: string,
            Currency: string,
            Date: string,
            "From/To": string,
            Notes: string,
            Value: string,
          }[]
        }) => {

          const newCurrencies = [...currencies]
          const newCategories = [...categories]
          const newAccounts = [...accounts]

          for (const line of results.data) {
            if (!line.Currency) {
              break
            }

            let currency = newCurrencies.find(c => c.symbol === line.Currency)
            if (typeof currency === "undefined") {
              currency = await createCurrency({name: "Canadian Dollar", symbol: line.Currency})
              newCurrencies.push(currency)
            }

            let category = newCategories.find(c => c.name === line.Category)
            if (typeof category === "undefined") {
              category = await createCategory({
                name: line.Category,
                parentId: rootCategory.id,
                iconName: "BsQuestionLg",
                iconColor: "#2F4F4F",
                iconBackground: "rgb(255, 165, 0)",
              })
              newCategories.push(category)
            }

            let account = newAccounts.find(a => a.name === line.Account)
            if (typeof account === "undefined") {
              account = await createAccount({
                name: line.Account,
                initialAmount: 0,
              })
              newAccounts.push(account)
            }

            let fromto: Account | undefined
            if (line["From/To"] != "") {
              fromto = newAccounts.find(a => a.name === line["From/To"])
              if (typeof fromto === "undefined") {
                fromto = await createAccount({
                  name: line["From/To"],
                  initialAmount: 0,
                })
                newAccounts.push(fromto)
              }
            }

            let amount = Number.parseInt(line.Value.replace(".", ""))
            let date = new Date(line.Date)
            let note = line.Notes

            let sender: Account | undefined
            let receiver: Account | undefined
            if (amount < 0) {
              sender = account
              receiver = fromto
            } else {
              sender = fromto
              receiver = account
            }

            transactionPromises.push(createTransaction({
              amount: Math.abs(amount),
              currencyId: currency.id,
              categoryId: category.id,
              date,
              senderId: sender?.id ?? null,
              receiverId: receiver?.id ?? null,
              note,
            }))
          }

          console.log(await Promise.all(transactionPromises))
        },
        error: (error) => {
          console.error("Error parsing CSV:", error)
        },
      })
    }
  }

  return (
    <IonPage>
      <ContentWithHeader title="Import Spreadsheet" button="return">
        <IonButton expand="block" onClick={handleButtonClick}>Upload CSV</IonButton>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          style={{display: "none"}}
        />
      </ContentWithHeader>
    </IonPage>
  )
}

export default ImportSpreadsheet
