import { Button, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { FC, useMemo } from 'react'
import { default as styled } from 'styled-components'

import CategoryPicker from '../components/categories/CategoryPicker'
import { GraphContainer, GraphPageContainer, SecondDivision } from '../components/graphing/GraphStyledComponents'
import TrendsChart, { Grouping } from '../components/graphing/TrendsChart'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { Column, Row } from '../components/shared/Layout'
import { useElementDimensions } from '../components/shared/useDimensions'
import useQueryParams from '../components/shared/useQueryParams'
import { CategoryID } from '../domain/model/category'

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

type QueryParams = {
  grouping: string
  years: string
  categories: string
}

const TrendsPage: FC = () => {
  const { height: optionsHeight, ref: setOptionsRef } = useElementDimensions(600, 600)

  const { queryParams: qp, updateQueryParams } = useQueryParams<QueryParams>()
  const grouping = useMemo(() => (qp.grouping || 'months') as Grouping, [qp.grouping])
  const years = useMemo(() => parseInt(qp.years || '1'), [qp.years])
  const selectedCategories = useMemo<CategoryID[]>(() => JSON.parse(qp.categories || '[]'), [qp.categories])

  const { height: contentHeight, ref: setContentRef } = useElementDimensions(600, 600)

  return (
    <ContentWithHeader title="Trends" action="menu">
      <GraphPageContainer ref={setContentRef}>
        <GraphContainer style={{ height: contentHeight - optionsHeight }}>
          <TrendsChart categories={selectedCategories} grouping={grouping} years={years} />
        </GraphContainer>

        <SecondDivision style={{ gap: '1rem' }} ref={setOptionsRef}>
          <CategoryPicker
            selectedConfig={{
              mode: 'multi',
              selectedItems: selectedCategories,
              onSelectItems: (categories) =>
                updateQueryParams({ categories: categories.length === 0 ? null : JSON.stringify(categories) }),
            }}
            labelText="Filter by categories"
            valueText={selectedCategories.length === 0 ? 'All Categories' : undefined}
          />

          <Column style={{ gap: '0.5rem' }}>
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

            <Row style={{ alignItems: 'center', gap: '1rem' }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => years > 1 && updateQueryParams({ years: String(years - 1) })}
                disabled={years <= 1}
                style={{ minWidth: '2rem', width: '2rem', height: '2rem', padding: 0 }}
              >
                -
              </Button>
              <Row
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  backgroundColor: 'rgba(128,128,128,0.1)',
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
                      updateQueryParams({ years: String(value) })
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                />
                <span style={{ marginLeft: '0.5rem' }}>{years === 1 ? 'Year' : 'Years'}</span>
              </Row>
              <Button
                variant="outlined"
                size="small"
                onClick={() => updateQueryParams({ years: String(years + 1) })}
                style={{ minWidth: '2rem', width: '2rem', height: '2rem', padding: 0 }}
              >
                +
              </Button>
            </Row>
          </Column>

          <Row>
            <ToggleButtonGroup
              value={grouping}
              exclusive
              onChange={(_event, value) => value && updateQueryParams({ grouping: value })}
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
          </Row>
        </SecondDivision>
      </GraphPageContainer>
    </ContentWithHeader>
  )
}

export default TrendsPage
