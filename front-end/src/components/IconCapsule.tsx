import { DataType } from "csstype"
import { useMemo } from "react"
import { iconComponentTypeFromName } from "./IconTools"

interface Props {
  iconName: string
  size: string | number
  backgroundColor: DataType.Color
  color: DataType.Color
}

const IconCapsule = (props: Props) => {
  const {iconName, size, color, backgroundColor} = props

  const IconType = useMemo(() => iconComponentTypeFromName(iconName), [iconName])

  return (
    <div style={{
      backgroundColor: backgroundColor,
      borderRadius: `calc(${size} / 2)`,
      height: size,
      width: size,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <IconType size={`calc(${size} / 1.6)`} color={color}/>
    </div>
  )
}

export default IconCapsule