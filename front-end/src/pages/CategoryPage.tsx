import { Button, DialogContent, Divider, List, ListItem, ListItemIcon, ListItemText, Typography } from '@mui/material'
import { FC, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { CategoryList } from '../components/categories/CategoryList'
import { IconToolsContext } from '../components/icons/IconTools'
import ContentDialog from '../components/shared/ContentDialog'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import {
  FadingDivider,
  ListContentContainer,
  PageContainer,
  ScrollAreaContainer,
} from '../components/shared/PageStyledComponents'
import Category from '../domain/model/category'
import { CategoryServiceContext } from '../service/ServiceContext'
import '../styles/overview-modal-tailwind.css'

const CategoryPage: FC = () => {
  const navigate = useNavigate()
  const { IconLib } = useContext(IconToolsContext)
  const { state: categories } = useContext(CategoryServiceContext)
  const [clickedCategory, setClickedCategory] = useState<Category | null>(null)

  const [optionsHeight, setOptionsHeight] = useState(240)
  const [contentRef, setContentRef] = useState<HTMLDivElement | null>(null)
  const [contentHeight, setContentHeight] = useState(600)
  const [scrollProgress, setScrollProgress] = useState(1)

  useEffect(() => {
    if (contentRef === null) return
    const ref = contentRef

    const callback = () => {
      setContentHeight(ref.clientHeight)
    }
    callback()

    window.addEventListener('resize', callback)
    return () => window.removeEventListener('resize', callback)
  }, [contentRef])

  return (
    <ContentWithHeader title="Categories" button="menu" contentMaxWidth="100%" contentOverflowY="hidden">
      <PageContainer ref={setContentRef}>
        <ListContentContainer>
          <ScrollAreaContainer style={{ height: `${contentHeight - optionsHeight}px` }}>
            <CategoryList
              categories={categories}
              onSelect={(categoryId) => {
                const category = categories.find((c) => c.id === categoryId)
                if (category) setClickedCategory(category)
              }}
              onScrollProgress={setScrollProgress}
            />
          </ScrollAreaContainer>
          <div
            ref={(ref) => {
              if (ref !== null) setOptionsHeight(ref.scrollHeight)
            }}
            className="overflow-hidden"
          >
            <FadingDivider opacity={scrollProgress ?? 1} />
            <Button fullWidth variant="contained" onClick={() => navigate('/categories/new')}>
              New
            </Button>
          </div>
        </ListContentContainer>
      </PageContainer>
      <ContentDialog
        open={clickedCategory !== null}
        onClose={() => setClickedCategory(null)}
        slotProps={{
          paper: {
            className: 'overview-modal',
          },
        }}
      >
        {clickedCategory !== null && (
          <DialogContent sx={{ padding: 0 }} className="overview-modal-content">
            <div className="overview-header">
              <div className="overview-header-glow-1" />
              <div className="overview-header-glow-2" />
              <Typography variant="overline" className="overview-header-label">
                Category
              </Typography>
              <Typography variant="h5" className="overview-header-title">
                {clickedCategory.name}
              </Typography>
              {clickedCategory.parentId && (
                <Typography variant="body2" className="overview-header-subtitle">
                  <IconLib.MdArrowForwardIos className="opacity-50" />
                  {categories.find((c) => c.id === clickedCategory.parentId)?.name}
                </Typography>
              )}
            </div>

            <div className="overview-content">
              <Typography variant="subtitle2" className="overview-content-label">
                DETAILS
              </Typography>
              <div className="overview-items-container">
                <div className="overview-item">
                  <div className="overview-item-info">
                    <div>
                      <Typography variant="body2" className="overview-item-title">
                        Fixed Costs
                      </Typography>
                      <Typography variant="caption" className="overview-item-subtitle">
                        Recurring expenses
                      </Typography>
                    </div>
                  </div>
                  <Typography variant="body1" className="overview-item-value">
                    {clickedCategory.fixedCosts ? 'Yes' : 'No'}
                  </Typography>
                </div>
              </div>
            </div>

            <Divider className="opacity-10 my-2" />

            <List className="overview-action-list">
              {[
                {
                  icon: <IconLib.MdEdit />,
                  label: 'Edit Category',
                  color: '#64B5F6',
                  description: 'Modify category details',
                  action: (category: Category) => navigate(`/categories/edit/${category.id}`),
                  disabled: false,
                },
                {
                  icon: <IconLib.MdDelete />,
                  label: 'Delete Category',
                  color: '#EF5350',
                  description: 'Remove this category',
                  action: (_category: Category) => {},
                  disabled: true,
                },
                {
                  icon: <IconLib.MdList />,
                  label: 'View Transactions',
                  color: '#81C784',
                  description: 'See all category transactions',
                  action: (category: Category) => navigate(`/transactions?categories=[${category.id}]`),
                  disabled: false,
                },
              ]
                .filter((item) => !item.disabled)
                .map((item) => (
                  <ListItem
                    key={item.label}
                    component="div"
                    onClick={() => item.action(clickedCategory)}
                    className="overview-action-item"
                  >
                    <ListItemIcon className="overview-action-icon" sx={{ color: item.color }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      secondary={item.description}
                      slotProps={{
                        primary: { className: 'overview-action-title' },
                        secondary: { className: 'overview-action-description' },
                      }}
                    />
                  </ListItem>
                ))}
            </List>
          </DialogContent>
        )}
      </ContentDialog>
    </ContentWithHeader>
  )
}

export default CategoryPage
