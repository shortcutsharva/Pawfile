import type { PropsWithChildren } from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { colors } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Variant = keyof typeof typography;

export interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  weight?: TextStyle['fontWeight'];
  center?: boolean;
}

export function AppText({
  variant = 'body',
  color,
  weight,
  center,
  style,
  children,
  ...rest
}: PropsWithChildren<AppTextProps>) {
  return (
    <Text
      {...rest}
      maxFontSizeMultiplier={rest.maxFontSizeMultiplier ?? 2}
      style={[
        typography[variant],
        { color: color ?? colors.ink900 },
        weight ? { fontWeight: weight } : null,
        center ? { textAlign: 'center' } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}
