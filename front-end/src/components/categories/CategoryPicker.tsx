import { Button, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material'
import { FC, useContext, useMemo, useState } from 'react'
import styled from 'styled-components'

import { CategoryList } from './CategoryList'
import { CategoryServiceContext } from '../../service/ServiceContext'
import ContentDialog from '../shared/ContentDialog'

const FullWidthTextField = styled(TextField)`
  width: 100%;
`

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
      <FullWidthTextField
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
        className="w-full"
      />
      <ContentDialog open={showModal} onClose={() => setShowModal(false)}>
        <DialogTitle>Select Category</DialogTitle>
        <DialogContent
          sx={{
            height: '70vh',
            overflowY: 'scroll',
            padding: '0 20px',
          }}
        >
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowModal(false)}>Close</Button>
        </DialogActions>
      </ContentDialog>
    </>
  )
}

export default CategoryPicker
