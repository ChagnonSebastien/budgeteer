import { Dialog, TextField } from '@mui/material'
import { FC, useContext, useMemo, useState } from 'react'

import { CategoryList } from './CategoryList'
import ContentWithHeader from './ContentWithHeader'
import { CategoryServiceContext } from '../service/ServiceContext'

interface Props {
  categoryId?: number
  setCategoryId?: (categoryId: number) => void
  selected?: number[]
  onMultiSelect?: (selected: number[]) => void
  labelText: string
  valueText?: string
}

const CategoryPicker: FC<Props> = (props) => {
  const { categoryId, setCategoryId, selected = [], onMultiSelect, labelText, valueText } = props
  const { state: categories } = useContext(CategoryServiceContext)
  const currentCategory = useMemo(
    () => (categoryId ? categories.find((c) => c.id === categoryId)! : undefined),
    [categories, categoryId],
  )
  const selectedCategories = useMemo(
    () => selected.map((id) => categories.find((c) => c.id === id)!).filter((c) => c),
    [categories, selected],
  )

  const [showModal, setShowModal] = useState(false)

  const displayValue =
    valueText ??
    (onMultiSelect ? selectedCategories.map((c) => c.name).join(', ') || 'None' : (currentCategory?.name ?? 'None'))

  return (
    <>
      <TextField
        sx={{ width: '100%' }}
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
        required={!onMultiSelect}
      />
      <Dialog open={showModal} onClose={() => setShowModal(false)}>
        <ContentWithHeader title="Select Category" button="return" onCancel={() => setShowModal(false)}>
          <CategoryList
            categories={categories}
            onSelect={
              setCategoryId
                ? (newParent) => {
                    setCategoryId(newParent)
                    setShowModal(false)
                  }
                : undefined
            }
            onMultiSelect={onMultiSelect}
            selected={selected}
          />
        </ContentWithHeader>
      </Dialog>
    </>
  )
}

export default CategoryPicker
