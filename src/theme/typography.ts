import type { TextStyle } from 'react-native';

export const fontFamily = {
  regular: undefined as string | undefined,
  medium: undefined as string | undefined,
} as const;

export const typography = {
  display: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
  } satisfies TextStyle,
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '600',
  } satisfies TextStyle,
  heading: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '600',
  } satisfies TextStyle,
  bodyLg: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '400',
  } satisfies TextStyle,
  body: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
  } satisfies TextStyle,
  label: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  } satisfies TextStyle,
  caption: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '500',
  } satisfies TextStyle,
} as const;

export const tabularNums = { fontVariant: ['tabular-nums'] as TextStyle['fontVariant'] };
