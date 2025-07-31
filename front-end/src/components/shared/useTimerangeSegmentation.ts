import { differenceInDays, differenceInMonths, differenceInWeeks, subDays, subMonths, subWeeks } from 'date-fns'
import { useMemo } from 'react'

const lightGenerator = (diffDays: number, diffWeeks: number, diffMonths: number) => {
  let subN = subDays
  let showLabelEveryFactor = 2
  let i = diffDays + 1

  if (diffMonths > 72) {
    // Tick every 2 months, label every year
    subN = (date, i) => subMonths(date, i * 2)
    showLabelEveryFactor = 6
    i = Math.floor(diffMonths / 2) + 1
  } else if (diffMonths > 36) {
    // Tick every month, label every 6 months
    subN = subMonths
    showLabelEveryFactor = 6
    i = diffMonths + 1
  } else if (diffMonths > 24) {
    // Tick every month, label every 3 months
    subN = subMonths
    showLabelEveryFactor = 3
    i = diffMonths + 1
  } else if (diffWeeks > 20) {
    // Tick every week, label every 4 weeks
    subN = subWeeks
    showLabelEveryFactor = 4
    i = diffWeeks + 1
  } else if (diffDays > 50) {
    // Tick every day, label every week
    subN = subDays
    showLabelEveryFactor = 7
    i = diffDays + 1
  }

  return { hop: subN, showLabelEveryFactor, amountHop: i }
}

const denseGenerator = (diffDays: number, diffWeeks: number, diffMonths: number) => {
  let subN = subDays
  let showLabelEveryFactor = 1
  let i = diffDays + 1

  if (diffMonths > 5 * 12) {
    // above 5 years
    subN = subMonths
    showLabelEveryFactor = 6
    i = diffMonths
  } else if (diffMonths > 4 * 12) {
    // between 4 year and 5 years
    subN = subWeeks
    showLabelEveryFactor = 16
    i = diffWeeks
  } else if (diffMonths > 3 * 12) {
    // between 3 year and 4 years
    subN = (date, i) => subWeeks(date, i * 2)
    showLabelEveryFactor = 8
    i = Math.floor(diffWeeks / 2) + 1
  } else if (diffMonths > 2 * 12) {
    // between 2 year and 3 years
    subN = subWeeks
    showLabelEveryFactor = 8
    i = diffWeeks
  } else if (diffMonths > 12) {
    // between 1 year and 2 years
    subN = subWeeks
    showLabelEveryFactor = 6
    i = diffWeeks
  } else if (diffWeeks > 6 * 4) {
    // between 6 months and 1 year
    subN = subDays
    showLabelEveryFactor = 30
    i = diffDays
  } else if (diffDays > 60) {
    // between 2 months and 6 months
    subN = subDays
    showLabelEveryFactor = 7
    i = diffDays
  }

  return { hop: subN, showLabelEveryFactor, amountHop: i }
}

const useTimerangeSegmentation = (fromDate: Date, toDate: Date, density: 'light' | 'dense' = 'light') => {
  return useMemo(() => {
    const diffDays = differenceInDays(toDate, fromDate)
    const diffWeeks = differenceInWeeks(toDate, fromDate)
    const diffMonths = differenceInMonths(toDate, fromDate)

    const generator = density === 'light' ? lightGenerator : denseGenerator
    return generator(diffDays, diffWeeks, diffMonths)
  }, [fromDate, toDate])
}

export default useTimerangeSegmentation
