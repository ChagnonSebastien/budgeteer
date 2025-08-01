import {
  differenceInDays,
  differenceInMonths,
  differenceInWeeks,
  isBefore,
  isSameDay,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns'
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
    i = diffMonths + 1
  } else if (diffMonths > 4 * 12) {
    // between 4 year and 5 years
    subN = subWeeks
    showLabelEveryFactor = 16
    i = diffWeeks + 1
  } else if (diffMonths > 3 * 12) {
    // between 3 year and 4 years
    subN = (date, i) => subWeeks(date, i * 2)
    showLabelEveryFactor = 8
    i = Math.floor(diffWeeks / 2) + 1
  } else if (diffMonths > 2 * 12) {
    // between 2 year and 3 years
    subN = subWeeks
    showLabelEveryFactor = 8
    i = diffWeeks + 1
  } else if (diffMonths > 12) {
    // between 1 year and 2 years
    subN = subWeeks
    showLabelEveryFactor = 6
    i = diffWeeks + 1
  } else if (diffWeeks > 6 * 4) {
    // between 6 months and 1 year
    subN = subDays
    showLabelEveryFactor = 30
    i = diffDays + 1
  } else if (diffDays > 60) {
    // between 2 months and 6 months
    subN = subDays
    showLabelEveryFactor = 7
    i = diffDays + 1
  }

  return { hop: subN, showLabelEveryFactor, amountHop: i }
}

class SubTimeseriesIterator<Item> implements Iterable<Item> {
  constructor(
    private readonly start: number,
    private readonly end: number,
    private readonly items: Item[],
  ) {}

  [Symbol.iterator](): Iterator<Item> {
    const items = this.items
    const end = this.end
    let i = this.start

    return {
      next(): IteratorResult<Item> {
        if (end == i) {
          return { done: true, value: null }
        }

        const item = items[i]

        i -= 1

        return { done: false, value: item }
      },
    }
  }
}

export type Datable = { date: Date }

type HopFunction = (date: Date | number | string, amount: number) => Date

type TimeseriesIteratorData<Item> = { section: 'before' | 'into'; items: SubTimeseriesIterator<Item>; upTo: Date }

export class TimeseriesIterator<Item extends Datable> implements Iterable<TimeseriesIteratorData<Item>> {
  constructor(
    private readonly endDate: Date,
    private readonly hop: HopFunction,
    private readonly amountHop: number,
    private readonly items: Item[],
  ) {}

  [Symbol.iterator](): Iterator<TimeseriesIteratorData<Item>> {
    const items = this.items
    const endDate = this.endDate
    const hop = this.hop

    let i = items.length - 1
    let n = this.amountHop + 1
    let upTo = hop(endDate, n)
    let started = false
    let finished = false

    return {
      next(): IteratorResult<TimeseriesIteratorData<Item>> {
        if (finished) {
          return { done: true, value: null }
        }

        const starting = !started
        const startingIndex = i

        while (i >= 0 && (isBefore(items[i].date, upTo) || isSameDay(items[i].date, upTo))) {
          i -= 1
        }

        const data: TimeseriesIteratorData<Item> = {
          items: new SubTimeseriesIterator(startingIndex, i, items),
          section: starting ? 'before' : 'into',
          upTo,
        }

        n -= 1
        upTo = hop(endDate, n)
        started = true
        finished = isSameDay(data.upTo, endDate)

        return {
          value: data,
          done: false,
        }
      },
    }
  }
}

const useTimerangeSegmentation = (fromDate: Date, toDate: Date, density: 'light' | 'dense' = 'light') => {
  return useMemo(() => {
    const diffDays = differenceInDays(toDate, fromDate)
    const diffWeeks = differenceInWeeks(toDate, fromDate)
    const diffMonths = differenceInMonths(toDate, fromDate)

    const generator = density === 'light' ? lightGenerator : denseGenerator
    const { hop, amountHop, showLabelEveryFactor } = generator(diffDays, diffWeeks, diffMonths)

    return {
      hop,
      amountHop,
      showLabelEveryFactor,
      timeseriesIteratorGenerator: <Item extends Datable>(items: Item[]) => {
        return new TimeseriesIterator(toDate, hop, amountHop, items)
      },
    }
  }, [fromDate, toDate])
}

export default useTimerangeSegmentation
