import { Button } from '@mui/material'
import { default as styled } from 'styled-components'

import { Column, Row, TinyHeader } from '../shared/Layout'

const Input = styled.input`
  width: 2rem;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.4375em;
  letter-spacing: 0.00938em;
  font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
  text-align: right;
  padding: 0.25rem 0;
  appearance: none;
  -moz-appearance: textfield;

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    appearance: none;
    margin: 0;
  }

  &:focus {
    outline: none;
  }
`

type Props = {
  label?: string
  value: number
  onChange(newValue: number): void
}

const CounterInput = (props: Props) => (
  <Column style={{ gap: '0.5rem' }}>
    {props.label && <TinyHeader>{props.label}</TinyHeader>}

    <Row style={{ alignItems: 'center', gap: '1rem' }}>
      <Button
        variant="outlined"
        size="small"
        onClick={() => props.value > 1 && props.onChange(props.value - 1)}
        disabled={props.value <= 1}
        style={{ minWidth: '2rem', width: '2rem', height: '2rem', padding: 0 }}
      >
        -
      </Button>
      <Row
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          backgroundColor: 'rgba(128,128,128,0.1)',
          borderRadius: '0.25rem',
          padding: '0 0.75rem',
        }}
      >
        <Input
          type="number"
          min="1"
          value={props.value}
          onChange={(e) => {
            const value = parseInt(e.target.value)
            if (value >= 1) props.onChange(value)
          }}
          onFocus={(e) => e.target.select()}
        />
        <span style={{ marginLeft: '0.5rem' }}>{props.value === 1 ? 'Year' : 'Years'}</span>
      </Row>
      <Button
        variant="outlined"
        size="small"
        onClick={() => props.onChange(props.value + 1)}
        style={{ minWidth: '2rem', width: '2rem', height: '2rem', padding: 0 }}
      >
        +
      </Button>
    </Row>
  </Column>
)

export default CounterInput
