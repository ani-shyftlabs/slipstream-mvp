import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        navy: "#0F2540",
        gold: "#C49A2C",
        ink: "#0E1920",
        silver: "#DDE4E9",
        success: "#0D5C3A",
        warning: "#7A4A00",
        error: "#6B1E1E",
        border: "#DDE4E9",
        input: "#DDE4E9",
        ring: "#0F2540",
        background: "#FAFAFA",
        foreground: "#0E1920",
        primary: {
          DEFAULT: "#0F2540",
          foreground: "#FAFAFA",
        },
        secondary: {
          DEFAULT: "#DDE4E9",
          foreground: "#0E1920",
        },
        destructive: {
          DEFAULT: "#6B1E1E",
          foreground: "#FAFAFA",
        },
        muted: {
          DEFAULT: "#DDE4E9",
          foreground: "#0E1920",
        },
        accent: {
          DEFAULT: "#C49A2C",
          foreground: "#0E1920",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#0E1920",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#0E1920",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
