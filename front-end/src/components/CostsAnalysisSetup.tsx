import { Button, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material'
import { FC } from 'react'

import CategoryPicker from './categories/CategoryPicker'
import BasicModal from './shared/BasicModal'

interface Props {
  open: boolean
  grossIncome: number
  setGrossIncome: (value: number) => void
  incomeCategories: number[]
  setIncomeCategories: (value: number[]) => void
  onComplete: () => void
}

const CostsAnalysisSetup: FC<Props> = ({
  open,
  grossIncome,
  setGrossIncome,
  incomeCategories,
  setIncomeCategories,
  onComplete,
}) => {
  return (
    <BasicModal open={open} fullWidth maxWidth="sm">
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
            selectedConfig={{
              mode: 'multi',
              selectedItems: incomeCategories,
              onSelectItems: setIncomeCategories,
            }}
            labelText="Your net income categories"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onComplete} variant="contained" disabled={grossIncome === 0 || incomeCategories.length === 0}>
          Complete Setup
        </Button>
      </DialogActions>
    </BasicModal>
  )
}

export default CostsAnalysisSetup
