import { darken, useTheme } from '@mui/material/styles'
import { ResponsiveSankey, SankeyLinkDatum, SankeyNodeDatum } from '@nivo/sankey'
import { FC, useContext } from 'react'

import { formatFull } from '../../domain/model/currency'
import MixedAugmentation from '../../service/MixedAugmentation'
import { darkColors, darkTheme } from '../../utils'
import { DrawerContext } from '../Menu'
import { GraphTooltip } from './GraphStyledComponents'

export type Flow = { id: string; amount: number }

interface Props {
  inflows: Flow[]
  outflows: Flow[]
  netBorrowed: number
  fixedCosts: Map<string, number>
  variableCosts: Map<string, number>
  dimensions: { width: number; height: number }
}

const TOTAL = 'Total Income'

const EarningsBreakdownChart: FC<Props> = ({ inflows, outflows, netBorrowed, fixedCosts, variableCosts }) => {
  const theme = useTheme()
  const { defaultCurrency } = useContext(MixedAugmentation)
  const { privacyMode } = useContext(DrawerContext)

  const largestFirst = (costs: Map<string, number>) =>
    [...costs.entries()].filter(([, value]) => value > 0).sort(([, a], [, b]) => b - a)
  const positiveTotal = (amounts: number[]) => amounts.filter((value) => value > 0).reduce((a, b) => a + b, 0)
  const uses = [
    ...outflows,
    { id: 'Essential Expenses', amount: positiveTotal([...fixedCosts.values()]) },
    { id: 'Other Expenses', amount: positiveTotal([...variableCosts.values()]) },
  ]
  const fromDebt = Math.max(0, netBorrowed)
  const debtRepayment = Math.max(0, -netBorrowed)
  const balance =
    positiveTotal(inflows.map((flow) => flow.amount)) +
    fromDebt -
    positiveTotal(uses.map((flow) => flow.amount)) -
    debtRepayment

  type SankeyNode = {
    id: string
    nodeColor: string
  }

  const nodes: SankeyNode[] = [
    { id: TOTAL, nodeColor: darken(theme.palette.money.gain, 0.4) },
    ...inflows.map((flow, index) => ({
      id: flow.id,
      nodeColor: darken(theme.palette.money.gain, 0.1 + (0.3 * index) / inflows.length),
    })),
    { id: 'From Debt', nodeColor: darkColors[0] },
    { id: 'From Savings', nodeColor: darkColors[3] },
    ...outflows.map((flow) => ({ id: flow.id, nodeColor: darkColors[0] })),
    { id: 'Essential Expenses', nodeColor: darkColors[1] },
    { id: 'Other Expenses', nodeColor: darkColors[2] },
    { id: 'Debt Repayment', nodeColor: darkColors[0] },
    { id: 'Investments and Savings', nodeColor: darkColors[3] },
  ]

  const fixedCostNodes: SankeyNode[] = largestFirst(fixedCosts).map(([name, _], index) => ({
    id: `${name}`,
    nodeColor: darkColors[(index + 4) % darkColors.length],
  }))

  const variableCostNodes: SankeyNode[] = largestFirst(variableCosts).map(([name, _], index) => ({
    id: `${name}`,
    nodeColor: darkColors[(index + 4 + fixedCostNodes.length) % darkColors.length],
  }))

  const links = [
    ...inflows.map((flow) => ({ source: flow.id, target: TOTAL, value: flow.amount })),
    { source: 'From Debt', target: TOTAL, value: fromDebt },
    { source: 'From Savings', target: TOTAL, value: -balance },
    ...uses.map((flow) => ({ source: TOTAL, target: flow.id, value: flow.amount })),
    { source: TOTAL, target: 'Debt Repayment', value: debtRepayment },
    { source: TOTAL, target: 'Investments and Savings', value: balance },
  ]

  const fixedCostLinks = largestFirst(fixedCosts).map(([name, value]) => ({
    source: 'Essential Expenses',
    target: `${name}`,
    value,
  }))

  const variableCostLinks = largestFirst(variableCosts).map(([name, value]) => ({
    source: 'Other Expenses',
    target: `${name}`,
    value,
  }))

  const allLinks = [...links, ...fixedCostLinks, ...variableCostLinks].filter((link) => link.value > 0)
  const linkedIds = new Set(allLinks.flatMap((link) => [link.source, link.target]))

  const allNodes = [...nodes, ...fixedCostNodes, ...variableCostNodes].reduce<SankeyNode[]>((prev, current) => {
    if (!linkedIds.has(current.id) || prev.findIndex((e) => e.id === current.id) !== -1) {
      return prev
    }

    return [...prev, current]
  }, [])

  const data = {
    nodes: allNodes,
    links: allLinks,
  }

  const sumLinks = (side: 'source' | 'target', nodeId: string) =>
    allLinks.filter((link) => link[side] === nodeId).reduce((a, link) => a + link.value, 0)
  const getNodeValue = (nodeId: string) => sumLinks('source', nodeId) || sumLinks('target', nodeId)
  const totalIncome = getNodeValue(TOTAL)

  // Custom node tooltip
  const NodeTooltip = ({
    node,
  }: {
    node: SankeyNodeDatum<SankeyNode, { source: string; target: string; value: number }>
  }) => {
    const nodeId = node.id as string
    const value = getNodeValue(nodeId)
    const percentage = totalIncome > 0 ? (value / totalIncome) * 100 : 0

    return (
      <GraphTooltip style={{ whiteSpace: 'nowrap' }}>
        <div style={{ fontWeight: 'bold' }}>{nodeId}</div>
        {!privacyMode && <div>{formatFull(defaultCurrency, value, privacyMode)}</div>}
        <div>
          {percentage.toFixed(1)}% of {TOTAL}
        </div>
      </GraphTooltip>
    )
  }

  // Custom link tooltip
  const LinkTooltip = ({
    link,
  }: {
    link: SankeyLinkDatum<SankeyNode, { source: string; target: string; value: number }>
  }) => {
    const sourceId = link.source.id as string
    const targetId = link.target.id as string
    const value = link.value
    const isInflow = targetId === TOTAL
    const flowId = isInflow ? sourceId : targetId
    const baseId = isInflow ? targetId : sourceId
    const baseValue = getNodeValue(baseId)
    const percentage = baseValue > 0 ? (value / baseValue) * 100 : 0

    return (
      <GraphTooltip style={{ whiteSpace: 'nowrap' }}>
        <div style={{ fontWeight: 'bold' }}>{flowId}</div>
        {!privacyMode && <div>{formatFull(defaultCurrency, value, privacyMode)}</div>}
        <div>
          {percentage.toFixed(1)}% of {baseId}
        </div>
      </GraphTooltip>
    )
  }

  return (
    <ResponsiveSankey
      data={data}
      margin={{ top: 50, right: window.innerWidth / 40, bottom: 50, left: window.innerWidth / 40 }}
      align="start"
      sort="input"
      colors={(node) => node.nodeColor || darkColors[0]}
      nodeOpacity={1}
      nodeHoverOpacity={1}
      nodeThickness={18}
      nodeSpacing={24}
      nodeBorderWidth={0}
      nodeBorderColor={{
        from: 'color',
        modifiers: [['darker', 0.8]],
      }}
      nodeBorderRadius={3}
      linkOpacity={0.35}
      linkHoverOpacity={0.6}
      linkBlendMode="normal"
      linkContract={3}
      enableLinkGradient={true}
      labelOrientation="horizontal"
      labelPadding={16}
      labelTextColor={{
        from: 'color',
        modifiers: [['brighter', 1]],
      }}
      label={(node) => {
        if (node.id === TOTAL) return ''
        const words = node.id.toString().split(' ')
        const lineHeight = 15

        const initialOffset = words.length > 1 ? (-lineHeight * (words.length - 1)) / 2 : 0

        return (
          <tspan>
            {words.map((word, i) => (
              <tspan key={`${i}${word}`} x="0" dy={i === 0 ? initialOffset : lineHeight}>
                {word}
              </tspan>
            ))}
          </tspan>
        ) as unknown as string
      }}
      theme={darkTheme}
      nodeTooltip={NodeTooltip}
      linkTooltip={LinkTooltip}
    />
  )
}

export default EarningsBreakdownChart
