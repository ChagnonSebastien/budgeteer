export interface TemplateCategory {
  name: string
  icon: string
  fixedCosts?: boolean
  children?: TemplateCategory[]
}

export interface TemplateGroup extends TemplateCategory {
  color: string
}

export const iconColor = '#FFFFFF'

export const commonCategories: TemplateGroup[] = [
  {
    name: 'Housing',
    icon: 'FaHouse',
    color: '#5C6BC0',
    children: [
      { name: 'Rent or mortgage', icon: 'FaKey', fixedCosts: true },
      { name: 'Electricity and heating', icon: 'FaBolt', fixedCosts: true },
      { name: 'Internet and phone', icon: 'FaWifi', fixedCosts: true },
      { name: 'Home insurance', icon: 'FaShieldHalved', fixedCosts: true },
      { name: 'Maintenance', icon: 'FaScrewdriverWrench', fixedCosts: true },
    ],
  },
  {
    name: 'Food',
    icon: 'FaUtensils',
    color: '#43A047',
    children: [
      { name: 'Groceries', icon: 'FaCartShopping', fixedCosts: true },
      { name: 'Restaurants', icon: 'FaBurger' },
      { name: 'Coffee', icon: 'FaMugHot' },
    ],
  },
  {
    name: 'Transportation',
    icon: 'FaCar',
    color: '#FB8C00',
    children: [
      { name: 'Gas', icon: 'FaGasPump', fixedCosts: true },
      { name: 'Public transit', icon: 'FaBus', fixedCosts: true },
      { name: 'Car insurance', icon: 'FaShieldHalved', fixedCosts: true },
      { name: 'Car maintenance', icon: 'FaWrench', fixedCosts: true },
      { name: 'Parking', icon: 'FaSquareParking' },
    ],
  },
  {
    name: 'Health',
    icon: 'FaHeartPulse',
    color: '#E53935',
    children: [
      { name: 'Pharmacy', icon: 'FaPills', fixedCosts: true },
      { name: 'Dental and vision', icon: 'FaTooth', fixedCosts: true },
      { name: 'Fitness', icon: 'FaDumbbell' },
    ],
  },
  {
    name: 'Shopping',
    icon: 'FaBagShopping',
    color: '#8E24AA',
    children: [
      { name: 'Clothing', icon: 'FaShirt' },
      { name: 'Electronics', icon: 'FaLaptop' },
      { name: 'Household items', icon: 'FaCouch' },
    ],
  },
  {
    name: 'Entertainment',
    icon: 'FaFilm',
    color: '#00ACC1',
    children: [
      { name: 'Subscriptions', icon: 'FaTv', fixedCosts: true },
      { name: 'Outings', icon: 'FaTicket' },
      { name: 'Travel', icon: 'FaPlane' },
    ],
  },
  {
    name: 'Personal',
    icon: 'FaUser',
    color: '#6D4C41',
    children: [
      { name: 'Gifts', icon: 'FaGift' },
      { name: 'Education', icon: 'FaGraduationCap' },
      { name: 'Pets', icon: 'FaPaw' },
    ],
  },
  {
    name: 'Fees and taxes',
    icon: 'FaFileInvoiceDollar',
    color: '#546E7A',
    children: [
      { name: 'Bank fees', icon: 'FaBuildingColumns' },
      { name: 'Taxes', icon: 'FaLandmark' },
    ],
  },
  {
    name: 'Income',
    icon: 'FaMoneyBillWave',
    color: '#2E7D32',
    children: [
      { name: 'Salary', icon: 'FaBriefcase' },
      { name: 'Government benefits', icon: 'FaBuildingColumns' },
      { name: 'Interest and dividends', icon: 'FaPiggyBank' },
    ],
  },
]
