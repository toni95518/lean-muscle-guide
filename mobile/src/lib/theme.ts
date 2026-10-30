// Same palette as the web app and the approved design.
export const C = {
  bg: "#F2F5F1",
  surface: "#FFFFFF",
  sunk: "#E7ECE7",
  ink: "#14201B",
  ink2: "#3B4A43",
  muted: "#5A6962",
  line: "#D6DFD8",
  accent: "#0B7A55",
  accentDark: "#075A3F",
  accentSoft: "#DCEFE5",
  onAccent: "#FFFFFF",
  burn: "#C94F08",
  prot: "#C2255C",
  carb: "#B87708",
  fat: "#5F45BF",
  water: "#1864AB",
  waterSoft: "#DCEBFA",
  danger: "#B42318",
  dangerSoft: "#FDE7E4",
  camera: "#0D1411",
  camera2: "#1D2923",
  cameraInk: "#E6EFEA",
};

export const R = { card: 16, control: 12, pill: 999 };

export const T = {
  display: { fontSize: 30, fontWeight: "800" as const, letterSpacing: 0.5, textTransform: "uppercase" as const },
  h2: { fontSize: 16, fontWeight: "800" as const, letterSpacing: 1, textTransform: "uppercase" as const },
  label: { fontSize: 11.5, fontWeight: "700" as const, letterSpacing: 0.9, textTransform: "uppercase" as const, color: C.muted },
  body: { fontSize: 15, color: C.ink },
  small: { fontSize: 12.5, color: C.muted },
  num: { fontVariant: ["tabular-nums" as const], fontWeight: "700" as const },
};
