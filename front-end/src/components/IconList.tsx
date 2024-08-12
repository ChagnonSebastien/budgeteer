import { IonInput, IonItem } from "@ionic/react"
import { FC, useMemo, useState } from "react"
import { iconComponentTypeFromName, iconTools } from "./IconTools"


const IconList: FC = () => {
  const [filter, setFilter] = useState<string>("")

  const onFilterChange = (event: Event) => {
    const value = (event.target as HTMLIonInputElement).value as string
    setFilter(value)
  }
  const filteredIcons = useMemo(() => {
    return iconTools.filter(value => value.toLowerCase().includes(filter.toLowerCase())).slice(0, 100)
  }, [filter])

  return (
    <>
      <IonItem>
        <IonInput label="Filter" value={filter} onIonInput={onFilterChange}></IonInput>
      </IonItem>
      <div style={{display: "flex", flexWrap: "wrap"}}>
        {filteredIcons.map(iconName => {
          const IconType = iconComponentTypeFromName(iconName)
          return <div key={`icon-list-element-${iconName}`} style={{margin: "0.3rem"}}><IconType size="2rem"/></div>
        })}
      </div>
    </>
  )
}

export default IconList