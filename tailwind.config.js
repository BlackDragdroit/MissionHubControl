/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,html}', './server.js'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
        mono2: ['JetBrains Mono', 'monospace']
      },
      colors: {
        hub: {
          void: '#05080f',
          base: '#0a0f1c',
          card: '#111a2e',
          raised: '#16213b',
          line: '#22304f',
          hair: '#19233c',
          accent: '#6c9bff',
          text: '#e8edfb',
          muted: '#8b97b6',
          faint: '#5c6788'
        }
      }
    }
  }
}
