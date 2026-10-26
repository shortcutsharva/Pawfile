import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
import { actionsRepository } from '@/data/repositories/actions';
import { hearingsRepository } from '@/data/repositories/hearings';
import { casesRepository } from '@/data/repositories/cases';
import type { Action, Hearing } from '@/data/types';
import { combineDateAndTime, toDate } from '@/utils/date';
import { computeHearingReminders, followUpReminderAt } from '@/utils/reminders';

const STORAGE_KEY = '@animal-welfare/notifications';

type NotificationsModule = typeof import('expo-notifications');

// Expo Go for SDK 58 does not ship every expo-notifications native module
// (notably ExpoTopicSubscriptionModule), so importing the package there throws at
// evaluation time. Skip it entirely in Expo Go and on web; the in-app Alerts inbox
// remains fully functional. A development build gets real local notifications.
const IS_EXPO_GO =
  Constants.executionEnvironment === 'storeClient' ||
  (Constants as { appOwnership?: string | null }).appOwnership === 'expo';
const HAS_NOTIFICATIONS_NATIVE_MODULE = Boolean(
  requireOptionalNativeModule('ExpoTopicSubscriptionModule'),
);
const NOTIFICATIONS_AVAILABLE =
  HAS_NOTIFICATIONS_NATIVE_MODULE && !IS_EXPO_GO && Platform.OS !== 'web';

let modulePromise: Promise<NotificationsModule | null> | null = null;
let handlerConfigured = false;

async function notifications(): Promise<NotificationsModule | null> {
  if (!NOTIFICATIONS_AVAILABLE) return null;
  if (!modulePromise) {
    modulePromise = import('expo-notifications')
      .then((module) => {
        if (!handlerConfigured) {
          module.setNotificationHandler({
            handleNotification: async () => ({
              shouldShowBanner: true,
              shouldShowList: true,
              shouldPlaySound: false,
              shouldSetBadge: false,
            }),
          });
          handlerConfigured = true;
        }
        return module;
      })
      .catch(() => {
        // A build can still lack the native module. Treat notifications as optional.
        return null;
      });
  }
  return modulePromise;
}

type NotificationMap = Record<string, string[]>;

async function readMap(): Promise<NotificationMap> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored) as NotificationMap;
  } catch {
    return {};
  }
}

async function writeMap(map: NotificationMap): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const Notifications = await notifications();
  if (!Notifications) return false;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#235140',
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

async function cancelFor(key: string): Promise<void> {
  const map = await readMap();
  const ids = map[key] ?? [];
  delete map[key];
  await writeMap(map);
  if (!ids.length) return;
  const Notifications = await notifications();
  if (!Notifications) return;
  await Promise.all(
    ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)),
  );
}

async function schedule(key: string, date: Date, title: string, body: string, caseId: string) {
  const Notifications = await notifications();
  if (!Notifications) return;
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { caseId },
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: 'reminders',
    },
  });
  const map = await readMap();
  map[key] = [...(map[key] ?? []), id];
  await writeMap(map);
}

export async function scheduleActionReminder(action: Action, caseTitle: string): Promise<void> {
  try {
    await cancelFor(`action-${action.actionId}`);
    if (action.isClosed) return;
    const due = toDate(action.dueValue ?? action.followUpDate);
    if (!due) return;
    await schedule(
      `action-${action.actionId}`,
      followUpReminderAt(due),
      `Follow-up: #${action.caseId}`,
      `${caseTitle} · ${action.nextAction || 'Follow-up due'}`,
      action.caseId,
    );
  } catch {
    // Reminders are best-effort; the in-app Alerts inbox remains authoritative.
  }
}

export async function scheduleHearingReminders(hearing: Hearing, caseTitle: string): Promise<void> {
  try {
    await cancelFor(`hearing-${hearing.hearingId}`);
    if (hearing.outcome) return;
    const hearingDate = toDate(combineDateAndTime(hearing.date, hearing.time));
    if (!hearingDate) return;
    const leads = [
      hearing.reminder7d ? 7 : null,
      hearing.reminder3d ? 3 : null,
      hearing.reminder1d ? 1 : null,
    ].filter((lead): lead is number => lead !== null);
    for (const reminder of computeHearingReminders(hearingDate, leads)) {
      await schedule(
        `hearing-${hearing.hearingId}`,
        reminder.at,
        reminder.immediate
          ? `Hearing soon: #${hearing.caseId}`
          : `Hearing in ${reminder.leadDays} day${reminder.leadDays === 1 ? '' : 's'}: #${hearing.caseId}`,
        `${caseTitle} · ${hearing.court || 'Court'} at ${hearing.time}`,
        hearing.caseId,
      );
    }
  } catch {
    // Reminders are best-effort; the in-app Alerts inbox remains authoritative.
  }
}

export async function rescheduleAllReminders(): Promise<void> {
  try {
    const granted = await ensureNotificationPermission();
    if (!granted) return;
    const [actions, hearings, cases] = await Promise.all([
      actionsRepository.getAll(),
      hearingsRepository.getAll(),
      casesRepository.getAll(),
    ]);
    const titleByCase = new Map(cases.map((caseRecord) => [caseRecord.caseId, caseRecord.title]));
    for (const action of actions) {
      if (action.isDeleted) continue;
      await scheduleActionReminder(action, titleByCase.get(action.caseId) ?? 'Case');
    }
    for (const hearing of hearings) {
      if (hearing.isDeleted) continue;
      await scheduleHearingReminders(hearing, titleByCase.get(hearing.caseId) ?? 'Case');
    }
  } catch {
    // Never block app startup on notification permissions.
  }
}

export async function cancelActionReminder(actionId: string): Promise<void> {
  await cancelFor(`action-${actionId}`);
}

export async function cancelHearingReminder(hearingId: string): Promise<void> {
  await cancelFor(`hearing-${hearingId}`);
}
