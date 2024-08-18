import { IonInput, IonModal } from "@ionic/react"
import { FC, useContext, useMemo, useState } from "react"
import Currency from "../domain/model/currency"
import { CurrencyServiceContext } from "../service/ServiceContext"
import ContentWithHeader from "./ContentWithHeader"
import { CurrencyList } from "./CurrencyList"

interface Props {
  selectedCurrencyId: number | null,
  setSelectedCurrencyId: (id: number) => void,
  labelText: string,
  style?: {[key: string]: any},
  errorText?: string,
  currencies: Currency[]
}

const CurrencyPicker: FC<Props> = (props) => {
  const {selectedCurrencyId, setSelectedCurrencyId, labelText, style, errorText, currencies} = props
  const selectedCurrency = useMemo(() => currencies.find(a => a.id === selectedCurrencyId), [currencies, selectedCurrencyId])

  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <IonInput style={style}
                errorText={errorText}
                type="text"
                label={labelText}
                labelPlacement="stacked"
                placeholder={"None"}
                value={selectedCurrency?.symbol}
                onFocus={e => {
                  e.target.blur()
                  setShowModal(true)
                }}

      />
      <IonModal isOpen={showModal}
                onWillDismiss={() => setShowModal(false)}>
        <ContentWithHeader title={`Select ${labelText}`} button="return"
                           onCancel={() => setShowModal(false)}>
          <CurrencyList
            currencies={currencies}
            onSelect={newParent => {
              setSelectedCurrencyId(newParent)
              setShowModal(false)
            }}
          />
        </ContentWithHeader>
      </IonModal>
    </>
  )
}

export default CurrencyPicker