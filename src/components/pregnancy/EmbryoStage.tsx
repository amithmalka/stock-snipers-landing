import React from 'react';
import Svg, { Circle, Ellipse, Path, G } from 'react-native-svg';

// Embryo / early fetus development illustration. For weeks 4–17 we draw a
// progressive illustration that adds anatomical features as they actually
// develop in the embryo (heart at week 6, limb buds at 7, fingers at 10,
// face at 14, etc.). For week 18+ the parent component switches to real
// 3D-rendered fetus photos.

interface Props {
  week: number;
  size: number;
}

const SKIN = '#E5B3AB';
const SKIN_DARK = '#A66B62';
const SKIN_LIGHT = '#F4D2CB';
const HEART = '#C4565A';
const SAC = '#F8E2DD';
const OUTLINE = '#8B5852';

export default function EmbryoStage({ week, size }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* Amniotic sac glow — soft inner ring */}
      <Circle cx="50" cy="50" r="48" fill={SAC} opacity="0.4" />
      {renderStage(week)}
    </Svg>
  );
}

function renderStage(week: number): React.ReactElement {
  if (week <= 4) return <Week4 />;
  if (week === 5) return <Week5 />;
  if (week === 6) return <Week6 />;
  if (week === 7) return <Week7 />;
  if (week === 8) return <Week8 />;
  if (week === 9) return <Week9 />;
  if (week === 10) return <Week10 />;
  if (week === 11) return <Week11 />;
  if (week === 12) return <Week12 />;
  if (week === 13) return <Week13 />;
  if (week === 14) return <Week14 />;
  if (week === 15) return <Week15 />;
  if (week === 16) return <Week16 />;
  return <Week17 />;
}

// Week 4: Cluster of cells (blastocyst → morula). No structure yet.
function Week4() {
  return (
    <G>
      <Circle cx="48" cy="48" r="3" fill={SKIN} />
      <Circle cx="53" cy="50" r="2.5" fill={SKIN} />
      <Circle cx="50" cy="53" r="2.5" fill={SKIN} />
      <Circle cx="46" cy="52" r="2" fill={SKIN_DARK} />
      <Circle cx="51" cy="46" r="2" fill={SKIN_DARK} />
    </G>
  );
}

// Week 5: Tiny comma-shaped embryonic disc. Neural tube starting to close
// down the back.
function Week5() {
  return (
    <G>
      <Path
        d="M 50 38 Q 42 42 42 52 Q 42 60 48 62 Q 54 60 56 52 Q 56 44 50 38 Z"
        fill={SKIN_LIGHT}
        stroke={OUTLINE}
        strokeWidth="0.4"
      />
      {/* Neural tube line */}
      <Path d="M 48 42 Q 47 50 48 58" stroke={SKIN_DARK} strokeWidth="0.5" fill="none" />
    </G>
  );
}

// Week 6: Embryo begins to curl. HEART starts beating (visible red dot).
function Week6() {
  return (
    <G>
      <Path
        d="M 50 34 Q 38 38 38 52 Q 38 64 48 68 Q 60 64 60 50 Q 60 38 50 34 Z"
        fill={SKIN_LIGHT}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Heart — first beat */}
      <Circle cx="48" cy="52" r="2.2" fill={HEART} />
      <Circle cx="48" cy="52" r="3.5" fill="none" stroke={HEART} strokeWidth="0.4" opacity="0.5" />
    </G>
  );
}

// Week 7: LIMB BUDS appear — small bumps on sides.
function Week7() {
  return (
    <G>
      <Path
        d="M 50 30 Q 35 34 34 50 Q 34 66 48 72 Q 64 66 64 50 Q 64 34 50 30 Z"
        fill={SKIN_LIGHT}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Heart */}
      <Circle cx="48" cy="48" r="2.4" fill={HEART} />
      {/* Limb buds — NEW this week */}
      <Circle cx="32" cy="46" r="2.5" fill={SKIN} />
      <Circle cx="66" cy="46" r="2.5" fill={SKIN} />
      <Circle cx="36" cy="68" r="2.5" fill={SKIN} />
      <Circle cx="62" cy="68" r="2.5" fill={SKIN} />
    </G>
  );
}

