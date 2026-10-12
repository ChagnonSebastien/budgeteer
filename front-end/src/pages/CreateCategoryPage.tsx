import { FC, useCallback, useContext } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import CategoryForm from '../components/categories/CategoryForm'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { useToast } from '../components/shared/ToastProvider'
import Category, { CategoryUpdatableFields } from '../domain/model/category'
import { CategoryServiceContext } from '../service/ServiceContext'

export interface CreateCategoryNavigationState {
  from: string
  prefill: CategoryUpdatableFields
  returnState?: object
}

const CreateCategoryPage: FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const navigationState = location.state as CreateCategoryNavigationState | null
  const prefill = navigationState?.prefill

  const { create: createCategory } = useContext(CategoryServiceContext)
  const { showToast } = useToast()

  const onSubmit = useCallback(
    async (data: Partial<Omit<Category, 'id' | 'hasName'>>) => {
      if (typeof data.name === 'undefined') throw new Error('Name cannot be undefined')
      if (typeof data.iconName === 'undefined') throw new Error('iconName cannot be undefined')
      if (typeof data.iconColor === 'undefined') throw new Error('iconColor cannot be undefined')
      if (typeof data.iconBackground === 'undefined') throw new Error('iconBackground cannot be undefined')
      if (typeof data.parentId === 'undefined') throw new Error('parentId cannot be undefined')
      if (typeof data.fixedCosts === 'undefined') throw new Error('fixedCosts cannot be undefined')
      if (typeof data.ordering === 'undefined') throw new Error('ordering cannot be undefined')

      const created = await createCategory({
        name: data.name,
        iconName: data.iconName,
        iconColor: data.iconColor,
        iconBackground: data.iconBackground,
        parentId: data.parentId,
        fixedCosts: data.fixedCosts,
        ordering: data.ordering,
      })
      showToast('Category created')
      if (navigationState?.from) {
        navigate(navigationState.from, {
          replace: true,
          state: { ...navigationState.returnState, createdCategoryId: created.id },
        })
      } else {
        navigate('/categories', { replace: true })
      }
    },
    [createCategory, navigate, showToast, navigationState],
  )

  return (
    <ContentWithHeader title="Create new category" action="return" withPadding withScrolling>
      <CategoryForm
        onSubmit={onSubmit}
        submitText="Create"
        initialCategory={
          prefill &&
          new Category(
            -1,
            prefill.name,
            prefill.iconName,
            prefill.iconColor,
            prefill.iconBackground,
            prefill.parentId,
            prefill.fixedCosts,
            prefill.ordering,
          )
        }
      />
    </ContentWithHeader>
  )
}

export default CreateCategoryPage
