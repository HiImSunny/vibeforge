/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Vibeforge calm technical palette (from UI design plan)
        bg: '#0a0c10',
        surface: '#111318',
        surface2: '#161a20',
        border: '#1f242c',
        text: '#e6e8eb',
        muted: '#8a919d',
        accent: {
          claude: '#3b82f6',
          codex: '#a855f7',
          gemini: '#22c55e',
          general: '#64748b',
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
