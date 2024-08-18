import {
  IonPage, useIonRouter,
} from "@ionic/react"
import { FC, useCallback, useContext, useMemo } from "react"
import { useParams } from "react-router"
import ContentWithHeader from "../components/ContentWithHeader"
import CurrencyForm from "../components/CurrencyForm"
import Category from "../domain/model/category"
import Currency from "../domain/model/currency"
import { CategoryServiceContext, CurrencyServiceContext } from "../service/ServiceContext"
import CategoryForm from "../components/CategoryForm"

interface Params {
  currencyId: string
}

const EditCurrency: FC = () => {
  const router = useIonRouter()

  const {currencyId} = useParams<Params>()
  const {state: currencies, update: updateCurrencies} = useContext(CurrencyServiceContext)
  const selectedCurrency = useMemo(() => currencies.find(c => c.id === parseInt(currencyId)), [currencies, currencyId])

  const onSubmit = useCallback(async (data: Omit<Currency, "id">) => {
    if (typeof selectedCurrency === "undefined") return

    await updateCurrencies(selectedCurrency!.id, data)

    if (router.canGoBack()) {
      router.goBack()
    } else {
      router.push("/currencies", "back", "replace")
    }
  }, [updateCurrencies, selectedCurrency])

  if (typeof selectedCurrency === "undefined") {
    router.push("/currencies", "back", "replace")
    return null
  }

  return (
    <IonPage>
      <ContentWithHeader title="Edit currency" button="return">
        <div style={{padding: "1rem"}}>
          <CurrencyForm
            onSubmit={onSubmit}
            submitText="Save changes"
            initialCurrency={selectedCurrency}
          />
        </div>
      </ContentWithHeader>
    </IonPage>

  )
}

export default EditCurrency
