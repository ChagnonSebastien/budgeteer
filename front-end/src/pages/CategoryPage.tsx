import { Button, DialogContent, Divider, List, ListItem, ListItemIcon, ListItemText, Typography } from '@mui/material'
import { FC, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { CategoryList } from '../components/CategoryList'
import ContentDialog from '../components/ContentDialog'
import ContentWithHeader from '../components/ContentWithHeader'
import { IconToolsContext } from '../components/IconTools'
import Category from '../domain/model/category'
import { CategoryServiceContext } from '../service/ServiceContext'
import '../styles/list-pages.css'
import '../styles/overview-modal.css'

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
      <div style={{ height: '100%', maxWidth: '100%', display: 'flex', justifyContent: 'center' }} ref={setContentRef}>
        <div style={{ maxWidth: '50rem', flexGrow: 1 }}>
          <div
            style={{
              width: '100%',
              position: 'relative',
              height: `${contentHeight - optionsHeight}px`,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <CategoryList
              categories={categories}
              onSelect={(categoryId) => {
                const category = categories.find((c) => c.id === categoryId)
                if (category) setClickedCategory(category)
              }}
              onScrollProgress={setScrollProgress}
            />
          </div>
          <div
            ref={(ref) => {
              if (ref !== null) setOptionsHeight(ref.scrollHeight)
            }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                height: '1rem',
                borderTop: '1px solid transparent',
                borderImage: 'linear-gradient(to right, transparent, #fff4 20%, #fff4 80%, transparent) 1',
                background: 'radial-gradient(ellipse 100% 100% at 50% 0%, #fff2 0%, #fff0 50%, transparent 100%)',
                opacity: scrollProgress ?? 1,
              }}
            />
            <Button fullWidth variant="contained" onClick={() => navigate('/categories/new')}>
              New
            </Button>
          </div>
        </div>
      </div>
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
          <DialogContent sx={{ padding: 0 }} className="overview-modal">
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
                  <IconLib.MdArrowForwardIos style={{ opacity: 0.5 }} />
                  {categories.find((c) => c.id === clickedCategory.parentId)?.name}
                </Typography>
              )}
            </div>

            <div className="overview-content">
              <Typography variant="subtitle2" className="overview-content-label" sx={{ opacity: 0.6 }}>
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

            <Divider
              sx={{
                opacity: 0.1,
                margin: '8px 0',
              }}
            />

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
