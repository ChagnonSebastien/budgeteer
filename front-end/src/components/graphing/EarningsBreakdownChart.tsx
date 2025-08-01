import { ResponsiveSankey, SankeyLinkDatum, SankeyNodeDatum } from '@nivo/sankey'
import { FC, useContext } from 'react'

import { formatFull } from '../../domain/model/currency'
import MixedAugmentation from '../../service/MixedAugmentation'
import { darkColors, darkTheme } from '../../utils'
import { DrawerContext } from '../Menu'
import { GraphTooltip } from './GraphStyledComponents'

interface Props {
  grossIncome: number
  netIncome: number
  fixedCosts: Map<string, number>
  variableCosts: Map<string, number>
  dimensions: { width: number; height: number }
}

const EarningsBreakdownChart: FC<Props> = ({ grossIncome, netIncome, fixedCosts, variableCosts, dimensions }) => {
  const { defaultCurrency } = useContext(MixedAugmentation)
  const { privacyMode } = useContext(DrawerContext)

  const taxes = grossIncome - netIncome
  const investments =
    netIncome -
    [...fixedCosts.values()].reduce((a, b) => a + b, 0) -
    [...variableCosts.values()].reduce((a, b) => a + b, 0)

  // Define node type with proper typing
  type SankeyNode = {
    id: string
    nodeColor: string
  }

  // Prepare data for Sankey diagram
  const nodes: SankeyNode[] = [
    { id: 'Income', nodeColor: '#363' },
    { id: 'Income Taxes', nodeColor: darkColors[0] },
    { id: 'Fixed Costs', nodeColor: darkColors[1] },
    { id: 'Variable Costs', nodeColor: darkColors[2] },
    { id: 'Investments and Savings', nodeColor: darkColors[3] },
  ]

  // Add nodes for each fixed cost category
  const fixedCostNodes: SankeyNode[] = [...fixedCosts.entries()]
    .filter(([, value]) => value > 0)
    .map(([name, _], index) => ({
      id: `${name}`,
      nodeColor: darkColors[(index + 4) % darkColors.length],
    }))

  // Add nodes for each variable cost category
  const variableCostNodes: SankeyNode[] = [...variableCosts.entries()]
    .filter(([, value]) => value > 0)
    .map(([name, _], index) => ({
      id: `${name}`,
      nodeColor: darkColors[(index + 4 + fixedCostNodes.length) % darkColors.length],
    }))

  // Combine all nodes
  const allNodes = [...nodes, ...fixedCostNodes, ...variableCostNodes].reduce<SankeyNode[]>((prev, current) => {
    if (prev.findIndex((e) => e.id === current.id) !== -1) {
      return prev
    }

    return [...prev, current]
  }, [])

  // Create links
  const links = [
    { source: 'Income', target: 'Income Taxes', value: taxes },
    {
      source: 'Income',
      target: 'Fixed Costs',
      value: [...fixedCosts.values()].filter((value) => value > 0).reduce((a, b) => a + b, 0),
    },
    {
      source: 'Income',
      target: 'Variable Costs',
      value: [...variableCosts.values()].filter((value) => value > 0).reduce((a, b) => a + b, 0),
    },
    { source: 'Income', target: 'Investments and Savings', value: investments },
  ]

  // Add links from Fixed Costs to individual categories
  const fixedCostLinks = [...fixedCosts.entries()]
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({
      source: 'Fixed Costs',
      target: `${name}`,
      value,
    }))

  // Add links from Variable Costs to individual categories
  const variableCostLinks = [...variableCosts.entries()]
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({
      source: 'Variable Costs',
      target: `${name}`,
      value,
    }))

  // Combine all links
  const allLinks = [...links, ...fixedCostLinks, ...variableCostLinks]

  const data = {
    nodes: allNodes,
    links: allLinks,
  }

  // Calculate total income (gross income)
  const totalIncome = grossIncome

  // Function to get node value
  const getNodeValue = (nodeId: string): number => {
    if (nodeId === 'Income') return totalIncome
    if (nodeId === 'Income Taxes') return taxes
    if (nodeId === 'Fixed Costs') return [...fixedCosts.values()].filter((v) => v > 0).reduce((a, b) => a + b, 0)
    if (nodeId === 'Variable Costs') return [...variableCosts.values()].filter((v) => v > 0).reduce((a, b) => a + b, 0)
    if (nodeId === 'Investments and Savings') return investments

    // Check if it's a fixed cost category
    const fixedCost = fixedCosts.get(nodeId)
    if (fixedCost !== undefined) return fixedCost

    // Check if it's a variable cost category
    const variableCost = variableCosts.get(nodeId)
    if (variableCost !== undefined) return variableCost

    return 0
  }

  // Custom node tooltip
  const NodeTooltip = ({
    node,
  }: {
    node: SankeyNodeDatum<SankeyNode, { source: string; target: string; value: number }>
  }) => {
    const nodeId = node.id as string
    const value = getNodeValue(nodeId)
    const percentage = (value / totalIncome) * 100

    return (
      <GraphTooltip style={{ whiteSpace: 'nowrap' }}>
        <div style={{ fontWeight: 'bold' }}>{nodeId}</div>
        {!privacyMode && <div>{formatFull(defaultCurrency, value, privacyMode)}</div>}
        <div>{percentage.toFixed(1)}% of Income</div>
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
    const sourceValue = getNodeValue(sourceId)
    const percentage = sourceValue > 0 ? (value / sourceValue) * 100 : 0

    return (
      <GraphTooltip style={{ whiteSpace: 'nowrap' }}>
        <div style={{ fontWeight: 'bold' }}>{targetId}</div>
        {!privacyMode && <div>{formatFull(defaultCurrency, value, privacyMode)}</div>}
        <div>
          {percentage.toFixed(1)}% of {sourceId}
        </div>
      </GraphTooltip>
    )
  }

  return (
    <div className="relative" style={{ height: dimensions.height, width: dimensions.width }}>
      <ResponsiveSankey
        data={data}
        margin={{ top: 50, right: window.innerWidth / 40, bottom: 50, left: window.innerWidth / 40 }}
        align="start"
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
        linkOpacity={0.5}
        linkHoverOpacity={0.8}
        linkContract={3}
        enableLinkGradient={true}
        labelOrientation="horizontal"
        labelPadding={16}
        labelTextColor={{
          from: 'color',
          modifiers: [['brighter', 1]],
        }}
        label={(node) => {
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
    </div>
  )
}

export default EarningsBreakdownChart
