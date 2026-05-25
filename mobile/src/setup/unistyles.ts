import { Platform } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import type { UnistylesBreakpoints } from "react-native-unistyles";

const FONT_LIGHT = Platform.select({
  android: "SNPro_300Light",
  ios: "SN-Pro Light",
});
const FONT_REGULAR = Platform.select({
  android: "SNPro_400Regular",
  ios: "SN-Pro Regular",
});
const FONT_MEDIUM = Platform.select({
  android: "SNPro_500Medium",
  ios: "SN-Pro Medium",
});
const FONT_BOLD = Platform.select({
  android: "SNPro_700Bold",
  ios: "SN-Pro Bold",
});

const theme = {
  typography: {
    text: {
      light: FONT_LIGHT,
      regular: FONT_REGULAR,
      medium: FONT_MEDIUM,
      bold: FONT_BOLD,
    },
    header: {
      light: FONT_LIGHT,
      regular: FONT_REGULAR,
      medium: FONT_MEDIUM,
      bold: FONT_BOLD,
    },
  },
  colors: {
    text: {
      primary: "#733e0a",
    },
    button: {
      primary: "#fdc700",
    },
  },
} as const;

type AppTheme = typeof theme;

declare module "react-native-unistyles" {
  export interface UnistylesThemes {
    default: AppTheme;
  }

  export interface UnistylesBreakpoints {
    xs: 0;
    sm: 300;
    md: 500;
    lg: 800;
    xl: 1200;
  }
}

const breakpoints = {
  xs: 0,
  sm: 300,
  md: 500,
  lg: 800,
  xl: 1200,
} as const satisfies UnistylesBreakpoints;

StyleSheet.configure({
  themes: { default: theme },
  breakpoints,
  settings: {
    initialTheme: "default",
  },
});
