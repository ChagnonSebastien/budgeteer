import { FC, memo } from "react"
import IconCapsule from "./IconCapsule"

interface Props {
  amount: number;
  currencySymbol: string,
  from: string,
  to: string,
  categoryIconName: string,
  date: Date,
  note: string,
}

const TransactionCard: FC<Props> = (props) => {
  const {amount, currencySymbol, from, to, categoryIconName, date, note} = props

  return (
    <div style={{
      display: "flex",
      flexDirection: "row",
      background: "#f5f3f6",
      borderRadius: ".3rem",
      fontSize: "small",
      textWrap: "nowrap",
      margin: ".3rem",
      padding: ".3rem",
      alignItems: "center",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0,
      }}>
        <IconCapsule iconName={categoryIconName} size="2.4rem" backgroundColor="orange" color="darkslategray"/>
      </div>
      <div style={{
        display: "flex",
        flexDirection: "column",
        justifyItems: "stretch",
        flexGrow: 1,
        width: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        marginLeft: ".3rem",
      }}>
        <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between"}}>
          <div style={{fontWeight: "bold"}}>{amount} {currencySymbol}</div>
          <div>{date.toDateString()}</div>
        </div>
        <div style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          width: "100%",
        }}>
          <div style={{
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}>
            <div style={{textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden"}}>From: {from}</div>
            <div style={{textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden"}}>To: {to}</div>
          </div>

          <div style={{
            whiteSpace: "wrap",
            textOverflow: "ellipsis",
            fontWeight: "lighter",
            textWrap: "wrap",
            textAlign: "end",
          }}>{note}</div>
        </div>
      </div>
    </div>
  )
}

export default memo(TransactionCard)