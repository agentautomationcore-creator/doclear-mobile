import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * Local push notifications for document deadlines.
 * Schedules 2 reminders: 3 days before and 1 day before deadline.
 *
 * Permission is requested AFTER first successful analysis (not on start).
 */

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permission.
 * Call after first successful document analysis.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedule deadline reminders for a document.
 * @param documentId - Document ID (used as notification identifier prefix)
 * @param title - Document title
 * @param deadline - Deadline date string (ISO format)
 */
export async function scheduleDeadlineReminders(
  documentId: string,
  title: string,
  deadline: string
): Promise<void> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime())) return;

  const now = new Date();

  // 3 days before
  const threeDaysBefore = new Date(deadlineDate);
  threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
  threeDaysBefore.setHours(9, 0, 0, 0); // 9:00 AM

  if (threeDaysBefore > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `3 days left: ${title}`,
        body: `Deadline: ${deadlineDate.toLocaleDateString()}`,
        data: { documentId },
      },
      trigger: { type: SchedulableTriggerInputTypes.DATE, date: threeDaysBefore },
      identifier: `${documentId}_3days`,
    });
  }

  // 1 day before
  const oneDayBefore = new Date(deadlineDate);
  oneDayBefore.setDate(oneDayBefore.getDate() - 1);
  oneDayBefore.setHours(9, 0, 0, 0);

  if (oneDayBefore > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Tomorrow: ${title}`,
        body: `Deadline: ${deadlineDate.toLocaleDateString()}`,
        data: { documentId },
      },
      trigger: { type: SchedulableTriggerInputTypes.DATE, date: oneDayBefore },
      identifier: `${documentId}_1day`,
    });
  }
}

/**
 * Cancel scheduled reminders for a document.
 */
export async function cancelDeadlineReminders(documentId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(`${documentId}_3days`).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(`${documentId}_1day`).catch(() => {});
}

/**
 * Save Expo Push Token to Supabase profile (for future server-side push).
 */
export async function savePushToken(userId: string): Promise<void> {
  try {
    if (Platform.OS === 'web') return;

    const token = await Notifications.getExpoPushTokenAsync();
    if (token?.data) {
      await supabase
        .from('profiles')
        .update({ push_token: token.data, updated_at: new Date().toISOString() })
        .eq('id', userId);
    }
  } catch (e) {
    if (__DEV__) console.error('[Notifications] savePushToken error:', e);
  }
}
