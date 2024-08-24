import { IonInput, IonModal } from '@ionic/react'
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
        <IonInput
          type="text"
          label={labelText}
          labelPlacement="stacked"
          placeholder={typeof rootCategory === 'undefined' ? 'Loading...' : undefined}
          value={currentCategory.name}
          onFocus={() => setShowModal(true)}
          required
        />
      </div>
      <IonModal isOpen={showModal} onWillDismiss={() => setShowModal(false)}>
        <ContentWithHeader title="Select Icon" button="return" onCancel={() => setShowModal(false)}>
          <CategoryList
            categories={categories}
            onSelect={(newParent) => {
              setCategoryId(newParent)
              setShowModal(false)
            }}
          />
        </ContentWithHeader>
      </IonModal>
    </>
  )
}

export default CategoryPicker
