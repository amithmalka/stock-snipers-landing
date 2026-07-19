export interface ZmanimResult {
  sunrise: Date | null;
  sunset: Date | null;
  shkiah: Date | null;
  tzeis: Date | null;
}

// Lightweight sunrise/sunset (NOAA algorithm) — replaces kosher-zmanim
function calcSunTime(lat: number, lon: number, date: Date, isSunrise: boolean): Date | null {
  const rad = Math.PI / 180;
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const B = (2 * Math.PI * (dayOfYear - 81)) / 364;
  const EoT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const decl = 23.45 * rad * Math.sin(B);
  const cosH =
    (Math.cos(90.833 * rad) - Math.sin(lat * rad) * Math.sin(decl)) /
    (Math.cos(lat * rad) * Math.cos(decl));
  if (cosH < -1 || cosH > 1) return null;
  const H = (Math.acos(cosH) * 180) / Math.PI;
  const solarNoon = 720 - 4 * lon - EoT;
  const minutesUtc = isSunrise ? solarNoon - H * 4 : solarNoon + H * 4;
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  result.setUTCMinutes(minutesUtc);
  return result;
}

/**
 * Get zmanim (sunrise/sunset) for a given location and date.
 */
export function getZmanim(
  latitude: number,
  longitude: number,
  date: Date = new Date()
): ZmanimResult {
  const sunrise = calcSunTime(latitude, longitude, date, true);
  const sunset = calcSunTime(latitude, longitude, date, false);
  const tzeis = sunset ? new Date(sunset.getTime() + 18 * 60000) : null;
  return { sunrise, sunset, shkiah: sunset, tzeis };
}
