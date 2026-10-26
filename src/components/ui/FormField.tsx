import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextInputFocusEvent,
  type ViewStyle,
} from 'react-native';
import { colors, radius, sizes, spacing } from '@/theme/tokens';
import { formatDate, formatDateTime, formatTime, toDate } from '@/utils/date';
import { AppText } from './Text';
import { BottomSheet, OptionSheet } from './BottomSheet';

export function FieldShell({
  label,
  required,
  helper,
  error,
  children,
  style,
}: {
  label?: string;
  required?: boolean;
  helper?: string;
  error?: string | null;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.field, style]}>
      {label ? (
        <AppText variant="label" color={colors.ink700}>
          {label}
          {required ? <AppText color={colors.brick600}> *</AppText> : null}
        </AppText>
      ) : null}
      {children}
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={16} color={colors.brick600} />
          <AppText variant="body" color={colors.brick600} style={styles.helperText}>
            {error}
          </AppText>
        </View>
      ) : helper ? (
        <AppText variant="body" color={colors.ink500} style={styles.helperText}>
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
  helper,
  error,
  keyboardType,
  multiline,
  maxLength,
  autoCapitalize = 'sentences',
  editable = true,
  secureTextEntry = false,
  onFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  helper?: string;
  error?: string | null;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  secureTextEntry?: boolean;
  onFocus?: (event: TextInputFocusEvent) => void;
}) {
  return (
    <FieldShell label={label} required={required} helper={helper} error={error}>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.ink500}
        keyboardType={keyboardType}
        multiline={multiline}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        editable={editable}
        secureTextEntry={secureTextEntry}
        onFocus={onFocus}
        style={[
          styles.input,
          multiline && styles.textArea,
          error ? styles.inputError : null,
          !editable && styles.inputDisabled,
        ]}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Select',
  required,
  helper,
  error,
  disabled,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onSelect: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  helper?: string;
  error?: string | null;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <FieldShell label={label} required={required} helper={helper} error={error}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || placeholder}`}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.input, styles.select, disabled && styles.inputDisabled]}
      >
        <AppText variant="bodyLg" color={value ? colors.ink900 : colors.ink500} numberOfLines={1}>
          {value || placeholder}
        </AppText>
        <Ionicons name="chevron-down" size={20} color={colors.ink500} />
      </Pressable>
      <OptionSheet
        visible={open}
        title={label}
        options={options}
        value={value}
        onSelect={onSelect}
        onClose={() => setOpen(false)}
      />
    </FieldShell>
  );
}

export function DateTimeField({
  label,
  value,
  onChange,
  required,
  helper,
  error,
  mode = 'datetime',
}: {
  label: string;
  value: string | null;
  onChange: (iso: string | null) => void;
  required?: boolean;
  helper?: string;
  error?: string | null;
  mode?: 'date' | 'time' | 'datetime';
}) {
  const [open, setOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>(mode === 'time' ? 'time' : 'date');
  const dateValue = toDate(value) ?? new Date();

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setOpen(false);
    if (event.type === 'dismissed' || !selected) return;
    if (mode === 'datetime' && pickerMode === 'date') {
      const base = toDate(value) ?? new Date();
      base.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      onChange(base.toISOString());
      setPickerMode('time');
      if (Platform.OS !== 'ios') setTimeout(() => setOpen(true), 50);
      return;
    }
    if (mode === 'datetime' && pickerMode === 'time') {
      const base = toDate(value) ?? new Date();
      base.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      onChange(base.toISOString());
      setPickerMode('date');
      return;
    }
    if (mode === 'date') {
      const base = toDate(value) ?? new Date();
      base.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      onChange(base.toISOString());
    } else if (mode === 'time') {
      const base = toDate(value) ?? new Date();
      base.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      onChange(base.toISOString());
    } else {
      onChange(selected.toISOString());
    }
  };

  return (
    <FieldShell label={label} required={required} helper={helper} error={error}>
      <View style={styles.dateRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value ? formatDateTime(value) : 'not set'}`}
          onPress={() => {
            setPickerMode(mode === 'time' ? 'time' : 'date');
            setOpen(true);
          }}
          style={[styles.input, styles.select, styles.dateButton]}
        >
          <AppText variant="bodyLg" color={value ? colors.ink900 : colors.ink500} numberOfLines={1}>
            {value
              ? mode === 'time'
                ? formatTime(value)
                : mode === 'date'
                  ? formatDate(value)
                  : formatDateTime(value)
              : 'Select date & time'}
          </AppText>
          <Ionicons name="calendar-outline" size={20} color={colors.ink500} />
        </Pressable>
        {value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label}`}
            hitSlop={8}
            onPress={() => onChange(null)}
            style={styles.clear}
          >
            <Ionicons name="close" size={18} color={colors.ink500} />
          </Pressable>
        ) : null}
      </View>

      {open && Platform.OS !== 'ios' ? (
        <DateTimePicker
          value={dateValue}
          mode={mode === 'datetime' ? pickerMode : mode}
          display="default"
          onChange={handleChange}
        />
      ) : null}

      <BottomSheet
        visible={open && Platform.OS === 'ios'}
        onClose={() => setOpen(false)}
        title={label}
        footer={
          <Pressable
            onPress={() => setOpen(false)}
            style={styles.doneButton}
            accessibilityRole="button"
          >
            <AppText variant="label" color={colors.white}>
              Done
            </AppText>
          </Pressable>
        }
      >
        <DateTimePicker
          value={dateValue}
          mode={mode === 'datetime' ? pickerMode : mode}
          display="spinner"
          onChange={handleChange}
          themeVariant="light"
        />
        {mode === 'datetime' ? (
          <View style={styles.segmentRow}>
            <Pressable
              onPress={() => setPickerMode('date')}
              style={[styles.segment, pickerMode === 'date' && styles.segmentActive]}
            >
              <AppText variant="label" color={pickerMode === 'date' ? colors.pine700 : colors.ink500}>
                Date
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => setPickerMode('time')}
              style={[styles.segment, pickerMode === 'time' && styles.segmentActive]}
            >
              <AppText variant="label" color={pickerMode === 'time' ? colors.pine700 : colors.ink500}>
                Time
              </AppText>
            </Pressable>
          </View>
        ) : null}
      </BottomSheet>
    </FieldShell>
  );
}

export function RadioSegment<T extends string>({
  label,
  value,
  options,
  onChange,
  required,
  helper,
  error,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  required?: boolean;
  helper?: string;
  error?: string | null;
}) {
  return (
    <FieldShell label={label} required={required} helper={helper} error={error}>
      <View style={styles.segmentRow}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(option)}
              style={[styles.segment, selected && styles.segmentActive]}
            >
              <AppText
                variant="label"
                color={selected ? colors.pine700 : colors.ink700}
                numberOfLines={1}
              >
                {radioLabel(option)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </FieldShell>
  );
}

function radioLabel(value: string): string {
  const labels: Record<string, string> = {
    not_sure: 'Not sure',
    to_assess: 'To assess',
    no_response: 'No response',
    in_progress: 'In progress',
  };
  return labels[value] ?? value.charAt(0).toUpperCase() + value.slice(1);
}

export function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={styles.checkboxRow}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
      </View>
      <AppText variant="body">{label}</AppText>
    </Pressable>
  );
}

export function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <AppText variant="bodyLg">{label}</AppText>
        {description ? (
          <AppText variant="body" color={colors.ink500}>
            {description}
          </AppText>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.ink200, true: colors.pine500 }}
        thumbColor={colors.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs, marginBottom: spacing.md },
  input: {
    minHeight: sizes.inputHeight,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.ink200,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 17,
    color: colors.ink900,
  },
  textArea: { minHeight: sizes.textAreaMinHeight, maxHeight: 160 },
  inputError: { borderWidth: 2, borderColor: colors.brick500 },
  inputDisabled: { backgroundColor: colors.ink100, color: colors.ink500 },
  helperText: { flex: 1 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dateButton: { flex: 1 },
  clear: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: colors.ink100,
    borderRadius: radius.input,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.input - 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  segmentActive: { backgroundColor: colors.card },
  checkboxRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.ink300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.pine700, borderColor: colors.pine700 },
  toggleRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    paddingVertical: spacing.sm,
  },
  toggleText: { flex: 1, gap: 2 },
  doneButton: {
    minHeight: sizes.touchTarget,
    backgroundColor: colors.pine700,
    borderRadius: radius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
