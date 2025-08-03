import { Button, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material'
import { FC, useContext } from 'react'

import CategoryPicker from './categories/CategoryPicker'
import BasicModal from './shared/BasicModal'
import { CategoryServiceContext } from '../service/ServiceContext'

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
  const { augmentedCategories } = useContext(CategoryServiceContext)

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
              mode: 'single',
              selectedItem: incomeCategory,
              onSelectItem: setIncomeCategory,
            }}
            labelText="Select your net income category"
            icon={augmentedCategories.find((category) => category.id === incomeCategory)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onComplete} variant="contained" disabled={grossIncome === 0}>
          Complete Setup
        </Button>
      </DialogActions>
    </BasicModal>
  )
}

export default CostsAnalysisSetup
