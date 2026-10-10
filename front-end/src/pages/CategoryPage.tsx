import { FC, useContext, useState } from 'react'

import { CategoryCard } from '../components/categories/CategoryCard'
import { CategoryList } from '../components/categories/CategoryList'
import DeleteCategoryDialog from '../components/categories/DeleteCategoryDialog'
import { IconToolsContext } from '../components/icons/IconTools'
import ActionSpeedDial from '../components/shared/ActionSpeedDial'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { CustomScrolling } from '../components/shared/CustomScrolling'
import { DetailCard, DetailHeading, FancyDialog, FancyModal } from '../components/shared/FancyModal'
import { useNavigateFromDialog } from '../components/shared/useCloseOnBack'
import Category from '../domain/model/category'
import { CategoryServiceContext } from '../service/ServiceContext'

const CategoryPage: FC = () => {
  const navigate = useNavigateFromDialog()
  const { IconLib } = useContext(IconToolsContext)
  const { state: categories } = useContext(CategoryServiceContext)
  const [clickedCategory, setClickedCategory] = useState<Category | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)

  return (
    <ContentWithHeader title="Categories" action="menu" withPadding>
      <CustomScrolling sx={{ width: '100%', height: '100%', maxWidth: (t) => t.contentWidth.medium, pb: 11 }}>
        <CategoryList
          items={categories}
          selectConfiguration={{
            mode: 'click',
            onClick: setClickedCategory,
          }}
          ItemComponent={CategoryCard}
          additionalItemsProps={{}}
        />
      </CustomScrolling>

      <ActionSpeedDial
        ariaLabel="Create category"
        actions={[
          {
            label: 'New category',
            Icon: IconLib.FaPlus,
            color: 'primary.main',
            onClick: () => navigate('/categories/new'),
          },
        ]}
      />
      <FancyDialog open={clickedCategory !== null} onClose={() => setClickedCategory(null)}>
        {clickedCategory !== null && (
          <FancyModal
            title={{
              topCategory: 'Category',
              bigTitle: clickedCategory.name,
              bottomSpec: {
                IconComponent: IconLib.MdArrowForwardIos,
                text: categories.find((c) => c.id === clickedCategory.parentId)?.name ?? '',
              },
            }}
            bottomMenu={[
              {
                Icon: IconLib.MdEdit,
                label: 'Edit Category',
                intent: 'edit',
                description: 'Modify category details',
                action: () => navigate(`/categories/edit/${clickedCategory.id}`),
                disabled: false,
              },
              {
                Icon: IconLib.MdDelete,
                label: 'Delete Category',
                intent: 'destructive',
                description: 'Move or delete its transactions, then remove it',
                action: () => setCategoryToDelete(clickedCategory),
                disabled: clickedCategory.parentId === null,
              },
              {
                Icon: IconLib.MdList,
                label: 'View Transactions',
                intent: 'navigate',
                description: 'See all category transactions',
                action: () => navigate(`/transactions?categories=[${clickedCategory.id}]`),
                disabled: false,
              },
            ]}
          >
            <DetailHeading>DETAILS</DetailHeading>

            <DetailCard
              delay={0}
              title="Essential expense"
              subTitle="Needs like rent, groceries or transit"
              value={clickedCategory.fixedCosts ? 'Yes' : 'No'}
            />
          </FancyModal>
        )}
      </FancyDialog>
      {categoryToDelete && (
        <DeleteCategoryDialog
          category={categoryToDelete}
          onClose={() => setCategoryToDelete(null)}
          onDeleted={() => {
            setCategoryToDelete(null)
            setClickedCategory(null)
          }}
        />
      )}
    </ContentWithHeader>
  )
}

export default CategoryPage
