export const Colors = {
  bg: '#FFF5E6',
  card: '#FFE8CC',
  cardLight: '#FFF0DC',
  primary: '#FFB38A',
  primaryDark: '#E8935A',
  text: '#4E3B31',
  textLight: '#8B6E5A',
  textMuted: '#B89A88',
  danger: '#E97A7A',
  dangerBg: '#FDEAEA',
  dangerDark: '#C0392B',
  warning: '#F5A623',
  warningBg: '#FEF6E4',
  safe: '#7BBF8E',
  safeBg: '#EAF7EE',
  white: '#FFFFFF',
  border: '#F0D9C0',
  shadow: 'rgba(78,59,49,0.08)',
  overlay: 'rgba(0,0,0,0.5)',
};

export const Typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, color: Colors.text },
  h2: { fontSize: 22, fontWeight: '700' as const, color: Colors.text },
  h3: { fontSize: 18, fontWeight: '600' as const, color: Colors.text },
  body: { fontSize: 15, fontWeight: '400' as const, color: Colors.text },
  bodyLarge: { fontSize: 17, fontWeight: '400' as const, color: Colors.text },
  caption: { fontSize: 13, fontWeight: '400' as const, color: Colors.textLight },
  label: { fontSize: 12, fontWeight: '600' as const, color: Colors.textMuted },
  // Guardian larger sizes
  guardianH1: { fontSize: 32, fontWeight: '700' as const, color: Colors.text },
  guardianBody: { fontSize: 19, fontWeight: '400' as const, color: Colors.text },
};

export const Spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};

export const Radius = {
  sm: 8, md: 12, lg: 16, xl: 24, full: 999,
};

export const Shadow = {
  card: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  strong: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
  },
};