// Week 8: Head distinct, limb paddles forming.
function Week8() {
  return (
    <G>
      {/* Head — now distinct */}
      <Circle cx="42" cy="35" r="14" fill={SKIN_LIGHT} stroke={OUTLINE} strokeWidth="0.5" />
      {/* Body */}
      <Path
        d="M 36 42 Q 30 56 38 70 Q 50 76 60 70 Q 64 56 56 42 Z"
        fill={SKIN_LIGHT}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      {/* Heart */}
      <Circle cx="44" cy="52" r="2.4" fill={HEART} />
      {/* Arm buds (paddle-shaped) */}
      <Ellipse cx="28" cy="48" rx="4" ry="2.5" fill={SKIN} stroke={OUTLINE} strokeWidth="0.4" />
      <Ellipse cx="64" cy="48" rx="4" ry="2.5" fill={SKIN} stroke={OUTLINE} strokeWidth="0.4" />
      {/* Leg buds */}
      <Ellipse cx="34" cy="72" rx="3" ry="4" fill={SKIN} stroke={OUTLINE} strokeWidth="0.4" />
      <Ellipse cx="60" cy="72" rx="3" ry="4" fill={SKIN} stroke={OUTLINE} strokeWidth="0.4" />
      {/* Eye spot — NEW */}
      <Circle cx="36" cy="32" r="1.2" fill={SKIN_DARK} />
    </G>
  );
}

// Week 9: Tail recedes, fingers begin to web.
function Week9() {
  return (
    <G>
      <Circle cx="40" cy="32" r="14" fill={SKIN_LIGHT} stroke={OUTLINE} strokeWidth="0.5" />
      <Path
        d="M 34 40 Q 26 56 36 72 Q 50 78 62 72 Q 66 56 58 40 Z"
        fill={SKIN_LIGHT}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      <Circle cx="42" cy="52" r="2.2" fill={HEART} />
      {/* Arms — more defined */}
      <Path
        d="M 28 48 Q 22 52 22 58 Q 26 60 30 56"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.4"
      />
      <Path
        d="M 62 48 Q 70 50 72 58 Q 70 62 64 58"
        fill={SKIN}
        stroke={OUTLINE}
        strokeWidth="0.4"
      />
      {/* Legs */}
      <Ellipse cx="36" cy="76" rx="3" ry="6" fill={SKIN} stroke={OUTLINE} strokeWidth="0.4" />
      <Ellipse cx="58" cy="76" rx="3" ry="6" fill={SKIN} stroke={OUTLINE} strokeWidth="0.4" />
      {/* Eye */}
      <Circle cx="33" cy="30" r="1.5" fill={SKIN_DARK} />
    </G>
  );
}

// Week 10: All organs present. Fingers/toes distinct.
function Week10() {
  return (
    <G>
      <Circle cx="38" cy="30" r="14" fill={SKIN_LIGHT} stroke={OUTLINE} strokeWidth="0.5" />
      <Path
        d="M 32 38 Q 24 56 34 74 Q 50 80 64 74 Q 68 56 60 38 Z"
        fill={SKIN_LIGHT}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      <Circle cx="40" cy="52" r="2.2" fill={HEART} />
      <Path d="M 26 46 Q 18 52 16 60 Q 22 62 28 56" fill={SKIN} stroke={OUTLINE} strokeWidth="0.4" />
      <Path d="M 62 46 Q 74 50 78 58 Q 74 64 66 58" fill={SKIN} stroke={OUTLINE} strokeWidth="0.4" />
      {/* Hand plates */}
      <Circle cx="18" cy="60" r="2.5" fill={SKIN_DARK} />
      <Circle cx="78" cy="60" r="2.5" fill={SKIN_DARK} />
      <Ellipse cx="36" cy="80" rx="3.5" ry="7" fill={SKIN} stroke={OUTLINE} strokeWidth="0.4" />
      <Ellipse cx="58" cy="80" rx="3.5" ry="7" fill={SKIN} stroke={OUTLINE} strokeWidth="0.4" />
      <Circle cx="31" cy="28" r="1.5" fill={SKIN_DARK} />
      {/* Nose bump */}
      <Path d="M 24 32 Q 22 34 24 36" stroke={OUTLINE} strokeWidth="0.5" fill="none" />
    </G>
  );
}

// Week 11: Ear position, more refined face.
function Week11() {
  return (
    <G>
      <Circle cx="38" cy="28" r="15" fill={SKIN_LIGHT} stroke={OUTLINE} strokeWidth="0.5" />
      <Path
        d="M 32 38 Q 24 58 34 76 Q 50 82 64 76 Q 68 58 60 38 Z"
        fill={SKIN_LIGHT}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      <Circle cx="40" cy="50" r="2.2" fill={HEART} />
      <Path d="M 26 46 Q 16 54 14 62 Q 22 64 28 56" fill={SKIN} stroke={OUTLINE} strokeWidth="0.4" />
      <Path d="M 62 46 Q 76 50 80 60 Q 74 64 66 58" fill={SKIN} stroke={OUTLINE} strokeWidth="0.4" />
      <Circle cx="16" cy="62" r="3" fill={SKIN_DARK} />
      <Circle cx="80" cy="62" r="3" fill={SKIN_DARK} />
      <Ellipse cx="36" cy="82" rx="4" ry="8" fill={SKIN} stroke={OUTLINE} strokeWidth="0.4" />
      <Ellipse cx="58" cy="82" rx="4" ry="8" fill={SKIN} stroke={OUTLINE} strokeWidth="0.4" />
      <Circle cx="30" cy="26" r="1.5" fill={SKIN_DARK} />
      {/* Ear */}
      <Path d="M 46 30 Q 49 30 48 34" stroke={OUTLINE} strokeWidth="0.6" fill="none" />
      <Path d="M 22 30 Q 20 32 22 36" stroke={OUTLINE} strokeWidth="0.5" fill="none" />
    </G>
  );
}

