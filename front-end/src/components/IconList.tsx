import { IonInfiniteScroll, IonInfiniteScrollContent } from '@ionic/react'
import { FC, useContext, useEffect, useMemo, useState } from 'react'

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

  return (
    <>
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
      <IonInfiniteScroll
        onIonInfinite={(ev) => {
          setAmountItems((prevState) => prevState + perfectMultiplier)
          setTimeout(() => ev.target.complete(), 500)
        }}
      >
        <IonInfiniteScrollContent></IonInfiniteScrollContent>
      </IonInfiniteScroll>
    </>
  )
}

export default IconList
