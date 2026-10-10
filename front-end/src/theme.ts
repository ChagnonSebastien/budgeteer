import '@fontsource-variable/plus-jakarta-sans'
import { alpha, createTheme } from '@mui/material'

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
    brand: { gradient: string; glow: string; drawer: string }
  }
  interface PaletteOptions {
    surface: Palette['surface']
    overlay: Palette['overlay']
    border: Palette['border']
    intent: Palette['intent']
    money: Palette['money']
    transactionTint: Palette['transactionTint']
    slider: Palette['slider']
    brand: Palette['brand']
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

const fontFamily = "'Plus Jakarta Sans Variable', system-ui, -apple-system, 'Segoe UI', sans-serif"
const headingTracking = '-0.015em'

// Spacing stays on MUI's 8px base: use 0.5, 1, 1.5, 2, 3, 4 (4px to 32px), never raw rem/px.
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#FF7A45', light: '#FF9E73', dark: '#E5582A', contrastText: '#1A0F09' },
    secondary: { main: '#B4A2FF', contrastText: '#14102A' },
    error: { main: '#F87171' },
    warning: { main: '#FBBF24' },
    success: { main: '#34D399' },
    info: { main: '#60A5FA' },
    background: { default: '#0E1014', paper: '#161921' },
    text: { primary: '#F4F5F7', secondary: 'rgba(244, 245, 247, 0.68)', disabled: 'rgba(244, 245, 247, 0.4)' },
    divider: 'rgba(255, 255, 255, 0.08)',
    brand: {
      gradient: 'linear-gradient(135deg, #FF8A4C 0%, #FF5E62 100%)',
      glow: 'radial-gradient(900px 480px at 0% -10%, rgba(255, 122, 69, 0.12), transparent 65%), radial-gradient(700px 420px at 100% 0%, rgba(180, 162, 255, 0.07), transparent 60%)',
      drawer: '#12151C',
    },
    overlay: {
      tooltip: 'rgba(22, 25, 33, 0.96)',
      backdrop: 'rgba(5, 6, 8, 0.7)',
      panelTop: 'rgba(30, 33, 43, 0.98)',
      panelBottom: 'rgba(20, 22, 29, 0.98)',
      dialog: '#1A1D25',
    },
    surface: {
      subtle: 'rgba(255, 255, 255, 0.03)',
      muted: 'rgba(255, 255, 255, 0.05)',
      raised: 'rgba(255, 255, 255, 0.08)',
      strong: 'rgba(255, 255, 255, 0.12)',
      shade: 'rgba(0, 0, 0, 0.25)',
    },
    border: {
      subtle: 'rgba(255, 255, 255, 0.08)',
      default: 'rgba(255, 255, 255, 0.14)',
      strong: 'rgba(255, 255, 255, 0.26)',
    },
    intent: {
      edit: '#60A5FA',
      destructive: '#F87171',
      navigate: '#34D399',
      adjust: '#FBBF24',
      confirm: '#4ADE80',
    },
    money: { gain: '#34D399', loss: '#F87171' },
    slider: {
      handle: '#FF7A45',
      handleDisabled: '#4B5060',
      valid: 'rgba(52, 211, 153, 0.35)',
      validEdge: '#34D399',
      invalid: 'rgba(248, 113, 113, 0.4)',
      invalidEdge: '#F87171',
      rail: '#232733',
      tick: 'rgba(255, 255, 255, 0.35)',
      tickLabel: 'rgba(255, 255, 255, 0.55)',
      disabledStripe: 'rgba(255, 255, 255, 0.18)',
    },
    transactionTint: {
      expense: 'rgba(248, 113, 113, 0.06)',
      income: 'rgba(52, 211, 153, 0.06)',
      financialIncome: 'rgba(96, 165, 250, 0.07)',
      transfer: 'rgba(255, 255, 255, 0.03)',
    },
  },
  shape: { borderRadius: 12 },
  radius: { sm: '0.375rem', md: '0.75rem', lg: '1rem', card: '1.25rem', xl: '1.75rem', round: '50%' },
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
    subtle: '0 1px 2px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.18)',
    card: '0 12px 32px rgba(0, 0, 0, 0.38)',
  },
  typography: {
    fontFamily,
    h1: { fontWeight: 800, letterSpacing: '-0.03em' },
    h2: { fontWeight: 800, letterSpacing: '-0.025em' },
    h3: { fontWeight: 700, letterSpacing: '-0.02em' },
    h4: { fontWeight: 700, letterSpacing: headingTracking },
    h5: { fontWeight: 700, letterSpacing: headingTracking },
    h6: { fontWeight: 700, letterSpacing: headingTracking },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
    label: {
      fontSize: '0.7rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      lineHeight: 1.5,
    },
    stat: { fontSize: '1.35rem', fontWeight: 700, lineHeight: 1.3, letterSpacing: headingTracking },
    hero: { fontSize: '2.75rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        body: {
          backgroundColor: theme.palette.background.default,
          backgroundImage: theme.palette.brand.glow,
          backgroundAttachment: 'fixed',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        '::selection': { backgroundColor: alpha(theme.palette.primary.main, 0.35) },
        // viewport-fit=cover lets the page draw under the notch and home bar.
        '#root': {
          boxSizing: 'border-box',
          padding:
            'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
        },
      }),
    },
    MuiSnackbar: {
      styleOverrides: { root: { marginBottom: 'env(safe-area-inset-bottom)' } },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: alpha(theme.palette.background.default, 0.72),
          backgroundImage: 'none',
          backdropFilter: 'blur(14px) saturate(140%)',
          borderBottom: `1px solid ${theme.palette.border.subtle}`,
          color: theme.palette.text.primary,
        }),
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundColor: theme.palette.brand.drawer,
          borderRight: `1px solid ${theme.palette.border.subtle}`,
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
        }),
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          margin: theme.spacing(0.25, 1.5),
          borderRadius: theme.radius.md,
          '&.Mui-selected': {
            backgroundColor: alpha(theme.palette.primary.main, 0.14),
            color: theme.palette.primary.light,
            '& .MuiListItemIcon-root': { color: theme.palette.primary.main },
            '@media (hover: hover)': { '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.2) } },
          },
        }),
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: ({ theme }) => ({ borderRadius: 999, paddingInline: theme.spacing(2) }),
        containedPrimary: ({ theme }) => ({
          backgroundImage: theme.palette.brand.gradient,
          color: theme.palette.primary.contrastText,
          '&:hover': { backgroundImage: theme.palette.brand.gradient },
          // Touch screens keep the hover state after a tap.
          '@media (hover: hover)': { '&:hover': { filter: 'brightness(1.08)' } },
        }),
      },
    },
    MuiFab: {
      styleOverrides: {
        root: ({ theme }) => ({ boxShadow: theme.elevation.card }),
        primary: ({ theme }) => ({
          backgroundImage: theme.palette.brand.gradient,
          color: theme.palette.primary.contrastText,
          '&:hover': { backgroundImage: theme.palette.brand.gradient },
          '@media (hover: hover)': { '&:hover': { filter: 'brightness(1.08)' } },
        }),
      },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 999, fontWeight: 500 } },
    },
    MuiToggleButton: {
      styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: ({ theme }) => ({
          backgroundColor: theme.palette.overlay.tooltip,
          border: `1px solid ${theme.palette.border.subtle}`,
          borderRadius: theme.radius.sm,
          ...theme.typography.caption,
          padding: theme.spacing(0.75, 1.25),
        }),
        arrow: ({ theme }) => ({ color: theme.palette.overlay.tooltip }),
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundColor: theme.palette.overlay.dialog,
          border: `1px solid ${theme.palette.border.subtle}`,
          borderRadius: theme.radius.md,
        }),
      },
    },
    MuiAlert: {
      styleOverrides: { root: ({ theme }) => ({ borderRadius: theme.radius.md }) },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundColor: theme.palette.overlay.dialog,
          backgroundImage: 'none',
          border: `1px solid ${theme.palette.border.subtle}`,
          borderRadius: theme.radius.xl,
          boxShadow: theme.elevation.card,
          [theme.breakpoints.up('sm')]: { minWidth: theme.contentWidth.dialog },
          [theme.breakpoints.up('md')]: { minWidth: theme.contentWidth.compact },
          [theme.breakpoints.up('lg')]: { minWidth: theme.contentWidth.narrow },
        }),
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: ({ theme }) => ({ padding: theme.spacing(3, 3, 1), ...theme.typography.h6 }) },
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
    MuiInputLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&.Mui-focused': { color: theme.palette.secondary.main },
        }),
      },
    },
    MuiInput: {
      styleOverrides: {
        underline: ({ theme }) => ({
          '&:before': { borderBottomColor: theme.palette.border.default },
          '&:after': { borderBottomColor: theme.palette.secondary.main },
        }),
      },
    },
    MuiFilledInput: {
      styleOverrides: {
        underline: ({ theme }) => ({
          '&:after': { borderBottomColor: theme.palette.secondary.main },
        }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.border.default },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.border.strong },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.secondary.main },
        }),
      },
    },
  },
})
