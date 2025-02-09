import { Box, Button, Tab, Tabs } from '@mui/material'
import { FC, useContext, useEffect, useState } from 'react'

import CategoryPicker from '../components/CategoryPicker'
import ContentWithHeader from '../components/ContentWithHeader'
import TrendsChart, { grouping } from '../components/TrendsChart'
import { CategoryServiceContext } from '../service/ServiceContext'

const TrendsPage: FC = () => {
  const [optionsHeight, setOptionsHeight] = useState(240)

  const { root } = useContext(CategoryServiceContext)

  const [grouping, setGrouping] = useState<grouping>('months')
  const [years, setYears] = useState(1)
  const [categoryId, setCategoryId] = useState(root.id)

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
          <TrendsChart categoryId={categoryId} grouping={grouping} years={years} />
        </div>

        <div
          ref={(ref) => {
            if (ref !== null) setOptionsHeight(ref.scrollHeight)
          }}
        >
          <Box sx={{ padding: '1rem 2rem' }}>
            <CategoryPicker categoryId={categoryId} setCategoryId={setCategoryId} labelText="Filter by category" />

            <div style={{ display: 'flex', padding: '.5rem', alignItems: 'center' }}>
              <Button variant="outlined" disabled={years === 1} onClick={() => setYears((y) => y - 1)}>
                -1
              </Button>
              <div style={{ flexGrow: 1, textAlign: 'center' }}>{years} years</div>
              <Button variant="outlined" onClick={() => setYears((y) => y + 1)}>
                +1
              </Button>
            </div>
          </Box>

          <Tabs centered value={grouping} onChange={(_event, value) => setGrouping(value as grouping)}>
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
