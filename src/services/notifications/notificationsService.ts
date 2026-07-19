import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { VesetDate, CalculationResult, HalachicProfile } from '../../types/halachic';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const VESET_LABELS: Record<VesetDate['type'], string> = {
  onah_beinonit: 'עונה בינונית',
  veset_hachodesh: 'וסת החודש',
  veset_haflagah: 'וסת ההפלגה',
  or_zarua: 'אור זרוע',
};

function atHour(dateMs: number, hour: number, minute = 0): number {
  const d = new Date(dateMs);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('siel-default', {
      name: 'SIEL התראות',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export async function cancelAllSielNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleHefsekReminders(
  cycleStartDate: string,
  _profile: HalachicProfile,
): Promise<void> {
  const now = Date.now();
  const startMs = new Date(cycleStartDate).getTime();
  for (let day = 5; day <= 14; day++) {
    const dayMs = startMs + (day - 1) * 24 * 60 * 60 * 1000;
    const triggerMs = atHour(dayMs, 10);
    if (triggerMs <= now) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'SIEL · הפסק טהרה',
        body: `היום יום ${day} לווסת – ניתן לבצע הפסק טהרה`,
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(triggerMs) },
    });
  }
}

export async function scheduleCleanDayReminders(
  hefsekDate: string,
  _profile: HalachicProfile,
): Promise<void> {
  await cancelAllSielNotifications();
  const now = Date.now();
  const hefsekMs = new Date(hefsekDate).getTime();
  for (let day = 1; day <= 7; day++) {
    const dayMs = hefsekMs + day * 24 * 60 * 60 * 1000;
    const isLast = day === 7;
    const morning = atHour(dayMs, 10);
    if (morning > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: isLast ? 'SIEL · יום 7 – בדיקה אחרונה!' : `SIEL · יום ${day} לספירה`,
          body: isLast
            ? 'בדיקה אחרונה בבוקר. הלילה – ליל הטבילה!'
            : `יום ${day} מהפסק הטהרה – זמן לבדיקת עד. נותרו ${7 - day} ימים`,
          sound: true,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(morning) },
      });
    }
    if (isLast) {
      const evening = atHour(dayMs, 20, 30);
      if (evening > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'SIEL · ליל הטבילה',
            body: 'הלילה ליל הטבילה. זכרי לבדוק עם מוכנית המקווה. ברוכה הבאה!',
            sound: true,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(evening) },
        });
      }
    }
  }
}

// ─── Prayer reminders (daily, repeating) ─────────────────────────────────────

const PRAYER_ID = 'siel-prayer-daily';

export async function schedulePrayerReminder(type: 'shacharit' | 'mincha' | 'arvit'): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(PRAYER_ID).catch(() => {});
  const hours = { shacharit: 9, mincha: 14, arvit: 20 };
  const labels = { shacharit: 'שחרית', mincha: 'מנחה', arvit: 'ערבית' };
  await Notifications.scheduleNotificationAsync({
    identifier: PRAYER_ID,
    content: {
      title: `SIEL · תפילת ${labels[type]}`,
      body: 'זמן התפילה הגיע 🙏',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: hours[type],
      minute: 0,
    },
  });
}

export async function cancelPrayerReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(PRAYER_ID).catch(() => {});
}

// ─── Cycle notifications ──────────────────────────────────────────────────────

export async function scheduleNotificationsForCycle(
  result: CalculationResult,
  cycleStartDate: string,
  profile: HalachicProfile,
): Promise<void> {
  await cancelAllSielNotifications();
  const now = Date.now();
  for (const veset of result.vesetDates) {
    const vesetTime = new Date(veset.date).getTime();
    const triggerTime = vesetTime - 24 * 60 * 60 * 1000;
    if (triggerTime > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `SIEL · ${VESET_LABELS[veset.type]} מחר`,
          body: `${veset.onah === 'night' ? 'הלילה' : 'מחר ביום'} — יש לשמור את העונה`,
          sound: true,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(triggerTime) },
      });
    }
  }
  if (result.mikvehNight) {
    const mikvehTime = new Date(result.mikvehNight).getTime();
    if (mikvehTime > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'SIEL · ליל טבילה',
          body: 'הלילה הוא ליל הטבילה. ברוכה הבאה!',
          sound: true,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(mikvehTime) },
      });
    }
  } else {
    await scheduleHefsekReminders(cycleStartDate, profile);
  }
}
