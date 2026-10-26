import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';
import { AppText } from './Text';
import { OptionSheet, BottomSheet } from './BottomSheet';
import type { WorklistFilters } from '@/data/services/worklist';

const STATUS_OPTIONS = ['All', 'To attend', 'Follow-up', 'In progress', 'Closed'] as const;
const DUE_OPTIONS = ['All', 'Overdue', 'Today', 'Next 7 days', 'Upcoming'] as const;

const statusLabel: Record<WorklistFilters['status'], string> = {
  all: 'All',
  to_attend: 'To attend',
  follow_up: 'Follow-up',
  in_progress: 'In progress',
  closed: 'Closed',
};

const dueLabelMap: Record<WorklistFilters['due'], string> = {
  all: 'All',
  overdue: 'Overdue',
  today: 'Today',
  next7: 'Next 7 days',
  upcoming: 'Upcoming',
};

const statusValue: Record<(typeof STATUS_OPTIONS)[number], WorklistFilters['status']> = {
  All: 'all',
  'To attend': 'to_attend',
  'Follow-up': 'follow_up',
  'In progress': 'in_progress',
  Closed: 'closed',
};

const dueValueMap: Record<(typeof DUE_OPTIONS)[number], WorklistFilters['due']> = {
  All: 'all',
  Overdue: 'overdue',
  Today: 'today',
  'Next 7 days': 'next7',
  Upcoming: 'upcoming',
};

export function FilterGroup({
  filters,
  onChange,
  assignees,
}: {
  filters: WorklistFilters;
  onChange: (filters: WorklistFilters) => void;
  assignees: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState<'status' | 'assignee' | 'due' | null>(null);
  const assigneeName =
    filters.assignedTo === 'all'
      ? 'All'
      : assignees.find((assignee) => assignee.id === filters.assignedTo)?.name ??
        filters.assignedTo;

  const activeChips = [
    filters.status !== 'all' ? { key: 'status', label: `Status: ${statusLabel[filters.status]}` } : null,
    filters.assignedTo !== 'all' ? { key: 'assignee', label: `Assigned: ${assigneeName}` } : null,
    filters.due !== 'all' ? { key: 'due', label: `Due: ${dueLabelMap[filters.due]}` } : null,
  ].filter((chip): chip is { key: string; label: string } => chip !== null);

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <FilterButton
          label="Status"
          value={statusLabel[filters.status]}
          active={filters.status !== 'all'}
          onPress={() => setOpen('status')}
        />
        <FilterButton
          label="Assigned to"
          value={assigneeName}
          active={filters.assignedTo !== 'all'}
          onPress={() => setOpen('assignee')}
        />
        <FilterButton
          label="Due"
          value={dueLabelMap[filters.due]}
          active={filters.due !== 'all'}
          onPress={() => setOpen('due')}
        />
      </ScrollView>

      {activeChips.length ? (
        <View style={styles.chips}>
          {activeChips.map((chip) => (
            <Pressable
              key={chip.key}
              accessibilityRole="button"
              accessibilityLabel={`Remove filter ${chip.label}`}
              onPress={() => {
                if (chip.key === 'status') onChange({ ...filters, status: 'all' });
                if (chip.key === 'assignee') onChange({ ...filters, assignedTo: 'all' });
                if (chip.key === 'due') onChange({ ...filters, due: 'all' });
              }}
              style={styles.chip}
            >
              <AppText variant="caption" color={colors.pine700}>
                {chip.label}
              </AppText>
              <Ionicons name="close" size={14} color={colors.pine700} />
            </Pressable>
          ))}
          <Pressable onPress={() => onChange({ ...filters, status: 'all', assignedTo: 'all', due: 'all' })} accessibilityRole="button">
            <AppText variant="caption" color={colors.pine700}>
              Clear all
            </AppText>
          </Pressable>
        </View>
      ) : null}

      <OptionSheet
        visible={open === 'status'}
        title="Status"
        options={STATUS_OPTIONS}
        value={STATUS_OPTIONS.find((option) => statusValue[option] === filters.status)}
        onSelect={(option) => onChange({ ...filters, status: statusValue[option] })}
        onClose={() => setOpen(null)}
      />
      <OptionSheet
        visible={open === 'due'}
        title="Due"
        options={DUE_OPTIONS}
        value={DUE_OPTIONS.find((option) => dueValueMap[option] === filters.due)}
        onSelect={(option) => onChange({ ...filters, due: dueValueMap[option] })}
        onClose={() => setOpen(null)}
      />
      <BottomSheet
        visible={open === 'assignee'}
        onClose={() => setOpen(null)}
        title="Assigned to"
      >
        {[{ id: 'all', name: 'All' }, ...assignees].map((assignee) => {
          const selected = filters.assignedTo === assignee.id;
          return (
            <Pressable
              key={assignee.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                onChange({ ...filters, assignedTo: assignee.id });
                setOpen(null);
              }}
              style={[styles.assigneeRow, selected && styles.assigneeRowActive]}
            >
              <AppText variant="bodyLg" color={selected ? colors.pine700 : colors.ink900}>
                {assignee.name}
              </AppText>
              {selected ? <Ionicons name="checkmark" size={20} color={colors.pine700} /> : null}
            </Pressable>
          );
        })}
      </BottomSheet>
    </View>
  );
}

function FilterButton({
  label,
  value,
  active,
  onPress,
}: {
  label: string;
  value: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} filter: ${value}`}
      onPress={onPress}
      style={[styles.filterButton, active && styles.filterButtonActive]}
    >
      <AppText variant="caption" color={active ? colors.pine700 : colors.ink700}>
        {label}: {value}
      </AppText>
      <Ionicons name="chevron-down" size={14} color={active ? colors.pine700 : colors.ink500} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  row: { gap: spacing.sm, paddingVertical: 2 },
  filterButton: {
    minHeight: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.ink200,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  filterButtonActive: { backgroundColor: colors.pine100, borderColor: colors.pine100 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.pine100,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  assigneeRow: {
    minHeight: 48,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assigneeRowActive: { backgroundColor: colors.pine100 },
});
