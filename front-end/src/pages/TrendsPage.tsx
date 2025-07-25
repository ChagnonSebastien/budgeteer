import { Button, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { FC, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { default as styled } from 'styled-components'

import CategoryPicker from '../components/categories/CategoryPicker'
import { ControlsContainer, GraphContainer, GraphPageContainer } from '../components/graphing/GraphStyledComponents'
import TrendsChart, { grouping } from '../components/graphing/TrendsChart'
import ContentWithHeader from '../components/shared/ContentWithHeader'

const YearInput = styled.input`
  width: 2rem;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.4375em;
  letter-spacing: 0.00938em;
  font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
  text-align: right;
  padding: 0.25rem 0;
  appearance: none;
  -moz-appearance: textfield;

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    appearance: none;
    margin: 0;
  }

  &:focus {
    outline: none;
  }
`

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
      <GraphPageContainer ref={setContentRef}>
        <GraphContainer height={contentHeight - optionsHeight}>
          <TrendsChart categories={selectedCategories} grouping={grouping} years={years} />
        </GraphContainer>

        <ControlsContainer
          ref={(element: HTMLDivElement | null) => {
            if (element) setOptionsHeight(element.scrollHeight)
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <CategoryPicker
              selected={selectedCategories}
              onMultiSelect={(categories) => updateQuery({ categories })}
              labelText="Filter by categories"
              valueText={selectedCategories.length === 0 ? 'All Categories' : undefined}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Typography
                style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.75rem',
                  fontWeight: 400,
                  lineHeight: '1.4375em',
                  letterSpacing: '0.00938em',
                  fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
                }}
              >
                Time Range
              </Typography>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => years > 1 && updateQuery({ years: years - 1 })}
                  disabled={years <= 1}
                  style={{ minWidth: '2rem', width: '2rem', height: '2rem', padding: 0 }}
                >
                  -
                </Button>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '0.25rem',
                    padding: '0 0.75rem',
                  }}
                >
                  <YearInput
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
                  />
                  <span style={{ marginLeft: '0.5rem' }}>{years === 1 ? 'Year' : 'Years'}</span>
                </div>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => updateQuery({ years: years + 1 })}
                  style={{ minWidth: '2rem', width: '2rem', height: '2rem', padding: 0 }}
                >
                  +
                </Button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: 0 }}>
                <ToggleButtonGroup
                  value={grouping}
                  exclusive
                  onChange={(_event, value) => value && updateQuery({ grouping: value as grouping })}
                  size="small"
                  sx={{
                    minHeight: '2rem',
                    width: '100%',
                    '& .MuiToggleButton-root': {
                      flex: 1,
                      textTransform: 'none',
                      fontSize: '0.9rem',
                    },
                  }}
                >
                  <ToggleButton value="months">Monthly</ToggleButton>
                  <ToggleButton value="quarters">Quarterly</ToggleButton>
                  <ToggleButton value="years">Yearly</ToggleButton>
                </ToggleButtonGroup>
              </div>
            </div>
          </div>
        </ControlsContainer>
      </GraphPageContainer>
    </ContentWithHeader>
  )
}

export default TrendsPage
