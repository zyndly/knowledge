# Cirqapture - Screenshot-Based Guide Recorder

A browser-based guide recorder that captures user actions as discrete steps with screenshots, providing a web editor for annotations and interactive HTML guide exports.

## 🏗️ Project Structure

```
knowledge/
├── api/                # NestJS Backend
│   ├── src/
│   │   ├── guides/     # Guide CRUD & management
│   │   ├── steps/      # Step management
│   │   ├── auth/       # Authentication (JWT)
│   │   ├── uploads/    # S3 file handling
│   │   └── shared/     # Shared utilities
│   └── ...
│
├── web/                # Vite + React Web Editor
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── pages/      # Editor, Viewer, Dashboard
│   │   ├── hooks/      # Custom React hooks
│   │   ├── services/   # API client
│   │   └── stores/     # Zustand stores
│   └── ...
│
└── extension/          # Chrome Extension (MV3)
    ├── manifest.json
    ├── background.js   # Service worker
    ├── content.js      # Click capture
    └── popup/          # Extension popup UI
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- AWS S3 bucket (for screenshot storage)

### 1. API Setup
```bash
cd api
npm install
cp .env.example .env
# Edit .env with your MongoDB and AWS credentials
npm run start:dev
```

### 2. Web Editor Setup
```bash
cd web
npm install
npm run dev
```

### 3. Extension Setup
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `extension/` folder

## 📋 Features

- **Recording**: Capture clicks, screenshots, and element metadata
- **Editing**: Reorder steps, add annotations (arrows, boxes, text)
- **Sharing**: Generate public/private shareable links
- **Export**: Download interactive HTML guides
- **Embedding**: Get iframe/JS snippets for docs

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | NestJS, MongoDB, AWS S3 |
| Frontend | Vite, React, TypeScript, Fabric.js |
| Extension | Chrome Manifest V3, Vanilla JS |
| Auth | JWT with refresh tokens |

## 📄 License

MIT
