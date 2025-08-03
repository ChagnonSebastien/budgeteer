import { Box } from '@mui/material'
import { FC, useMemo } from 'react'

import CategoryPicker from '../components/categories/CategoryPicker'
import { GraphContainer, SecondDivision } from '../components/graphing/GraphStyledComponents'
import TrendsChart, { Grouping } from '../components/graphing/TrendsChart'
import CounterInput from '../components/inputs/CounterInput'
import SelectOne from '../components/inputs/SelectOne'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { useElementDimensions, useWindowDimensions } from '../components/shared/useDimensions'
import useQueryParams from '../components/shared/useQueryParams'
import { CategoryID } from '../domain/model/category'

type QueryParams = {
  grouping: string
  years: string
  categories: string
}

const TrendsPage: FC = () => {
  const { queryParams: qp, updateQueryParams } = useQueryParams<QueryParams>()
  const grouping = useMemo(() => (qp.grouping || 'months') as Grouping, [qp.grouping])
  const years = useMemo(() => parseInt(qp.years || '1'), [qp.years])
  const selectedCategories = useMemo<CategoryID[]>(() => JSON.parse(qp.categories || '[]'), [qp.categories])

  const { height: pageHeight } = useWindowDimensions()
  const { height: contentHeight, ref: setContentRef } = useElementDimensions(600, 600)
  const { height: optionsHeight, ref: setOptionsRef } = useElementDimensions(600, 600)

  const contentTooTall = useMemo(
    () => Math.max(pageHeight / 2, 300) + optionsHeight + 64 > pageHeight,
    [optionsHeight, pageHeight],
  )

  return (
    <ContentWithHeader title="Trends" action="menu" setContentRef={setContentRef} withScrolling={contentTooTall}>
      <GraphContainer style={{ height: contentHeight - optionsHeight, minHeight: 'max(50vh, 300px)' }}>
        <TrendsChart categories={selectedCategories} grouping={grouping} years={years} />
      </GraphContainer>

      <SecondDivision
        style={{ flexDirection: 'row', columnGap: '3rem', flexWrap: 'wrap', rowGap: '1rem' }}
        ref={setOptionsRef}
      >
        <Box style={{ flexGrow: 1, width: '100%' }}>
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
        </Box>

        <Box style={{ flexGrow: 1, minWidth: '15rem' }}>
          <CounterInput
            label="Time Range"
            value={years}
            onChange={(newValue) => updateQueryParams({ years: String(newValue) })}
          />
        </Box>

        <Box style={{ flexGrow: 3, minWidth: '25rem' }}>
          <SelectOne
            label="Grouping"
            value={grouping}
            onChange={(value) => updateQueryParams({ grouping: value })}
            options={[
              { value: 'months', label: 'Monthly' },
              { value: 'quarters', label: 'Quarterly' },
              { value: 'years', label: 'Yearly' },
            ]}
            type="toggle"
          />
        </Box>
      </SecondDivision>
    </ContentWithHeader>
  )
}

export default TrendsPage
