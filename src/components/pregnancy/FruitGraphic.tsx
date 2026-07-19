import React from 'react';
import Svg, { Circle, Ellipse, Path, G, Line } from 'react-native-svg';

// Line-art fruit illustrations in the Feather / Lucide / tab-bar style.
// One stroke color, no fills, rounded line caps. Elegant and minimal.

interface Props {
  name: string;
  size: number;
  color?: string;
  strokeWidth?: number;
}

export default function FruitGraphic({ name, size, color = '#AD7872', strokeWidth = 2.2 }: Props) {
  const sw = strokeWidth;
  const stroke = { stroke: color, strokeWidth: sw, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {renderFruit(name, stroke, color)}
    </Svg>
  );
}

type StrokeProps = {
  stroke: string;
  strokeWidth: number;
  fill: string;
  strokeLinecap: 'round';
  strokeLinejoin: 'round';
};

function renderFruit(name: string, s: StrokeProps, color: string): React.ReactElement {
  switch (name) {
    case 'גרגר פרג':
      return <Circle cx="50" cy="50" r="4" fill={color} />;

    case 'גרגר שומשום':
      return <Ellipse cx="50" cy="50" rx="7" ry="4" {...s} />;

    case 'עדשה':
      return <Ellipse cx="50" cy="50" rx="11" ry="8" {...s} />;

    case 'אוכמנייה':
      return (
        <G>
          <Circle cx="40" cy="55" r="14" {...s} />
          <Circle cx="58" cy="48" r="13" {...s} />
        </G>
      );

    case 'דובדבן':
      return (
        <G>
          <Path d="M 50 18 Q 55 12 64 14" {...s} />
          <Path d="M 50 18 Q 45 12 36 14" {...s} />
          <Circle cx="35" cy="62" r="18" {...s} />
          <Circle cx="65" cy="58" r="18" {...s} />
        </G>
      );

    case 'ענב':
      return (
        <G>
          <Path d="M 50 14 L 50 22" {...s} />
          <Path d="M 50 20 Q 60 14 66 22" {...s} />
          <Circle cx="40" cy="32" r="7" {...s} />
          <Circle cx="56" cy="32" r="7" {...s} />
          <Circle cx="32" cy="46" r="7" {...s} />
          <Circle cx="48" cy="46" r="7" {...s} />
          <Circle cx="64" cy="46" r="7" {...s} />
          <Circle cx="40" cy="60" r="7" {...s} />
          <Circle cx="56" cy="60" r="7" {...s} />
          <Circle cx="48" cy="74" r="7" {...s} />
        </G>
      );

    case 'תות':
      return (
        <G>
          <Path d="M 38 22 L 50 26 L 62 22 L 56 32 L 50 28 L 44 32 Z" {...s} />
          <Path d="M 50 26 L 50 32" {...s} />
          <Path d="M 28 38 Q 50 30 72 38 Q 72 70 50 86 Q 28 70 28 38 Z" {...s} />
          {[[40, 50], [58, 48], [48, 60], [60, 62], [42, 68], [56, 74]].map(([x, y], i) => (
            <Path key={i} d={`M ${x} ${y - 1.5} L ${x} ${y + 1.5}`} stroke={color} strokeWidth={s.strokeWidth * 0.7} strokeLinecap="round" />
          ))}
        </G>
      );

    case 'ליים':
    case 'לימון':
      return (
        <G>
          <Ellipse cx="50" cy="52" rx="26" ry="30" {...s} />
          <Path d="M 22 52 L 16 52" {...s} />
          <Path d="M 84 52 L 78 52" {...s} />
          <Path d="M 50 22 Q 58 16 64 22" {...s} />
        </G>
      );

    case 'קיווי':
      return (
        <G>
          <Ellipse cx="50" cy="50" rx="28" ry="26" {...s} />
          <Ellipse cx="50" cy="50" rx="23" ry="21" {...s} />
          <Circle cx="50" cy="50" r="2.5" fill={color} />
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const r = 14;
            return (
              <Path
                key={i}
                d={`M ${50 + Math.cos(angle) * (r - 2)} ${50 + Math.sin(angle) * (r - 2)} L ${50 + Math.cos(angle) * (r + 2)} ${50 + Math.sin(angle) * (r + 2)}`}
                stroke={color}
                strokeWidth={s.strokeWidth * 0.7}
                strokeLinecap="round"
              />
            );
          })}
        </G>
      );

    case 'אפרסק':
      return (
        <G>
          <Path d="M 50 18 Q 60 12 68 18" {...s} />
          <Path d="M 50 22 L 50 30" {...s} />
          <Circle cx="50" cy="56" r="30" {...s} />
          <Path d="M 50 30 Q 50 56 50 84" {...s} />
        </G>
      );

    case 'קלמנטינה':
      return (
        <G>
          <Circle cx="50" cy="52" r="28" {...s} />
          <Path d="M 50 24 L 50 18" {...s} />
          <Path d="M 50 22 Q 58 16 64 22" {...s} />
        </G>
      );

    case 'אבוקדו':
      return (
        <G>
          <Path d="M 50 18 Q 32 22 30 50 Q 30 80 50 84 Q 70 80 70 50 Q 68 22 50 18 Z" {...s} />
          <Circle cx="50" cy="58" r="10" {...s} />
          <Path d="M 50 16 L 50 22" {...s} />
        </G>
      );

    case 'אגס':
      return (
        <G>
          <Path d="M 50 16 L 52 22" {...s} />
          <Path d="M 52 20 Q 60 14 66 22" {...s} />
          <Path d="M 50 22 Q 38 24 36 42 Q 28 60 30 72 Q 32 86 50 86 Q 68 86 70 72 Q 72 60 64 42 Q 62 24 50 22 Z" {...s} />
        </G>
      );

    case 'פלפל ירוק':
      return (
        <G>
          <Path d="M 38 22 Q 50 18 62 22 L 60 32 L 50 28 L 40 32 Z" {...s} />
          <Path d="M 50 22 L 50 16" {...s} />
          <Path d="M 28 38 Q 36 28 50 30 Q 64 28 72 38 Q 76 64 60 82 Q 50 86 40 82 Q 24 64 28 38 Z" {...s} />
        </G>
      );

    case 'עגבנייה':
      return (
        <G>
          <Circle cx="50" cy="56" r="28" {...s} />
          <Path d="M 38 28 L 50 32 L 62 28 L 56 36 L 50 30 L 44 36 Z" {...s} />
          <Path d="M 50 28 L 50 22" {...s} />
        </G>
      );

    case 'בננה':
      return (
        <G>
          <Path d="M 22 26 Q 26 20 32 24 Q 60 36 76 70 Q 80 80 74 84 Q 70 86 62 82 Q 36 64 24 38 Q 18 30 22 26 Z" {...s} />
        </G>
      );

    case 'גזר':
      return (
        <G>
          <Path d="M 50 26 L 48 14" {...s} />
          <Path d="M 50 26 L 42 16" {...s} />
          <Path d="M 50 26 L 56 16" {...s} />
          <Path d="M 50 26 L 62 18" {...s} />
          <Path d="M 50 26 L 38 20" {...s} />
          <Path d="M 38 28 L 62 28 L 56 84 Q 50 90 44 84 Z" {...s} />
          <Path d="M 42 40 L 58 40" stroke={color} strokeWidth={s.strokeWidth * 0.6} strokeLinecap="round" />
          <Path d="M 44 54 L 56 54" stroke={color} strokeWidth={s.strokeWidth * 0.6} strokeLinecap="round" />
          <Path d="M 46 68 L 54 68" stroke={color} strokeWidth={s.strokeWidth * 0.6} strokeLinecap="round" />
        </G>
      );

    case 'תירס':
      return (
        <G>
          <Path d="M 32 22 Q 24 30 28 50 Q 30 56 38 52" {...s} />
          <Path d="M 68 22 Q 76 30 72 50 Q 70 56 62 52" {...s} />
          <Path d="M 36 24 Q 32 70 50 88 Q 68 70 64 24 Q 50 18 36 24 Z" {...s} />
        </G>
      );

    case 'מנגו':
      return (
        <G>
          <Path d="M 50 22 Q 30 28 26 48 Q 24 70 42 82 Q 60 86 72 70 Q 80 50 70 32 Q 60 22 50 22 Z" {...s} />
          <Path d="M 50 18 L 50 24" {...s} />
        </G>
      );

    case 'תפוח':
    case 'תפוח ירוק':
      return (
        <G>
          <Path d="M 50 22 L 50 30" {...s} />
          <Path d="M 50 24 Q 58 18 64 24" {...s} />
          <Path d="M 50 32 Q 32 30 28 50 Q 26 72 40 84 Q 50 86 60 84 Q 74 72 72 50 Q 68 30 50 32 Z" {...s} />
          {name === 'תפוח ירוק' && (
            <Path d="M 38 42 Q 40 50 38 58" stroke={color} strokeWidth={s.strokeWidth * 0.7} strokeLinecap="round" fill="none" />
          )}
        </G>
      );

    case 'חסה':
      return (
        <G>
          <Path d="M 50 28 Q 26 32 22 56 Q 30 72 50 76 Q 70 72 78 56 Q 74 32 50 28 Z" {...s} />
          <Path d="M 50 30 Q 36 38 32 56" {...s} />
          <Path d="M 50 30 Q 64 38 68 56" {...s} />
          <Path d="M 50 32 L 50 70" {...s} />
        </G>
      );

    case 'ברוקולי':
      return (
        <G>
          <Circle cx="35" cy="30" r="9" {...s} />
          <Circle cx="50" cy="22" r="10" {...s} />
          <Circle cx="65" cy="30" r="9" {...s} />
          <Circle cx="42" cy="42" r="8" {...s} />
          <Circle cx="58" cy="42" r="8" {...s} />
          <Path d="M 44 50 L 56 50 L 58 82 L 42 82 Z" {...s} />
        </G>
      );

    case 'חציל':
      return (
        <G>
          <Path d="M 36 22 Q 46 18 60 22 Q 62 28 56 30 L 44 30 Q 38 28 36 22 Z" {...s} />
          <Path d="M 50 22 L 50 16" {...s} />
          <Path d="M 44 30 Q 28 38 30 60 Q 32 82 50 86 Q 70 82 70 60 Q 70 38 56 30" {...s} />
        </G>
      );

    case 'מלפפון':
      return (
        <G>
          <Path d="M 24 36 Q 18 30 24 24 Q 32 22 38 30 L 70 64 Q 78 70 74 78 Q 68 84 60 78 L 28 44 Q 22 40 24 36 Z" {...s} />
          {[0, 1, 2, 3].map((i) => (
            <Path key={i} d={`M ${28 + i * 10} ${38 + i * 8} L ${33 + i * 10} ${43 + i * 8}`} stroke={color} strokeWidth={s.strokeWidth * 0.6} strokeLinecap="round" />
          ))}
        </G>
      );

    case 'פטרייה':
      return (
        <G>
          <Path d="M 18 50 Q 18 28 50 24 Q 82 28 82 50 Q 70 56 50 56 Q 30 56 18 50 Z" {...s} />
          <Path d="M 38 56 Q 36 78 40 86 L 60 86 Q 64 78 62 56" {...s} />
          <Circle cx="35" cy="42" r="2.5" fill={color} />
          <Circle cx="55" cy="38" r="2" fill={color} />
          <Circle cx="65" cy="46" r="2" fill={color} />
        </G>
      );

    case 'קוקוס':
      return (
        <G>
          <Circle cx="50" cy="52" r="30" {...s} />
          <Circle cx="40" cy="42" r="2" fill={color} />
          <Circle cx="58" cy="40" r="2" fill={color} />
          <Circle cx="50" cy="52" r="2" fill={color} />
          <Path d="M 50 22 L 50 32" stroke={color} strokeWidth={s.strokeWidth * 0.8} strokeLinecap="round" />
          <Path d="M 26 50 Q 28 48 32 50" stroke={color} strokeWidth={s.strokeWidth * 0.8} strokeLinecap="round" />
        </G>
      );

    case 'בצל':
      return (
        <G>
          <Path d="M 30 50 Q 28 32 50 26 Q 72 32 70 50 Q 70 78 50 84 Q 30 78 30 50 Z" {...s} />
          <Path d="M 40 30 Q 38 50 40 82" stroke={color} strokeWidth={s.strokeWidth * 0.7} fill="none" strokeLinecap="round" />
          <Path d="M 50 28 Q 50 60 50 84" stroke={color} strokeWidth={s.strokeWidth * 0.7} fill="none" strokeLinecap="round" />
          <Path d="M 60 30 Q 62 50 60 82" stroke={color} strokeWidth={s.strokeWidth * 0.7} fill="none" strokeLinecap="round" />
          <Path d="M 50 26 L 48 18 M 50 26 L 54 18" {...s} />
        </G>
      );

    case 'אננס':
      return (
        <G>
          <Path d="M 50 14 L 42 26 M 50 14 L 50 26 M 50 14 L 58 26 M 50 14 L 38 28 M 50 14 L 62 28" {...s} />
          <Path d="M 32 32 Q 30 60 50 86 Q 70 60 68 32 Q 50 28 32 32 Z" {...s} />
          {Array.from({ length: 3 }).map((_, row) =>
            Array.from({ length: 3 }).map((_, col) => {
              const x = 38 + col * 11 + (row % 2) * 5;
              const y = 40 + row * 13;
              return (
                <Path
                  key={`${row}-${col}`}
                  d={`M ${x} ${y} L ${x + 4} ${y + 4} L ${x} ${y + 8} L ${x - 4} ${y + 4} Z`}
                  stroke={color}
                  strokeWidth={s.strokeWidth * 0.7}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })
          )}
        </G>
      );

    case 'מלון':
      return (
        <G>
          <Circle cx="50" cy="50" r="30" {...s} />
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            return (
              <Path
                key={i}
                d={`M ${50 + Math.cos(angle) * 18} ${50 + Math.sin(angle) * 18} A 16 16 0 0 1 ${50 + Math.cos(angle + 0.3) * 24} ${50 + Math.sin(angle + 0.3) * 24}`}
                stroke={color}
                strokeWidth={s.strokeWidth * 0.6}
                fill="none"
                strokeLinecap="round"
              />
            );
          })}
        </G>
      );

    case 'תפוח אדמה':
      return (
        <G>
          <Path d="M 28 38 Q 26 26 38 24 Q 50 22 60 26 Q 76 30 76 50 Q 74 78 56 82 Q 36 84 28 70 Q 22 50 28 38 Z" {...s} />
          <Circle cx="42" cy="40" r="1.5" fill={color} />
          <Circle cx="58" cy="48" r="1.5" fill={color} />
          <Circle cx="48" cy="60" r="1.5" fill={color} />
          <Circle cx="64" cy="65" r="1.5" fill={color} />
        </G>
      );

    case 'פלפל חריף':
      return (
        <G>
          <Path d="M 30 18 Q 36 16 42 22 Q 44 28 40 32" {...s} />
          <Path d="M 38 30 Q 42 36 48 42 Q 60 56 68 76 Q 70 84 64 86 Q 56 86 50 78 Q 38 60 32 42 Q 28 32 32 28 Q 36 26 38 30 Z" {...s} />
        </G>
      );

    case 'ערמון':
      return (
        <G>
          <Path d="M 50 18 Q 40 14 36 22 Q 38 26 50 24 Q 62 26 64 22 Q 60 14 50 18 Z" {...s} />
          <Path d="M 30 30 Q 30 60 50 80 Q 70 60 70 30 Q 50 26 30 30 Z" {...s} />
          <Path d="M 50 30 L 50 76" stroke={color} strokeWidth={s.strokeWidth * 0.6} fill="none" strokeLinecap="round" />
        </G>
      );

    case 'שום':
      return (
        <G>
          <Path d="M 50 18 L 48 28 M 50 18 L 52 28" {...s} />
          <Path d="M 28 38 Q 28 28 50 26 Q 72 28 72 38 Q 76 70 50 86 Q 24 70 28 38 Z" {...s} />
          <Path d="M 50 28 Q 38 60 38 82" stroke={color} strokeWidth={s.strokeWidth * 0.7} fill="none" strokeLinecap="round" />
          <Path d="M 50 28 L 50 86" stroke={color} strokeWidth={s.strokeWidth * 0.7} fill="none" strokeLinecap="round" />
          <Path d="M 50 28 Q 62 60 62 82" stroke={color} strokeWidth={s.strokeWidth * 0.7} fill="none" strokeLinecap="round" />
        </G>
      );

    case 'אבטיח':
      return (
        <G>
          <Circle cx="50" cy="50" r="30" {...s} />
          <Circle cx="50" cy="50" r="24" {...s} />
          {[[42, 42], [56, 40], [48, 52], [60, 54], [44, 60], [56, 64]].map(([x, y], i) => (
            <Ellipse key={i} cx={x} cy={y} rx="1.3" ry="2.2" fill={color} />
          ))}
        </G>
      );

    case 'דלעת':
      return (
        <G>
          <Path d="M 50 18 L 50 26" {...s} />
          <Path d="M 50 22 Q 58 18 64 22 L 60 28" {...s} />
          <Path d="M 22 50 Q 22 28 50 28 Q 78 28 78 50 Q 78 82 50 86 Q 22 82 22 50 Z" {...s} />
          <Path d="M 35 30 Q 32 50 35 84" stroke={color} strokeWidth={s.strokeWidth * 0.7} fill="none" strokeLinecap="round" />
          <Path d="M 50 28 L 50 86" stroke={color} strokeWidth={s.strokeWidth * 0.7} fill="none" strokeLinecap="round" />
          <Path d="M 65 30 Q 68 50 65 84" stroke={color} strokeWidth={s.strokeWidth * 0.7} fill="none" strokeLinecap="round" />
        </G>
      );

    default:
      return <Circle cx="50" cy="50" r="28" {...s} />;
  }
}
