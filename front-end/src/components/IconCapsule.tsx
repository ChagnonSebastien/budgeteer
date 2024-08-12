import { DataType } from "csstype"
import { useContext, useMemo } from "react"
import { IconToolsContext } from "./IconTools"

const regexp = new RegExp("^(?<comp>[1-9.]+)(?<unit>[a-z]*)$")

interface Props {
  iconName: string
  size: string | number
  backgroundColor: DataType.Color
  color: DataType.Color
}

const IconCapsule = (props: Props) => {
  const {iconName, size, color, backgroundColor} = props

  const {iconTypeFromName} = useContext(IconToolsContext)

  const Icon = useMemo(() => iconTypeFromName(iconName), [iconName, iconTypeFromName])

  const {sizeNumber, unit} = useMemo(() => {
    if (typeof size === "number") {
      return {sizeNumber: size, unit: ""}
    } else {
      const groups = regexp.exec(size)?.groups!
      return {sizeNumber: parseFloat(groups["comp"]), unit: groups["unit"]}
    }
  }, [size])

  return (
    <div style={{
      backgroundColor: backgroundColor,
      borderRadius: `${sizeNumber * 0.5}${unit}`,
      height: size,
      width: size,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <Icon size={`${sizeNumber * 0.625}${unit}`} color={color}/>
    </div>
  )
}

export default IconCapsule