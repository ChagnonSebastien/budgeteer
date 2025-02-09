import { Button, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { FC, useEffect, useState } from 'react'
import '../styles/graphs.css'
import { useLocation, useNavigate } from 'react-router-dom'

import CategoryPicker from '../components/CategoryPicker'
import ContentWithHeader from '../components/ContentWithHeader'
import TrendsChart, { grouping } from '../components/TrendsChart'
import './TrendsPage.css'

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
      <div className="graph-page" ref={setContentRef}>
        <div
          className="graph-container"
          style={{
            height: `${contentHeight - optionsHeight}px`,
          }}
        >
          <TrendsChart categories={selectedCategories} grouping={grouping} years={years} />
        </div>

        <div
          className="graph-controls"
          ref={(element: HTMLDivElement | null) => {
            if (element) setOptionsHeight(element.scrollHeight)
          }}
        >
          <div className="graph-controls-group">
            <CategoryPicker
              selected={selectedCategories}
              onMultiSelect={(categories) => updateQuery({ categories })}
              labelText="Filter by categories"
              valueText={selectedCategories.length === 0 ? 'All Categories' : undefined}
            />

            <div className="graph-time-controls">
              <Typography className="graph-time-controls-label">Time Range</Typography>

              <div className="graph-time-range graph-year-input">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => years > 1 && updateQuery({ years: years - 1 })}
                  disabled={years <= 1}
                >
                  -
                </Button>
                <div className="year-input-container">
                  <span className="year-display">
                    <input
                      type="number"
                      min="1"
                      value={years}
                      onChange={(e) => {
                        const value = parseInt(e.target.value)
                        if (value >= 1) {
                          updateQuery({ years: value })
                        }
                      }}
                      onFocus={(e) => e.target.select()}
                      className="year-input"
                    />
                    <span className="year-text">{years === 1 ? 'Year' : 'Years'}</span>
                  </span>
                </div>
                <Button variant="outlined" size="small" onClick={() => updateQuery({ years: years + 1 })}>
                  +
                </Button>
              </div>

              <div className="graph-time-range">
                <ToggleButtonGroup
                  value={grouping}
                  exclusive
                  onChange={(_event, value) => value && updateQuery({ grouping: value as grouping })}
                  size="small"
                >
                  <ToggleButton value="months">Monthly</ToggleButton>
                  <ToggleButton value="quarters">Quarterly</ToggleButton>
                  <ToggleButton value="years">Yearly</ToggleButton>
                </ToggleButtonGroup>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ContentWithHeader>
  )
}

export default TrendsPage
