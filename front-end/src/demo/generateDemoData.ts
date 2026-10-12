import {
  addDays,
  differenceInCalendarDays,
  getDate,
  getDay,
  getMonth,
  isLastDayOfMonth,
  startOfDay,
  subYears,
} from 'date-fns'

import Ledger from './Ledger'
import { pricePath } from './pricePath'
import Random from './Random'
import { commonCategories, iconColor, TemplateCategory } from '../components/categories/commonCategories'
import { SplitType } from '../domain/model/transactionGroup'
import User from '../domain/model/user'
import type {
  Account,
  Category,
  Currency,
  ExchangeRate,
  Settlement,
  Transaction,
  TransactionGroup,
} from '../store/local/IndexedDB'

export interface DemoData {
  user: User
  currencies: Currency[]
  accounts: Account[]
  categories: Category[]
  exchangeRates: ExchangeRate[]
  transactions: Transaction[]
  transactionGroups: TransactionGroup[]
  settlements: Settlement[]
}

interface Person {
  email: string
  name: string
}

const alex: Person = { email: 'alex.tremblay@example.com', name: 'Alex Tremblay' }
const sam: Person = { email: 'sam.lavoie@example.com', name: 'Sam Lavoie' }
const charlie: Person = { email: 'charlie.roy@example.com', name: 'Charlie Roy' }
const jordan: Person = { email: 'jordan.nguyen@example.com', name: 'Jordan Nguyen' }

const CAD = 1
const USD = 2
const EUR = 3
const GEQ = 4
const TECH = 5
const BOND = 6

const currencies: Currency[] = [
  { id: CAD, name: 'Canadian dollar', symbol: 'CAD', type: 'Cash', risk: '0. None', decimalPoints: 2 },
  { id: USD, name: 'US dollar', symbol: 'USD', type: 'Cash', risk: '0. None', decimalPoints: 2 },
  { id: EUR, name: 'Euro', symbol: 'EUR', type: 'Cash', risk: '0. None', decimalPoints: 2 },
  { id: GEQ, name: 'Global Equity Index ETF', symbol: 'GEQ', type: 'Equity ETF', risk: '3. Medium', decimalPoints: 4 },
  {
    id: TECH,
    name: 'Technology Growth ETF',
    symbol: 'TECH',
    type: 'Sector ETF',
    risk: '4. Medium-High',
    decimalPoints: 4,
  },
  {
    id: BOND,
    name: 'Canadian Bond Index ETF',
    symbol: 'BOND',
    type: 'Bond ETF',
    risk: '1. Low',
    decimalPoints: 4,
  },
].map((c) => ({ ...c, rateFetchScript: '', autoUpdate: false }))

const funds = [GEQ, TECH, BOND]
const fundYield: Record<number, number> = { [GEQ]: 0.02, [TECH]: 0.006, [BOND]: 0.032 }
const tfsaMix: [number, number][] = [
  [GEQ, 0.7],
  [TECH, 0.2],
  [BOND, 0.1],
]
const rrspMix: [number, number][] = [
  [GEQ, 0.65],
  [BOND, 0.35],
]

const europe = [
  {
    city: 'Paris',
    nights: 4,
    train: 'Air Transat',
    food: ['Bouillon Chartier', 'Le Relais de l’Entrecôte', 'Breizh Café', 'Chez Gladines'],
    grocery: 'Carrefour City',
    sights: ['Musée du Louvre', 'Musée d’Orsay', 'Tour Eiffel', 'Catacombes de Paris'],
  },
  {
    city: 'Amsterdam',
    nights: 3,
    train: 'Eurostar',
    food: ['Café de Klos', 'Foodhallen', 'The Pancake Bakery'],
    grocery: 'Albert Heijn',
    sights: ['Rijksmuseum', 'Van Gogh Museum', 'Canal cruise'],
  },
  {
    city: 'Berlin',
    nights: 3,
    train: 'Deutsche Bahn',
    food: ['Markthalle Neun', 'Mustafa’s Gemüse Kebap', 'Prater Garten'],
    grocery: 'REWE',
    sights: ['Pergamonmuseum', 'Berliner Fernsehturm', 'Bike rental Berlin'],
  },
  {
    city: 'Prague',
    nights: 2,
    train: 'RegioJet',
    food: ['Lokál Dlouhááá', 'U Fleků', 'Kantýna'],
    grocery: 'Albert',
    sights: ['Prague Castle', 'Petřín Tower'],
  },
  {
    city: 'Vienna',
    nights: 2,
    train: 'ÖBB',
    food: ['Figlmüller', 'Naschmarkt', 'Café Central'],
    grocery: 'Billa',
    sights: ['Schönbrunn Palace', 'Belvedere'],
  },
]

const pools = {
  groceries: {
    cegep: ['Dépanneur Chez Ben', 'Metro'],
    university: ['Maxi', 'Metro', 'Provigo', 'Adonis'],
    work: ['IGA', 'Metro', 'Marché Jean-Talon', 'Super C', 'Avril Santé'],
  },
  coffee: {
    cegep: ['Tim Hortons', 'Second Cup', 'Starbucks'],
    university: ['Café Campus', 'Tim Hortons', 'Second Cup', 'Starbucks'],
    work: ['Café Olimpico', 'Pikolo Espresso Bar', 'Tim Hortons', 'Starbucks', 'Dispatch Coffee'],
  },
  lunch: {
    cegep: ['Subway', 'Cafétéria du cégep', 'A&W'],
    university: ['Cafétéria Polytechnique', 'Subway', 'Sushi Shop', 'Thaï Express'],
    work: ['Mandy’s', 'Sushi Shop', 'Paulette', 'Banh Mi Ba Le', 'Chez Tousignant'],
  },
  bars: ['Le Saint-Bock', 'Brasserie Harricana', 'Dieu du Ciel!', 'Pub L’Île Noire', 'Le Cheval Blanc', 'Bar Le Ritz'],
  dinners: ['La Banquise', 'Pizzeria Gema', 'Ramen Misoya', 'Kazu', 'Le Pick Up', 'Lucky’s Burgers'],
  delivery: ['Uber Eats', 'DoorDash'],
  clothing: ['Simons', 'Uniqlo', 'Winners', 'Frank And Oak', 'Old Navy'],
  household: ['Dollarama', 'Canadian Tire', 'Home Depot'],
  pharmacy: ['Jean Coutu', 'Pharmaprix', 'Familiprix'],
  gifts: ['Indigo', 'Simons', 'Amazon', 'Renaud-Bray', 'SAQ'],
  gas: ['Shell', 'Esso', 'Petro-Canada', 'Costco Gas'],
  gadgets: ['Best Buy', 'Amazon'],
}

type Phase = keyof typeof pools.coffee

const dayKey = (day: Date) => `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`

const buildCategories = () => {
  const rows: Category[] = [
    {
      id: 1,
      name: 'Any',
      parentId: null,
      iconName: 'MdCategory',
      iconColor: '#FFFFFF',
      iconBackground: '#E5582A',
      fixedCosts: false,
      ordering: 0,
    },
  ]
  const add = (template: TemplateCategory, color: string, parentId: number) => {
    const id = rows.length + 1
    rows.push({
      id,
      name: template.name,
      parentId,
      iconName: template.icon,
      iconColor,
      iconBackground: color,
      fixedCosts: template.fixedCosts ?? false,
      ordering: 0,
    })
    for (const child of template.children ?? []) add(child, color, id)
  }
  for (const group of commonCategories) add(group, group.color, 1)
  return rows
}

class Story {
  readonly ledger: Ledger
  readonly categories = buildCategories()
  readonly rates: ExchangeRate[] = []
  readonly groups: TransactionGroup[] = []

