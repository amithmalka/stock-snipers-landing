export type HalachicProfile = 'sephardi' | 'ashkenazi';

export type Onah = 'day' | 'night';

export interface CycleEntry {
  id: string;
  userId: string;
  startDate: string;
  hebrewDate: string;
  onah: Onah;
  hefsekDate?: string;   // recorded by user tapping "+ הפסק טהרה"
  createdAt: string;
}

export interface VesetDate {
  date: string;
  type: 'onah_beinonit' | 'veset_hachodesh' | 'veset_haflagah' | 'or_zarua';
  onah: Onah;
  isFixed: boolean;
}

export interface CalculationInput {
  startDate: string;
  hebrewDate: string;
  onah: Onah;
  hefsekDate?: string;   // if set, overrides the auto-calculated day-5 hefsek
  latitude: number;
  longitude: number;
  profile: HalachicProfile;
  previousCycles: CycleEntry[];
}

export interface CalculationResult {
  vesetDates: VesetDate[];
  hefsekTaharahDate: string | undefined;  // undefined until user records it
  mikvehNight: string | undefined;        // undefined until hefsek is recorded
  alerts: ProactiveAlert[];
}

export interface ProactiveAlert {
  type: 'onah_reminder' | 'hefsek_taharah' | 'mikveh_night';
  triggerDate: string;
  message: string;
}
