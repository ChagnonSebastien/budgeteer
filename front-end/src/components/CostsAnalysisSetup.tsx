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
  onDismiss: () => void
  onCreateCategory: () => void
}

const CostsAnalysisSetup: FC<Props> = ({
  open,
  grossIncome,
  setGrossIncome,
  incomeCategories,
  setIncomeCategories,
  onComplete,
  onDismiss,
  onCreateCategory,
}) => (
  <AppDialog
    open={open}
    onClose={onDismiss}
    title="Costs Analysis Setup"
    fullWidth
    actions={
      <>
        <Button color="inherit" onClick={onDismiss}>
          Cancel
        </Button>
        <Button onClick={onComplete} variant="contained" disabled={grossIncome === 0 || incomeCategories.length === 0}>
          Complete Setup
        </Button>
      </>
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
        onCreateCategory={onCreateCategory}
      />
    </Stack>
  </AppDialog>
)

export default CostsAnalysisSetup
