import { FC, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { IconToolsContext } from './IconTools'

const perfectMultiplier = 4 * 3 * 5 * 7

interface Props {
  filter: string
  onSelect: (selectedIcon: string) => void
}

const IconList: FC<Props> = ({ filter, onSelect }) => {
  const [amountItems, setAmountItems] = useState<number>(perfectMultiplier)
  const { iconNameList, iconTypeFromName } = useContext(IconToolsContext)

  useEffect(() => setAmountItems(perfectMultiplier), [filter])

  const filteredIcons = useMemo(() => {
    return iconNameList.filter((value) => value.toLowerCase().includes(filter.toLowerCase())).slice(0, amountItems)
  }, [filter, amountItems])

  const loadMoreRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setAmountItems((prevState) => prevState + perfectMultiplier)
      }
    })

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current)
      }
    }
  }, [])

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-evenly',
          paddingTop: '.5rem',
        }}
      >
        {filteredIcons.map((iconName) => {
          const IconType = iconTypeFromName(iconName)
          return (
            <div
              onClick={() => onSelect(iconName)}
              key={`icon-list-element-${iconName}`}
              style={{ margin: '0.2rem', padding: '0.5rem', borderRadius: '0.5rem' }}
            >
              <IconType size="2.5rem" />
            </div>
          )
        })}
      </div>
      <div
        style={{
          height: '100vh',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        }}
        ref={loadMoreRef}
      />
    </div>
  )
}

export default IconList
