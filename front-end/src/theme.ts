import { createTheme } from '@mui/material'

declare module '@mui/material/styles' {
  interface Palette {
    surface: { subtle: string; muted: string; raised: string; strong: string; shade: string }
    overlay: { tooltip: string; backdrop: string; panelTop: string; panelBottom: string; dialog: string }
    border: { subtle: string; default: string; strong: string }
    intent: { edit: string; destructive: string; navigate: string; adjust: string; confirm: string }
    money: { gain: string; loss: string }
    transactionTint: { expense: string; income: string; financialIncome: string; transfer: string }
    slider: {
      handle: string
      handleDisabled: string
      valid: string
      validEdge: string
      invalid: string
      invalidEdge: string
      rail: string
      tick: string
      tickLabel: string
      disabledStripe: string
    }
  }
  interface PaletteOptions {
    surface: Palette['surface']
    overlay: Palette['overlay']
    border: Palette['border']
    intent: Palette['intent']
    money: Palette['money']
    transactionTint: Palette['transactionTint']
    slider: Palette['slider']
  }
  interface Theme {
    radius: { sm: string; md: string; lg: string; card: string; xl: string; round: string }
    contentWidth: {
      modal: string
      dialog: string
      compact: string
      narrow: string
      medium: string
      default: string
      wide: string
    }
    fieldWidth: { sm: string; md: string; lg: string }
    elevation: { subtle: string; card: string }
  }
  interface ThemeOptions {
    radius: Theme['radius']
    contentWidth: Theme['contentWidth']
    fieldWidth: Theme['fieldWidth']
    elevation: Theme['elevation']
  }
  interface TypographyVariants {
    label: React.CSSProperties
    stat: React.CSSProperties
    hero: React.CSSProperties
  }
  interface TypographyVariantsOptions {
    label?: React.CSSProperties
    stat?: React.CSSProperties
    hero?: React.CSSProperties
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    label: true
    stat: true
    hero: true
  }
}

// Spacing stays on MUI's 8px base: use 0.5, 1, 1.5, 2, 3, 4 (4px to 32px), never raw rem/px.
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#C84B31',
    },
    secondary: {
      main: '#D6D5A8',
    },
    background: {
      default: '#1F1F1F',
    },
    overlay: {
      tooltip: 'rgba(0, 0, 0, 0.85)',
      backdrop: 'rgba(0, 0, 0, 0.75)',
      panelTop: 'rgba(15, 15, 15, 0.98)',
      panelBottom: 'rgba(10, 10, 10, 0.98)',
      dialog: '#2A2A2A',
    },
    surface: {
      subtle: 'rgba(128,128,128,0.04)',
      muted: 'rgba(128,128,128,0.08)',
      raised: 'rgba(128,128,128,0.16)',
      strong: 'rgba(128,128,128,0.24)',
      shade: 'rgba(0,0,0,0.2)',
    },
    border: {
      subtle: 'rgba(128,128,128,0.2)',
      default: 'rgba(128,128,128,0.4)',
      strong: '#808080',
    },
    intent: {
      edit: '#64B5F6',
      destructive: '#EF5350',
      navigate: '#81C784',
      adjust: '#FFB74D',
      confirm: '#66BB6A',
    },
    money: {
      gain: '#4caf50',
      loss: '#f44336',
    },
    slider: {
      handle: '#ffc400',
      handleDisabled: '#666',
      valid: 'rgba(98, 203, 102, 0.5)',
      validEdge: '#62CB66',
      invalid: 'rgba(214, 0, 11, 0.5)',
      invalidEdge: '#D6000B',
      rail: '#505050',
      tick: '#C8CACC',
      tickLabel: '#77828C',
      disabledStripe: '#D0D3D7',
    },
    transactionTint: {
      expense: 'rgba(240, 128, 128, 0.05)',
      income: 'rgba(128, 240, 128, 0.05)',
      financialIncome: 'rgba(128, 240, 240, 0.05)',
      transfer: 'rgba(128, 128, 128, 0.05)',
    },
  },
  radius: { sm: '0.25rem', md: '0.5rem', lg: '0.75rem', card: '1rem', xl: '24px', round: '50%' },
  contentWidth: {
    modal: '20rem',
    dialog: '24rem',
    compact: '32rem',
    narrow: '35rem',
    medium: '40rem',
    default: '50rem',
    wide: '65rem',
  },
  fieldWidth: { sm: '10rem', md: '15rem', lg: '25rem' },
  elevation: {
    subtle: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    card: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },
  typography: {
    label: { fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.5 },
    stat: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.4 },
    hero: { fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2 },
  },
  components: {
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundColor: theme.palette.overlay.dialog,
          backgroundImage: 'none',
          border: `1px solid ${theme.palette.surface.raised}`,
          borderRadius: theme.radius.xl,
          [theme.breakpoints.up('sm')]: { minWidth: theme.contentWidth.dialog },
          [theme.breakpoints.up('md')]: { minWidth: theme.contentWidth.compact },
          [theme.breakpoints.up('lg')]: { minWidth: theme.contentWidth.narrow },
        }),
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: ({ theme }) => ({ padding: theme.spacing(3, 3, 1) }) },
    },
    MuiDialogContent: {
      styleOverrides: { root: ({ theme }) => ({ padding: theme.spacing(1, 3) }) },
    },
    MuiDialogActions: {
      styleOverrides: { root: ({ theme }) => ({ padding: theme.spacing(2, 3, 3), gap: theme.spacing(1) }) },
    },
    MuiTypography: {
      defaultProps: {
        variantMapping: { label: 'span', stat: 'span', hero: 'p' },
      },
    },
    // Forms/pickers use the secondary color for the focus accent (label +
    // underline/outline) instead of the primary brand color.
    MuiInputLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&.Mui-focused': {
            color: theme.palette.secondary.main,
          },
        }),
      },
    },
    MuiInput: {
      styleOverrides: {
        underline: ({ theme }) => ({
          '&:after': {
            borderBottomColor: theme.palette.secondary.main,
          },
        }),
      },
    },
    MuiFilledInput: {
      styleOverrides: {
        underline: ({ theme }) => ({
          '&:after': {
            borderBottomColor: theme.palette.secondary.main,
          },
        }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.secondary.main,
          },
        }),
      },
    },
  },
})
