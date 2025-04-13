interface GradientColors {
  start: string;
  end: string;
}

interface ColorScheme {
  primary: string;
  secondary: string;
  black: string;
  white: string;
  gray: string;
  lightGray: string;
  darkGray: string;
  error: string;
  success: string;
  transparent: string;
  overlay: string;
  gradient: GradientColors;
}

interface SizeScheme {
  xSmall: number;
  small: number;
  medium: number;
  large: number;
  xLarge: number;
  xxLarge: number;
  xxxLarge: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  padding: number;
}

interface FontStyle {
  fontWeight: "400" | "500" | "600" | "700";
}

interface FontScheme {
  regular: FontStyle;
  medium: FontStyle;
  bold: FontStyle;
  semiBold: FontStyle;
}

interface ShadowStyle {
  shadowColor: string;
  shadowOffset: {
    width: number;
    height: number;
  };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

interface ShadowScheme {
  small: ShadowStyle;
  medium: ShadowStyle;
  large: ShadowStyle;
}

export const COLORS: ColorScheme = {
  primary: '#1DB954', // Spotify green
  secondary: '#9147FF', // For additional accents
  black: '#121212', // Dark background (Spotify-inspired)
  white: '#FFFFFF',
  gray: '#B3B3B3',
  lightGray: '#333333',
  darkGray: '#1A1A1A',
  error: '#FF5252',
  success: '#4CAF50',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.7)',
  gradient: {
    start: '#1DB954',
    end: '#191414'
  },
};

export const SIZES: SizeScheme = {
  // font sizes
  xSmall: 10,
  small: 12,
  medium: 14,
  large: 16,
  xLarge: 18,
  xxLarge: 22,
  xxxLarge: 28,
  
  // margins
  xs: 5,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,

  // padding
  padding: 20,
};

export const FONTS: FontScheme = {
  regular: {
    fontWeight: "400",
  },
  medium: {
    fontWeight: "500",
  },
  bold: {
    fontWeight: "700",
  },
  semiBold: {
    fontWeight: "600",
  },
};

export const SHADOWS: ShadowScheme = {
  small: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  large: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 15,
  },
};