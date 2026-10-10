import { Button, Stack, TextField } from '@mui/material'
import { FC } from 'react'

import CategoryPicker from './categories/CategoryPicker'
import AppDialog from './shared/AppDialog'

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
}) => (
  <AppDialog
    open={open}
    onClose={() => {}}
    title="Costs Analysis Setup"
    fullWidth
    actions={
      <Button onClick={onComplete} variant="contained" disabled={grossIncome === 0 || incomeCategories.length === 0}>
        Complete Setup
      </Button>
    }
  >
    <Stack spacing={3} sx={{ pt: 1 }}>
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
  </AppDialog>
)

export default CostsAnalysisSetup
