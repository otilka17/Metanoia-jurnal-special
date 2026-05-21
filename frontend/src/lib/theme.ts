export const theme = {
  colors: {
    bg: "#F9F8F6",
    surface: "#FFFFFF",
    surfaceElevated: "#F0EFEA",
    primary: "#5E8B7E",
    primaryLight: "#A4C3B2",
    primaryDark: "#3D5A52",
    secondary: "#DE8F6E",
    secondaryLight: "#F2B8A2",
    textPrimary: "#2D3A35",
    textSecondary: "#5C6B64",
    textDisabled: "#A0ACA6",
    border: "#E6E4DD",
    error: "#B56B6B",
    warning: "#E8C37C",
    success: "#5E8B7E",
    white: "#FFFFFF",
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { sm: 8, md: 16, lg: 24, pill: 999 },
  font: {
    h1: { fontSize: 32, fontWeight: "700" as const, letterSpacing: -1, lineHeight: 40 },
    h2: { fontSize: 24, fontWeight: "600" as const, letterSpacing: -0.5, lineHeight: 32 },
    h3: { fontSize: 20, fontWeight: "500" as const, lineHeight: 28 },
    bodyL: { fontSize: 18, fontWeight: "400" as const, lineHeight: 26 },
    body: { fontSize: 16, fontWeight: "400" as const, lineHeight: 24 },
    label: { fontSize: 12, fontWeight: "500" as const, letterSpacing: 1, lineHeight: 16 },
  },
};

export const moods = [
  { key: "calm", label: "Calm", color: "#5E8B7E", emoji: "🌿" },
  { key: "fericit", label: "Fericit", color: "#E8C37C", emoji: "☀️" },
  { key: "agitat", label: "Agitat", color: "#DE8F6E", emoji: "⚡" },
  { key: "criza", label: "Criză", color: "#B56B6B", emoji: "🌧️" },
  { key: "ingrijorat", label: "Îngrijorat", color: "#7A9E9F", emoji: "💭" },
];
