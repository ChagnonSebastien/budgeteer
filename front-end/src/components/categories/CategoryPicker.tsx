import { Button, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material'
import { FC, useContext, useMemo, useState } from 'react'

import { CategoryCard } from './CategoryCard'
import { CategoryList } from './CategoryList'
import Category, { CategoryID } from '../../domain/model/category'
import { CategoryServiceContext } from '../../service/ServiceContext'
import { MultiSelectConfiguration, SingleSelectConfiguration } from '../accounts/ItemList'
import IconCapsule from '../icons/IconCapsule'
import BasicModal from '../shared/BasicModal'
import { Row } from '../shared/Layout'

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
      <Row style={{ alignItems: 'center', gap: '1rem' }}>
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
      </Row>
      <BasicModal open={showModal} onClose={() => setShowModal(false)}>
        <DialogTitle>Select Category</DialogTitle>
        <DialogContent
          sx={{
            height: '70vh',
            overflowY: 'scroll',
            padding: '0 20px',
          }}
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowModal(false)}>Close</Button>
        </DialogActions>
      </BasicModal>
    </>
  )
}

export default CategoryPicker
