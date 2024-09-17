import { useIonRouter } from '@ionic/react'
import { Button } from '@mui/material'
import { FC, useContext } from 'react'

import { CategoryList } from '../components/CategoryList'
import ContentWithHeader from '../components/ContentWithHeader'
import { CategoryServiceContext } from '../service/ServiceContext'

const CategoryPage: FC = () => {
  const router = useIonRouter()

  const { state: categories } = useContext(CategoryServiceContext)

  return (
    <ContentWithHeader title="Categories" button="menu">
      <div style={{ margin: '1rem' }}>
        <Button onClick={() => router.push('/categories/new')}>New</Button>
        <div style={{ height: '1rem' }} />
        <CategoryList
          categories={categories}
          onSelect={(categoryId) => router.push(`/categories/edit/${categoryId}`)}
        />
      </div>
    </ContentWithHeader>
  )
}

export default CategoryPage
