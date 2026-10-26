export const colors = {
  pine900: '#16302A',
  pine700: '#235140',
  pine500: '#2F6B54',
  pine100: '#DCE9E2',
  pine50: '#EEF4F0',

  ochre700: '#8F4E0F',
  ochre600: '#A85D12',
  ochre500: '#D98324',
  ochre100: '#FAE8D3',

  brick700: '#7F2A17',
  brick600: '#A63A22',
  brick500: '#C04A2B',
  brick100: '#F7DED8',

  moss700: '#3E6322',
  moss600: '#4F7D2E',
  moss500: '#5E9438',
  moss100: '#E4EFD5',

  ink900: '#1C2420',
  ink700: '#3E4A44',
  ink500: '#5F6A63',
  ink300: '#B7BFB9',
  ink200: '#DDE2DD',
  ink100: '#EDF0EC',

  surface: '#F7F8F5',
  card: '#FFFFFF',
  white: '#FFFFFF',
  transparent: 'transparent',
} as const;

export type ColorName = keyof typeof colors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  input: 8,
  card: 12,
  sheet: 16,
  pill: 999,
} as const;

export const sizes = {
  screenGutter: 16,
  cardPadding: 16,
  listRowMinHeight: 56,
  inputHeight: 48,
  textAreaMinHeight: 96,
  touchTarget: 48,
  chipHeight: 28,
  tabBarHeight: 56,
  fabHeight: 56,
  fabMinWidth: 144,
} as const;

export const elevation = {
  card: {
    shadowColor: colors.ink900,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sheet: {
    shadowColor: colors.ink900,
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
} as const;

export const theme = { colors, spacing, radius, sizes, elevation } as const;
export type Theme = typeof theme;
