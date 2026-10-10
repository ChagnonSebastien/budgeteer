import js from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import importPlugin from 'eslint-plugin-import'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import globals from 'globals'

const styleProps = 'JSXAttribute[name.name=/^(sx|style)$/]'
const spacingKeys =
  '/^(m|p|mt|mb|ml|mr|mx|my|pt|pb|pl|pr|px|py|gap|rowGap|columnGap|margin|padding|marginTop|marginBottom|marginLeft|marginRight|paddingTop|paddingBottom|paddingLeft|paddingRight)$/'

export default [
  { ignores: ['node_modules/', 'build/', 'dist/', 'src/store/remote/dto/'] },
  js.configs.recommended,
  ...tsPlugin.configs['flat/recommended'],
  importPlugin.flatConfigs.errors,
  importPlugin.flatConfigs.warnings,
  importPlugin.flatConfigs.typescript,
  prettierRecommended,
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    settings: {
      'import/resolver': { node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] } },
    },
    rules: {
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index'], 'unknown'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'prettier/prettier': ['error'],
      semi: ['error', 'never'],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'all',
          argsIgnorePattern: '^_',
          ignoreRestSiblings: true,
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: `${styleProps} Literal[value=/^(#[0-9a-fA-F]{3,8}|rgba?\\()/]`,
          message: 'Use a theme palette token (surface, border, intent, money, ...) instead of a raw color.',
        },
        {
          selector: `${styleProps} Property[key.name=${spacingKeys}] > Literal[value=/(rem|px)$/]`,
          message: 'Use the spacing scale (0.5, 1, 1.5, 2, 3, 4) instead of rem/px.',
        },
        {
          selector: `${styleProps} Property[key.name=/^(minWidth|maxWidth)$/] > Literal[value=/(rem|px)$/]`,
          message: 'Use theme.contentWidth or theme.fieldWidth instead of a raw width.',
        },
        {
          selector: `${styleProps} Property[key.name='fontSize'] > Literal[value=/(rem|px|em)$/]`,
          message: 'Use a typography variant instead of a raw font size.',
        },
        {
          selector: "JSXAttribute[name.name='fontSize'] > Literal",
          message: 'Use a typography variant instead of a raw font size.',
        },
      ],
    },
  },
]
