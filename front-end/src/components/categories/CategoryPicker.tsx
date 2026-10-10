import { Button, Stack, TextField } from '@mui/material'
import { FC, useContext, useMemo, useState } from 'react'

import { CategoryCard } from './CategoryCard'
import { CategoryList } from './CategoryList'
import Category, { CategoryID } from '../../domain/model/category'
import { CategoryServiceContext } from '../../service/ServiceContext'
import { MultiSelectConfiguration, SingleSelectConfiguration } from '../accounts/ItemList'
import IconCapsule from '../icons/IconCapsule'
import AppDialog from '../shared/AppDialog'

interface Props {
  selectedConfig: MultiSelectConfiguration<CategoryID, Category> | SingleSelectConfiguration<CategoryID, Category>
  labelText: string
  valueText?: string
  icon?: {
    iconName: string
    iconColor: string
    iconBackground: string
  }
}

const CategoryPicker: FC<Props> = (props) => {
  const { selectedConfig, labelText, valueText, icon } = props
  const { state: categories } = useContext(CategoryServiceContext)

  const selectedCategories = useMemo(() => {
    if (selectedConfig.mode === 'single') {
      const category = categories.find((c) => c.id === selectedConfig.selectedItem)
      if (typeof category === 'undefined') return undefined
      return [category]
    } else if (selectedConfig.mode === 'multi') {
      const selectedCategories = selectedConfig.selectedItems
        .map((categoryId) => categories.find((c) => c.id === categoryId))
        .filter((c) => typeof c !== 'undefined')
      if (selectedCategories.length === 0) return undefined
      return selectedCategories
    }
  }, [categories, selectedConfig])

  const [showModal, setShowModal] = useState(false)

  const displayValue = valueText ?? (selectedCategories?.map((c) => c.name).join(', ') || 'None')

  return (
    <>
      <Stack direction="row" alignItems="center" spacing={2}>
        {icon && (
          <IconCapsule
            iconName={icon.iconName}
            size="2rem"
            color={icon.iconColor}
            backgroundColor={icon.iconBackground}
          />
        )}
        <TextField
          sx={{ width: '100%', flexShrink: 1 }}
          variant="standard"
          type="text"
          label={labelText}
          placeholder={'None'}
          value={displayValue}
          onFocus={(ev) => {
            ev.preventDefault()
            setShowModal(true)
            ev.target.blur()
          }}
          required={selectedConfig.mode === 'single'}
        />
      </Stack>
      <AppDialog
        open={showModal}
        onClose={() => setShowModal(false)}
        disableRestoreFocus
        title="Select Category"
        actions={
          <>
            <Button color="inherit" onClick={() => setShowModal(false)}>
              Close
            </Button>
          </>
        }
        contentSx={{ maxHeight: '70vh' }}
      >
        <CategoryList
          items={categories}
          selectConfiguration={
            selectedConfig.mode === 'single'
              ? {
                  ...selectedConfig,
                  onSelectItem: (item) => {
                    setShowModal(false)
                    selectedConfig.onSelectItem(item)
                  },
                }
              : selectedConfig
          }
          ItemComponent={CategoryCard}
          additionalItemsProps={{}}
        />
      </AppDialog>
    </>
  )
}

export default CategoryPicker
