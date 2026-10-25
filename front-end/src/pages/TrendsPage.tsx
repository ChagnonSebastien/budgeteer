import { Box } from '@mui/material'
import { differenceInCalendarMonths } from 'date-fns'
import { FC, useContext, useMemo } from 'react'

import CategoryPicker from '../components/categories/CategoryPicker'
import { GraphContainer, SecondDivision } from '../components/graphing/GraphStyledComponents'
import TrendsChart, { Grouping } from '../components/graphing/TrendsChart'
import CounterInput from '../components/inputs/CounterInput'
import SelectOne from '../components/inputs/SelectOne'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { EmptyState } from '../components/shared/Layout'
import useQueryParams from '../components/shared/useQueryParams'
import { CategoryID } from '../domain/model/category'
import MixedAugmentation from '../service/MixedAugmentation'

type QueryParams = {
  grouping: string
  years: string
  categories: string
  projection: string
}

const TrendsPage: FC = () => {
  const { queryParams: qp, updateQueryParams } = useQueryParams<QueryParams>()
  const grouping = useMemo(() => (qp.grouping || 'months') as Grouping, [qp.grouping])
  const { augmentedTransactions } = useContext(MixedAugmentation)
  const oldestDate = augmentedTransactions[augmentedTransactions.length - 1]?.date
  const maxYears = useMemo(
    () => (oldestDate ? Math.max(1, Math.ceil((differenceInCalendarMonths(new Date(), oldestDate) + 1) / 12)) : 1),
    [oldestDate],
  )
  const years = Math.min(parseInt(qp.years || '1'), maxYears)
  const projection = qp.projection !== 'off'
  const selectedCategories = useMemo<CategoryID[]>(() => JSON.parse(qp.categories || '[]'), [qp.categories])

  return (
    <ContentWithHeader title="Trends" action="menu" withScrolling scrollEndSx={{ bgcolor: 'surface.subtle' }}>
      <GraphContainer
        sx={{
          flex: '1 0 max(50vh, 300px)',
          ...(augmentedTransactions.length === 0 && { display: 'flex', flexDirection: 'column' }),
        }}
      >
        {augmentedTransactions.length === 0 ? (
          <EmptyState
            compact
            title="See how your spending changes"
            description="Record your expenses to chart each category week by week or month by month, with a projection for the current period."
            action={{ label: 'Record a transaction', path: '/transactions/new' }}
          />
        ) : (
          <TrendsChart categories={selectedCategories} grouping={grouping} years={years} projection={projection} />
        )}
      </GraphContainer>

      <SecondDivision
        sx={{
          flexDirection: 'row',
          columnGap: { xs: 2, sm: 6 },
          flexWrap: 'wrap',
          rowGap: { xs: 1.5, sm: 2 },
          bgcolor: 'surface.subtle',
          flexShrink: 0,
        }}
      >
        <Box sx={{ flexGrow: 1, width: '100%' }}>
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

        <Box sx={{ flexGrow: 1, minWidth: (t) => `min(${t.fieldWidth.md}, 100%)` }}>
          <CounterInput
            label="Time Range"
            value={years}
            max={maxYears}
            onChange={(newValue) => updateQueryParams({ years: String(newValue) })}
          />
        </Box>

        <Box sx={{ flexGrow: 3, minWidth: (t) => `min(${t.fieldWidth.lg}, 100%)` }}>
          <SelectOne
            label="Grouping"
            value={grouping}
            onChange={(value) => updateQueryParams({ grouping: value })}
            options={[
              { value: 'weeks', label: 'Weekly' },
              { value: 'months', label: 'Monthly' },
              { value: 'quarters', label: 'Quarterly' },
              { value: 'years', label: 'Yearly' },
            ]}
            type="toggle"
          />
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: (t) => `min(${t.fieldWidth.md}, 100%)` }}>
          <SelectOne
            label="Projection"
            value={projection ? 'past' : 'off'}
            onChange={(value) => value && updateQueryParams({ projection: value === 'off' ? 'off' : null })}
            options={[
              { value: 'past', label: 'Past behavior' },
              { value: 'off', label: 'Off' },
            ]}
            type="toggle"
          />
        </Box>
      </SecondDivision>
    </ContentWithHeader>
  )
}

export default TrendsPage