  private readonly start: Date
  private readonly y0: number
  private readonly prices = new Map<number, number[]>()
  private readonly agenda = new Map<string, (() => void)[]>()
  private readonly earned = new Map<string, number>()
  private readonly raises: number[]
  private readonly firstSalary: number
  private secondSalary = 0
  private payAnchor = 0
  private index = 0

  readonly chequing: number
  readonly savings: number
  private card: number | null = null
  private loan: number | null = null
  private wise: number | null = null
  private tfsa: number | null = null
  private rrsp: number | null = null

  private netflix = false
  private statement = 0
  private shoppedThisWeekend = false
  private christmasGifts = 0
  private samBalance = 0
  private nextCatFood: Date | null = null
  private sprained = false
  private readonly europeNet = new Map<string, number>()

  readonly moveOut: Date
  readonly ownApartment: Date
  readonly uniStart: Date
  readonly graduation: Date
  readonly firstJob: Date
  readonly layoff: Date
  readonly secondJob: Date
  readonly carPurchase: Date
  readonly europeStart: Date
  readonly europeEnd: Date
  readonly usTripStart: Date
  readonly usTripEnd: Date
  readonly catAdoption: Date
  readonly birthday: Date
  readonly firstCamera: Date
  readonly internships: { from: Date; to: Date; employer: string; hourly: number }[]

  constructor(
    private readonly random: Random,
    private readonly now: Date,
  ) {
    this.start = startOfDay(subYears(now, 10))
    this.y0 = this.start.getMonth() >= 5 ? this.start.getFullYear() : this.start.getFullYear() - 1
    this.ledger = new Ledger(alex.email, now)

    this.moveOut = this.on(2, 7, 1)
    this.uniStart = this.on(2, 9, 3)
    this.internships = [
      { from: this.on(4, 5, 6), to: this.on(4, 8, 21), employer: 'Hydrotech Ingénierie', hourly: 22.5 },
      { from: this.on(5, 5, 5), to: this.on(5, 8, 20), employer: 'Boréal Robotique', hourly: 25.5 },
    ]
    this.graduation = this.on(6, 4, 28)
    this.europeStart = this.on(6, 5, random.int(4, 12))
    this.europeEnd = addDays(this.europeStart, 14)
    this.firstJob = this.on(6, 6, 6)
    this.ownApartment = this.on(6, 7, 1)
    this.usTripStart = this.on(7, 8, random.int(4, 20))
    this.usTripEnd = addDays(this.usTripStart, 5)
    this.layoff = this.on(8, random.int(2, 4), random.int(1, 28))
    this.secondJob = addDays(this.layoff, random.int(95, 140))
    this.carPurchase = addDays(this.secondJob, random.int(14, 40))
    this.catAdoption = addDays(this.layoff, random.int(20, 50))
    this.birthday = this.on(0, random.int(1, 12), random.int(1, 28))
    this.firstCamera = this.on(0, 12, random.int(1, 20))

    this.firstSalary = random.int(80, 86) * 1000
    this.raises = Array.from({ length: 12 }, () => random.between(0.025, 0.05))

    const days = differenceInCalendarDays(now, this.start) + 1
    this.prices.set(USD, pricePath(random, days, random.between(1.27, 1.34), { volatility: 0.07, anchor: 1.33 }))
    this.prices.set(EUR, pricePath(random, days, random.between(1.42, 1.5), { volatility: 0.08, anchor: 1.48 }))
    const drift = (mean: number, spread: number, min: number, max: number) =>
      Math.min(max, Math.max(min, mean + spread * random.normal()))
    this.prices.set(
      GEQ,
      pricePath(random, days, random.between(18, 24), { drift: drift(0.08, 0.02, 0.04, 0.12), volatility: 0.14 }),
    )
    this.prices.set(
      TECH,
      pricePath(random, days, random.between(26, 34), { drift: drift(0.11, 0.04, 0.03, 0.18), volatility: 0.25 }),
    )
    this.prices.set(
      BOND,
      pricePath(random, days, random.between(24, 27), { drift: drift(0.02, 0.01, 0, 0.04), volatility: 0.045 }),
    )

    this.chequing = this.ledger.open('Chequing', 'Chequing', 'Desjardins', this.start, [
      [CAD, random.int(300, 900) * 100],
    ])
    this.savings = this.ledger.open('Savings', 'Savings', 'Desjardins', this.start, [
      [CAD, random.int(1200, 2600) * 100],
    ])
  }

  run() {
    while (true) {
      const day = addDays(this.start, this.index)
      if (day > this.now) break
      if (getDay(day) === 4 && this.payAnchor === 0 && this.index > 0) this.payAnchor = this.index
      this.live(day)
      this.index += 1
    }
  }

  private live(day: Date) {
    for (const event of this.agenda.get(dayKey(day)) ?? []) event()
    this.milestones(day)
    this.earn(day)
    this.payday(day)
    this.housing(day)
    this.food(day)
    this.transport(day)
    this.health(day)
    this.shopping(day)
    this.entertainment(day)
    this.outdoors(day)
    this.personal(day)
    this.government(day)
    this.roommate(day)
    this.europeTrip(day)
    this.usTrip(day)
    this.investing(day)
    this.banking(day)
    this.markets(day)
  }

  private on(years: number, month: number, day: number) {
    return new Date(this.y0 + years, month - 1, day)
  }

  private is(day: Date, target: Date) {
    return dayKey(day) === dayKey(target)
  }

  private schedule(day: Date, event: () => void) {
    const key = dayKey(day)
    this.agenda.set(key, [...(this.agenda.get(key) ?? []), event])
  }

  private at(day: Date, hour: number) {
    const date = new Date(day)
    date.setHours(Math.floor(hour), this.random.int(0, 59))
    return date
  }

  private cat(name: string) {
    const category = this.categories.find((c) => c.name === name)
    if (!category) throw new Error(`unknown demo category ${name}`)
    return category.id
  }

  private price(currency: number) {
    return this.prices.get(currency)![this.index]
  }

  private cents(min: number, max: number) {
    const inflation = Math.pow(1.027, this.index / 365)
    return Math.round(this.random.between(min, max) * inflation * 100)
  }

  private phase(day: Date): Phase {
    if (day < this.moveOut) return 'cegep'
    if (day < this.firstJob) return 'university'
    return 'work'
  }

  private laidOff(day: Date) {
    return day >= this.layoff && day < this.secondJob
  }

  private inEurope(day: Date) {
    return day >= this.europeStart && day < this.europeEnd
  }

  private away(day: Date) {
    return this.inEurope(day) || (day >= this.usTripStart && day < this.usTripEnd)
  }

  private hasCar(day: Date) {
    return day >= this.carPurchase
  }

  private wallet() {
    return this.card !== null && this.random.chance(0.8) ? this.card : this.chequing
  }

  private cover(day: Date, hour: number, from: number, amount: number) {
    const balance = this.ledger.balance(this.chequing, CAD)
    if (from === this.chequing && balance - amount < 2000)
      this.raiseCash(day, amount - balance + 20000, Math.max(0, hour - 1))
  }

  private spend(day: Date, hour: number, payee: string, category: string, amount: number, note = '', from?: number) {
    const sender = from ?? this.wallet()
    this.cover(day, hour, sender, amount)
    return this.ledger.record({
      date: this.at(day, hour),
      amount,
      currency: CAD,
      sender,
      receiver: this.ledger.payee(payee, day),
      category: this.cat(category),
      note,
    })
  }

  private receive(day: Date, hour: number, payer: string, category: string, amount: number, note = '', to?: number) {
    return this.ledger.record({
      date: this.at(day, hour),
      amount,
      currency: CAD,
      sender: this.ledger.payee(payer, day),
      receiver: to ?? this.chequing,
      category: this.cat(category),
      note,
    })
  }

  private move(day: Date, hour: number, from: number, to: number, amount: number, note: string) {
    if (amount <= 0) return
    this.cover(day, hour, from, amount)
    this.ledger.record({
      date: this.at(day, hour),
      amount,
      currency: CAD,
      sender: from,
      receiver: to,
      category: null,
      note,
    })
  }

