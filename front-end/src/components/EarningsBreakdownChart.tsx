import { ResponsiveSunburst } from '@nivo/sunburst'
import { FC, useContext, useEffect, useState } from 'react'

import { CurrencyServiceContext } from '../service/ServiceContext'
import { darkColors, darkTheme } from '../utils'

import '../styles/graphs-tailwind.css'

interface Props {
  grossIncome: number
  netIncome: number
  fixedCosts: Map<string, number>
  variableCosts: Map<string, number>
  contentRef: HTMLDivElement | null
}

const EarningsBreakdownChart: FC<Props> = ({ grossIncome, netIncome, fixedCosts, variableCosts, contentRef }) => {
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 })

  useEffect(() => {
    if (!contentRef) return

    const updateDimensions = () => {
      setDimensions({
        width: contentRef.clientWidth,
        height: contentRef.clientHeight,
      })
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [contentRef])
  const { defaultCurrency } = useContext(CurrencyServiceContext)
  const [clickedCategory, setClickedCategory] = useState<string | null>(null)

  if (!defaultCurrency) return null

  const taxes = grossIncome - netIncome
  const investments =
    netIncome -
    [...fixedCosts.values()].reduce((a, b) => a + b, 0) -
    [...variableCosts.values()].reduce((a, b) => a + b, 0)

  const data = {
    name: 'Total',
    loc: 0,
    children: [
      {
        name: 'Taxes',
        loc: taxes,
        children: [],
      },
      {
        name: 'Fixed Costs',
        loc: 0,
        children: [...fixedCosts.entries()].map(([name, value]) => ({
          name: `Fixed: ${name}`,
          loc: value,
          children: [],
        })),
      },
      {
        name: 'Variable Costs',
        loc: 0,
        children: [...variableCosts.entries()].map(([name, value]) => ({
          name: `Variable: ${name}`,
          loc: value,
          children: [],
        })),
      },
      {
        name: 'Investments',
        loc: investments,
        children: [],
      },
    ],
  }

  const getCategoryValue = (categoryName: string): number => {
    const mainCategory = data.children.find((c) => c.name === categoryName)
    if (mainCategory) {
      if (mainCategory.name === 'Fixed Costs') {
        return [...fixedCosts.values()].reduce((a, b) => a + b, 0)
      }
      if (mainCategory.name === 'Variable Costs') {
        return [...variableCosts.values()].reduce((a, b) => a + b, 0)
      }
      return mainCategory.loc
    }
    const subCategory = data.children.flatMap((c) => c.children).find((c) => c?.name === categoryName)
    return subCategory?.loc ?? 0
  }

  return (
    <div className="relative" style={{ height: dimensions.height, width: dimensions.width }}>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center z-10">
        {clickedCategory ? (
          <>
            <div className="font-bold">{clickedCategory?.replace(/^(Fixed|Variable): /, '')}</div>
            <div>{((getCategoryValue(clickedCategory) / grossIncome) * 100).toFixed(1)}¢</div>
          </>
        ) : (
          <>
            <div className="font-bold">1.00$</div>
          </>
        )}
      </div>
      <ResponsiveSunburst
        data={data}
        margin={{ top: 50, right: 50, bottom: 50, left: 50 }}
        id="name"
        value="loc"
        cornerRadius={5}
        colors={darkColors}
        borderWidth={1}
        borderColor={{
          from: 'color',
          modifiers: [['darker', 0.5]],
        }}
        childColor={{
          from: 'color',
          modifiers: [['brighter', 0.2]],
        }}
        enableArcLabels={true}
        arcLabel={({ id }) => id.toString().replace(/^(Fixed|Variable): /, '')}
        arcLabelsSkipAngle={5}
        arcLabelsTextColor="white"
        theme={darkTheme}
        onClick={({ id }) => setClickedCategory((prev) => (prev === (id as string) ? null : (id as string)))}
        tooltip={() => <div />}
      />
    </div>
  )
}

export default EarningsBreakdownChart
