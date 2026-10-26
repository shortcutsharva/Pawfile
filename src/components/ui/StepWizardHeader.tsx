import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/theme/tokens';
import { AppText } from './Text';

export function StepWizardHeader({ steps, current }: { steps: string[]; current: number }) {
  return (
    <View style={styles.container}>
      <View style={styles.track}>
        {steps.map((step, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <View key={step} style={styles.step}>
              <View style={styles.stepRow}>
                <View
                  style={[
                    styles.circle,
                    done && styles.circleDone,
                    active && styles.circleActive,
                    !done && !active && styles.circleUpcoming,
                  ]}
                >
                  {done ? (
                    <Ionicons name="checkmark" size={14} color={colors.white} />
                  ) : (
                    <AppText
                      variant="caption"
                      color={active ? colors.white : colors.ink500}
                    >
                      {index + 1}
                    </AppText>
                  )}
                </View>
                {index < steps.length - 1 ? (
                  <View style={[styles.line, done && styles.lineDone]} />
                ) : null}
              </View>
              <AppText
                variant="caption"
                color={active ? colors.pine700 : colors.ink500}
                numberOfLines={1}
                style={styles.label}
              >
                {step}
              </AppText>
            </View>
          );
        })}
      </View>
      <AppText variant="caption" color={colors.ink500}>
        Step {current + 1} of {steps.length}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs, marginBottom: spacing.lg },
  track: { flexDirection: 'row', alignItems: 'flex-start' },
  step: { flex: 1 },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  circle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: { backgroundColor: colors.pine700 },
  circleActive: { backgroundColor: colors.pine700 },
  circleUpcoming: { borderWidth: 1, borderColor: colors.ink300 },
  line: { flex: 1, height: 2, backgroundColor: colors.ink200, marginHorizontal: 4 },
  lineDone: { backgroundColor: colors.pine700 },
  label: { marginTop: 4 },
});
