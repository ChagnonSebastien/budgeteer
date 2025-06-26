import { FC } from 'react'

import { CurrencyList } from './CurrencyList'
import Currency from '../../domain/model/currency'
import ItemPicker, { ItemListProps } from '../inputs/ItemPicker'

interface Props {
  selectedCurrencyId: number | null
  setSelectedCurrencyId: (id: number) => void
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
      filterable={listProps.filterable}
      onFilteredCurrenciesChange={listProps.onFilteredItemsChange}
      focusedCurrency={listProps.focusedItemId}
      hideSearchOverlay={listProps.hideSearchOverlay}
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
