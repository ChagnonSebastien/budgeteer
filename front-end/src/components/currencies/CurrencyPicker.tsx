import { FC } from 'react'

import { CurrencyList } from './CurrencyList'
import Currency, { CurrencyID } from '../../domain/model/currency'
import ItemPicker, { ItemListProps } from '../inputs/ItemPicker'

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

  // Render the currency list
  const renderCurrencyList = (listProps: ItemListProps<Currency>) => (
    <CurrencyList
      currencies={listProps.items}
      onSelect={listProps.onSelect}
      filter={listProps.filter}
      onFilteredCurrenciesChange={listProps.onFilteredItemsChange}
      focusedCurrency={listProps.focusedItemId}
    />
  )

  return (
    <ItemPicker<Currency>
      items={currencies}
      selectedItemId={selectedCurrencyId}
      onItemSelected={setSelectedCurrencyId}
      labelText={labelText}
      style={style}
      errorText={errorText}
      searchPlaceholder="Search currency..."
      renderItemValue={(currency) => currency?.symbol ?? ''}
      renderItemList={renderCurrencyList}
    />
  )
}

export default CurrencyPicker
