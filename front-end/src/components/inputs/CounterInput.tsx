import { Box, Button, Stack, SxProps, Theme, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'

const Input = styled('input')(({ theme }) => ({
  width: theme.spacing(4),
  background: 'transparent',
  border: 'none',
  color: theme.palette.text.primary,
  ...theme.typography.body1,
  textAlign: 'right',
  padding: theme.spacing(0.5, 0),
  appearance: 'none',
  MozAppearance: 'textfield',

  '&::-webkit-inner-spin-button, &::-webkit-outer-spin-button': {
    appearance: 'none',
    margin: 0,
  },

  '&:focus': {
    outline: 'none',
  },
}))

const stepButton: SxProps<Theme> = {
  minWidth: (t) => t.spacing(4),
  width: (t) => t.spacing(4),
  height: (t) => t.spacing(4),
  p: 0,
}

type Props = {
  label?: string
  value: number
  onChange(newValue: number): void
}

const CounterInput = (props: Props) => (
  <Stack spacing={1}>
    {props.label && (
      <Typography variant="caption" color="text.secondary">
        {props.label}
      </Typography>
    )}

    <Stack direction="row" alignItems="center" spacing={2}>
      <Button
        variant="outlined"
        size="small"
        onClick={() => props.value > 1 && props.onChange(props.value - 1)}
        disabled={props.value <= 1}
        sx={stepButton}
      >
        -
      </Button>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="center"
        sx={{ flex: 1, bgcolor: 'surface.muted', borderRadius: (t) => t.radius.sm, px: 1.5 }}
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
        <Box component="span" sx={{ ml: 1 }}>
          {props.value === 1 ? 'Year' : 'Years'}
        </Box>
      </Stack>
      <Button variant="outlined" size="small" onClick={() => props.onChange(props.value + 1)} sx={stepButton}>
        +
      </Button>
    </Stack>
  </Stack>
)

export default CounterInput
