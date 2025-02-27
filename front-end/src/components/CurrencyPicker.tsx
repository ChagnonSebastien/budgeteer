import { TextField } from '@mui/material'
import { CSSProperties, FC, useMemo, useState } from 'react'
import styled from 'styled-components'

import ContentDialog from './ContentDialog'
import ContentWithHeader from './ContentWithHeader'
import { CurrencyList } from './CurrencyList'
import Currency from '../domain/model/currency'

const StyledTextField = styled(TextField)<{ $customStyle?: CSSProperties }>`
  ${(props) => props.$customStyle && { ...props.$customStyle }}
`

interface Props {
  selectedCurrencyId: number | null
  setSelectedCurrencyId: (id: number) => void
  labelText: string
  style?: CSSProperties
  errorText?: string
  currencies: Currency[]
}

const CurrencyPicker: FC<Props> = (props) => {
  const { selectedCurrencyId, setSelectedCurrencyId, labelText, style, errorText, currencies } = props
  const selectedCurrency = useMemo(
    () => currencies.find((a) => a.id === selectedCurrencyId),
    [currencies, selectedCurrencyId],
  )

  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <StyledTextField
        $customStyle={style}
        error={!!errorText}
        variant="standard"
        label={labelText}
        placeholder={'None'}
        value={selectedCurrency?.symbol ?? ''}
        onFocus={(e) => {
          setShowModal(true)
          e.target.blur()
        }}
      />
      <ContentDialog open={showModal} onClose={() => setShowModal(false)}>
        <ContentWithHeader title={`Select ${labelText}`} button="return" onCancel={() => setShowModal(false)}>
          <CurrencyList
            currencies={currencies}
            onSelect={(newParent) => {
              setSelectedCurrencyId(newParent)
              setShowModal(false)
            }}
          />
        </ContentWithHeader>
      </ContentDialog>
    </>
  )
}

export default CurrencyPicker
