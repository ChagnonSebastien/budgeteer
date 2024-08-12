import {
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonInput,
  IonItem,
  IonList,
  IonSearchbar,
  IonToolbar,
} from "@ionic/react"
import { FC, useEffect, useMemo, useState } from "react"
import { iconComponentTypeFromName, iconList } from "./IconTools"

const perfectMultiplier = 4 * 3 * 5 * 7

interface Props {
  filter: string,
  onSelect: (selectedIcon: string) => void
}

const IconList: FC<Props> = ({filter, onSelect}) => {
  const [amountItems, setAmountItems] = useState<number>(perfectMultiplier)

  useEffect(() => setAmountItems(perfectMultiplier), [filter])

  const filteredIcons = useMemo(() => {
    return iconList.filter(value => value.toLowerCase().includes(filter.toLowerCase())).slice(0, amountItems)
  }, [filter, amountItems])

  return (
    <>
      <div style={{display: "flex", flexWrap: "wrap"}}>

        {filteredIcons.map(iconName => {
          const IconType = iconComponentTypeFromName(iconName)
          return <div key={`icon-list-element-${iconName}`} style={{margin: "0.5rem"}}><IconType
            onClick={() => onSelect(iconName)} size="2.5rem"/></div>
        })}
      </div>
      <IonInfiniteScroll
        onIonInfinite={(ev) => {
          setAmountItems(prevState => prevState + perfectMultiplier)
          setTimeout(() => ev.target.complete(), 500)
        }}
      >
        <IonInfiniteScrollContent></IonInfiniteScrollContent>
      </IonInfiniteScroll>
    </>
  )
}

export default IconList