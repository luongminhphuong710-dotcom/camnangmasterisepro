import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        masterise: {
          ink: "#211b16",
          muted: "#6f665f",
          primary: "#947346",
          dark: "#6f512d",
          soft: "#f4eadc",
          line: "#ded2c3",
          surface: "#fbf8f3",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        masterise: "0 18px 44px rgba(33, 27, 22, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
