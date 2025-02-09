import { Button } from '@mui/material'
import { FC, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { CategoryList } from '../components/CategoryList'
import ContentWithHeader from '../components/ContentWithHeader'
import { CategoryServiceContext } from '../service/ServiceContext'

const CategoryPage: FC = () => {
  const navigate = useNavigate()
  const { state: categories } = useContext(CategoryServiceContext)

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

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget
    const progress = 1 - target.scrollTop / (target.scrollHeight - target.clientHeight)
    setScrollProgress(Math.max(0, Math.min(1, progress)))
  }

  return (
    <ContentWithHeader title="Categories" button="menu" contentMaxWidth="100%" contentOverflowY="hidden">
      <div style={{ height: '100%', maxWidth: '100%', display: 'flex', justifyContent: 'center' }} ref={setContentRef}>
        <div style={{ maxWidth: '50rem', flexGrow: 1 }}>
          <div
            style={{
              width: '100%',
              position: 'relative',
              height: `${contentHeight - optionsHeight}px`,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
            onScroll={handleScroll}
          >
            <CategoryList
              buttonText="Edit"
              categories={categories}
              onSelect={(categoryId) => navigate(`/categories/edit/${categoryId}`)}
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
                opacity: scrollProgress,
              }}
            />
            <Button fullWidth variant="contained" onClick={() => navigate('/categories/new')}>
              New
            </Button>
          </div>
        </div>
      </div>
    </ContentWithHeader>
  )
}

export default CategoryPage
