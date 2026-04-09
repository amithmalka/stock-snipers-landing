import { GeoLocation, ZmanimCalendar } from 'kosher-zmanim';

export interface ZmanimResult {
  sunrise: Date | null;
  sunset: Date | null;
  shkiah: Date | null;
  tzeis: Date | null;
}

/**
 * Get zmanim (sunrise/sunset) for a given location and date.
 */
export function getZmanim(
  latitude: number,
  longitude: number,
  date: Date = new Date()
): ZmanimResult {
  const geoLocation = new GeoLocation(
    'UserLocation',
    latitude,
    longitude,
    0,
    'UTC'
  );

  const calendar = new ZmanimCalendar(geoLocation);
  calendar.setDate(date);

  return {
    sunrise: calendar.getSunrise(),
    sunset: calendar.getSunset(),
    shkiah: calendar.getSunset(),
    tzeis: calendar.getTzais(),
  };
}