  private spendAbroad(day: Date, hour: number, payee: string, category: string, usd: number, note = '') {
    this.ledger.record({
      date: this.at(day, hour),
      amount: Math.round(usd * this.price(USD) * 1.025),
      currency: CAD,
      sender: this.card ?? this.chequing,
      receiver: this.ledger.payee(payee, day),
      category: this.cat(category),
      note,
      receiverCurrency: USD,
      receiverAmount: usd,
    })
  }

  private convertToEuros(day: Date, euros: number) {
    const amount = Math.round(euros * this.price(EUR) * 1.004)
    this.cover(day, 9, this.chequing, amount)
    this.ledger.record({
      date: this.at(day, 9),
      amount,
      currency: CAD,
      sender: this.chequing,
      receiver: this.wise!,
      category: null,
      note: 'Convert to euros',
      receiverCurrency: EUR,
      receiverAmount: euros,
    })
  }

  private ensureEuros(day: Date, amount: number) {
    if (this.ledger.balance(this.wise!, EUR) < amount)
      this.convertToEuros(day, Math.max(40000, Math.ceil(amount / 10000) * 10000))
  }

  private milestones(day: Date) {
    const r = this.random
    if (this.is(day, this.firstCamera)) {
      this.spend(day, 14, 'Kijiji', 'Electronics', 38000, 'Used Canon DSLR and kit lens', this.chequing)
    }
    if (this.is(day, this.on(1, 4, 12))) this.spend(day, 15, 'Lozeau', 'Electronics', 15999, '50mm f/1.8 lens')
    if (this.is(day, this.moveOut)) {
      this.card = this.ledger.open('Visa', 'Credit card', 'Desjardins', day)
      this.spend(day, 8, 'Location Discount', 'Housing', 11900, 'Moving truck')
      this.schedule(addDays(day, 2), () =>
        this.spend(addDays(day, 2), 13, 'IKEA', 'Household items', 46000, 'Bed and desk'),
      )
      this.netflix = r.chance(0.8)
    }
    if (this.is(day, this.on(2, 8, 20))) this.spend(day, 16, 'Best Buy', 'Electronics', 124999, 'Laptop for school')
    if (this.is(day, this.uniStart))
      this.loan = this.ledger.open('Student loan', 'Loan', 'Aide financière aux études', day)
    if (this.is(day, this.on(2, 11, 14))) this.spend(day, 15, 'Simons', 'Clothing', 32900, 'Winter coat')
    if (this.is(day, this.on(4, 7, 9))) this.spend(day, 15, 'Lozeau', 'Electronics', 64900, 'Wide-angle lens')
    if (this.is(day, this.on(4, 9, 22))) this.spend(day, 17, 'Apple', 'Electronics', 97900, 'New phone')
    if (this.is(day, this.graduation)) {
      this.spend(day, 10, 'Polytechnique Montréal', 'Education', 6500, 'Graduation ceremony')
      this.receive(day, 18, 'Mom & Dad', 'Gifts', 50000, 'Graduation gift')
    }
    if (this.is(day, this.firstJob))
      this.rrsp = this.ledger.open('Group RRSP', 'Retirement', 'Desjardins Assurances', day)
    if (this.is(day, this.ownApartment)) {
      this.spend(day, 8, 'Location Discount', 'Housing', 18900, 'Moving truck')
      this.schedule(addDays(day, 3), () =>
        this.spend(addDays(day, 3), 12, 'IKEA', 'Household items', 138000, 'Furniture for the new place'),
      )
      this.schedule(addDays(day, 10), () =>
        this.spend(addDays(day, 10), 15, 'Structube', 'Household items', 89900, 'Sofa'),
      )
    }
    if (this.is(day, this.on(6, 6, 18))) this.spend(day, 11, 'MEC', 'Clothing', 22900, 'Hiking boots')
    if (this.is(day, addDays(this.firstJob, 75)))
      this.tfsa = this.ledger.open('TFSA', 'Investment', 'Wealthsimple', day)
    if (this.is(day, this.on(6, 9, 17))) {
      this.spend(day, 14, 'Lozeau', 'Electronics', 229900, 'Mirrorless camera body and lens')
      this.schedule(addDays(day, 11), () =>
        this.receive(
          addDays(day, 11),
          19,
          'Facebook Marketplace',
          'Electronics',
          52000,
          'Sold the old DSLR and lenses',
        ),
      )
    }
    if (this.is(day, this.on(7, 3, 10))) {
      this.spendAbroad(day, 21, 'B&H Photo', 'Electronics', 89900, 'Telephoto lens')
      this.schedule(addDays(day, 6), () => this.spend(addDays(day, 6), 11, 'UPS', 'Taxes', 9600, 'Import duties'))
    }
    if (this.is(day, this.on(7, 10, 19))) {
      this.spend(day, 13, 'Lunetterie New Look', 'Dental and vision', 42000, 'Glasses')
      this.schedule(addDays(day, 9), () =>
        this.receive(addDays(day, 9), 9, 'Sun Life', 'Dental and vision', 20000, 'Vision claim'),
      )
    }
    if (this.is(day, this.layoff)) {
      this.netflix = false
      const severance = Math.round(this.salary(day) * (8 / 52) * 0.62 * 100)
      this.schedule(addDays(day, 5), () =>
        this.receive(addDays(day, 5), 9, 'Boréal Robotique', 'Salary', severance, 'Severance pay'),
      )
    }
    if (this.is(day, this.catAdoption)) {
      this.spend(day, 13, 'SPCA de Montréal', 'Pets', 26000, 'Adoption fee for Pixel the cat')
      this.spend(day, 15, 'Mondou', 'Pets', 21000, 'Litter box, carrier, toys and food')
      this.nextCatFood = addDays(day, 24)
      this.schedule(addDays(day, 12), () =>
        this.spend(addDays(day, 12), 10, 'Clinique vétérinaire Rosemont', 'Pets', 18500, 'First checkup'),
      )
    }
    if (this.is(day, this.secondJob)) {
      this.secondSalary = Math.max(Math.round(this.salary(this.layoff) * 1.1), r.int(102, 110) * 1000)
      this.schedule(addDays(day, 30), () => (this.netflix = true))
    }
    if (this.is(day, this.carPurchase)) {
      const price = r.int(155, 185) * 10000
      this.spend(day, 11, 'Auto Rosemont', 'Transportation', price, 'Used Mazda3', this.chequing)
      this.spend(day, 12, 'SAAQ', 'Transportation', 32000, 'Registration and licence plate', this.chequing)
    }
    if (this.is(day, this.on(9, 5, 11))) this.spend(day, 15, 'Lozeau', 'Electronics', 23900, 'Travel tripod')
  }

  private hourlyJob(day: Date): { employer: string; hourly: number; hours: number } | null {
    const month = getMonth(day) + 1
    const summer = month >= 6 && month <= 8
    const wage = 11.25 + 0.6 * Math.floor(differenceInCalendarDays(day, this.on(0, 5, 1)) / 365)
    if (day < this.uniStart)
      return { employer: 'Café Lune', hourly: wage, hours: summer || day >= this.on(2, 5, 18) ? 33 : 14 }
    if (day >= this.graduation) return null
    const internship = this.internships.find((i) => day >= i.from && day <= i.to)
    if (internship) return { employer: internship.employer, hourly: internship.hourly, hours: 40 }
    const year = Math.floor(differenceInCalendarDays(day, this.uniStart) / 365)
    if (month >= 5 && month <= 8) return { employer: 'Brûlerie du Campus', hourly: wage + 0.5, hours: 35 }
    const hours = [10, 10, 8, 6][year] ?? 0
    return hours === 0 ? null : { employer: 'Brûlerie du Campus', hourly: wage + 0.5, hours }
  }

