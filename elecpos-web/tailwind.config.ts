import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/pages/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      boxShadow: { soft: "0 20px 40px rgba(2,6,23,0.06)" },
      borderRadius: { "2xl": "1.5rem" },
      container: { center: true, padding: "1rem" },
    },
  },
  plugins: [],
};
export default config;
