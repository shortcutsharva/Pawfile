import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar } from '@/components/ui/Layout';
import { AppText } from '@/components/ui/Text';
import { IconButton } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { EmptyState } from '@/components/ui/States';
import { useWorklist } from '@/hooks/useDomain';
import { dateKey, formatDate, formatMonthLabel, toDate } from '@/utils/date';
import type { WorklistItem } from '@/data/types';
import { colors, radius, spacing } from '@/theme/tokens';

type EventKind = 'hearing' | 'follow_up' | 'overdue';

interface CalendarEvent {
  id: string;
  date: string;
  kind: EventKind;
  caseId: string;
  actionId: string;
  title: string;
  subtitle: string;
}

export default function CalendarScreen() {
  const router = useRouter();
  const { data } = useWorklist();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => new Date());
  const [addOpen, setAddOpen] = useState(false);

  const items = useMemo(() => [...data.rescue, ...data.legal], [data]);

  const events = useMemo(() => {
    const list: CalendarEvent[] = [];
    for (const item of items) {
      const due = toDate(item.action.dueValue ?? item.action.followUpDate);
      if (due) {
        list.push({
          id: `due-${item.action.actionId}`,
          date: dateKey(due),
          kind: due < new Date() ? 'overdue' : 'follow_up',
          caseId: item.caseRecord.caseId,
          actionId: item.action.actionId,
          title: `#${item.caseRecord.caseId} ${item.caseRecord.title}`,
          subtitle: item.action.nextAction || 'Follow-up',
        });
      }
    }
    const seen = new Set<string>();
    for (const item of items) {
      if (!item.hearing) continue;
      const key = item.hearing.hearingId;
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({
        id: `hearing-${key}`,
        date: item.hearing.date,
        kind: 'hearing',
        caseId: item.caseRecord.caseId,
        actionId: item.action.actionId,
        title: `#${item.caseRecord.caseId} ${item.caseRecord.title}`,
        subtitle: `Hearing · ${item.hearing.court || 'Court'} · ${item.hearing.time}`,
      });
    }
    return list;
  }, [items]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    });
    return map;
  }, [events]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const dayEvents = eventsByDay.get(dateKey(selected)) ?? [];
  const legalItems = useMemo(() => {
    const seen = new Set<string>();
    return data.legal.filter((item) => {
      if (seen.has(item.caseRecord.caseId)) return false;
      seen.add(item.caseRecord.caseId);
      return true;
    });
  }, [data.legal]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBar
        title="Calendar"
        subtitle={formatMonthLabel(month)}
        right={
          <IconButton icon="add" label="Add hearing" color={colors.pine700} onPress={() => setAddOpen(true)} />
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.monthHeader}>
          <IconButton
            icon="chevron-back"
            label="Previous month"
            onPress={() => setMonth(addMonths(month, -1))}
          />
          <AppText variant="heading">{formatMonthLabel(month)}</AppText>
          <IconButton
            icon="chevron-forward"
            label="Next month"
            onPress={() => setMonth(addMonths(month, 1))}
          />
        </View>

        <View style={styles.weekHeader}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <AppText key={day} variant="caption" color={colors.ink500} style={styles.weekDay}>
              {day}
            </AppText>
          ))}
        </View>

        <View style={styles.grid}>
          {days.map((day) => {
            const key = dateKey(day);
            const dayItems = eventsByDay.get(key) ?? [];
            const hasHearing = dayItems.some((event) => event.kind === 'hearing');
            const hasFollowUp = dayItems.some((event) => event.kind === 'follow_up');
            const hasOverdue = dayItems.some((event) => event.kind === 'overdue');
            const isSelected = isSameDay(day, selected);
            const inMonth = isSameMonth(day, month);
            return (
              <Pressable
                key={key}
                onPress={() => setSelected(day)}
                style={[styles.day, isSelected && styles.daySelected, !inMonth && styles.dayMuted]}
                accessibilityRole="button"
                accessibilityLabel={`${format(day, 'dd MMMM')}, ${dayItems.length} events`}
              >
                <AppText
                  variant="body"
                  color={isSelected ? colors.pine700 : inMonth ? colors.ink900 : colors.ink300}
                  style={styles.dayNumber}
                >
                  {format(day, 'd')}
                </AppText>
                <View style={styles.dots}>
                  {hasHearing ? <View style={[styles.dot, { backgroundColor: colors.pine500 }]} /> : null}
                  {hasFollowUp ? <View style={[styles.dot, { backgroundColor: colors.ochre500 }]} /> : null}
                  {hasOverdue ? <View style={styles.overdueRing} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.legend}>
          <LegendItem color={colors.pine500} label="Hearing" />
          <LegendItem color={colors.ochre500} label="Follow-up" />
          <LegendItem color={colors.brick500} label="Overdue" ring />
        </View>

        <AppText variant="heading" style={styles.agendaTitle}>
          {formatDate(selected)}
        </AppText>
        {dayEvents.length ? (
          dayEvents.map((event) => (
            <Pressable
              key={event.id}
              onPress={() =>
                router.push({ pathname: '/case/[id]', params: { id: event.caseId } })
              }
              style={styles.event}
              accessibilityRole="button"
            >
              <Ionicons
                name={
                  event.kind === 'hearing'
                    ? 'calendar-outline'
                    : event.kind === 'overdue'
                      ? 'alert-circle-outline'
                      : 'time-outline'
                }
                size={22}
                color={
                  event.kind === 'hearing'
                    ? colors.pine700
                    : event.kind === 'overdue'
                      ? colors.brick700
                      : colors.ochre700
                }
              />
              <View style={styles.flex}>
                <AppText variant="bodyLg" numberOfLines={1}>
                  {event.title}
                </AppText>
                <AppText variant="caption" color={colors.ink500} numberOfLines={1}>
                  {event.subtitle}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.ink300} />
            </Pressable>
          ))
        ) : (
          <EmptyState
            icon="calendar-clear-outline"
            title={`Nothing scheduled on ${format(selected, 'dd MMM')}`}
            body="Hearings and follow-ups appear here."
          />
        )}
      </ScrollView>

      <BottomSheet visible={addOpen} onClose={() => setAddOpen(false)} title="Add hearing to a case">
        {legalItems.length ? (
          legalItems.map((item: WorklistItem) => (
            <Pressable
              key={item.caseRecord.caseId}
              onPress={() => {
                setAddOpen(false);
                router.push({
                  pathname: '/case/[id]/hearing/new',
                  params: { id: item.caseRecord.caseId, actionId: item.action.actionId },
                });
              }}
              style={styles.pickRow}
              accessibilityRole="button"
            >
              <Ionicons name="document-text-outline" size={22} color={colors.pine700} />
              <View style={styles.flex}>
                <AppText variant="bodyLg">
                  #{item.caseRecord.caseId} {item.caseRecord.title}
                </AppText>
                <AppText variant="caption" color={colors.ink500}>
                  {item.caseRecord.district}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.ink300} />
            </Pressable>
          ))
        ) : (
          <EmptyState
            icon="calendar-outline"
            title="No legal actions"
            body="Cases with legal action can have hearings."
          />
        )}
      </BottomSheet>
    </SafeAreaView>
  );
}

function LegendItem({ color, label, ring }: { color: string; label: string; ring?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View
        style={
          ring
            ? [styles.legendRing, { borderColor: color }]
            : [styles.legendDot, { backgroundColor: color }]
        }
      />
      <AppText variant="caption" color={colors.ink500}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.base, paddingBottom: 64 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekHeader: { flexDirection: 'row', marginTop: spacing.sm },
  weekDay: { flex: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  day: {
    width: `${100 / 7}%`,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
    borderRadius: radius.input,
    gap: 4,
  },
  daySelected: { backgroundColor: colors.pine100 },
  dayMuted: { opacity: 0.5 },
  dayNumber: { fontVariant: ['tabular-nums'] },
  dots: { flexDirection: 'row', gap: 3, alignItems: 'center', height: 8 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  overdueRing: { width: 7, height: 7, borderRadius: 4, borderWidth: 1.5, borderColor: colors.brick500 },
  legend: { flexDirection: 'row', gap: spacing.base, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendRing: { width: 9, height: 9, borderRadius: 5, borderWidth: 1.5 },
  agendaTitle: { marginTop: spacing.lg, marginBottom: spacing.sm },
  event: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  flex: { flex: 1 },
  pickRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.input,
  },
});
