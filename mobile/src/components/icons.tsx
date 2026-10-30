import Svg, { Circle, Path, Rect } from "react-native-svg";

type P = { size?: number; color?: string; width?: number };
const base = ({ size = 22, color = "#14201B", width = 2 }: P) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: color,
  strokeWidth: width,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const IconCamera = (p: P) => (
  <Svg {...base(p)}><Path d="M4 8h3l2-3h6l2 3h3v11H4z" /><Circle cx="12" cy="13" r="3.5" /></Svg>
);
export const IconMic = (p: P) => (
  <Svg {...base(p)}><Rect x="9" y="3" width="6" height="11" rx="3" /><Path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></Svg>
);
export const IconStar = (p: P & { filled?: boolean }) => (
  <Svg {...base(p)}><Path fill={p.filled ? p.color : "none"} d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" /></Svg>
);
export const IconChat = (p: P) => (
  <Svg {...base(p)}><Path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.9A8 8 0 1 1 21 12z" /></Svg>
);
export const IconBack = (p: P) => (
  <Svg {...base({ width: 2.4, ...p })}><Path d="M15 5l-7 7 7 7" /></Svg>
);
export const IconNext = (p: P) => (
  <Svg {...base({ width: 2.4, ...p })}><Path d="M9 5l7 7-7 7" /></Svg>
);
export const IconClose = (p: P) => (
  <Svg {...base({ width: 2.6, ...p })}><Path d="M6 6l12 12M18 6L6 18" /></Svg>
);
export const IconPlus = (p: P) => (
  <Svg {...base({ width: 2.4, ...p })}><Path d="M12 5v14M5 12h14" /></Svg>
);
export const IconCheck = (p: P) => (
  <Svg {...base({ width: 2.6, ...p })}><Path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>
);
export const IconSpark = (p: P) => (
  <Svg {...base(p)}><Path d="M12 3l2.2 5.3L20 9.5l-4.3 3.8 1.3 5.7L12 16l-5 3 1.3-5.7L4 9.5l5.8-1.2z" /></Svg>
);
export const IconLock = (p: P) => (
  <Svg {...base(p)}><Rect x="5" y="11" width="14" height="10" rx="2" /><Path d="M8 11V8a4 4 0 0 1 8 0v3" /></Svg>
);
export const IconClock = (p: P) => (
  <Svg {...base(p)}><Circle cx="12" cy="12" r="8.5" /><Path d="M12 7.5V12l3 2" /></Svg>
);
export const IconBars = (p: P) => (
  <Svg {...base(p)}><Path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Svg>
);
export const IconUser = (p: P) => (
  <Svg {...base(p)}><Circle cx="12" cy="8" r="4" /><Path d="M4 21a8 8 0 0 1 16 0" /></Svg>
);
export const IconImage = (p: P) => (
  <Svg {...base(p)}><Rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><Circle cx="9" cy="10" r="1.8" /><Path d="M20.5 16l-5-5-8 8.5" /></Svg>
);
export const IconRepeat = (p: P) => (
  <Svg {...base(p)}><Path d="M4 12a8 8 0 0 1 14-5.3M20 4v5h-5M20 12a8 8 0 0 1-14 5.3M4 20v-5h5" /></Svg>
);
export const IconSend = (p: P) => (
  <Svg {...base(p)}><Path d="M4 12l16-8-6 16-2.5-6.5z" /></Svg>
);
export const IconSearch = (p: P) => (
  <Svg {...base(p)}><Circle cx="11" cy="11" r="6.5" /><Path d="M20 20l-4.2-4.2" /></Svg>
);
export const IconFlame = (p: P) => (
  <Svg {...base(p)}><Path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.5 2 1.5 3 3 3-1.5-3-1-6 0-8.5z" /></Svg>
);
