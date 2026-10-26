import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, SectionHeader, Card, Divider, MetaRow } from '@/components/ui/Layout';
import { AppText } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { StatusChip, DuePill, UrgencyTag } from '@/components/ui/StatusChip';
import { FlagBanner } from '@/components/ui/FlagBanner';
import { EmptyState } from '@/components/ui/States';
import { FieldShell, RadioSegment, TextField, ToggleRow } from '@/components/ui/FormField';
import { QuickActionBar } from '@/components/domain/QuickActionBar';
import { colors, radius, sizes, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { useState } from 'react';

export default function StyleGalleryScreen() {
  const router = useRouter();
  const [radio, setRadio] = useState<'yes' | 'no' | 'not_sure'>('not_sure');
  const [toggle, setToggle] = useState(true);
  const [text, setText] = useState('');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBar title="Style gallery" subtitle="Tokens and component states" showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader title="Color tokens" />
        <View style={styles.swatches}>
          {Object.entries(colors).map(([name, value]) => (
            <View key={name} style={styles.swatch}>
              <View style={[styles.swatchColor, { backgroundColor: value }]} />
              <AppText variant="caption" color={colors.ink700}>
                {name}
              </AppText>
              <AppText variant="caption" color={colors.ink500}>
                {value}
              </AppText>
            </View>
          ))}
        </View>

        <SectionHeader title="Typography" />
        <Card style={styles.stack}>
          {(Object.keys(typography) as (keyof typeof typography)[]).map((role) => (
            <AppText key={role} variant={role}>
              {role} — The quick brown fox
            </AppText>
          ))}
        </Card>

        <SectionHeader title="Action status chips" />
        <View style={styles.rowWrap}>
          <StatusChip kind="action" status="to_attend" />
          <StatusChip kind="action" status="follow_up" />
          <StatusChip kind="action" status="in_progress" />
          <StatusChip kind="action" status="closed" />
        </View>

        <SectionHeader title="Rescue status chips" />
        <View style={styles.rowWrap}>
          <StatusChip kind="rescue" status="to_attend" />
          <StatusChip kind="rescue" status="awaiting_confirmation" />
          <StatusChip kind="rescue" status="in_progress" />
          <StatusChip kind="rescue" status="rescued" />
          <StatusChip kind="rescue" status="unsuccessful" />
        </View>

        <SectionHeader title="Legal and hearing chips" />
        <View style={styles.rowWrap}>
          <StatusChip kind="legal" status="complaint_filed" />
          <StatusChip kind="legal" status="police_follow_up" />
          <StatusChip kind="legal" status="fir_registered" />
          <StatusChip kind="legal" status="hearing_scheduled" />
          <StatusChip kind="legal" status="concluded" />
        </View>
        <View style={styles.rowWrap}>
          <StatusChip kind="hearing" status="scheduled" />
          <StatusChip kind="hearing" status="outcome_pending" />
          <StatusChip kind="hearing" status="outcome_recorded" />
        </View>

        <SectionHeader title="Due and urgency" />
        <View style={styles.rowWrap}>
          <DuePill state="overdue" label="2 days overdue" />
          <DuePill state="today" label="Due today, 4:00 pm" />
          <DuePill state="upcoming" label="Due 12 Oct 2026" />
          <DuePill state="none" label="No due date" />
          <DuePill state="upcoming" label="Hearing 15 Oct, 10:30 am" hearing />
          <UrgencyTag urgency="High" />
          <UrgencyTag urgency="Medium" />
          <UrgencyTag urgency="Low" />
        </View>

        <SectionHeader title="Buttons" />
        <View style={styles.stack}>
          <Button label="Primary action" />
          <Button label="Secondary action" variant="secondary" />
          <Button label="Ghost action" variant="ghost" />
          <Button label="Destructive action" variant="destructive" />
          <Button label="Disabled action" disabled />
          <Button label="With icon" icon="add" />
          <Button label="Small" size="sm" />
        </View>

        <SectionHeader title="Banners" />
        <View style={styles.stack}>
          <FlagBanner tone="critical" text="Critical: action overdue" actionLabel="Update" onAction={() => undefined} />
          <FlagBanner tone="attention" text="Attention: no next action set" />
          <FlagBanner tone="info" text="Info: offline, showing saved data" />
          <FlagBanner tone="success" text="Success: update saved" />
        </View>

        <SectionHeader title="Case actions" />
        <Card>
          <QuickActionBar
            actions={[
              { key: 'attend', label: 'Attend', icon: 'play-outline', onPress: () => undefined },
              { key: 'assign', label: 'Assign', icon: 'people-outline', onPress: () => undefined },
              { key: 'call', label: 'Call', icon: 'call-outline', onPress: () => undefined },
              { key: 'more', label: 'More', icon: 'ellipsis-horizontal', onPress: () => undefined },
            ]}
          />
        </Card>

        <SectionHeader title="Fields" />
        <TextField
          label="Text field"
          value={text}
          onChange={setText}
          placeholder="Type here"
          helper="Helper text sits below the control"
        />
        <TextField
          label="Error state"
          value={text}
          onChange={setText}
          placeholder="Type here"
          error="This field is required"
        />
        <RadioSegment
          label="Radio segment"
          value={radio}
          options={['yes', 'no', 'not_sure'] as const}
          onChange={setRadio}
          helper="Labels are formatted from their values"
        />
        <ToggleRow
          label="Toggle row"
          description="Supporting description"
          value={toggle}
          onChange={setToggle}
        />
        <FieldShell label="Field shell" helper="Visible label, control, helper">
          <View style={styles.fakeInput} />
        </FieldShell>

        <SectionHeader title="Metadata rows" />
        <Card>
          <MetaRow icon="paw-outline" label="Animal" value="Dog · Injury" />
          <Divider />
          <MetaRow icon="location-outline" label="Location" value="Mysuru, Karnataka" />
          <Divider />
          <MetaRow icon="call-outline" label="Phone" value="Hidden" />
        </Card>

        <SectionHeader title="Empty state" />
        <EmptyState
          icon="checkmark-circle-outline"
          tone={colors.moss500}
          title="Everything is up to date"
          body="New rescue and legal actions appear here as cases are registered."
          actionLabel="New case"
          onAction={() => undefined}
        />

        <AppText variant="caption" color={colors.ink500} center style={styles.footer}>
          Touch targets: {sizes.touchTarget}dp · Card radius: {radius.card} · Gutter: {sizes.screenGutter}
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.base, paddingBottom: 64 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: { width: '30%', gap: 2 },
  swatchColor: {
    height: 44,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.ink200,
  },
  stack: { gap: spacing.sm, marginTop: spacing.sm },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  fakeInput: {
    minHeight: sizes.inputHeight,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.ink200,
    backgroundColor: colors.card,
  },
  footer: { marginTop: spacing.xl },
});
