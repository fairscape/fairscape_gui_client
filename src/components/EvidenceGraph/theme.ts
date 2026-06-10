// styled-components theme shim for the ported EvidenceGraph viewer. The viewer's
// styled components read theme.colors.*, theme.spacing.*, theme.borderRadius — so
// it's wrapped in <ThemeProvider theme={graphTheme}>. Values mirror the web client's
// styles/theme.ts, plus a neutral `disabled` the original lacked.
export const graphTheme = {
  colors: {
    primary: '#005f73',
    primaryLight: '#0a9396',
    primaryDark: '#003844',
    secondary: '#ee9b00',
    secondaryLight: '#f4c277',
    background: '#f8f9fa',
    backgroundAlt: '#f0f0f0',
    backgroundHover: '#e9ecef',
    surface: '#ffffff',
    text: '#212529',
    textSecondary: '#6c757d',
    border: '#dee2e6',
    error: '#d00000',
    success: '#40916c',
    info: '#0077b6',
    warning: '#ffb703',
    disabled: '#adb5bd',
  },
  fonts: {
    main: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
  },
  spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' },
  borderRadius: '8px',
};

export type GraphTheme = typeof graphTheme;
