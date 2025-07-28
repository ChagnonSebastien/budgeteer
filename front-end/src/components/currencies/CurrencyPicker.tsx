import { FC } from 'react'

import CurrencyCard from './CurrencyCard'
import Currency, { CurrencyID } from '../../domain/model/currency'
import ItemPicker from '../inputs/ItemPicker'

interface Props {
  selectedCurrencyId: CurrencyID | null
  setSelectedCurrencyId: (id: CurrencyID) => void
  labelText: string
  style?: React.CSSProperties
  errorText?: string
  currencies: Currency[]
}

const CurrencyPicker: FC<Props> = (props) => {
  const { selectedCurrencyId, setSelectedCurrencyId, labelText, style, errorText, currencies } = props

  return (
    <ItemPicker<CurrencyID, Currency, unknown>
      items={currencies}
      selectedItemId={selectedCurrencyId}
      onSelectItem={setSelectedCurrencyId}
      labelText={labelText}
      style={style}
      errorText={errorText}
      searchPlaceholder="Search currency..."
      itemDisplayText={(currency) => currency?.symbol ?? ''}
      ItemComponent={CurrencyCard}
      additionalItemProps={{}}
    />
  )
}

export default CurrencyPicker