  private salary(day: Date) {
    const base = day >= this.secondJob ? this.secondSalary : this.firstSalary
    const hired = day >= this.secondJob ? this.secondJob : this.firstJob
    let salary = base
    for (let year = hired.getFullYear() + 1; year <= day.getFullYear(); year += 1) {
      if (new Date(year, 2, 1) <= day) salary *= 1 + this.raises[year - this.y0]
    }
    return Math.round(salary)
  }

  private salaried(day: Date) {
    if (day >= this.secondJob) return 'Lumen Automatisation'
    if (day >= this.firstJob && day < this.layoff) return 'Boréal Robotique'
    return null
  }

  private earn(day: Date) {
    const weekday = getDay(day)
    if (weekday === 0 || weekday === 6) return
    const employer = this.salaried(day)
    if (employer !== null) {
      this.earned.set(employer, (this.earned.get(employer) ?? 0) + (this.salary(day) / 260) * 100)
      return
    }
    const job = this.hourlyJob(day)
    if (job === null) return
    const daily = (job.hourly * job.hours * this.random.between(0.8, 1.15)) / 5
    this.earned.set(job.employer, (this.earned.get(job.employer) ?? 0) + daily * 100)
  }

  private payday(day: Date) {
    if (this.payAnchor === 0 || (this.index - this.payAnchor) % 14 !== 0) return
    for (const [employer, gross] of this.earned) {
      const salaried = employer === 'Boréal Robotique' || employer === 'Lumen Automatisation'
      const annual = (gross / 100) * 26
      const taxable = salaried ? gross * 0.94 : gross
      const tax = Math.min(0.38, Math.max(0.07, 0.07 + (annual - 15000) * 0.000003))
      this.receive(day, 6, employer, 'Salary', Math.round(taxable * (1 - tax)), 'Pay')
      if (salaried && this.rrsp !== null) {
        this.receive(day, 6, employer, 'Salary', Math.round(gross * 0.12), 'Group RRSP contributions', this.rrsp)
      }
    }
    this.earned.clear()

    const employer = this.salaried(day)
    if (employer !== null && getMonth(day) === 2 && getDate(day) <= 14 && day >= addDays(this.firstJob, 240)) {
      const share =
        employer === 'Lumen Automatisation' ? this.random.between(0.08, 0.12) : this.random.between(0.04, 0.06)
      this.receive(day, 6, employer, 'Salary', Math.round(this.salary(day) * share * 0.6 * 100), 'Annual bonus')
    }

    if (this.laidOff(day) && day >= addDays(this.layoff, 21)) {
      const weekly = Math.min(0.55 * (this.salary(this.layoff) / 52), 668)
      this.receive(
        day,
        7,
        'Service Canada',
        'Government benefits',
        Math.round(weekly * 2 * 0.9 * 100),
        'Employment insurance',
      )
    }
  }

  private housing(day: Date) {
    const dom = getDate(day)
    const month = getMonth(day) + 1
    if (day >= this.moveOut && day < this.ownApartment) {
      const leases = day.getFullYear() - this.moveOut.getFullYear() - (month < 7 ? 1 : 0)
      if (dom === 1) {
        const rent = Math.round(65000 * Math.pow(1.03, leases))
        this.spend(
          day,
          7,
          'Gestion Immobilière Côte-des-Neiges',
          'Rent or mortgage',
          rent,
          'My half of the rent',
          this.chequing,
        )
      }
      if (dom === 12) this.spend(day, 6, 'Vidéotron', 'Internet and phone', this.cents(58, 62), 'Internet')
      if (dom === 20) this.spend(day, 6, 'Desjardins Assurances', 'Home insurance', 1700, 'Tenant insurance')
    }
    if (day >= this.ownApartment) {
      const leases = day.getFullYear() - this.ownApartment.getFullYear() - (month < 7 ? 1 : 0)
      if (dom === 1) {
        const rent = Math.round(129500 * Math.pow(1.04, leases))
        this.spend(day, 7, 'Habitations Rosemont', 'Rent or mortgage', rent, 'Rent', this.chequing)
      }
      if (dom === 18 && month % 2 === 1) {
        const winter = month === 1 || month === 3 || month === 11
        this.spend(
          day,
          6,
          'Hydro-Québec',
          'Electricity and heating',
          this.cents(winter ? 190 : 110, winter ? 260 : 150),
        )
      }
      if (dom === 12) this.spend(day, 6, 'Vidéotron', 'Internet and phone', this.cents(72, 76), 'Internet')
      if (dom === 20) this.spend(day, 6, 'Desjardins Assurances', 'Home insurance', 2400, 'Tenant insurance')
      if (this.random.chance(0.015)) {
        this.spend(day, 14, this.random.pick(pools.household), 'Maintenance', this.cents(12, 65))
      }
    }
  }

  private food(day: Date) {
    if (this.away(day)) return
    const r = this.random
    const phase = this.phase(day)
    const weekday = getDay(day)
    const working = weekday >= 1 && weekday <= 5
    const idle = this.laidOff(day)

    if (weekday === 1) this.shoppedThisWeekend = false
    if (phase === 'cegep' && weekday === 6 && r.chance(0.25)) {
      this.spend(day, 15, r.pick(pools.groceries.cegep), 'Groceries', this.cents(8, 25), 'Snacks')
    }
    if (phase === 'university' && r.chance(0.16)) {
      this.spend(day, 17, r.pick(pools.groceries.university), 'Groceries', this.cents(12, 35))
    }
    if (phase === 'work') {
      if ((weekday === 6 || weekday === 0) && !this.shoppedThisWeekend && r.chance(0.65)) {
        this.shoppedThisWeekend = true
        this.spend(day, 11, r.pick(pools.groceries.work), 'Groceries', this.cents(75, 130))
      } else if (r.chance(0.08)) {
        this.spend(day, 18, r.pick(pools.groceries.work), 'Groceries', this.cents(15, 40))
      }
    }

    const coffee = { cegep: 0.25, university: 0.4, work: idle ? 0.12 : 0.35 }[phase]
    if (working && r.chance(coffee)) this.spend(day, 8.5, r.pick(pools.coffee[phase]), 'Coffee', this.cents(2.5, 5.5))

    const lunch = { cegep: 0.15, university: 0.2, work: idle ? 0.04 : 0.18 }[phase]
    const lunchRange: [number, number] = phase === 'work' ? [13, 20] : [8, 14]
    if (working && r.chance(lunch))
      this.spend(day, 12, r.pick(pools.lunch[phase]), 'Restaurants', this.cents(...lunchRange))

    const delivery = { cegep: 0, university: 0.04, work: 0.08 }[phase]
    if ((weekday === 0 || weekday === 4 || weekday === 6) && r.chance(delivery)) {
      this.spend(day, 19, r.pick(pools.delivery), 'Restaurants', this.cents(25, 45), 'Takeout')
    }

    const friday = { cegep: 0.45, university: 0.55, work: idle ? 0.25 : 0.45 }[phase]
    if (weekday === 5 && r.chance(friday)) {
      const scale = phase === 'cegep' ? 0.7 : 1
      if (r.chance(0.5)) {
        this.spend(
          day,
          22,
          r.pick(pools.bars),
          'Outings',
          Math.round(this.cents(25, 65) * scale),
          'Drinks with friends',
        )
      } else {
        this.spend(
          day,
          19,
          r.pick(pools.dinners),
          'Restaurants',
          Math.round(this.cents(28, 60) * scale),
          'Dinner with friends',
        )
      }
    }
  }

