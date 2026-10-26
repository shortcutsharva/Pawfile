import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, SectionHeader } from '@/components/ui/Layout';
import { AppText } from '@/components/ui/Text';
import { IconButton } from '@/components/ui/Button';
import { SearchBar } from '@/components/ui/SearchBar';
import { FilterGroup } from '@/components/ui/FilterGroup';
import { CaseCompactRow } from '@/components/domain/CaseCompactRow';
import { CaseDetailedRow } from '@/components/domain/CaseDetailedRow';
import { FAB } from '@/components/ui/FAB';
import { FlagBanner } from '@/components/ui/FlagBanner';
import { EmptyState, ErrorBanner, SkeletonList } from '@/components/ui/States';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useAsyncData, usePendingEntityIds, useSettings, useSyncStatus } from '@/hooks/useAppData';
import { useAlerts, useContacts, useWorklist } from '@/hooks/useDomain';
import { isItemPending } from '@/utils/pending';
import { defaultFilters, type WorklistFilters } from '@/data/services/worklist';
import { getAssignees } from '@/data/services/worklist';
import { retryFailedSync } from '@/data/sync/SyncManager';
import { updateSettings } from '@/data/settings';
import { callPhone } from '@/services/share';
import type { WorklistItem } from '@/data/types';
import { colors, spacing } from '@/theme/tokens';
import { format } from 'date-fns';

