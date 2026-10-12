import { Box, Button, Stack, Typography } from '@mui/material'
import { FC, useContext, useState } from 'react'

import CategoryForm from './CategoryForm'
import { commonCategories, iconColor, TemplateCategory } from './commonCategories'
import Category, { CategoryUpdatableFields } from '../../domain/model/category'
import MixedAugmentation from '../../service/MixedAugmentation'
import { CategoryServiceContext } from '../../service/ServiceContext'
import IconCapsule from '../icons/IconCapsule'
import { Section } from '../shared/Layout'
import { SecureButton } from '../shared/SecureButton'
import { useToast } from '../shared/ToastProvider'

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
  const [step, setStep] = useState<'template' | 'own'>('template')
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
    onDone()
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

  if (step === 'own') {
    return (
      <Screen>
        <Typography variant="h5">Create your first category</Typography>
        <Typography color="textSecondary">
          Start with the one almost everyone needs. You can add the rest later from the Categories page.
        </Typography>
        <CategoryForm initialCategory={groceries} onSubmit={createCategory} submitText="Create my first category" />
        <Button color="inherit" onClick={onDone}>
          Skip
        </Button>
      </Screen>
    )
  }

  return (
    <Screen>
      <Typography variant="h5">Organize your spending with categories</Typography>
      <Typography color="textSecondary">
        Each transaction gets a category, like Groceries or Rent, so you can see where your money goes. Categories can
        be nested: Groceries and Restaurants both sit under Food. Start with this ready-made set, everything stays yours
        to rename, move or delete later from the Categories page.
      </Typography>
      <Section title="Common categories">
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(14rem, 1fr))', gap: 2 }}>
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
      </Section>
      <SecureButton variant="contained" onClick={applyTemplate} loading={applying}>
        Add these categories
      </SecureButton>
      <Button color="inherit" onClick={() => setStep('own')} disabled={applying}>
        No thanks, I'll make my own
      </Button>
    </Screen>
  )
}

export default CategoryTutorial
