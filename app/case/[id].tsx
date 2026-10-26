import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, Divider, MetaRow } from '@/components/ui/Layout';
import { AppText } from '@/components/ui/Text';
import { Button, IconButton } from '@/components/ui/Button';
import { StatusChip, UrgencyTag, PendingChip } from '@/components/ui/StatusChip';
import { FlagBanner } from '@/components/ui/FlagBanner';
import { EmptyState, ErrorBanner, SkeletonList } from '@/components/ui/States';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { TimelineEntry } from '@/components/domain/TimelineEntry';
import { HearingCard } from '@/components/domain/HearingCard';
import { DocumentTile } from '@/components/domain/DocumentTile';
import { Snackbar } from '@/components/ui/Snackbar';
import { useCaseDetail, useContacts } from '@/hooks/useDomain';
import { usePendingEntityIds } from '@/hooks/useAppData';
import { closeCase, reopenCase, attachDraftMedia, addActionToCase } from '@/data/services/caseService';
import { documentsRepository } from '@/data/repositories/documents';
import { logHistory } from '@/data/repositories/history';
import { OutboundQueue } from '@/data/queue/OutboundQueue';
import { retryUpload } from '@/services/uploads';
import { pickDocuments } from '@/services/media';
import { callPhone, openMap } from '@/services/share';
import { formatDate, formatDateTime } from '@/utils/date';
import { isItemPending } from '@/utils/pending';
import type { DocumentCategory, DocumentMeta, HistoryEntry } from '@/data/types';
import { colors, radius, spacing } from '@/theme/tokens';
import { RESCUE_STATUSES, HISTORY_FILTERS } from '@/constants/sections';

const TABS = ['Details', 'Rescue', 'Legal', 'History', 'Documents'] as const;

