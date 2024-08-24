import { IonToggle } from "@ionic/react"
import { ResponsiveSunburst } from "@nivo/sunburst"
import { FC, useContext, useMemo, useState } from "react"
import Category from "../domain/model/category"
import { AugmentedTransaction } from "../domain/model/transaction"
import { CategoryServiceContext } from "../service/ServiceContext"

type LocalTree = {
  name: string
  loc: number | undefined
  children: LocalTree[]
}

interface Props {
  augmentedTransactions: AugmentedTransaction[]
}

const TransactionsPieChart: FC<Props> = (props) => {
  const {augmentedTransactions} = props
  const {state: categories, root, subCategories} = useContext(CategoryServiceContext)

  const [showIncomes, setShowIncomes] = useState(false)
  const [clickedCategory, setClickedCategory] = useState<Category | null>(null)

  const differences = useMemo(() => {
    const diffs = new Map<number, number>()

    augmentedTransactions.forEach(transaction => {
      if (transaction.categoryId === null) return

      if (transaction.sender?.isMine ?? false) {
        diffs.set(transaction.categoryId, (diffs.get(transaction.categoryId) ?? 0) + -transaction.amount)
      } else {
        diffs.set(transaction.categoryId, (diffs.get(transaction.categoryId) ?? 0) + transaction.receiverAmount)
      }
    })

    return diffs
  }, [categories, augmentedTransactions])

  const buildGraph = (category: Category): {tree: LocalTree, total: number} => {
    const sub = (subCategories[category.id] ?? []).map(buildGraph)
    const childAmount = sub.map(s => s.total).reduce((a, b) => a + b, 0)
    let selfAmount = differences.get(category.id) ?? 0
    if (!showIncomes) selfAmount *= -1
    if (selfAmount < 0) selfAmount = 0
    selfAmount /= 100
    return {
      total: childAmount + selfAmount,
      tree: {
        name: category.name,
        loc: selfAmount,
        children: sub.map(s => s.tree),
      },
    }
  }

  const sunburst = useMemo(() => {
    const data = buildGraph(root).tree
    return (
      <div style={{height: "30rem", width: "100%", position: "relative"}}>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}>
          <div style={{fontWeight: "bold"}}>
            {clickedCategory?.name}
          </div>
        </div>
        <ResponsiveSunburst
          data={data}
          margin={{top: 10, right: 10, bottom: 10, left: 10}}
          id="name"
          value="loc"
          cornerRadius={5}
          colors={{scheme: "set3"}}
          borderWidth={2}
          borderColor={{theme: "background"}}
          childColor={{
            from: "color",
            modifiers: [[
              "brighter",
              0.2,
            ]],
          }}
          onClick={({id}) => {
            setClickedCategory(categories.find(c => c.name === id)!)
          }}
          valueFormat=" >($.2f"
          enableArcLabels={true}
          arcLabel="id"
          arcLabelsSkipAngle={5}
          arcLabelsTextColor={{
            from: "color",
            modifiers: [[
              "darker",
              2.5,
            ]],
          }}
          tooltip={({id, formattedValue}) => (
            <div style={{
              backgroundColor: "#fff",
              color: "darkslategrey",
              padding: "0.5rem",
              boxShadow: "0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)",
            }}>
              <div style={{fontWeight: "bold"}}>
                {id}
              </div>
              <div>
                {formattedValue}
              </div>
            </div>
          )}
        />
      </div>
    )
  }, [augmentedTransactions, showIncomes, clickedCategory])

  return (
    <>
      <div style={{display: "flex", justifyContent: "center", margin: "1rem", alignItems: "center"}}>
        <div>Expenses</div>
        <IonToggle style={{margin: "0 1rem"}}
                   checked={showIncomes}
                   onIonChange={() => {
                     setClickedCategory(null)
                     setShowIncomes(prev => !prev)
                   }}
                   aria-label="Enable Notifications"></IonToggle>
        <div>Incomes</div>
      </div>

      {sunburst}
    </>
  )
}

export default TransactionsPieChart