  private transport(day: Date) {
    const dom = getDate(day)
    const month = getMonth(day) + 1
    const phase = this.phase(day)
    if (dom === 1 && day >= this.on(0, 8, 20) && !this.away(day)) {
      if (phase !== 'work') this.spend(day, 8, 'STM', 'Public transit', this.cents(50, 50), 'Reduced fare monthly pass')
      else if (!this.hasCar(day) && !this.laidOff(day))
        this.spend(day, 8, 'STM', 'Public transit', this.cents(94, 94), 'Monthly pass')
    }
    if (phase === 'work' && month === 4 && dom === 15)
      this.spend(day, 12, 'BIXI Montréal', 'Public transit', this.cents(100, 100), 'Season pass')
    if (!this.hasCar(day) || this.away(day)) return

    const r = this.random
    if (r.chance(1 / 7)) this.spend(day, 17, r.pick(pools.gas), 'Gas', this.cents(45, 68))
    if (dom === 3) this.spend(day, 6, 'Belairdirect', 'Car insurance', this.cents(96, 96))
    if ((month === 4 && dom === 20) || (month === 11 && dom === 8))
      this.spend(day, 10, 'Pneus Rosemont', 'Car maintenance', this.cents(70, 90), 'Tire swap')
    if ((month === 6 || month === 10) && dom === 14)
      this.spend(day, 10, 'Mr. Lube', 'Car maintenance', this.cents(85, 110), 'Oil change')
    if (month === 11 && dom === 1 && day.getFullYear() === this.carPurchase.getFullYear()) {
      this.spend(day, 10, 'Pneus Rosemont', 'Car maintenance', this.cents(760, 820), 'Winter tires')
    }
    if (r.chance(0.03)) this.spend(day, 13, 'Stationnement de Montréal', 'Parking', this.cents(6, 18))
    if (r.chance(0.03)) this.spend(day, 9, 'STM', 'Public transit', this.cents(3.75, 3.75), 'Single fare')
    if (
      this.is(day, new Date(day.getFullYear(), this.carPurchase.getMonth(), this.carPurchase.getDate())) &&
      day.getFullYear() > this.carPurchase.getFullYear()
    ) {
      this.spend(day, 9, 'SAAQ', 'Transportation', this.cents(300, 300), 'Registration renewal', this.chequing)
    }
  }

  private health(day: Date) {
    const r = this.random
    const dom = getDate(day)
    const month = getMonth(day) + 1
    if (!this.away(day) && r.chance(0.022)) this.spend(day, 16, r.pick(pools.pharmacy), 'Pharmacy', this.cents(8, 40))

    if (day >= addDays(this.firstJob, 90) && (month === 3 || month === 9) && dom === 14) {
      const amount = this.cents(205, 240)
      this.spend(day, 10, 'Clinique dentaire Rosemont', 'Dental and vision', amount, 'Cleaning and checkup')
      this.schedule(addDays(day, 6), () =>
        this.receive(addDays(day, 6), 9, 'Sun Life', 'Dental and vision', Math.round(amount * 0.8), 'Dental claim'),
      )
    }
    if (this.phase(day) === 'university' && ((month === 9 && dom === 5) || (month === 1 && dom === 8))) {
      this.spend(day, 11, 'CEPSUM', 'Fitness', this.cents(95, 95), 'Gym pass for the semester')
    }
    if (day >= addDays(this.firstJob, 60) && !this.laidOff(day) && dom === 7) {
      this.spend(day, 6, 'Allez Up', 'Fitness', this.cents(79, 79), 'Climbing gym membership')
    }
  }

  private shopping(day: Date) {
    if (this.away(day)) return
    const r = this.random
    const phase = this.phase(day)
    if (r.chance(phase === 'cegep' ? 0.015 : 0.02))
      this.spend(day, 15, r.pick(pools.clothing), 'Clothing', this.cents(25, 110))
    if (phase !== 'cegep' && r.chance(0.012))
      this.spend(day, 14, r.pick(pools.household), 'Household items', this.cents(8, 60))
    if (r.chance(0.006))
      this.spend(
        day,
        20,
        r.pick(pools.gadgets),
        'Electronics',
        this.cents(15, 70),
        r.pick(['SD card', 'Charger', 'Camera filter', 'Headphones', 'Lens cleaning kit']),
      )
  }

  private entertainment(day: Date) {
    const r = this.random
    const dom = getDate(day)
    const month = getMonth(day) + 1
    const year = day.getFullYear() - this.y0
    const phase = this.phase(day)

    if (day >= this.moveOut && dom === 14) {
      if (this.netflix) {
        const price =
          [10.99, 10.99, 10.99, 13.99, 14.99, 14.99, 16.49, 16.49, 18.99, 18.99, 20.99, 20.99][year] ?? 20.99
        this.spend(day, 5, 'Netflix', 'Subscriptions', Math.round(price * 100), '', this.card!)
        if (!this.laidOff(day) && r.chance(0.07)) this.netflix = false
      } else if (!this.laidOff(day) && r.chance(0.15)) {
        this.netflix = true
      }
    }
    if (day >= this.on(0, 11, 1) && dom === 9) {
      const price = day < this.graduation ? 5.99 : year < 8 ? 10.99 : year < 9 ? 11.99 : 12.99
      this.spend(
        day,
        5,
        'Spotify',
        'Subscriptions',
        Math.round(price * 100),
        day < this.graduation ? 'Student plan' : '',
        this.card ?? this.chequing,
      )
    }
    if (day >= this.uniStart && dom === 22) {
      this.spend(day, 5, 'Apple', 'Subscriptions', phase === 'work' ? 399 : 129, 'iCloud storage', this.card!)
    }
    if (day >= this.on(3, 6, 17) && dom === 17) {
      this.spend(day, 5, 'Adobe', 'Subscriptions', year < 7 ? 1379 : 1609, 'Lightroom photography plan', this.card!)
    }
    if (day >= addDays(this.layoff, 7) && day < addDays(this.secondJob, 30) && dom === 25) {
      this.spend(day, 5, 'Disney+', 'Subscriptions', 1199, '', this.card!)
    }
    if (!this.away(day) && getDay(day) === 6 && r.chance(0.05)) {
      this.spend(day, 19, r.pick(['Cineplex', 'Cinéma du Parc']), 'Outings', this.cents(13, 19), 'Movie')
    }
    if (year >= 1 && month === 2 && dom === 20 && r.chance(0.5)) {
      this.spend(day, 12, 'Osheaga', 'Outings', this.cents(330, 400), 'Festival pass')
    }
  }

  private outdoors(day: Date) {
    if (day < this.on(1, 5, 1) || this.away(day)) return
    const r = this.random
    const month = getMonth(day) + 1
    const phase = this.phase(day)
    if (month >= 5 && month <= 10 && getDay(day) === 6 && r.chance(phase === 'work' ? 0.28 : 0.15)) {
      const park = r.pick([
        'Parc national du Mont-Tremblant',
        'Parc national du Mont-Orford',
        'Parc national de la Jacques-Cartier',
        'Parc national du Mont-Mégantic',
      ])
      this.spend(day, 7, 'Sépaq', 'Outings', this.cents(9.5, 9.5), `Day pass, ${park}`)
      if (this.hasCar(day)) this.spend(day, 6, r.pick(pools.gas), 'Gas', this.cents(35, 55), 'Gas for the hike')
      else if (r.chance(0.5)) this.spend(day, 6, 'Communauto', 'Transportation', this.cents(60, 95), 'Car for the hike')
      this.spend(day, 6.5, 'Dépanneur Chez Ben', 'Groceries', this.cents(12, 22), 'Trail snacks')
      if (phase === 'work' && r.chance(0.35)) {
        this.spend(day, 16, 'Sépaq', 'Travel', this.cents(38, 48), `Campsite, ${park}`)
      }
      if (!this.sprained && day >= this.on(9, 7, 1) && day < this.on(9, 9, 1) && day >= this.secondJob) {
        this.sprained = true
        for (let session = 0; session < 6; session += 1) {
          const visit = addDays(day, 3 + session * 7)
          this.schedule(visit, () => {
            const amount = this.cents(95, 95)
            this.spend(visit, 17, 'Physio Rosemont', 'Health', amount, 'Physiotherapy for a sprained ankle')
            this.schedule(addDays(visit, 4), () =>
              this.receive(addDays(visit, 4), 9, 'Sun Life', 'Health', Math.round(amount * 0.8), 'Physiotherapy claim'),
            )
          })
        }
      }
    }
    if (month <= 3 && getDay(day) === 0 && r.chance(0.05)) {
      this.spend(day, 8, 'Sépaq', 'Outings', this.cents(9.5, 9.5), 'Snowshoeing day pass')
    }
  }

