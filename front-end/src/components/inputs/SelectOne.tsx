import {
  alpha,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Radio,
  RadioGroup,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import { FC } from 'react'

import { Column, TinyHeader } from '../shared/Layout'

type Option = {
  value: string
  label: string
}

export type Props = {
  label: string
  value: string
  onChange(value: string): void
  options: Option[]
  type: 'radio' | 'dropdown' | 'toggle'
}

const SelectOne: FC<Props> = (props) => {
  if (props.type === 'radio')
    return (
      <FormControl>
        <FormLabel id={`${props.label}-label`} sx={{ color: 'text.secondary', mb: 1 }}>
          {props.label}
        </FormLabel>
        <RadioGroup
          aria-labelledby={`${props.label}-label`}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
        >
          {props.options.map((option) => (
            <FormControlLabel
              key={`${props.label}-label-${option.value}`}
              value={option.value}
              control={<Radio />}
              label={option.label}
            />
          ))}
        </RadioGroup>
      </FormControl>
    )
  if (props.type === 'dropdown')
    return (
      <TextField
        label={props.label}
        sx={{
          flexGrow: 1,
          minWidth: '12.5rem',
          '& .MuiInput-underline:before': {
            borderBottomColor: (theme) => alpha(theme.palette.primary.main, 0.1),
          },
        }}
        select
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        variant="standard"
      >
        {props.options.map((option) => (
          <MenuItem key={`${props.label}-label-${option.value}`} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
    )

  return (
    <Column style={{ gap: '0.5rem' }}>
      {props.label && <TinyHeader>{props.label}</TinyHeader>}

      <ToggleButtonGroup
        value={props.value}
        exclusive
        onChange={(_event, value) => props.onChange(value)}
        size="small"
        sx={{
          minHeight: '2rem',
          width: '100%',
          '& .MuiToggleButton-root': {
            flex: 1,
            textTransform: 'none',
            fontSize: '0.9rem',
          },
        }}
      >
        {props.options.map((option) => (
          <ToggleButton value={option.value}>{option.label}</ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Column>
  )
}

export default SelectOne
