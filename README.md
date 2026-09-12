# REFRA 🎬 https://refra.netlify.app)

> A minimalist, high-performance 4K movie & anime streaming and discovery platform.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8.svg?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg?logo=express&logoColor=black)](https://expressjs.com/)
[![Gemini AI](https://img.shields.io/badge/Google_Gemini-3.8_Flash-8e44ad.svg?logo=google&logoColor=white)](https://ai.google.dev/)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline_First-5A0FC8.svg?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

---

## ✨ Features

- **4K Movie & TV Discovery**: Real-time trending, spotlight picks, top-rated movies, TV series, Indian cinema, and curated collections.
- **Trending Anime Hub**: Comprehensive anime discovery powered by TMDB and AniList GraphQL with full episode and season tracking.
- **Ad-Free Embedded Player**: Seamless multi-source video player with quick-switching mirrors, episode navigators, and full-screen support.
- **Liquid Glass Aesthetic**: Handcrafted UI featuring SVG fractal noise displacement (`feTurbulence`), subtle specular lighting, squircle geometries, and fluid spring animations.
- **Universal Image Proxy & Resilient Fallback**: Auto-detects blocked CDNs (e.g. ISP blocks) and routes through a high-speed server-side image proxy (`/api/image`) with inline SVG fallbacks.
- **Diagnostics & Network Sandbox**: Built-in visual latency testing for Direct TMDB CDN vs. Server Proxy, along with one-click cache purging.
- **Progressive Web App (PWA)**: Installable on iOS, Android, and Desktop with offline caching and instant cold-start loading.
- **Data Saver Mode & Themes**: Multiple themes (Cinema Onyx, Obsidian, Tokyo Neon, Midnight Sapphire) and configurable bandwidth optimization.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS v4, Motion (`motion/react`), Lucide React
- **Backend & Middleware**: Express, Sharp (image optimization), Serverless-HTTP
- **APIs & Data**: TMDB API, AniList GraphQL, OMDb API, Fanart.tv, MDBList
- **AI Integration**: Google GenAI SDK (`@google/genai`)
- **Deployment**: Standalone Node.js container (Cloud Run / Docker) or Serverless (Netlify Functions)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [bun](https://bun.sh/)

### 1. Clone the Repository

Bash
git clone https://github.com/Bakhshi7889/REFRA.git
cd REFRA

### 2. Install Dependencies
Bash
npm install
3. Configure Environment Variables
Create a .env file in the root directory by copying .env.example:

Bash
cp .env.example .env
Fill in your API credentials:
code
Env
# Google Gemini AI (Optional - for AI assistant features)
GEMINI_API_KEY="your_gemini_api_key_here"

# Application URL
APP_URL="http://localhost:3000"

# Movie & Media Metadata APIs
TMDB_API_KEY="your_tmdb_api_key_here"
OMDB_API_KEY="your_omdb_api_key_here"
MDBLIST_API_KEY="your_mdblist_api_key_here"
FANART_API_KEY="your_fanart_api_key_here"

# Google Analytics (Optional)
VITE_GA_MEASUREMENT_ID="

Note: The application includes built-in fallback catalogs, so it will still launch and display movies even without all API keys configured!

### 4. Run Development Server
Bash
npm run dev
Open http://localhost:3000 in your browser.

📦 Build & Production
Compile for Production
Bash
npm run build
This compiles the Vite frontend into dist/ and bundles server.ts into a self-contained CommonJS binary at dist/server.cjs via esbuild.

Start Production Server
code
Bash
npm start
The server binds to 0.0.0.0:3000.

📁 Project Structure
code
Code
REFRA/
├── netlify/                # Serverless functions (Netlify deployment)
├── public/                 # Static assets, Web App Manifest & Service Worker
│   ├── manifest.json
│   └── sw.js
├── src/
│   ├── components/         # Modular React components
│   │   ├── PlayerModal.tsx             # Multi-provider streaming player
│   │   ├── ImageDiagnosticsSection.tsx # Network & CDN diagnostics
│   │   ├── MovieCard.tsx               # Card with liquid hover & badges
│   │   └── ...
│   ├── services/           # Data services & state management
│   │   ├── movieApi.ts                 # TMDB, AniList & proxy clients
│   │   ├── movieCache.ts               # IndexedDB & localStorage caching
│   │   ├── swrCache.ts                 # Stale-while-revalidate client cache
│   │   └── themeStore.ts               # Theme & UI preferences
│   ├── utils/              # Image resolution & helper utilities
│   ├── App.tsx             # Main shell & routing layout
│   └── main.tsx            # React root mount
├── server.ts               # Local/container Express server with Vite middleware
├── serverApp.ts            # Server-side API endpoints & proxies
├── .env.example            # Sample environment variables
└── package.json            # Scripts and dependencies




📜 License
This project is licensed under the MIT License.
🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.
