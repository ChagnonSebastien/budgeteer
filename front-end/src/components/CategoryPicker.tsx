import { Dialog, TextField } from '@mui/material'
import { FC, useContext, useMemo, useState } from 'react'

import { CategoryList } from './CategoryList'
import ContentWithHeader from './ContentWithHeader'
import IconCapsule from './IconCapsule'
import { CategoryServiceContext } from '../service/ServiceContext'

interface Props {
  categoryId: number
  setCategoryId: (categoryId: number) => void
  labelText: string
}

const CategoryPicker: FC<Props> = (props) => {
  const { categoryId, setCategoryId, labelText } = props
  const { state: categories, root: rootCategory } = useContext(CategoryServiceContext)
  const currentCategory = useMemo(() => categories.find((c) => c.id === categoryId)!, [categories, categoryId])

  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowModal(true)}>
        <IconCapsule
          flexShrink={0}
          iconName={currentCategory.iconName}
          size="2rem"
          color={currentCategory.iconColor}
          backgroundColor={currentCategory.iconBackground}
        />
        <div style={{ width: '1rem', flexShrink: 0 }} />
        <TextField
          type="text"
          label={labelText}
          variant="standard"
          sx={{ width: '100%' }}
          placeholder={typeof rootCategory === 'undefined' ? 'Loading...' : undefined}
          value={currentCategory.name}
          onFocus={(ev) => {
            ev.preventDefault()
            setShowModal(true)
            ev.target.blur()
          }}
          required
        />
      </div>
      <Dialog open={showModal} onClose={() => setShowModal(false)}>
        <ContentWithHeader title="Select Icon" button="return" onCancel={() => setShowModal(false)}>
          <CategoryList
            categories={categories}
            onSelect={(newParent) => {
              setCategoryId(newParent)
              setShowModal(false)
            }}
          />
        </ContentWithHeader>
      </Dialog>
    </>
  )
}

export default CategoryPicker
