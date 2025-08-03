import { alpha, FormControl, FormControlLabel, FormLabel, MenuItem, Radio, RadioGroup, TextField } from '@mui/material'
import { FC } from 'react'

type Option = {
  value: string
  label: string
}

export type Props = {
  label: string
  value: string
  onChange(value: string): void
  options: Option[]
  type: 'radio' | 'dropdown'
}

const SelectOne: FC<Props> = (props) =>
  props.type === 'radio' ? (
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
  ) : (
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
          {props.label}
        </MenuItem>
      ))}
    </TextField>
  )

export default SelectOne
