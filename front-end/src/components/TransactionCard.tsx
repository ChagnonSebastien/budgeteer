import { FC, memo } from "react"

interface Props {
  amount: number;
  currencySymbol: string,
  from: string,
  to: string,
  category: string,
  date: Date,
  note?: string,
}

const TransactionCard: FC<Props> = (props) => {
  const {amount, currencySymbol, from, to, category, date, note} = props
  return (
    <div style={{
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      background: "#f5f3f6",
      borderRadius: ".3rem",
      padding: "0.3rem",
      margin: ".3rem",
    }}>
      <div style={{display: "flex", flexDirection: "column", alignItems: "start"}}>
        <div style={{fontWeight: "bold"}}>{amount} {currencySymbol}</div>
        <div>From: {from}</div>
        <div>To: {to}</div>
      </div>
      <div style={{display: "flex", flexDirection: "column", alignItems: "end"}}>
        <div>{category}</div>
        <div style={{fontWeight: "lighter"}}>{note}</div>
      </div>
    </div>
  )
}

export default memo(TransactionCard)