  private personal(day: Date) {
    const r = this.random
    const dom = getDate(day)
    const month = getMonth(day) + 1
    const phase = this.phase(day)
    const weekday = getDay(day)

    if (month === 12 && dom === 7) this.christmasGifts = phase === 'work' ? 6 : 4
    if (month === 12 && dom >= 8 && dom <= 22 && this.christmasGifts > 0 && r.chance(0.3)) {
      this.christmasGifts -= 1
      const [min, max] = phase === 'work' ? [30, 90] : [20, 55]
      this.spend(day, 16, r.pick(pools.gifts), 'Gifts', this.cents(min, max), 'Christmas gift')
    }
    if (month === 12 && dom === 24)
      this.receive(day, 20, 'Grandparents', 'Gifts', r.int(5, 15) * 1000, 'Christmas money')
    if (month === this.birthday.getMonth() + 1 && dom === this.birthday.getDate() && phase !== 'work') {
      this.receive(day, 12, 'Grandparents', 'Gifts', r.int(5, 10) * 1000, 'Birthday money')
    }
    if (month === 5 && dom >= 8 && dom <= 14 && weekday === 6)
      this.spend(day, 11, 'Fleuriste Marie-Antoinette', 'Gifts', this.cents(35, 60), 'Mother’s Day')
    if (month === 6 && dom >= 15 && dom <= 21 && weekday === 6)
      this.spend(day, 11, 'SAQ', 'Gifts', this.cents(40, 70), 'Father’s Day')
    if (!this.away(day) && r.chance(6 / 365))
      this.spend(day, 17, r.pick(pools.gifts), 'Gifts', this.cents(25, 55), 'Birthday gift for a friend')

    if (phase === 'university' && dom === 1 && !this.internships.some((i) => day >= i.from && day <= i.to)) {
      this.receive(day, 9, 'Mom & Dad', 'Gifts', 15000, 'Help with the rent')
    }

    if (day < this.on(2, 5, 18) && ((month === 8 && dom === 20) || (month === 1 && dom === 15))) {
      this.spend(day, 10, 'Cégep Édouard-Montpetit', 'Education', this.cents(185, 185), 'Semester fees', this.chequing)
      this.spend(day, 13, 'Coop Édouard-Montpetit', 'Education', this.cents(90, 200), 'Textbooks')
    }
    if (day >= this.uniStart && day < this.graduation && ((month === 9 && dom === 15) || (month === 1 && dom === 15))) {
      const year = Math.floor(differenceInCalendarDays(day, this.uniStart) / 365)
      this.spend(
        day,
        10,
        'Polytechnique Montréal',
        'Education',
        Math.round(195000 * Math.pow(1.03, year)),
        'Tuition',
        this.chequing,
      )
      this.spend(day, 13, 'Coop Polytechnique', 'Education', this.cents(150, 350), 'Textbooks and calculator')
    }
    if (day >= this.on(7, 1, 1) && month === 4 && dom === 1) {
      this.spend(
        day,
        9,
        'Ordre des ingénieurs du Québec',
        'Education',
        this.cents(440, 440),
        'Annual membership',
        this.chequing,
      )
    }

    if (this.nextCatFood !== null && this.is(day, this.nextCatFood)) {
      this.spend(day, 14, 'Mondou', 'Pets', this.cents(45, 62), 'Cat food and litter')
      this.nextCatFood = addDays(day, r.int(22, 30))
    }
    if (day > addDays(this.catAdoption, 300) && month === this.catAdoption.getMonth() + 1 && dom === 15) {
      this.spend(day, 10, 'Clinique vétérinaire Rosemont', 'Pets', this.cents(160, 240), 'Annual checkup and vaccines')
    }
  }

  private government(day: Date) {
    const r = this.random
    const dom = getDate(day)
    const month = getMonth(day) + 1
    const lowIncome = day >= addDays(this.start, 365) && day < this.on(7, 7, 1)
    if (lowIncome && dom === 5 && month % 3 === 1)
      this.receive(day, 6, 'Canada Revenue Agency', 'Government benefits', this.cents(70, 95), 'GST credit')
    if (lowIncome && dom === 5)
      this.receive(day, 6, 'Revenu Québec', 'Government benefits', this.cents(35, 55), 'Solidarity tax credit')

    if (day >= this.uniStart && day < this.graduation && dom === 10 && (month === 9 || month === 1)) {
      this.receive(day, 6, 'Aide financière aux études', 'Government benefits', this.cents(1100, 1600), 'Bursary')
      this.move(day, 6, this.loan!, this.chequing, r.int(190, 230) * 1000, 'Loan disbursement')
    }

    if (month === 4 && dom === 29 && day >= addDays(this.start, 300)) {
      const taxYear = day.getFullYear() - 1
      if (taxYear === this.layoff.getFullYear()) {
        this.spend(
          day,
          9,
          'Revenu Québec',
          'Taxes',
          r.int(90, 160) * 1000,
          'Balance owing, severance was under-withheld',
          this.chequing,
        )
        return
      }
      const [min, max] = { cegep: [100, 300], university: [200, 450], work: [150, 700] }[this.phase(addDays(day, -120))]
      this.receive(day, 6, 'Canada Revenue Agency', 'Taxes', this.cents(min, max), 'Tax refund')
      const provincial = this.cents(min, max)
      this.schedule(addDays(day, 8), () =>
        this.receive(addDays(day, 8), 6, 'Revenu Québec', 'Taxes', provincial, 'Tax refund'),
      )
    }
  }

  private roommate(day: Date) {
    if (day < this.moveOut || day >= this.ownApartment) return
    const group = 1
    if (this.is(day, this.moveOut)) {
      this.groups.push(this.group(group, 'Groceries with Sam', [alex, sam], CAD, this.cat('Groceries'), day))
    }
    if (getDay(day) === 0 && !this.away(day) && this.random.chance(0.85)) {
      const amount = this.cents(70, 140)
      const share = Math.floor(amount / 2)
      const store = this.random.pick(pools.groceries.university)
      if (this.random.chance(0.5)) {
        const sender = this.wallet()
        this.cover(day, 11, sender, amount)
        this.ledger.record({
          date: this.at(day, 11),
          amount,
          currency: CAD,
          sender,
          receiver: this.ledger.payee(store, day),
          category: this.cat('Groceries'),
          note: 'Weekly groceries',
          group,
        })
        this.samBalance += share
      } else {
        this.ledger.record({
          date: this.at(day, 11),
          amount,
          currency: CAD,
          sender: null,
          receiver: null,
          category: null,
          note: store,
          group,
          owner: sam.email,
        })
        this.samBalance -= share
      }
    }
    const lastDay = this.is(addDays(day, 1), this.ownApartment)
    if (
      (getDate(day) === 1 && getMonth(day) % 2 === 0 && Math.abs(this.samBalance) >= 2000) ||
      (lastDay && this.samBalance !== 0)
    ) {
      const amount = Math.abs(this.samBalance)
      const alexPays = this.samBalance < 0
      const own = alexPays
        ? this.spend(day, 20, sam.name, 'Groceries', amount, `Settlement with ${sam.name}`, this.chequing)
        : this.receive(day, 20, sam.name, 'Groceries', amount, `Settlement with ${sam.name}`)
      const payer = alexPays ? alex.email : sam.email
      this.ledger.settle({
        transactionGroupId: group,
        amount,
        date: this.at(day, 20),
        note: 'Groceries',
        payer,
        receiver: alexPays ? sam.email : alex.email,
        createdBy: payer,
        proposedBy: payer,
        completed: true,
        ownTransactionId: own,
      })
      this.samBalance = 0
    }
  }

