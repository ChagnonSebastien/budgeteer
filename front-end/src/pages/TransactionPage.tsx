import { IonFab, IonFabButton, IonFabList, IonPage, IonToggle, useIonRouter } from "@ionic/react"
import { ResponsiveSunburst } from "@nivo/sunburst"
import { FC, useContext, useMemo, useState } from "react"
import ContentWithHeader from "../components/ContentWithHeader"
import { IconToolsContext } from "../components/IconTools"
import { TransactionList } from "../components/TransactionList"
import Category from "../domain/model/category"
import { AugmentedTransaction } from "../domain/model/transaction"
import {
  AccountServiceContext,
  CategoryServiceContext,
  CurrencyServiceContext,
  TransactionServiceContext,
} from "../service/ServiceContext"

const TransactionPage: FC = () => {
  const router = useIonRouter()

  const {state: transactions} = useContext(TransactionServiceContext)
  const {state: currencies} = useContext(CurrencyServiceContext)
  const {state: categories} = useContext(CategoryServiceContext)
  const {state: accounts} = useContext(AccountServiceContext)

  const {iconTypeFromName} = useContext(IconToolsContext)
  const FaPlus = useMemo(() => iconTypeFromName("FaPlus"), [iconTypeFromName])
  const GrTransaction = useMemo(() => iconTypeFromName("GrTransaction"), [iconTypeFromName])
  const MdOutput = useMemo(() => iconTypeFromName("MdOutput"), [iconTypeFromName])
  const MdInput = useMemo(() => iconTypeFromName("MdInput"), [iconTypeFromName])

  const [showIncomes, setShowIncomes] = useState(false)
  const [clickedCategory, setClickedCategory] = useState<Category | null>(null)

  const augmentedTransaction = useMemo<AugmentedTransaction[]>(() => {
    return transactions.map<AugmentedTransaction>(transaction => ({
      ...transaction,
      category: categories.find(c => c.id === transaction.categoryId),
      currency: currencies.find(c => c.id === transaction.currencyId)!,
      sender: accounts.find(c => c.id === transaction.senderId),
      receiver: accounts.find(c => c.id === transaction.receiverId),
    }))
  }, [transactions, currencies, categories, accounts])

  const roots = useMemo(() => (categories?.filter(c => c.parentId === null) ?? []), [categories])

  const hierarchy = useMemo(() => {
    return categories?.reduce<{[parent: number]: Category[]}>((tree, c) => {
      if (c.parentId === null) return tree
      return {
        ...tree,
        [c.parentId]: [...(tree[c.parentId] ?? []), c],
      }
    }, {}) ?? {}
  }, [categories])

  type LocalTree = {
    name: string
    loc: number | undefined
    children: LocalTree[]
  }

  const buildGraph = (category: Category): {tree: LocalTree, total: number} => {
    const sub = (hierarchy[category.id] ?? []).map(buildGraph)
    const childAmount = sub.map(s => s.total).reduce((a, b) => a + b, 0)
    let selfAmount = augmentedTransaction.filter(t => t.categoryId === category.id).reduce((sum, t) => sum + (t.amount * ((t.sender?.isMine ?? false) === showIncomes ? -1 : 1)), 0)
    if (selfAmount < 0) {
      selfAmount = 0
    }
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
    const data = buildGraph(roots[0]).tree
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
          arcLabelsSkipAngle={10}
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
  }, [augmentedTransaction, showIncomes, clickedCategory])

  return (
    <IonPage>
      <ContentWithHeader title="Transactions" button="menu">
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton>
            <FaPlus/>
          </IonFabButton>
          <IonFabList side="top">
            <IonFabButton color="success" onClick={() => router.push("/transactions/new?type=income")}>
              <MdInput/>
            </IonFabButton>
            <IonFabButton color="danger" onClick={() => router.push("/transactions/new?type=expense")}>
              <MdOutput/>
            </IonFabButton>
            <IonFabButton color="dark" onClick={() => router.push("/transactions/new?type=transfer")}>
              <GrTransaction/>
            </IonFabButton>
          </IonFabList>
        </IonFab>
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

        <TransactionList transactions={augmentedTransaction}
                         onClick={(transactionId) => {
                           router.push(`/transactions/edit/${transactionId}`)
                         }}
        />
      </ContentWithHeader>
    </IonPage>
  )
}

export default TransactionPage
