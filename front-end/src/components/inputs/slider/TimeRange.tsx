import { scaleTime } from 'd3-scale'
import { format, differenceInMilliseconds, isBefore, isAfter, addMinutes } from 'date-fns'
import React from 'react'
import { Slider, Rail, Handles, Tracks, Ticks } from 'react-compound-slider'

import Handle from './Handle'
import SliderRail from './SliderRail'
import Tick from './Tick'
import Track from './Track'

import './TimeRange.scss'

const getTimelineConfig = (timelineStart: Date, timelineLength: number) => (date: Date) => {
  const percent = (differenceInMilliseconds(date, timelineStart) / timelineLength) * 100
  const value = Number(format(date, 'T'))
  return { percent, value }
}

const getFormattedBlockedIntervals = (
  blockedDates: { start: Date; end: Date }[] = [],
  [startTime, endTime]: Date[],
) => {
  if (!blockedDates.length) return null

  const timelineLength = differenceInMilliseconds(endTime, startTime)
  const getConfig = getTimelineConfig(startTime, timelineLength)

  const formattedBlockedDates = blockedDates.map((interval, index) => {
    let { start, end } = interval

    if (isBefore(start, startTime)) start = startTime
    if (isAfter(end, endTime)) end = endTime

    const source = getConfig(start)
    const target = getConfig(end)

    return { id: `blocked-track-${index}`, source, target }
  })

  return formattedBlockedDates
}

const getNowConfig = ([startTime, endTime]: Date[]) => {
  const timelineLength = differenceInMilliseconds(endTime, startTime)
  const getConfig = getTimelineConfig(startTime, timelineLength)

  const source = getConfig(new Date())
  const target = getConfig(addMinutes(new Date(), 1))

  return { id: 'now-track', source, target }
}

interface TimeRangeProps {
  ticksNumber: number
  selectedInterval: Date[]
  timelineInterval: Date[]
  disabledIntervals: { start: Date; end: Date }[]
  containerClassName?: string
  sliderRailClassName?: string
  step: number
  formatTick: (ms: number) => string
  trackStyles?: { error: object; valid: object }
  handleColors?: { error: string; valid: string }
  error?: boolean
  showNow?: boolean
  mode?: 1 | 2 | 3
  onUpdateCallback: (data: { error: boolean; time: Date[] }) => void
  onChangeCallback: (data: Date[]) => void
}

class TimeRange extends React.Component<TimeRangeProps> {
  get disabledIntervals() {
    return getFormattedBlockedIntervals(this.props.disabledIntervals, this.props.timelineInterval)
  }

  get now() {
    return getNowConfig(this.props.timelineInterval)
  }

  onChange = (newTime: readonly number[]) => {
    const formattedNewTime = newTime.map((t) => new Date(t))
    if (isNaN(newTime[0])) return
    if (isNaN(newTime[1])) return
    this.props.onChangeCallback(formattedNewTime)
  }

  checkIsSelectedIntervalNotValid = (
    [start, end]: readonly number[],
    source: { value: number },
    target: { value: number },
  ) => {
    const { value: startInterval } = source
    const { value: endInterval } = target

    if ((startInterval > start && endInterval <= end) || (startInterval >= start && endInterval < end)) return true
    if (start >= startInterval && end <= endInterval) return true

    const isStartInBlockedInterval = start > startInterval && start < endInterval && end >= endInterval
    const isEndInBlockedInterval = end < endInterval && end > startInterval && start <= startInterval

    return isStartInBlockedInterval || isEndInBlockedInterval
  }

  onUpdate = (newTime: readonly number[]) => {
    const { onUpdateCallback } = this.props
    const disabledIntervals = this.disabledIntervals

    if (disabledIntervals?.length) {
      const isValuesNotValid = disabledIntervals.some(({ source, target }) =>
        this.checkIsSelectedIntervalNotValid(newTime, source, target),
      )
      const formattedNewTime = newTime.map((t) => new Date(t))
      onUpdateCallback({ error: isValuesNotValid, time: formattedNewTime })
      return
    }

    const formattedNewTime = newTime.map((t) => new Date(t))
    onUpdateCallback({ error: false, time: formattedNewTime })
  }

  getDateTicks = () => {
    const { timelineInterval, ticksNumber } = this.props
    return scaleTime()
      .domain(timelineInterval)
      .ticks(ticksNumber)
      .map((t) => +t)
  }

  render() {
    const {
      sliderRailClassName,
      timelineInterval,
      selectedInterval,
      containerClassName,
      error,
      step,
      showNow,
      formatTick,
      mode,
      trackStyles,
      handleColors,
    } = this.props

    const domain = timelineInterval.map((t) => Number(t))

    const disabledIntervals = this.disabledIntervals

    return (
      <div className={containerClassName || 'react_time_range__time_range_container'}>
        <Slider
          mode={mode}
          step={step}
          domain={domain}
          onUpdate={this.onUpdate}
          onChange={this.onChange}
          values={selectedInterval.map((t) => +t)}
          rootStyle={{ position: 'relative', width: '100%' }}
        >
          <Rail>
            {({ getRailProps }) => <SliderRail className={sliderRailClassName} getRailProps={getRailProps} />}
          </Rail>

          <Handles>
            {({ handles, getHandleProps }) => (
              <>
                {handles.map((handle) => (
                  <Handle
                    error={error}
                    key={handle.id}
                    handle={handle}
                    domain={domain}
                    getHandleProps={getHandleProps}
                    errorColor={handleColors?.error}
                    validColor={handleColors?.valid}
                  />
                ))}
              </>
            )}
          </Handles>

          <Tracks left={false} right={false}>
            {({ tracks, getTrackProps }) => (
              <>
                {tracks?.map(({ id, source, target }) => (
                  <Track
                    error={error}
                    key={id}
                    source={source}
                    target={target}
                    getTrackProps={getTrackProps}
                    styles={trackStyles}
                  />
                ))}
              </>
            )}
          </Tracks>

          {disabledIntervals?.length && (
            <Tracks left={false} right={false}>
              {({ getTrackProps }) => (
                <>
                  {disabledIntervals.map(({ id, source, target }) => (
                    <Track
                      key={id}
                      source={source}
                      target={target}
                      getTrackProps={getTrackProps}
                      disabled
                      styles={trackStyles}
                    />
                  ))}
                </>
              )}
            </Tracks>
          )}

          {showNow && (
            <Tracks left={false} right={false}>
              {({ getTrackProps }) => (
                <Track
                  key={this.now?.id}
                  source={this.now?.source}
                  target={this.now?.target}
                  getTrackProps={getTrackProps}
                  styles={trackStyles}
                />
              )}
            </Tracks>
          )}

          <Ticks values={this.getDateTicks()}>
            {({ ticks }) => (
              <>
                {ticks.map((tick) => (
                  <Tick key={tick.id} tick={tick} count={ticks.length} format={formatTick} />
                ))}
              </>
            )}
          </Ticks>
        </Slider>
      </div>
    )
  }
}

export default TimeRange