  private europeTrip(day: Date) {
    const r = this.random
    const group = 2
    const members = [alex, sam, charlie, jordan]
    if (this.is(day, addDays(this.europeStart, -90))) {
      this.spend(day, 21, 'Air Transat', 'Travel', this.cents(1150, 1350), 'Flights to Paris, back from Vienna')
    }
    if (this.is(day, addDays(this.europeStart, -60))) {
      this.groups.push(
        this.group(group, `Europe ${this.europeStart.getFullYear()}`, members, EUR, this.cat('Travel'), day),
      )
    }
    if (this.is(day, addDays(this.europeStart, -21))) {
      this.wise = this.ledger.open('Wise', 'Chequing', 'Wise', day)
      this.convertToEuros(day, 130000)
      this.spend(day, 9, 'Wise', 'Bank fees', 900, 'Conversion fee', this.chequing)
    }
    if (!this.inEurope(day) && !this.is(day, this.europeEnd)) return

    const shared = (hour: number, payee: string, amount: number, note: string) => {
      const payer = r.pick(members)
      if (payer === alex) {
        this.ensureEuros(day, amount)
        this.ledger.record({
          date: this.at(day, hour),
          amount,
          currency: EUR,
          sender: this.wise,
          receiver: this.ledger.payee(payee, day),
          category: this.cat('Travel'),
          note,
          group,
        })
      } else {
        this.ledger.record({
          date: this.at(day, hour),
          amount,
          currency: EUR,
          sender: null,
          receiver: null,
          category: null,
          note: `${payee}, ${note}`,
          group,
          owner: payer.email,
        })
      }
      const share = Math.floor(amount / members.length)
      for (const member of members) {
        const paid = member === payer ? amount : 0
        const owed = member === payer ? amount - share * (members.length - 1) : share
        this.europeNet.set(member.email, (this.europeNet.get(member.email) ?? 0) + paid - owed)
      }
    }
    const personal = (hour: number, payee: string, category: string, amount: number, note: string) => {
      this.ensureEuros(day, amount)
      this.ledger.record({
        date: this.at(day, hour),
        amount,
        currency: EUR,
        sender: this.wise,
        receiver: this.ledger.payee(payee, day),
        category: this.cat(category),
        note,
      })
    }
    const euros = (min: number, max: number) => Math.round(r.between(min, max) * 100)

    if (this.is(day, this.europeEnd)) {
      this.settleEurope(day, members, group)
      const leftover = this.ledger.balance(this.wise!, EUR)
      if (leftover > 0) {
        this.ledger.record({
          date: this.at(day, 20),
          amount: leftover,
          currency: EUR,
          sender: this.wise,
          receiver: this.chequing,
          category: null,
          note: 'Leftover euros back to CAD',
          receiverCurrency: CAD,
          receiverAmount: Math.round(leftover * this.price(EUR) * 0.996),
        })
      }
      return
    }

    const elapsed = differenceInCalendarDays(day, this.europeStart)
    let night = 0
    const stop = europe.find((s) => {
      night += s.nights
      return elapsed < night
    })!
    const arrival = elapsed === night - stop.nights
    if (arrival) {
      shared(15, 'Airbnb', euros(150, 220) * stop.nights, `Apartment in ${stop.city}`)
      if (elapsed > 0) shared(9, stop.train, euros(160, 300), `Tickets to ${stop.city}`)
    }
    if (r.chance(0.7)) shared(10, stop.grocery, euros(18, 40), 'Breakfast groceries')
    shared(20, r.pick(stop.food), euros(80, 140), `Dinner in ${stop.city}`)
    if (r.chance(0.65)) shared(13, r.pick(stop.sights), euros(40, 110), 'Tickets')
    if (r.chance(0.5)) shared(23, 'Bar', euros(45, 100), `Night out in ${stop.city}`)
    if (r.chance(0.8)) personal(8.5, 'Boulangerie', 'Coffee', euros(4, 9), `Coffee and pastry in ${stop.city}`)
    if (r.chance(0.2)) personal(16, 'Souvenir shop', 'Gifts', euros(10, 35), `Souvenir from ${stop.city}`)
  }

  private settleEurope(day: Date, members: Person[], group: number) {
    const balances = members.map((m) => ({ person: m, net: this.europeNet.get(m.email) ?? 0 }))
    const debtors = balances.filter((b) => b.net < 0).sort((a, b) => a.net - b.net)
    const creditors = balances.filter((b) => b.net > 0).sort((a, b) => b.net - a.net)
    for (const debtor of debtors) {
      for (const creditor of creditors) {
        const amount = Math.min(-debtor.net, creditor.net)
        if (amount <= 0) continue
        debtor.net += amount
        creditor.net -= amount
        let own: number | null = null
        if (debtor.person === alex || creditor.person === alex) {
          const counterpart = debtor.person === alex ? creditor.person : debtor.person
          if (debtor.person === alex) this.ensureEuros(day, amount)
          own = this.ledger.record({
            date: this.at(day, 19),
            amount,
            currency: EUR,
            sender: debtor.person === alex ? this.wise : this.ledger.payee(counterpart.name, day),
            receiver: debtor.person === alex ? this.ledger.payee(counterpart.name, day) : this.wise,
            category: this.cat('Travel'),
            note: `Settlement with ${counterpart.name}`,
          })
        }
        this.ledger.settle({
          transactionGroupId: group,
          amount,
          date: this.at(day, 19),
          note: 'Europe trip',
          payer: debtor.person.email,
          receiver: creditor.person.email,
          createdBy: debtor.person.email,
          proposedBy: debtor.person.email,
          completed: true,
          ownTransactionId: own,
        })
      }
    }
  }

  private usTrip(day: Date) {
    if (day < this.usTripStart || day >= this.usTripEnd) return
    const r = this.random
    const usd = (min: number, max: number) => Math.round(r.between(min, max) * 100)
    if (this.is(day, this.usTripStart)) {
      this.spend(
        day,
        8,
        'Enterprise Rent-A-Car',
        'Transportation',
        this.cents(360, 420),
        'Car rental for the White Mountains trip',
      )
      this.spendAbroad(day, 16, 'REI North Conway', 'Clothing', usd(60, 160), 'Rain jacket')
    }
    this.spendAbroad(day, 17, 'White Mountain National Forest', 'Travel', usd(30, 38), 'Campsite')
    this.spendAbroad(
      day,
      19,
      r.pick(['Moat Mountain Smokehouse', 'Peg Leg Pizza', 'Muddy Moose']),
      'Restaurants',
      usd(30, 60),
    )
    if (r.chance(0.5)) this.spendAbroad(day, 10, r.pick(['Mobil', 'Irving']), 'Gas', usd(40, 55))
    if (r.chance(0.6)) this.spendAbroad(day, 8, 'Hannaford', 'Groceries', usd(20, 45), 'Trail food')
  }