export default function CaseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const caseId = id ?? '';
  const { data, loading, error, reload } = useCaseDetail(caseId);
  const pendingIds = usePendingEntityIds();
  const { data: contacts } = useContacts();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Details');
  const [actionChooser, setActionChooser] = useState<'update' | 'reassign' | null>(null);
  const [historyFilter, setHistoryFilter] = useState('All');
  const [menuOpen, setMenuOpen] = useState(false);
  const [addActionOpen, setAddActionOpen] = useState(false);
  const [removedDocument, setRemovedDocument] = useState<DocumentMeta | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rescueAction = data.actions.find((action) => action.type === 'rescue');
  const legalAction = data.actions.find((action) => action.type === 'legal');
  const openActions = data.actions.filter((action) => !action.isClosed);
  const primaryAction = useMemo(() => {
    const sorted = [...openActions].sort((a, b) =>
      String(a.dueValue ?? a.followUpDate ?? '').localeCompare(
        String(b.dueValue ?? b.followUpDate ?? ''),
      ),
    );
    return sorted[0] ?? rescueAction ?? legalAction ?? null;
  }, [openActions, rescueAction, legalAction]);

  const caseRecord = data.caseRecord;
  const pendingForCase = isItemPending(
    pendingIds,
    caseRecord?.caseId,
    ...data.actions.map((action) => action.actionId),
    ...data.hearings.map((hearing) => hearing.hearingId),
    ...data.documents.map((document) => document.documentId),
  );
  const overdue = primaryAction?.dueValue ? new Date(primaryAction.dueValue) < new Date() : false;
  const nextHearing = useMemo(() => {
    const open = data.hearings
      .filter((hearing) => !hearing.outcome)
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
    return open[0] ?? null;
  }, [data.hearings]);
  const passedWithoutOutcome = data.hearings.some(
    (hearing) =>
      !hearing.outcome &&
      new Date(`${hearing.date}T${hearing.time || '09:00'}:00`) < new Date(),
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppBar title="Case" showBack onBack={() => router.back()} />
        <View style={styles.content}>
          <SkeletonList count={2} />
        </View>
      </SafeAreaView>
    );
  }

  if (!caseRecord) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppBar title="Case" showBack onBack={() => router.back()} />
        <EmptyState
          icon="alert-circle-outline"
          title="Case not found"
          body="This case may have been removed on another device."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  const call = async () => {
    const contact = contacts.find(
      (candidate) => candidate.contactId === primaryAction?.assignedToId,
    );
    const phone = contact?.phone || caseRecord.complainantPhone;
    if (phone) {
      await callPhone(phone);
    } else {
      Alert.alert('No phone number', 'Add a phone number to the assigned contact or complainant.');
    }
  };

  const chooseAction = (intent: 'update' | 'reassign') => {
    if (openActions.length <= 1) {
      const action = openActions[0];
      if (!action) {
        Alert.alert('No open action', 'Add an action before updating this case.');
        return;
      }
      router.push({
        pathname: intent === 'update' ? '/case/[id]/update' : '/case/[id]/assign',
        params: { id: caseRecord.caseId, actionId: action.actionId },
      });
      return;
    }
    setActionChooser(intent);
  };

  const onMenuAction = async (action: 'close' | 'reopen') => {
    setMenuOpen(false);
    if (action === 'close') {
      Alert.alert(
        `Close case #${caseRecord.caseId}?`,
        'Every open action will be closed. Rescue and legal status values are kept.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Close case',
            style: 'destructive',
            onPress: () => {
              void closeCase(caseRecord.caseId).then(() => void reload());
            },
          },
        ],
      );
    } else {
      await reopenCase(caseRecord.caseId);
      await reload();
    }
  };

  const addAction = async (type: 'rescue' | 'legal') => {
    setAddActionOpen(false);
    const created = await addActionToCase(caseRecord.caseId, type);
    await reload();
    router.push({
      pathname: '/case/[id]/update',
      params: { id: caseRecord.caseId, actionId: created.actionId },
    });
  };

  const addDocuments = async () => {
    const result = await pickDocuments();
    if (result.errors.length) Alert.alert('Some files were skipped', result.errors.join('\n'));
    if (!result.media.length) return;
    await attachDraftMedia(caseRecord.caseId, result.media);
    await reload();
  };

  const removeDocument = async (document: DocumentMeta) => {
    await documentsRepository.softDelete(document.documentId);
    await logHistory({
      caseId: caseRecord.caseId,
      eventType: 'document_removed',
      description: `Document removed: ${document.fileName}`,
    });
    await reload();
    setRemovedDocument(document);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setRemovedDocument(null), 5000);
  };

  const undoRemoveDocument = async () => {
    const document = removedDocument;
    if (!document) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setRemovedDocument(null);
    await OutboundQueue.removeByEntity('Documents', document.documentId);
    await documentsRepository.update(document.documentId, { isDeleted: false });
    await logHistory({
      caseId: caseRecord.caseId,
      eventType: 'document_added',
      description: `Document restored: ${document.fileName}`,
    });
    await reload();
  };

  const historyToShow: HistoryEntry[] = data.history;
  const historyEntries = historyToShow.filter((entry) => {
    if (historyFilter === 'All') return true;
    if (historyFilter === 'Updates') return ['updated', 'status_change', 'note_added'].includes(entry.eventType);
    if (historyFilter === 'Assignments') return ['assigned', 'reassigned'].includes(entry.eventType);
    if (historyFilter === 'Hearings') return ['hearing_added', 'hearing_outcome'].includes(entry.eventType);
    if (historyFilter === 'Documents') return ['document_added', 'document_removed'].includes(entry.eventType);
    if (historyFilter === 'Conflicts') return entry.isConflict;
    return true;
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBar
        title={`Case #${caseRecord.caseId}`}
        subtitle={caseRecord.title}
        showBack
        onBack={() => router.back()}
        right={
          <IconButton
            icon="ellipsis-vertical"
            label="Case menu"
            onPress={() => setMenuOpen(true)}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statusHeader}>
          <View style={styles.titleRow}>
            <AppText variant="title" style={styles.flex} numberOfLines={2}>
              {caseRecord.title}
            </AppText>
            <UrgencyTag urgency={caseRecord.urgency} />
          </View>
          <View style={styles.chipRow}>
            {pendingForCase ? <PendingChip /> : null}
            {rescueAction && rescueAction.rescueStatus !== 'na' ? (
              <StatusChip kind="rescue" status={rescueAction.rescueStatus as never} />
            ) : null}
            {legalAction && legalAction.legalStatus !== 'na' ? (
              <StatusChip kind="legal" status={legalAction.legalStatus as never} />
            ) : null}
            {caseRecord.status === 'closed' ? <StatusChip kind="action" status="closed" /> : null}
          </View>

          {primaryAction ? (
            <View style={styles.nextBlock}>
              <AppText variant="caption" color={colors.ink500}>
                NEXT ACTION
              </AppText>
              <AppText variant="bodyLg" weight="500">
                {primaryAction.nextAction || 'No next action set'}
              </AppText>
              <View style={styles.metaRow}>
                <Ionicons name="person-outline" size={16} color={colors.ink700} />
                <AppText variant="body" color={colors.ink700}>
                  Assigned: {primaryAction.assignedToName}
                </AppText>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="person-add-outline" size={16} color={colors.ink700} />
                <AppText variant="body" color={colors.ink700}>
                  Follow-up by: {primaryAction.followUpByName}
                </AppText>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={16} color={colors.ink700} />
                <AppText
                  variant="body"
                  color={overdue ? colors.brick700 : colors.ink700}
                >
                  {primaryAction.dueValue || primaryAction.followUpDate
                    ? `Due ${formatDateTime(primaryAction.dueValue ?? primaryAction.followUpDate)}`
                    : 'No due date'}
                </AppText>
              </View>
            </View>
          ) : (
            <FlagBanner
              tone="attention"
              text="This case has no open action."
              actionLabel="Add action"
              onAction={() => setAddActionOpen(true)}
            />
          )}

          <View style={styles.actionRow}>
            <Button label="Update" icon="create-outline" onPress={() => chooseAction('update')} style={styles.flex} />
            <Button
              label="Reassign"
              icon="people-outline"
              variant="secondary"
              onPress={() => chooseAction('reassign')}
              style={styles.flex}
            />
            <Button label="Call" icon="call-outline" variant="secondary" onPress={() => void call()} style={styles.flex} />
          </View>
        </View>

        {overdue ? (
          <FlagBanner tone="critical" text="This action is overdue." style={styles.flag} />
        ) : null}
        {primaryAction && !primaryAction.nextAction ? (
          <FlagBanner
            tone="attention"
            text="No next action set."
            actionLabel="Update"
            onAction={() => chooseAction('update')}
            style={styles.flag}
          />
        ) : null}
        {passedWithoutOutcome ? (
          <FlagBanner
            tone="attention"
            text="A hearing passed without a recorded outcome."
            actionLabel="Record outcome"
            onAction={() => {
              setTab('Legal');
            }}
            style={styles.flag}
          />
        ) : null}
        {caseRecord.status === 'closed' ? (
          <FlagBanner
            tone="info"
            text="This case is closed."
            actionLabel="Reopen case"
            onAction={() => void onMenuAction('reopen')}
            style={styles.flag}
          />
        ) : null}
        {error ? <ErrorBanner message={error} onRetry={() => void reload()} /> : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((entry) => {
            const selected = tab === entry;
            return (
              <Pressable
                key={entry}
                onPress={() => setTab(entry)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={[styles.tab, selected && styles.tabActive]}
              >
                <AppText variant="label" color={selected ? colors.pine700 : colors.ink500}>
                  {entry}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        {tab === 'Details' ? (
          <View style={styles.section}>
            <AppText variant="caption" color={colors.ink500}>
              COMPLAINT
            </AppText>
            <AppText variant="bodyLg">{caseRecord.description || 'No description'}</AppText>
            <Divider style={styles.divider} />
            <MetaRow icon="paw-outline" label="Animal" value={`${caseRecord.animalType} · ${caseRecord.complaintCategory}`} />
            <MetaRow icon="location-outline" label="Location" value={caseRecord.locationText || caseRecord.district} />
            <Pressable
              onPress={() => void openMap(caseRecord.locationText, caseRecord.locationLat, caseRecord.locationLng)}
              accessibilityRole="link"
              style={styles.mapLink}
            >
              <Ionicons name="map-outline" size={16} color={colors.pine700} />
              <AppText variant="label" color={colors.pine700}>
                Open in maps
              </AppText>
            </Pressable>
            <MetaRow icon="call-outline" label="Source" value={caseRecord.complaintSource} />
            <MetaRow icon="calendar-outline" label="Registered" value={formatDate(caseRecord.createdAt)} />
            <Divider style={styles.divider} />
            <AppText variant="caption" color={colors.ink500}>
              COMPLAINANT
            </AppText>
            <MetaRow icon="person-outline" label="Name" value={caseRecord.complainantName || 'Not provided'} />
            <MetaRow icon="call-outline" label="Phone" value={caseRecord.complainantPhone || 'Not provided'} />
            <AppText variant="caption" color={colors.ink500}>
              Hidden in shared messages.
            </AppText>
          </View>
        ) : null}

        {tab === 'Rescue' ? (
          <View style={styles.section}>
            {rescueAction ? (
              <>
                <MetaRow icon="people-outline" label="Assigned organization" value={rescueAction.assignedToName} />
                <MetaRow icon="medical-outline" label="Animal condition" value={rescueAction.animalCondition || 'Not recorded'} />
                <AppText variant="caption" color={colors.ink500} style={styles.progressTitle}>
                  RESCUE PROGRESS
                </AppText>
                <RescueProgress current={rescueAction.rescueStatus} />
                <MetaRow icon="checkmark-circle-outline" label="Outcome" value={rescueAction.outcome || 'Not recorded'} />
                <View style={styles.actionRow}>
                  <Button
                    label="Assign team"
                    icon="people-outline"
                    variant="secondary"
                    style={styles.flex}
                    onPress={() =>
                      router.push({
                        pathname: '/case/[id]/assign',
                        params: { id: caseRecord.caseId, actionId: rescueAction.actionId },
                      })
                    }
                  />
                  <Button
                    label="Record outcome"
                    icon="create-outline"
                    style={styles.flex}
                    onPress={() =>
                      router.push({
                        pathname: '/case/[id]/update',
                        params: { id: caseRecord.caseId, actionId: rescueAction.actionId, focus: 'outcome' },
                      })
                    }
                  />
                </View>
              </>
            ) : (
              <EmptyState
                icon="paw-outline"
                title="No rescue action"
                body="This case was registered without a rescue action."
                actionLabel="Add rescue action"
                onAction={() => void addAction('rescue')}
              />
            )}
          </View>
        ) : null}

        {tab === 'Legal' ? (
          <View style={styles.section}>
            {legalAction ? (
              <>
                <MetaRow icon="business-outline" label="Police station" value={legalAction.policeStation || 'Not recorded'} />
                <MetaRow icon="calendar-outline" label="Complaint date" value={legalAction.complaintDate ? formatDate(legalAction.complaintDate) : 'Not recorded'} />
                <MetaRow icon="document-text-outline" label="FIR number" value={legalAction.firNumber || 'No FIR yet'} />
                <MetaRow icon="calendar-outline" label="FIR date" value={legalAction.firDate ? formatDate(legalAction.firDate) : 'Not recorded'} />
                <MetaRow icon="person-outline" label="Investigating officer" value={legalAction.investigatingOfficerName || 'Not recorded'} />
                <MetaRow icon="business-outline" label="Court" value={legalAction.court || 'Not recorded'} />
                <MetaRow icon="document-outline" label="Court case number" value={legalAction.courtCaseNumber || 'Not recorded'} />
                <MetaRow icon="calendar-outline" label="Next hearing" value={nextHearing ? `${formatDate(nextHearing.date)}, ${nextHearing.time}` : 'No hearing scheduled'} />
                <View style={styles.actionRow}>
                  <Button
                    label="Add hearing"
                    icon="add"
                    style={styles.flex}
                    onPress={() =>
                      router.push({
                        pathname: '/case/[id]/hearing/new',
                        params: { id: caseRecord.caseId, actionId: legalAction.actionId },
                      })
                    }
                  />
                  <Button
                    label="Edit legal details"
                    icon="create-outline"
                    variant="secondary"
                    style={styles.flex}
                    onPress={() =>
                      router.push({
                        pathname: '/case/[id]/update',
                        params: { id: caseRecord.caseId, actionId: legalAction.actionId, focus: 'legal' },
                      })
                    }
                  />
                </View>
                <AppText variant="heading" style={styles.hearingsTitle}>
                  Hearings
                </AppText>
                {data.hearings.length ? (
                  data.hearings
                    .slice()
                    .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))
                    .map((hearing) => (
                      <HearingCard
                        key={hearing.hearingId}
                        hearing={hearing}
                        onPress={() =>
                          router.push({
                            pathname: '/case/[id]/hearing/[hearingId]',
                            params: {
                              id: caseRecord.caseId,
                              hearingId: hearing.hearingId,
                            },
                          })
                        }
                        onRecordOutcome={() =>
                          router.push({
                            pathname: '/case/[id]/hearing/[hearingId]',
                            params: {
                              id: caseRecord.caseId,
                              hearingId: hearing.hearingId,
                            },
                          })
                        }
                      />
                    ))
                ) : (
                  <EmptyState
                    icon="calendar-outline"
                    title="No hearings yet"
                    body="Add a hearing to start tracking court dates."
                  />
                )}
              </>
            ) : (
              <EmptyState
                icon="document-text-outline"
                title="No legal action"
                body="This case was registered without a legal action."
                actionLabel="Add legal action"
                onAction={() => void addAction('legal')}
              />
            )}
          </View>
        ) : null}

        {tab === 'History' ? (
          <View style={styles.section}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyFilters}>
              {HISTORY_FILTERS.map((filter) => {
                const selected = filter === historyFilter;
                return (
                  <Pressable
                    key={filter}
                    onPress={() => setHistoryFilter(filter)}
                    accessibilityRole="button"
                    style={[styles.historyChip, selected && styles.historyChipActive]}
                  >
                    <AppText variant="caption" color={selected ? colors.pine700 : colors.ink500}>
                      {filter}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
            {historyEntries.length ? (
              historyEntries.map((entry) => <TimelineEntry key={entry.historyId} entry={entry} />)
            ) : (
              <EmptyState
                icon="time-outline"
                title="No history yet"
                body="Updates, assignments, hearings, and conflicts appear here."
              />
            )}
          </View>
        ) : null}

        {tab === 'Documents' ? (
          <View style={styles.section}>
            <Button label="Add document" icon="add" variant="secondary" onPress={() => void addDocuments()} />
            {data.documents.length ? (
              Object.entries(groupDocuments()).map(([category, documents]) => (
                <View key={category} style={styles.docGroup}>
                  <AppText variant="caption" color={colors.ink500}>
                    {category.toUpperCase()}
                  </AppText>
                  <View style={styles.docGrid}>
                    {documents.map((document) => (
                      <DocumentTile
                        key={document.documentId}
                        document={document}
                        onRetry={() => void retryUpload(document.documentId).then(() => reload())}
                        onRemove={() => void removeDocument(document)}
                      />
                    ))}
                  </View>
                </View>
              ))
            ) : (
              <EmptyState
                icon="folder-open-outline"
                title="No documents"
                body="Photos, FIR copies, veterinary reports, and court orders attach here."
                actionLabel="Add document"
                onAction={() => void addDocuments()}
              />
            )}
          </View>
        ) : null}
      </ScrollView>

      <BottomSheet
        visible={Boolean(actionChooser)}
        onClose={() => setActionChooser(null)}
        title={actionChooser === 'reassign' ? 'Reassign which action?' : 'Update which action?'}
      >
        {openActions.map((action) => (
          <Pressable
            key={action.actionId}
            onPress={() => {
              const intent = actionChooser;
              setActionChooser(null);
              router.push({
                pathname: intent === 'reassign' ? '/case/[id]/assign' : '/case/[id]/update',
                params: { id: caseRecord.caseId, actionId: action.actionId },
              });
            }}
            style={styles.chooserRow}
            accessibilityRole="button"
          >
            <Ionicons
              name={action.type === 'rescue' ? 'paw-outline' : 'document-text-outline'}
              size={22}
              color={colors.pine700}
            />
            <View style={styles.flex}>
              <AppText variant="bodyLg">
                {action.type === 'rescue' ? 'Rescue action' : 'Legal action'}
              </AppText>
              <AppText variant="caption" color={colors.ink500}>
                {action.nextAction || 'No next action'} · {action.assignedToName}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.ink300} />
          </Pressable>
        ))}
      </BottomSheet>

      <BottomSheet
        visible={addActionOpen}
        onClose={() => setAddActionOpen(false)}
        title="Add an action"
      >
        <Pressable
          onPress={() => void addAction('rescue')}
          style={styles.chooserRow}
          accessibilityRole="button"
        >
          <Ionicons name="paw-outline" size={22} color={colors.pine700} />
          <View style={styles.flex}>
            <AppText variant="bodyLg">Rescue action</AppText>
            <AppText variant="caption" color={colors.ink500}>
              Assign a rescue team and track the outcome
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.ink300} />
        </Pressable>
        <Pressable
          onPress={() => void addAction('legal')}
          style={styles.chooserRow}
          accessibilityRole="button"
        >
          <Ionicons name="document-text-outline" size={22} color={colors.pine700} />
          <View style={styles.flex}>
            <AppText variant="bodyLg">Legal action</AppText>
            <AppText variant="caption" color={colors.ink500}>
              Track the police complaint, FIR, and hearings
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.ink300} />
        </Pressable>
      </BottomSheet>

      <BottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)} title={`Case #${caseRecord.caseId}`}>
        {caseRecord.status === 'closed' ? (
          <MenuRow icon="refresh-outline" label="Reopen case" onPress={() => void onMenuAction('reopen')} />
        ) : (
          <MenuRow icon="checkmark-done-outline" label="Close case" tone={colors.brick700} onPress={() => void onMenuAction('close')} />
        )}
        <MenuRow
          icon="calendar-outline"
          label="Add hearing"
          onPress={() => {
            setMenuOpen(false);
            if (legalAction) {
              router.push({
                pathname: '/case/[id]/hearing/new',
                params: { id: caseRecord.caseId, actionId: legalAction.actionId },
              });
            } else {
              setTab('Legal');
            }
          }}
        />
        <MenuRow
          icon="folder-open-outline"
          label="Open documents"
          onPress={() => {
            setMenuOpen(false);
            setTab('Documents');
          }}
        />
      </BottomSheet>

      <Snackbar
        visible={Boolean(removedDocument)}
        message="Document removed"
        actionLabel="Undo"
        onAction={() => void undoRemoveDocument()}
      />
    </SafeAreaView>
  );

  function groupDocuments(): Record<string, typeof data.documents> {
    return data.documents.reduce<Record<string, typeof data.documents>>((groups, document) => {
      const category = document.category as DocumentCategory;
      groups[category] = groups[category] ?? [];
      groups[category].push(document);
      return groups;
    }, {});
  }
}

function MenuRow({
  icon,
  label,
  onPress,
  tone = colors.ink900,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone?: string;
}) {
  return (
    <Pressable onPress={onPress} style={styles.menuRow} accessibilityRole="button">
      <Ionicons name={icon} size={22} color={tone} />
      <AppText variant="bodyLg" color={tone} style={styles.flex}>
        {label}
      </AppText>
    </Pressable>
  );
}

function RescueProgress({ current }: { current: string }) {
  return (
    <View style={styles.progressRow}>
      {RESCUE_STATUSES.map((status) => {
        const active = status.key === current;
        return (
          <View key={status.key} style={styles.progressStep}>
            <View style={[styles.progressDot, active && styles.progressDotActive]} />
            <AppText
              variant="caption"
              color={active ? colors.pine700 : colors.ink500}
              numberOfLines={2}
              style={styles.progressLabel}
            >
              {status.label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: spacing.base, paddingBottom: 64, gap: spacing.sm },
  statusHeader: { gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  flex: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  nextBlock: { gap: 4, backgroundColor: colors.card, borderRadius: radius.card, padding: spacing.md, borderWidth: 1, borderColor: colors.ink100 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  flag: { marginTop: spacing.xs },
  tabs: { gap: spacing.xs, paddingVertical: spacing.sm },
  tab: { paddingHorizontal: spacing.md, minHeight: 40, justifyContent: 'center', borderRadius: radius.pill },
  tabActive: { backgroundColor: colors.pine100 },
  section: { gap: spacing.sm, paddingBottom: spacing.lg },
  divider: { marginVertical: spacing.sm },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36 },
  progressTitle: { marginTop: spacing.sm },
  progressRow: { flexDirection: 'row', gap: 4 },
  progressStep: { flex: 1, alignItems: 'center', gap: 4 },
  progressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ink200 },
  progressDotActive: { backgroundColor: colors.pine700, width: 12, height: 12, borderRadius: 6 },
  progressLabel: { textAlign: 'center' },
  hearingsTitle: { marginTop: spacing.sm },
  historyFilters: { gap: spacing.xs, paddingBottom: spacing.sm },
  historyChip: { borderRadius: 999, borderWidth: 1, borderColor: colors.ink200, paddingHorizontal: spacing.md, minHeight: 36, justifyContent: 'center' },
  historyChipActive: { backgroundColor: colors.pine100, borderColor: colors.pine100 },
  docGroup: { gap: spacing.sm, marginTop: spacing.sm },
  docGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chooserRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.sm, borderRadius: radius.input },
  menuRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.sm, borderRadius: radius.input },
});
