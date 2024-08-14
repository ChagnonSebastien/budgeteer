import {
  IonButton,
  IonInput, IonItem,
  IonModal,
  IonToast,
} from "@ionic/react"
import { FC, FormEvent, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { Omit, useParams } from "react-router"
import Transaction from "../domain/model/transaction"
import AccountPicker from "./AccountPicker"
import { CategoryList } from "./CategoryList"
import ContentWithHeader from "./ContentWithHeader"
import { AccountServiceContext, CategoryServiceContext, CurrencyServiceContext } from "../service/ServiceContext"
import IconCapsule from "./IconCapsule"

const NoError = "nil"

interface FieldStatus {
  isValid: boolean
  hasVisited: boolean
  errorText: string
}

interface Props {
  initialTransaction?: Transaction,
  onSubmit: (data: Omit<Transaction, "id">) => Promise<void>,
  submitText: string,
  type: "income" | "expense" | "transfer" | null
}

const TransactionForm: FC<Props> = (props) => {
  const {initialTransaction, onSubmit, submitText, type} = props
  useParams()

  const {state: categories, root: rootCategory} = useContext(CategoryServiceContext)
  const {state: currencies} = useContext(CurrencyServiceContext)

  const [amount, setAmount] = useState<string>(`${initialTransaction?.amount ?? ""}`)
  const [currency, setCurrency] = useState<number>(currencies[0].id)
  const [parent, setParent] = useState<number | null>(initialTransaction?.categoryId ?? rootCategory.id)
  const [sender, setSender] = useState<number>()
  const [receiver, setReceiver] = useState<number>()
  const [note, setNote] = useState("")

  const category = useMemo(() => {
    return categories.find(c => c.id === parent)!
  }, [categories, parent])

  const [showParentModal, setShowCategoryModal] = useState(false)

  const validateAmount = useCallback((value: string) => {
    if (!value) {
      return "Amount is required"
    }

    return NoError
  }, [categories])

  const [showErrorToast, setShowErrorToast] = useState("")
  const [errors, setErrors] = useState<{amount: FieldStatus}>({
    amount: {
      hasVisited: false,
      isValid: false,
      errorText: NoError,
    },
  })

  useEffect(() => {
    const amountError = validateAmount(amount)
    setErrors(prevState => ({
      amount: {
        ...prevState.amount,
        isValid: amountError === NoError,
        errorText: amountError,
      },
    }))
  }, [validateAmount, amount])


  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (Object.values(errors).some(value => !value.isValid)) {
      setErrors(prevState => ({
        amount: {
          ...prevState.amount,
          hasVisited: true,
        },
      }))
      return
    }

    console.log("valid")

    onSubmit({
      amount: parseInt(amount),
      categoryId: parent!,
      receiverId: receiver ?? null,
      senderId: sender ?? null,
      note,
      date: new Date(),
      currencyId: currencies[0].id,
    }).catch(err => {
      setShowErrorToast("Unexpected error while creating the category")
      console.error(err)
    })
  }

  const classNameFromStatus = (status: FieldStatus) => {
    return `${!status.isValid && "ion-invalid"} ${status.hasVisited && "ion-touched"}`
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <div style={{margin: "1rem"}}>
        <div style={{display: "flex"}}>
          <div style={{color: "gray", margin: "0 1rem", transform: "translate(0, 0.5rem)"}}>Form</div>
          <div style={{borderBottom: "1px grey solid", flexGrow: 1}}/>
        </div>
        <div style={{padding: "1rem", border: "1px grey solid", borderTop: 0}}>

          <div style={{display: "flex"}}>
            <IonInput type="text"
                      className={classNameFromStatus(errors.amount)}
                      label="Amount"
                      labelPlacement="floating"
                      value={amount}
                      onIonInput={ev => setAmount(ev.target.value as string)}
                      errorText={errors.amount.errorText}
                      onIonBlur={() => setErrors(prevState => ({
                        ...prevState,
                        amount: {...prevState.amount, hasVisited: true},
                      }))}
            />
            <div style={{width: "3rem"}}/>
            <IonInput type="text"
                      style={{flexShrink: 2}}
                      label="Currency"
                      labelPlacement="floating"
                      value={currencies.find(c => c.id === currency)?.symbol}
                      errorText="None"
            />
          </div>

          <div style={{display: "flex", alignItems: "center", cursor: "pointer"}}
               onClick={() => setShowCategoryModal(true)}>
            <IconCapsule flexShrink={0} iconName={category.iconName} size="2rem" color={category.iconColor}
                         backgroundColor={category.iconBackground}/>
            <div style={{width: "1rem", flexShrink: 0}}/>
            <IonInput type="text"
                      label="Category"
                      labelPlacement="floating"
                      placeholder={typeof rootCategory === "undefined" ? "Loading..." : undefined}
                      value={categories?.find(c => c.id === parent)?.name}
                      onFocus={() => setShowCategoryModal(true)}
                      errorText="None"
            />
          </div>
          <IonModal isOpen={showParentModal} onWillDismiss={() => setShowCategoryModal(false)}>
            <ContentWithHeader title="Select Icon" button="return"
                               onCancel={() => setShowCategoryModal(false)}>
              <CategoryList categories={categories} onSelect={newParent => {
                setParent(newParent)
                setShowCategoryModal(false)
              }}/>
            </ContentWithHeader>
          </IonModal>

          <AccountPicker labelText="From" setSelectedAccountId={setSender} selectedAccountId={sender}/>

          <AccountPicker labelText="To" setSelectedAccountId={setReceiver} selectedAccountId={receiver}/>

          <IonInput type="text"
                    label="Note"
                    labelPlacement="stacked"
                    placeholder="Optional details"
                    value={note}
                    onIonInput={ev => setNote(ev.target.value as string)}
                    errorText="_blank"
          />

        </div>
        <div style={{height: "1rem"}}/>
        <IonButton type="submit" expand="block">
          {submitText}
        </IonButton>
      </div>

      <IonToast isOpen={showErrorToast !== ""}
                message={showErrorToast}
                duration={5000}
                onDidDismiss={() => setShowErrorToast("")}/>
    </form>

  )
}

export default TransactionForm
