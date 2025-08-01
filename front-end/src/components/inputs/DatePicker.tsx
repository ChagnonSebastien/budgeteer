import { DateCalendar, DateField, DateView, PickerValidDate } from '@mui/x-date-pickers'
import dayjs from 'dayjs'
import React, { useState } from 'react'

import ContentDialog from '../shared/ContentDialog'

interface Props {
  label: string
  date: Date
  onChange(newDate: Date): void
}

function DatePicker(props: Props) {
  const { label, date, onChange } = props

  const [showDateModal, setShowDateModal] = useState(false)
  const [dateView, setDateView] = useState<DateView>('day')

  return (
    <>
      <DateField
        label={label}
        value={dayjs(date)}
        onFocus={(ev) => {
          setShowDateModal(true)
          ev.preventDefault()
          ev.target.blur()
        }}
        variant="standard"
        sx={{ width: '100%' }}
      />

      <ContentDialog open={showDateModal} onClose={() => setShowDateModal(false)}>
        <DateCalendar
          views={['year', 'month', 'day']}
          value={dayjs(date)}
          onChange={(newDate: PickerValidDate | null) => {
            if (newDate === null) return
            onChange(newDate.toDate())
            if (dateView === 'day') setShowDateModal(false)
          }}
          onViewChange={(view) => {
            setDateView(view)
          }}
        />
      </ContentDialog>
    </>
  )
}

export default DatePicker