// Week 12: End of first trimester. Distinct human form.
function Week12() {
  return (
    <G>
      <Circle cx="38" cy="28" r="16" fill={SKIN_LIGHT} stroke={OUTLINE} strokeWidth="0.5" />
      <Path
        d="M 32 40 Q 22 60 34 78 Q 50 84 64 78 Q 70 60 60 40 Z"
        fill={SKIN_LIGHT}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      <Circle cx="40" cy="50" r="2.2" fill={HEART} />
      <Path d="M 24 46 Q 12 56 12 64 Q 22 66 28 56" fill={SKIN} stroke={OUTLINE} strokeWidth="0.4" />
      <Path d="M 64 46 Q 78 52 82 62 Q 74 66 66 58" fill={SKIN} stroke={OUTLINE} strokeWidth="0.4" />
      {/* Fingers — NEW visible detail */}
      <Path d="M 12 64 L 10 66 M 13 65 L 11 68 M 14 65 L 13 69 M 15 65 L 15 69" stroke={OUTLINE} strokeWidth="0.5" />
      <Path d="M 82 62 L 84 64 M 81 63 L 83 66 M 80 63 L 82 67" stroke={OUTLINE} strokeWidth="0.5" />
      <Ellipse cx="36" cy="84" rx="4" ry="8" fill={SKIN} stroke={OUTLINE} strokeWidth="0.4" />
      <Ellipse cx="58" cy="84" rx="4" ry="8" fill={SKIN} stroke={OUTLINE} strokeWidth="0.4" />
      <Circle cx="30" cy="26" r="1.6" fill={SKIN_DARK} />
      <Path d="M 22 30 Q 19 33 22 36" stroke={OUTLINE} strokeWidth="0.5" fill="none" />
      <Path d="M 28 36 Q 30 38 32 36" stroke={OUTLINE} strokeWidth="0.5" fill="none" />
    </G>
  );
}

// Week 13: Vocal cords, intestines in place.
function Week13() {
  return <Week12 />; // very similar to week 12 visually
}

// Week 14: Lanugo, facial expressions.
function Week14() {
  return (
    <G>
      <Circle cx="40" cy="28" r="17" fill={SKIN_LIGHT} stroke={OUTLINE} strokeWidth="0.5" />
      <Path
        d="M 32 42 Q 22 62 34 80 Q 50 86 66 80 Q 72 62 60 42 Z"
        fill={SKIN_LIGHT}
        stroke={OUTLINE}
        strokeWidth="0.5"
      />
      <Circle cx="42" cy="52" r="2.4" fill={HEART} />
      <Path d="M 24 48 Q 10 58 10 66 Q 20 68 28 58" fill={SKIN} stroke={OUTLINE} strokeWidth="0.4" />
      <Path d="M 66 48 Q 80 54 84 64 Q 76 68 68 60" fill={SKIN} stroke={OUTLINE} strokeWidth="0.4" />
      <Ellipse cx="36" cy="86" rx="4" ry="9" fill={SKIN} stroke={OUTLINE} strokeWidth="0.4" />
      <Ellipse cx="60" cy="86" rx="4" ry="9" fill={SKIN} stroke={OUTLINE} strokeWidth="0.4" />
      {/* Face profile */}
      <Circle cx="31" cy="26" r="1.8" fill={SKIN_DARK} />
      <Path d="M 22 28 Q 18 32 22 36" stroke={OUTLINE} strokeWidth="0.6" fill="none" />
      <Path d="M 22 36 Q 20 38 24 39" stroke={OUTLINE} strokeWidth="0.5" fill="none" />
      <Path d="M 28 38 Q 31 40 34 38" stroke={OUTLINE} strokeWidth="0.5" fill="none" />
      <Path d="M 47 30 Q 50 30 49 34" stroke={OUTLINE} strokeWidth="0.6" fill="none" />
    </G>
  );
}

function Week15() { return <Week14 />; }
function Week16() { return <Week14 />; }
function Week17() { return <Week14 />; }
