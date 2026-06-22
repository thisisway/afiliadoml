import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          100: "#D6E4FF",
          200: "#ADC8FF",
          300: "#84A9FF",
          400: "#6690FF",
          500: "#3366FF",
          600: "#254EDB",
          700: "#1939B7",
          800: "#102693",
          900: "#091A7A",
        },
        success: {
          100: "#CCFBEF",
          300: "#5CE8C0",
          500: "#00D68F",
          700: "#007A5E",
          900: "#004B3B",
        },
        warning: {
          100: "#FFF3CC",
          300: "#FFCE6A",
          500: "#FFAA00",
          700: "#B77600",
          900: "#704700",
        },
        danger: {
          100: "#FFE0EB",
          300: "#FF8FAB",
          500: "#FF3D71",
          700: "#B3134B",
          900: "#700024",
        },
        info: {
          100: "#CCE7FF",
          300: "#66B2FF",
          500: "#0095FF",
          700: "#0063B3",
          900: "#003368",
        },
        basic: {
          100: "#FFFFFF",
          200: "#F7F9FC",
          300: "#EDF1F7",
          400: "#E4E9F2",
          500: "#C5CEE0",
          600: "#8F9BB3",
          700: "#2E3A59",
          800: "#222B45",
          900: "#192038",
          1000: "#151A30",
          1100: "#101426",
        },
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "8px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 8px rgba(34, 43, 69, 0.08)",
        "card-hover": "0 4px 16px rgba(34, 43, 69, 0.14)",
        "btn": "0 2px 4px rgba(51, 102, 255, 0.24)",
      },
    },
  },
  plugins: [],
};

export default config;
