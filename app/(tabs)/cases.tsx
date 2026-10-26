import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar } from '@/components/ui/Layout';
import { AppText } from '@/components/ui/Text';
import { SearchBar } from '@/components/ui/SearchBar';
import { CaseCard } from '@/components/domain/CaseCard';
import { FAB } from '@/components/ui/FAB';
import { EmptyState, SkeletonList } from '@/components/ui/States';
import { StatusChip, PendingChip } from '@/components/ui/StatusChip';
import { useAsyncData, usePendingEntityIds } from '@/hooks/useAppData';
import { getAllCaseItems, type CaseSort } from '@/data/services/worklist';
import { isItemPending } from '@/utils/pending';
import { formatDate } from '@/utils/date';
import { colors, radius, spacing } from '@/theme/tokens';

const SORTS: { key: CaseSort; label: string }[] = [
  { key: 'recent', label: 'Recently updated' },
  { key: 'due', label: 'Due date' },
  { key: 'caseId', label: 'Case ID' },
];

export default function AllCasesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<CaseSort>('recent');
  const [includeClosed, setIncludeClosed] = useState(true);
  const pendingIds = usePendingEntityIds();
  const loader = useCallback(
    () => getAllCaseItems(search, includeClosed, sort),
    [search, includeClosed, sort],
  );
  const { data, loading } = useAsyncData(loader, [], [search, includeClosed, sort]);

  const openCase = (caseId: string) =>
    router.push({ pathname: '/case/[id]', params: { id: caseId } });

  const actionsFor = (caseId: string, actionId?: string) => [
    {
      key: 'details',
      label: 'Details',
      icon: 'document-text-outline' as const,
      onPress: () => openCase(caseId),
    },
    {
      key: 'update',
      label: 'Update',
      icon: 'create-outline' as const,
      onPress: () =>
        router.push({
          pathname: '/case/[id]/update',
          params: { id: caseId, actionId },
        }),
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBar title="All cases" subtitle={`${data.length} cases`} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SearchBar value={search} onChange={setSearch} placeholder="Search cases, FIR, location, complainant" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sorts}>
          {SORTS.map((option) => {
            const selected = option.key === sort;
            return (
              <Pressable
                key={option.key}
                onPress={() => setSort(option.key)}
                style={[styles.sortChip, selected && styles.sortChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <AppText variant="caption" color={selected ? colors.pine700 : colors.ink500}>
                  {option.label}
                </AppText>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => setIncludeClosed((value) => !value)}
            style={[styles.sortChip, !includeClosed && styles.sortChipActive]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !includeClosed }}
          >
            <AppText variant="caption" color={!includeClosed ? colors.pine700 : colors.ink500}>
              Open only
            </AppText>
          </Pressable>
        </ScrollView>

        {loading ? <SkeletonList /> : null}
        {!loading && !data.length ? (
          <EmptyState
            icon="folder-open-outline"
            title="No cases found"
            body="Register the first complaint, or clear the search."
            actionLabel="New case"
            onAction={() => router.push('/case/new')}
          />
        ) : null}

        {!loading
          ? data.map((summary) =>
              summary.item ? (
                <CaseCard
                  key={summary.caseRecord.caseId}
                  item={summary.item}
                  closed={summary.caseRecord.status === 'closed'}
                  onOpen={() => openCase(summary.caseRecord.caseId)}
                  actions={actionsFor(summary.caseRecord.caseId, summary.action?.actionId)}
                  pending={isItemPending(
                    pendingIds,
                    summary.caseRecord.caseId,
                    summary.action?.actionId,
                    summary.item.hearing?.hearingId,
                  )}
                />
              ) : (
                <Pressable
                  key={summary.caseRecord.caseId}
                  onPress={() => openCase(summary.caseRecord.caseId)}
                  style={styles.bareCase}
                >
                  <View style={styles.bareTop}>
                    <AppText variant="caption" color={colors.ink500}>
                      #{summary.caseRecord.caseId}
                    </AppText>
                    {isItemPending(pendingIds, summary.caseRecord.caseId) ? (
                      <PendingChip />
                    ) : null}
                    <StatusChip
                      kind="action"
                      status={summary.caseRecord.status === 'closed' ? 'closed' : 'to_attend'}
                    />
                  </View>
                  <AppText variant="heading">{summary.caseRecord.title}</AppText>
                  <AppText variant="body" color={colors.ink500}>
                    {summary.caseRecord.district} · {formatDate(summary.caseRecord.createdAt)}
                  </AppText>
                  <View style={styles.noAction}>
                    <Ionicons name="alert-circle-outline" size={16} color={colors.ochre700} />
                    <AppText variant="body" color={colors.ochre700}>
                      No open action
                    </AppText>
                  </View>
                </Pressable>
              ),
            )
          : null}
      </ScrollView>
      <FAB label="New case" onPress={() => router.push('/case/new')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: spacing.base, paddingBottom: 120, gap: spacing.md },
  sorts: { gap: spacing.xs },
  sortChip: {
    minHeight: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.ink200,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  sortChipActive: { backgroundColor: colors.pine100, borderColor: colors.pine100 },
  bareCase: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.ink100,
    padding: spacing.base,
    gap: spacing.xs,
  },
  bareTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  noAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
