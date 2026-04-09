export type HalachicProfile = 'sephardi' | 'ashkenazi';

export type Onah = 'day' | 'night';

export interface CycleEntry {
  id: string;
  userId: string;
  startDate: string;
  hebrewDate: string;
  onah: Onah;
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
  latitude: number;
  longitude: number;
  profile: HalachicProfile;
  previousCycles: CycleEntry[];
}

export interface CalculationResult {
  vesetDates: VesetDate[];
  hefsekTaharahDate: string;
  mikvehNight: string;
  alerts: ProactiveAlert[];
}

export interface ProactiveAlert {
  type: 'onah_reminder' | 'hefsek_taharah' | 'mikveh_night';
  triggerDate: string;
  message: string;
}
