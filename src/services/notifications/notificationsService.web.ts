// Web stub – push notifications are not supported in PWA mode
import { VesetDate, CalculationResult, HalachicProfile } from '../../types/halachic';

export async function registerForPushNotifications(): Promise<string | null> {
  return null;
}

export async function cancelAllSielNotifications(): Promise<void> {}

export async function scheduleHefsekReminders(
  _cycleStartDate: string,
  _profile: HalachicProfile,
): Promise<void> {}

export async function scheduleCleanDayReminders(
  _hefsekDate: string,
  _profile: HalachicProfile,
): Promise<void> {}

export async function schedulePrayerReminder(
  _type: 'shacharit' | 'mincha' | 'arvit',
): Promise<void> {}

export async function cancelPrayerReminder(): Promise<void> {}

export async function scheduleNotificationsForCycle(
  _result: CalculationResult,
  _cycleStartDate: string,
  _profile: HalachicProfile,
): Promise<void> {}
