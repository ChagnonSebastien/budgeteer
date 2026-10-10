import Random from './Random'

interface Dynamics {
  drift?: number
  volatility: number
  anchor?: number
}

const dt = 1 / 365

export const pricePath = (random: Random, days: number, initial: number, dynamics: Dynamics): number[] => {
  const { drift = 0, volatility, anchor } = dynamics
  const prices = [initial]
  for (let day = 1; day <= days; day += 1) {
    const previous = prices[day - 1]
    const pull = anchor === undefined ? 0 : 1.5 * Math.log(anchor / previous)
    const step = (drift + pull - (volatility * volatility) / 2) * dt + volatility * Math.sqrt(dt) * random.normal()
    prices.push(previous * Math.exp(step))
  }
  return prices
}