export default function HomeScreen() {
  const router = useRouter();
  const sync = useSyncStatus();
  const settings = useSettings();
  const pendingIds = usePendingEntityIds();
  const detailed = settings.worklistView === 'detailed';
  const [filters, setFilters] = useState<WorklistFilters>(defaultFilters);
  const [search, setSearch] = useState('');
  const [moreItem, setMoreItem] = useState<WorklistItem | null>(null);
  const { data: contacts } = useContacts();
  const { data: alerts } = useAlerts();
  const { data: assignees } = useAsyncData(getAssignees, [{ id: 'self', name: 'Self' }], []);
  const effectiveFilters = useMemo(() => ({ ...filters, search }), [filters, search]);
  const { data, loading, error, reload } = useWorklist(effectiveFilters);

  const overdue = alerts.filter((alert) => alert.group === 'overdue').length;
  const hearingsToday = alerts.filter(
    (alert) => alert.kind === 'hearing' && alert.group === 'today',
  ).length;
  const hasFilters =
    filters.status !== 'all' || filters.assignedTo !== 'all' || filters.due !== 'all' || Boolean(search);

  const openCase = (item: WorklistItem) => {
    router.push({ pathname: '/case/[id]', params: { id: item.caseRecord.caseId } });
  };

  const callFor = (item: WorklistItem) => {
    if (item.action.assignedToId !== 'self') {
      const contact = contacts.find((candidate) => candidate.contactId === item.action.assignedToId);
      if (contact?.phone) {
        void callPhone(contact.phone);
        return;
      }
    }
    if (item.caseRecord.complainantPhone) {
      void callPhone(item.caseRecord.complainantPhone);
    }
  };

  const actionsFor = (item: WorklistItem) => {
    const update = () =>
      router.push({
        pathname: '/case/[id]/update',
        params: {
          id: item.caseRecord.caseId,
          actionId: item.action.actionId,
        },
      });
    const assign = () =>
      router.push({
        pathname: '/case/[id]/assign',
        params: { id: item.caseRecord.caseId, actionId: item.action.actionId },
      });
    const actions = [];
    if (item.action.type === 'rescue' && item.action.actionStatus === 'to_attend') {
      actions.push({ key: 'attend', label: 'Attend', icon: 'play-outline' as const, onPress: update });
    } else {
      actions.push({ key: 'update', label: 'Update', icon: 'create-outline' as const, onPress: update });
    }
    if (item.action.type === 'rescue') {
      actions.push({ key: 'assign', label: 'Assign', icon: 'people-outline' as const, onPress: assign });
    }
    actions.push({
      key: 'call',
      label: 'Call',
      icon: 'call-outline' as const,
      onPress: () => callFor(item),
      disabled: !item.caseRecord.complainantPhone && item.action.assignedToId === 'self',
    });
    actions.push({
      key: 'details',
      label: 'Details',
      icon: 'document-text-outline' as const,
      onPress: () => openCase(item),
    });
    actions.push({
      key: 'more',
      label: 'More',
      icon: 'ellipsis-horizontal' as const,
      onPress: () => setMoreItem(item),
    });
    return actions;
  };

  const renderSection = (title: string, items: WorklistItem[]) => {
    if (!items.length) return null;
    return (
      <View>
        <SectionHeader title={title} count={items.length} />
        <View style={styles.cards}>
          {items.map((item) =>
            detailed ? (
              <CaseCompactRow
                key={item.action.actionId}
                item={item}
                onOpen={() => openCase(item)}
                actions={actionsFor(item)}
                pending={isItemPending(
                  pendingIds,
                  item.action.actionId,
                  item.caseRecord.caseId,
                  item.hearing?.hearingId,
                )}
              />
            ) : (
              <CaseDetailedRow
                key={item.action.actionId}
                item={item}
                onOpen={() => openCase(item)}
                actions={actionsFor(item)}
                pending={isItemPending(
                  pendingIds,
                  item.action.actionId,
                  item.caseRecord.caseId,
                  item.hearing?.hearingId,
                )}
              />
            ),
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBar
        title="Worklist"
        subtitle={format(new Date(), 'EEE dd MMM')}
        right={
          <>
            <IconButton
              icon={detailed ? 'grid-outline' : 'list-outline'}
              label={detailed ? 'Show card view' : 'Show detailed view'}
              onPress={() =>
                void updateSettings({ worklistView: detailed ? 'cards' : 'detailed' })
              }
              color={colors.ink700}
            />
            {sync.syncing ? (
              <ActivityIndicator size="small" color={colors.pine700} />
            ) : (
              <IconButton
                icon={sync.online ? 'cloud-done-outline' : 'cloud-offline-outline'}
                label="Sync now"
                onPress={() => void retryFailedSync()}
                color={sync.online ? colors.pine700 : colors.ochre700}
              />
            )}
            <IconButton
              icon="notifications-outline"
              label={`Alerts, ${overdue} overdue`}
              badge={overdue}
              onPress={() => router.push('/alerts')}
            />
          </>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!sync.online ? (
          <FlagBanner tone="info" text="Offline · showing saved data" style={styles.banner} />
        ) : null}
        {sync.queueDepth > 0 ? (
          <FlagBanner
            tone="attention"
            text={`${sync.queueDepth} update${sync.queueDepth === 1 ? '' : 's'} waiting to sync`}
            actionLabel="Retry sync"
            onAction={() => void retryFailedSync()}
            style={styles.banner}
          />
        ) : null}
        {sync.error ? (
          <ErrorBanner message={`Couldn't sync. ${sync.error}`} onRetry={() => void retryFailedSync()} />
        ) : null}

        {overdue || hearingsToday ? (
          <Pressable
            onPress={() => setFilters({ ...filters, due: 'overdue' })}
            accessibilityRole="button"
            accessibilityLabel={`${overdue} overdue, ${hearingsToday} hearings today`}
            style={styles.attention}
          >
            <Ionicons name="alert-circle" size={18} color={colors.brick700} />
            <AppText variant="body" color={colors.brick700} style={styles.flex}>
              {overdue ? `${overdue} overdue` : 'Nothing overdue'}
              {hearingsToday ? ` · ${hearingsToday} hearing${hearingsToday === 1 ? '' : 's'} today` : ''}
            </AppText>
            <Ionicons name="chevron-forward" size={16} color={colors.brick700} />
          </Pressable>
        ) : null}

        <SearchBar value={search} onChange={setSearch} />
        <FilterGroup filters={filters} onChange={setFilters} assignees={assignees} />

        {error ? <ErrorBanner message={error} onRetry={() => void reload()} /> : null}
        {loading ? <SkeletonList /> : null}

        {!loading && data.total === 0 ? (
          hasFilters ? (
            <EmptyState
              icon="search-outline"
              title="No actions match these filters"
              body="Try a different status, assignee, or due date."
              actionLabel="Clear filters"
              onAction={() => {
                setFilters(defaultFilters);
                setSearch('');
              }}
            />
          ) : (
            <EmptyState
              icon="checkmark-circle-outline"
              tone={colors.moss500}
              title="Everything is up to date"
              body="New rescue and legal actions appear here as cases are registered."
              actionLabel="New case"
              onAction={() => router.push('/case/new')}
            />
          )
        ) : null}

        {!loading && data.total > 0 ? (
          <>
            {renderSection('Rescue actions', data.rescue)}
            {renderSection('Legal case actions', data.legal)}
            {!data.rescue.length && !data.legal.length ? (
              <EmptyState
                icon="funnel-outline"
                title="No actions match these filters"
                body="Try clearing the filters to see the full worklist."
                actionLabel="Clear filters"
                onAction={() => {
                  setFilters(defaultFilters);
                  setSearch('');
                }}
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <FAB label="New case" onPress={() => router.push('/case/new')} />

      <BottomSheet
        visible={Boolean(moreItem)}
        onClose={() => setMoreItem(null)}
        title={moreItem ? `Case #${moreItem.caseRecord.caseId}` : undefined}
      >
        {moreItem ? (
          <View style={styles.moreList}>
            <MoreRow
              icon="create-outline"
              label="Update case"
              onPress={() => {
                const item = moreItem;
                setMoreItem(null);
                router.push({
                  pathname: '/case/[id]/update',
                  params: { id: item.caseRecord.caseId, actionId: item.action.actionId },
                });
              }}
            />
            <MoreRow
              icon="people-outline"
              label="Reassign action"
              onPress={() => {
                const item = moreItem;
                setMoreItem(null);
                router.push({
                  pathname: '/case/[id]/assign',
                  params: { id: item.caseRecord.caseId, actionId: item.action.actionId },
                });
              }}
            />
            <MoreRow
              icon="document-text-outline"
              label="Open case details"
              onPress={() => {
                const item = moreItem;
                setMoreItem(null);
                openCase(item);
              }}
            />
            <MoreRow
              icon="call-outline"
              label="Call contact"
              onPress={() => {
                const item = moreItem;
                setMoreItem(null);
                callFor(item);
              }}
            />
          </View>
        ) : null}
      </BottomSheet>
    </SafeAreaView>
  );
}

function MoreRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.moreRow} accessibilityRole="button">
      <Ionicons name={icon} size={22} color={colors.pine700} />
      <AppText variant="bodyLg" style={styles.flex}>
        {label}
      </AppText>
      <Ionicons name="chevron-forward" size={18} color={colors.ink300} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: spacing.base, paddingBottom: 88, gap: spacing.sm },
  cards: { gap: spacing.md },
  banner: { marginTop: spacing.xs },
  attention: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    backgroundColor: colors.brick100,
    borderRadius: 12,
    padding: spacing.md,
  },
  flex: { flex: 1 },
  moreList: { gap: spacing.xs },
  moreRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
  },
});
