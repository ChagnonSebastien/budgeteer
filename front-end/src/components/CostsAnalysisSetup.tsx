import { Button, Stack, TextField } from '@mui/material'
import { FC } from 'react'

import CategoryPicker from './categories/CategoryPicker'
import AppDialog from './shared/AppDialog'
import { CategoryID } from '../domain/model/category'

export interface CostsSetup {
  grossIncome: number
  employmentCategories: CategoryID[]
  otherIncomeCategories: CategoryID[]
  taxesCategories: CategoryID[]
}

export type CostsSetupCategoryList = Exclude<keyof CostsSetup, 'grossIncome'>

interface Props {
  open: boolean
  setup: CostsSetup
  setSetup: (value: CostsSetup) => void
  onComplete: () => void
  onDismiss: () => void
  onCreateCategory: (list: CostsSetupCategoryList) => void
}

const pickers: { list: CostsSetupCategoryList; label: string; canCreate: boolean }[] = [
  { list: 'employmentCategories', label: 'Your employment income categories (optional)', canCreate: true },
  { list: 'otherIncomeCategories', label: 'Your other income categories, e.g. rent (optional)', canCreate: false },
  { list: 'taxesCategories', label: 'Your tax payments and refunds categories (optional)', canCreate: true },
]

const CostsAnalysisSetup: FC<Props> = ({ open, setup, setSetup, onComplete, onDismiss, onCreateCategory }) => {
  return (
    <AppDialog
      open={open}
      onClose={onComplete}
      title="Costs Analysis Setup"
      fullWidth
      actions={
        <>
          <Button color="inherit" onClick={onDismiss}>
            Cancel
          </Button>
          <Button onClick={onComplete} variant="contained">
            Complete Setup
          </Button>
        </>
      }
    >
      <Stack spacing={3} sx={{ pt: 1 }}>
        <TextField
          type="text"
          value={setup.grossIncome || ''}
          fullWidth
          onChange={(ev) => {
            const parsed = parseInt(ev.target.value)
            setSetup({ ...setup, grossIncome: isNaN(parsed) ? 0 : parsed })
          }}
          variant="outlined"
          label="Yearly Gross Employment Income (optional)"
          helperText="Before taxes. Leave empty if no taxes are withheld from your income, e.g. when retired."
        />

        {pickers.map(({ list, label, canCreate }) => (
          <CategoryPicker
            key={list}
            selectedConfig={{
              mode: 'multi',
              selectedItems: setup[list],
              onSelectItems: (items) => setSetup({ ...setup, [list]: items }),
            }}
            labelText={label}
            onCreateCategory={canCreate ? () => onCreateCategory(list) : undefined}
          />
        ))}
      </Stack>
    </AppDialog>
  )
}

export default CostsAnalysisSetup
