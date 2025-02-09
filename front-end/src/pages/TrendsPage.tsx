import { Box, Button, Tab, Tabs } from '@mui/material'
import { FC, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import CategoryPicker from '../components/CategoryPicker'
import ContentWithHeader from '../components/ContentWithHeader'
import TrendsChart, { grouping } from '../components/TrendsChart'

const TrendsPage: FC = () => {
  const [optionsHeight, setOptionsHeight] = useState(240)

  const navigate = useNavigate()
  const location = useLocation()
  const query = new URLSearchParams(location.search)

  const grouping = (query.get('grouping') as grouping) || 'months'
  const years = parseInt(query.get('years') || '1')
  const selectedCategories: number[] = query.get('categories') ? JSON.parse(query.get('categories')!) : []

  const updateQuery = (updates: { grouping?: grouping; years?: number; categories?: number[] }) => {
    const newQuery = new URLSearchParams(query)

    if (updates.grouping) {
      newQuery.set('grouping', updates.grouping)
    }
    if (updates.years !== undefined) {
      newQuery.set('years', updates.years.toString())
    }
    if (updates.categories !== undefined) {
      if (updates.categories.length === 0) {
        newQuery.delete('categories')
      } else {
        newQuery.set('categories', JSON.stringify(updates.categories))
      }
    }

    navigate(`${location.pathname}?${newQuery.toString()}`)
  }

  const [contentRef, setContentRef] = useState<HTMLDivElement | null>(null)
  const [contentHeight, setContentHeight] = useState(600)
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
    <ContentWithHeader
      title="Trends"
      button="menu"
      contentMaxWidth="100%"
      contentOverflowY="hidden"
      contentPadding="1rem 0 0 0"
    >
      <div style={{ height: '100%', width: '100%' }} ref={setContentRef}>
        <div
          style={{
            height: `${contentHeight - optionsHeight}px`,
            width: '100%',
            position: 'relative',
            padding: '1rem 0',
          }}
        >
          <TrendsChart categories={selectedCategories} grouping={grouping} years={years} />
        </div>

        <div
          ref={(ref) => {
            if (ref !== null) setOptionsHeight(ref.scrollHeight)
          }}
        >
          <Box sx={{ padding: '1rem 2rem' }}>
            <CategoryPicker
              selected={selectedCategories}
              onMultiSelect={(categories) => updateQuery({ categories })}
              labelText="Filter by categories"
              valueText={selectedCategories.length === 0 ? 'All Categories' : undefined}
            />

            <div style={{ display: 'flex', padding: '.5rem', alignItems: 'center' }}>
              <Button variant="outlined" disabled={years === 1} onClick={() => updateQuery({ years: years - 1 })}>
                -1
              </Button>
              <div style={{ flexGrow: 1, textAlign: 'center' }}>{years} years</div>
              <Button variant="outlined" onClick={() => updateQuery({ years: years + 1 })}>
                +1
              </Button>
            </div>
          </Box>

          <Tabs centered value={grouping} onChange={(_event, value) => updateQuery({ grouping: value as grouping })}>
            <Tab label="Months" value="months" />
            <Tab label="Quarters" value="quarters" />
            <Tab label="Years" value="years" />
          </Tabs>
        </div>
      </div>
    </ContentWithHeader>
  )
}

export default TrendsPage
