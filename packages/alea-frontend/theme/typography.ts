import { createTheme, TypographyVariantsOptions } from "@mui/material/styles";

const HEADING_LINE_HEIGHT = 1.5;
const theme = createTheme();

export const TYPOGRAPHY: TypographyVariantsOptions = {
  fontFamily: `'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif`,//TODO: acc to wald, also look for T1 and T2
  fontWeightLight: 400,
  fontWeightRegular: 400,
  fontWeightMedium: 600,
  fontWeightBold: 700,
  h1: {
    fontSize: 48,
    lineHeight: HEADING_LINE_HEIGHT,
    fontWeight: 600,
    [theme.breakpoints.down("lg")]: {
      fontSize: 32,
    },
    [theme.breakpoints.down("sm")]: {
      fontSize: 28,
    },
  },
  h2: {
    fontSize: 30,
    lineHeight: HEADING_LINE_HEIGHT,
    fontWeight: 500,
    [theme.breakpoints.down("md")]: {
      fontSize: 24,
    },
  },
  h3: {
    fontSize: 24,
    lineHeight: HEADING_LINE_HEIGHT,
    fontWeight: 500,
    [theme.breakpoints.down("md")]: {
      fontSize: 20,
    },
  },
  h4: {
    fontSize: 20,
    lineHeight: HEADING_LINE_HEIGHT,
    fontWeight: 500,
    [theme.breakpoints.down("md")]: {
      fontSize: 18,
    },
  },
  h5: {
    fontSize: 16,
    lineHeight: HEADING_LINE_HEIGHT,
    fontWeight: 500,
  },
  h6: {
    fontSize: 14,
    lineHeight: HEADING_LINE_HEIGHT,
    fontWeight: 600,
  },
  body1: {
    fontSize: "16px",
  },
  body2: {
    fontSize: "14px",
  },
  subtitle1: {
    fontSize: "12px",
  },
  subtitle2: {
    fontSize: "10px",
  },
};