  private investing(day: Date) {
    const dom = getDate(day)
    const month = getMonth(day) + 1
    if (this.tfsa !== null && dom === 16 && !this.laidOff(day)) {
      this.move(day, 7, this.chequing, this.tfsa, day >= this.secondJob ? 100000 : 50000, 'Monthly TFSA contribution')
    }
    for (const [account, mix] of [
      [this.tfsa, tfsaMix],
      [this.rrsp, rrspMix],
    ] as const) {
      if (account === null) continue
      if (dom === 18) this.buy(day, account, mix)
      if (dom === 27) {
        for (const fund of funds) {
          const monthly = fund === BOND
          if (!monthly && month % 3 !== 0) continue
          const units = this.ledger.balance(account, fund) / 10000
          const amount = Math.round(units * this.price(fund) * 100 * (fundYield[fund] / (monthly ? 12 : 4)))
          if (amount <= 0) continue
          this.ledger.record({
            date: this.at(day, 6),
            amount,
            currency: CAD,
            sender: this.ledger.payee(currencies.find((c) => c.id === fund)!.name, day),
            receiver: account,
            category: this.cat('Interest and dividends'),
            note: 'Distribution',
            investment: fund,
          })
        }
      }
    }
  }

  private buy(day: Date, account: number, mix: readonly [number, number][]) {
    const cash = this.ledger.balance(account, CAD)
    if (cash < 10000) return
    for (const [fund, weight] of mix) {
      const amount = Math.floor(cash * weight)
      const units = Math.floor((amount / 100 / this.price(fund)) * 10000)
      if (units <= 0) continue
      this.ledger.record({
        date: this.at(day, 10),
        amount,
        currency: CAD,
        sender: account,
        receiver: account,
        category: null,
        note: `Buy ${currencies.find((c) => c.id === fund)!.symbol}`,
        receiverCurrency: fund,
        receiverAmount: units,
      })
    }
  }

  private sell(day: Date, account: number, needed: number) {
    let raised = 0
    for (const fund of [BOND, GEQ, TECH]) {
      if (raised >= needed) break
      const held = this.ledger.balance(account, fund)
      const unitPrice = this.price(fund) / 100
      const units = Math.min(held, Math.ceil((needed - raised) / unitPrice))
      if (units <= 0) continue
      const proceeds = Math.round(units * unitPrice)
      this.ledger.record({
        date: this.at(day, 10),
        amount: units,
        currency: fund,
        sender: account,
        receiver: account,
        category: null,
        note: `Sell ${currencies.find((c) => c.id === fund)!.symbol}`,
        receiverCurrency: CAD,
        receiverAmount: proceeds,
      })
      raised += proceeds
    }
  }

  private banking(day: Date) {
    const dom = getDate(day)
    const phase = this.phase(day)
    if (this.card !== null) {
      if (dom === 15) this.statement = Math.max(0, -this.ledger.balance(this.card, CAD))
      if (dom === 5 && this.statement > 0) {
        this.move(day, 7, this.chequing, this.card, this.statement, 'Credit card payment')
        this.statement = 0
      }
    }
    if (day >= this.firstJob && dom === 1)
      this.spend(day, 5, 'Desjardins', 'Bank fees', 595, 'Monthly account fee', this.chequing)

    if (this.loan !== null && day >= this.on(6, 11, 1) && dom === 1) {
      const owed = -this.ledger.balance(this.loan, CAD)
      if (owed > 0) {
        const interest = Math.round((owed * 0.0525) / 12)
        this.spend(day, 5, 'Aide financière aux études', 'Fees and taxes', interest, 'Student loan interest', this.loan)
        this.move(day, 6, this.chequing, this.loan, Math.min(owed + interest, 30000), 'Student loan payment')
      }
    }

    if (isLastDayOfMonth(day)) {
      const year = day.getFullYear() - this.y0
      const rate = year < 6 ? 0.006 : year < 9 ? 0.03 : 0.0225
      const interest = Math.round((this.ledger.balance(this.savings, CAD) * rate) / 12)
      if (interest > 0)
        this.receive(day, 23, 'Desjardins', 'Interest and dividends', interest, 'Savings interest', this.savings)
      this.sweep(day, phase)
    }

    const floor = { cegep: 10000, university: 20000, work: 50000 }[phase]
    const chequing = this.ledger.balance(this.chequing, CAD)
    if (chequing < floor) this.raiseCash(day, floor * 2 - chequing)
  }

  private sweep(day: Date, phase: Phase) {
    const buffer = { cegep: 70000, university: 150000, work: 350000 }[phase]
    const excess = this.ledger.balance(this.chequing, CAD) - buffer
    if (excess > 30000)
      this.move(day, 22, this.chequing, this.savings, Math.floor(excess / 5000) * 5000, 'Transfer to savings')

    if (this.tfsa === null || this.laidOff(day) || (day >= this.secondJob && day < this.carPurchase)) return
    let surplus = this.ledger.balance(this.savings, CAD) - 1000000
    if (surplus < 50000) return
    const owed = this.loan === null ? 0 : -this.ledger.balance(this.loan, CAD)
    if (owed > 0) {
      const extra = Math.min(owed, surplus)
      this.move(day, 22, this.savings, this.loan!, extra, 'Extra student loan payment')
      surplus -= extra
    }
    if (surplus >= 50000)
      this.move(day, 22, this.savings, this.tfsa, Math.floor(surplus / 5000) * 5000, 'TFSA contribution')
  }

  private raiseCash(day: Date, needed: number, hour = 21) {
    const fromSavings = Math.min(Math.max(0, this.ledger.balance(this.savings, CAD)), needed)
    this.move(day, hour, this.savings, this.chequing, fromSavings, 'Transfer from savings')
    let missing = needed - fromSavings
    if (missing > 0 && this.phase(day) !== 'work') {
      this.receive(day, hour, 'Mom & Dad', 'Gifts', Math.ceil(missing / 10000) * 10000, 'Help from Mom & Dad')
      return
    }
    if (missing <= 0 || this.tfsa === null) return
    if (this.ledger.balance(this.tfsa, CAD) < missing)
      this.sell(day, this.tfsa, missing - this.ledger.balance(this.tfsa, CAD))
    missing = Math.min(missing, this.ledger.balance(this.tfsa, CAD))
    this.move(day, hour, this.tfsa, this.chequing, missing, 'TFSA withdrawal')
  }

  private markets(day: Date) {
    const last = differenceInCalendarDays(this.now, day) === 0
    if (this.index % 7 !== 0 && !last) return
    const date = startOfDay(day)
    for (const currency of [USD, EUR]) this.rates.push({ a: currency, b: CAD, date, rate: this.price(currency) })
    if (day < addDays(this.firstJob, -30)) return
    for (const fund of funds) this.rates.push({ a: fund, b: CAD, date, rate: this.price(fund) / 100 })
  }

  private group(
    id: number,
    name: string,
    members: Person[],
    currency: number,
    category: number,
    createdAt: Date,
  ): TransactionGroup {
    const groupCurrency = currencies.find((c) => c.id === currency)!
    return {
      id,
      name,
      originalCurrency: groupCurrency.name,
      originalCurrencySymbol: groupCurrency.symbol,
      originalCurrencyDecimalPoints: groupCurrency.decimalPoints,
      splitType: SplitType.EQUAL,
      members: members.map((m) => ({ email: m.email, name: m.name, splitValue: null, joined: true })),
      currency,
      category,
      hidden: false,
      createdAt,
    }
  }

  currentSalary() {
    return this.salary(this.now)
  }
}

export const generateDemoData = (now: Date, seed: number): DemoData => {
  const story = new Story(new Random(seed), now)
  story.run()

  return {
    user: {
      sub: 'demo',
      email: alex.email,
      name: alex.name,
      display_name: alex.name,
      default_currency: CAD,
      hidden_default_account: 0,
      authentification_method: 'demo',
      preferences: {
        gettingStartedDismissed: true,
        categoryTutorialDone: true,
        costsGrossIncome: story.currentSalary(),
        costsEmploymentIncomeCategoryIds: [story.categories.find((c) => c.name === 'Salary')!.id],
      },
    },
    currencies,
    accounts: story.ledger.accounts,
    categories: story.categories,
    exchangeRates: story.rates,
    transactions: story.ledger.transactions,
    transactionGroups: story.groups,
    settlements: story.ledger.settlements,
  }
}
