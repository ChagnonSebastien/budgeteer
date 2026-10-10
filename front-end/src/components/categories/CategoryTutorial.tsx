import { Box, Button, Stack, Typography } from '@mui/material'
import { FC, useContext, useState } from 'react'

import CategoryForm from './CategoryForm'
import Category, { CategoryUpdatableFields } from '../../domain/model/category'
import MixedAugmentation from '../../service/MixedAugmentation'
import { CategoryServiceContext } from '../../service/ServiceContext'
import IconCapsule from '../icons/IconCapsule'
import { SecureButton } from '../shared/SecureButton'
import { useToast } from '../shared/ToastProvider'

interface TemplateCategory {
  name: string
  icon: string
  fixedCosts?: boolean
  children?: TemplateCategory[]
}

interface TemplateGroup extends TemplateCategory {
  color: string
}

const iconColor = '#FFFFFF'

const commonCategories: TemplateGroup[] = [
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

const Screen: FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ height: '100%', overflowY: 'auto', display: 'flex' }}>
    <Stack spacing={2} sx={{ p: 2, maxWidth: (t) => t.contentWidth.default, width: '100%', m: 'auto' }}>
      {children}
    </Stack>
  </Box>
)

const CategoryTutorial: FC<{ onDone(): void }> = ({ onDone }) => {
  const { create, state: categories } = useContext(CategoryServiceContext)
  const { rootCategory } = useContext(MixedAugmentation)
  const { showToast } = useToast()
  const [step, setStep] = useState<'intro' | 'template'>('intro')
  const [applying, setApplying] = useState(false)

  const groceries = new Category(-1, 'Groceries', 'FaCartShopping', iconColor, '#43A047', rootCategory.id, true, 0)

  const createCategory = async (data: Partial<CategoryUpdatableFields>) => {
    await create({
      name: data.name!,
      iconName: data.iconName!,
      iconColor: data.iconColor!,
      iconBackground: data.iconBackground!,
      parentId: data.parentId!,
      fixedCosts: data.fixedCosts!,
      ordering: data.ordering!,
    })
    setStep('template')
  }

  const applyTemplate = async () => {
    setApplying(true)
    const taken = new Set(categories.map((c) => c.name.toLowerCase()))
    const add = async (template: TemplateCategory, color: string, parentId: number) => {
      if (taken.has(template.name.toLowerCase())) return
      const created = await create({
        name: template.name,
        iconName: template.icon,
        iconColor,
        iconBackground: color,
        parentId,
        fixedCosts: template.fixedCosts ?? false,
        ordering: 0,
      })
      for (const child of template.children ?? []) await add(child, color, created.id)
    }
    try {
      for (const group of commonCategories) await add(group, group.color, rootCategory.id)
      showToast('Categories added')
      onDone()
    } catch (err) {
      console.error(err)
      showToast('Could not add every category, you can finish from the Categories page', 'error')
      onDone()
    }
  }

  if (step === 'intro') {
    return (
      <Screen>
        <Typography variant="h5">Organize your spending with categories</Typography>
        <Typography color="textSecondary">
          Each transaction gets a category, like Groceries or Rent, so you can see where your money goes. Categories can
          be nested: Groceries and Restaurants can both sit under Food. Let's start with the one almost everyone needs.
        </Typography>
        <CategoryForm initialCategory={groceries} onSubmit={createCategory} submitText="Create my first category" />
        <Button color="inherit" onClick={() => setStep('template')}>
          Skip
        </Button>
      </Screen>
    )
  }

  return (
    <Screen>
      <Typography variant="h5">Get a head start</Typography>
      <Typography color="textSecondary">
        Add a ready-made set of common categories in one click. Everything stays yours to rename, move or delete later
        from the Categories page.
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(14rem, 1fr))',
          gap: 2,
          border: '1px solid rgba(128,128,128,0.3)',
          borderRadius: 1,
          p: 2,
        }}
      >
        {commonCategories.map((group) => (
          <Stack key={group.name} spacing={0.75}>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconCapsule iconName={group.icon} color={iconColor} backgroundColor={group.color} size="1.75rem" />
              <Typography fontWeight="600">{group.name}</Typography>
            </Stack>
            {group.children?.map((child) => (
              <Stack key={child.name} direction="row" spacing={1} alignItems="center" sx={{ pl: 2 }}>
                <IconCapsule iconName={child.icon} color={iconColor} backgroundColor={group.color} size="1.25rem" />
                <Typography variant="body2">{child.name}</Typography>
              </Stack>
            ))}
          </Stack>
        ))}
      </Box>
      <SecureButton variant="contained" onClick={applyTemplate} loading={applying}>
        Add these categories
      </SecureButton>
      <Button color="inherit" onClick={onDone} disabled={applying}>
        No thanks, I'll make my own
      </Button>
    </Screen>
  )
}

export default CategoryTutorial
