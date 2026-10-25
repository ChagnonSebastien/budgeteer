import { Box, Button, Checkbox, FormControlLabel, Stack, TextField, useTheme } from '@mui/material'
import { styled } from '@mui/material/styles'
import { FC, FormEvent, useContext, useMemo, useState } from 'react'
import { HexColorPicker } from 'react-colorful'

import CategoryPicker from './CategoryPicker'
import Category from '../../domain/model/category'
import MixedAugmentation from '../../service/MixedAugmentation'
import { CategoryServiceContext } from '../../service/ServiceContext'
import IconCapsule, { IconProperties } from '../icons/IconCapsule'
import IconList from '../icons/IconList'
import AppDialog from '../shared/AppDialog'
import { CustomScrolling } from '../shared/CustomScrolling'
import FormWrapper, { FormSection } from '../shared/FormWrapper'
import { useToast } from '../shared/ToastProvider'

const SizedHexColorPicker = styled(HexColorPicker)({
  '&.react-colorful': {
    width: 'min(30rem, calc(100vw / 2))',
    height: 'min(30rem, calc(100vh / 2))',
  },
})

type IconPropertyEditorProps = {
  buttonText: string
  onClick(): void
  indicatorIconProperties: IconProperties
}

const IconPropertyEditor: FC<IconPropertyEditorProps> = (props) => (
  <Stack direction="row" spacing={2}>
    <Button onClick={props.onClick} variant="outlined" color="secondary" fullWidth>
      {props.buttonText}
    </Button>
    <IconCapsule size="2rem" bordered {...props.indicatorIconProperties} />
  </Stack>
)

interface Props {
  initialCategory?: Category
  onSubmit: (data: Partial<Omit<Category, 'id' | 'hasName'>>) => Promise<void>
  submitText: string
}

const CategoryForm: FC<Props> = (props) => {
  const { initialCategory, onSubmit, submitText } = props
  const theme = useTheme()

  const { state: categories } = useContext(CategoryServiceContext)
  const { rootCategory } = useContext(MixedAugmentation)

  const editingRoot = useMemo(() => initialCategory?.id === rootCategory.id, [initialCategory, rootCategory])

  const [name, setName] = useState(initialCategory?.name ?? '')
  const [parent, setParent] = useState<number>(initialCategory?.parentId ?? rootCategory.id)
  const [selectedIcon, setSelectedIcon] = useState<string>(initialCategory?.iconName ?? 'FaQuestion')
  const [innerColor, setInnerColor] = useState(initialCategory?.iconColor ?? '#2F4F4F')
  const [outerColor, setOuterColor] = useState(initialCategory?.iconBackground ?? '#FFA500')
  const [fixedCost, setFixedCost] = useState(initialCategory?.fixedCosts ?? false)

  const [filter, setFilter] = useState<string>('')
  const [showIconModal, setShowIconModal] = useState(false)
  const [showInnerColorModal, setShowInnerColorModal] = useState(false)
  const [showOuterColorModal, setShowOuterColorModal] = useState(false)

  const { showToast } = useToast()
  const [isTouched, setIsTouched] = useState(false)

  function onIconSelect(newIconName: string) {
    setSelectedIcon(newIconName)
    setFilter('')
    setShowIconModal(false)
  }

  const initialCategoryId = initialCategory?.id
  const categoryNameError = useMemo(() => {
    if (!name) {
      return 'Required'
    }

    if (categories?.find((c) => c.id !== initialCategoryId && c.name === name)) {
      return 'Name is already being used'
    }

    return undefined
  }, [categories, initialCategoryId, name])

  const isFormValid = categoryNameError === undefined

  const handleSubmit = (_e: FormEvent<HTMLFormElement>) => {
    if (!isFormValid) {
      setIsTouched(true)
      return
    }

    return onSubmit({
      name,
      iconName: selectedIcon,
      parentId: initialCategory?.id === rootCategory.id ? null : parent!,
      iconBackground: outerColor,
      iconColor: innerColor,
      fixedCosts: fixedCost,
      ordering: initialCategory?.ordering ?? 0,
    }).catch((err) => {
      showToast('Unexpected error while submitting the category', 'error')
      console.error(err)
    })
  }

  return (
    <FormWrapper onSubmit={handleSubmit} submitText={submitText}>
      <TextField
        type="text"
        label="Category name"
        variant="standard"
        placeholder="e.g., Groceries"
        value={name}
        onChange={(ev) => setName(ev.target.value as string)}
        helperText={isTouched ? categoryNameError : ''}
        error={isTouched && !!categoryNameError}
        onBlur={() => setIsTouched(true)}
      />

      {!editingRoot && (
        <CategoryPicker
          selectedConfig={{
            mode: 'single',
            selectedItem: parent,
            onSelectItem: setParent,
          }}
          labelText="Parent Category"
        />
      )}

      <FormControlLabel
        control={<Checkbox checked={fixedCost} onChange={(ev) => setFixedCost(ev.target.checked)} />}
        label="Essential expense"
      />

      <FormSection title="Appearance">
        <Stack direction="row" alignItems="center" spacing={2}>
          <Stack spacing={0.5} sx={{ flexGrow: 1 }}>
            <IconPropertyEditor
              buttonText="Select Icon"
              onClick={() => setShowIconModal(true)}
              indicatorIconProperties={{
                iconName: selectedIcon,
                color: theme.palette.text.disabled,
                backgroundColor: 'transparent',
              }}
            />

            <IconPropertyEditor
              buttonText="Select Outer Color"
              onClick={() => setShowOuterColorModal(true)}
              indicatorIconProperties={{
                iconName: 'GrX',
                color: 'transparent',
                backgroundColor: outerColor,
              }}
            />

            <IconPropertyEditor
              buttonText="Select Inner Color"
              onClick={() => setShowInnerColorModal(true)}
              indicatorIconProperties={{
                iconName: 'GrX',
                color: 'transparent',
                backgroundColor: innerColor,
              }}
            />
          </Stack>
          <AppDialog
            open={showIconModal}
            onClose={() => setShowIconModal(false)}
            title="Select icon"
            fullWidth
            actions={<Button onClick={() => setShowIconModal(false)}>Close</Button>}
          >
            <TextField
              onChange={(event) => setFilter(event.target.value ?? '')}
              variant="standard"
              placeholder="Search..."
              autoFocus
              fullWidth
            />
            <Box component={CustomScrolling} sx={{ maxHeight: '60vh' }}>
              <IconList filter={filter} onSelect={onIconSelect} />
            </Box>
          </AppDialog>
          <AppDialog
            open={showOuterColorModal}
            onClose={() => setShowOuterColorModal(false)}
            title="Select outer color"
            actions={<Button onClick={() => setShowOuterColorModal(false)}>Done</Button>}
          >
            <SizedHexColorPicker color={outerColor} onChange={setOuterColor} />
          </AppDialog>
          <AppDialog
            open={showInnerColorModal}
            onClose={() => setShowInnerColorModal(false)}
            title="Select inner color"
            actions={<Button onClick={() => setShowInnerColorModal(false)}>Done</Button>}
          >
            <SizedHexColorPicker color={innerColor} onChange={setInnerColor} />
          </AppDialog>
          <Box sx={{ p: 2, border: 2, borderColor: 'border.strong', borderRadius: (t) => t.radius.md }}>
            <IconCapsule iconName={selectedIcon} size="5rem" color={innerColor} backgroundColor={outerColor} />
          </Box>
        </Stack>
      </FormSection>
    </FormWrapper>
  )
}

export default CategoryForm
