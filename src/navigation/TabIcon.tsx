import React from 'react';
import { Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

const PATHS: Record<string, React.ReactElement[]> = {
  calendar: [
    React.createElement('rect', { key: 'r', x: 3, y: 5, width: 18, height: 16, rx: 2.5 }),
    React.createElement('line', { key: 'l1', x1: 3, y1: 10, x2: 21, y2: 10 }),
    React.createElement('line', { key: 'l2', x1: 8, y1: 3, x2: 8, y2: 7 }),
    React.createElement('line', { key: 'l3', x1: 16, y1: 3, x2: 16, y2: 7 }),
  ],
  message: [
    React.createElement('path', {
      key: 'p',
      d: 'M4 12c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7c-1.16 0-2.262-.217-3.252-.605L4 19l1.092-3.276C4.405 14.633 4 13.353 4 12z',
    }),
  ],
  droplet: [
    React.createElement('path', {
      key: 'p',
      d: 'M12 3c-3 4.5-6 7.5-6 11a6 6 0 0 0 12 0c0-3.5-3-6.5-6-11z',
    }),
  ],
  users: [
    React.createElement('circle', { key: 'c1', cx: 9, cy: 8, r: 3.2 }),
    React.createElement('circle', { key: 'c2', cx: 17, cy: 9, r: 2.5 }),
    React.createElement('path', { key: 'p1', d: 'M3 19c0-3.314 2.686-6 6-6s6 2.686 6 6' }),
    React.createElement('path', { key: 'p2', d: 'M15 13c2.761 0 5 2.239 5 5' }),
  ],
  heart: [
    React.createElement('path', {
      key: 'p',
      d: 'M12 20s-7-4.5-7-10a4.5 4.5 0 0 1 7-3.5A4.5 4.5 0 0 1 19 10c0 5.5-7 10-7 10z',
    }),
  ],
  user: [
    React.createElement('circle', { key: 'c', cx: 12, cy: 8, r: 4 }),
    React.createElement('path', { key: 'p', d: 'M4 20c0-4.418 3.582-8 8-8s8 3.582 8 8' }),
  ],
};

interface TabIconProps {
  name: keyof typeof PATHS;
  size: number;
  color: string;
}

export function TabIcon({ name, size, color }: TabIconProps) {
  if (Platform.OS === 'web') {
    return React.createElement(
      'svg',
      {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: color,
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        style: { display: 'block' },
      },
      PATHS[name]
    );
  }

  const FEATHER_MAP: Record<string, FeatherIconName> = {
    calendar: 'calendar',
    message: 'message-circle',
    droplet: 'droplet',
    users: 'users',
    heart: 'heart',
    user: 'user',
  };
  return <Feather name={FEATHER_MAP[name]} size={size} color={color} />;
}
