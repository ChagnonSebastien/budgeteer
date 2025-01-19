import { Button } from '@mui/material'
import { FC, useContext } from 'react'
import { useNavigate } from 'react-router-dom'

import { CategoryList } from '../components/CategoryList'
import ContentWithHeader from '../components/ContentWithHeader'
import { CategoryServiceContext } from '../service/ServiceContext'

const CategoryPage: FC = () => {
  const navigate = useNavigate()

  const { state: categories } = useContext(CategoryServiceContext)

  return (
    <ContentWithHeader title="Categories" button="menu">
      <div style={{ margin: '1rem' }}>
        <Button fullWidth variant="contained" onClick={() => navigate('/categories/new')}>
          New
        </Button>
        <div style={{ height: '1rem' }} />
        <CategoryList
          buttonText="Edit"
          categories={categories}
          onSelect={(categoryId) => navigate(`/categories/edit/${categoryId}`)}
        />
      </div>
    </ContentWithHeader>
  )
}

export default CategoryPage
