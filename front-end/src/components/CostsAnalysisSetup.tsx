import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material'
import { FC } from 'react'

import CategoryPicker from './CategoryPicker'

interface Props {
  open: boolean
  grossIncome: number
  setGrossIncome: (value: number) => void
  incomeCategory: number
  setIncomeCategory: (value: number) => void
  onComplete: () => void
}

const CostsAnalysisSetup: FC<Props> = ({
  open,
  grossIncome,
  setGrossIncome,
  incomeCategory,
  setIncomeCategory,
  onComplete,
}) => {
  return (
    <Dialog open={open} fullWidth maxWidth="sm">
      <DialogTitle>Costs Analysis Setup</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <TextField
            type="text"
            value={grossIncome}
            fullWidth
            onChange={(ev) => {
              const parsed = parseInt(ev.target.value)
              setGrossIncome(isNaN(parsed) ? 0 : parsed)
            }}
            variant="outlined"
            label="Gross Income"
          />

          <CategoryPicker
            categoryId={incomeCategory}
            setCategoryId={setIncomeCategory}
            labelText="Select your net income category"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onComplete} variant="contained" disabled={grossIncome === 0}>
          Complete Setup
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CostsAnalysisSetup
