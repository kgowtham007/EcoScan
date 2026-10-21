# EcoScan AI

A smart waste segregation web application that uses AI-powered image recognition to classify waste items into Reduce, Reuse, or Recycle categories.

## Overview

EcoScan AI combines a React.js frontend with Node.js + Python backends, powered by Google Gemini Vision API for waste classification. The app provides real-time disposal instructions, creative reuse ideas, gamification features, and location-based recycling guidance — all aligned with the Swachh Bharat mission.

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript
- **API Gateway**: Node.js 20 + Express
- **Classification Service**: Python 3.11 + FastAPI
- **AI Model**: Google Gemini Vision API (gemini-1.5-flash)
- **Auth & Database**: Firebase (Auth + Firestore + Storage)
- **Offline Support**: Workbox Service Worker + IndexedDB
- **Testing**: Vitest (JS) + pytest (Python) + fast-check & Hypothesis (Property-Based Testing)

## Project Structure

```
├── frontend/          # React 18 + Vite frontend
├── gateway/           # Node.js Express API gateway
├── classifier/        # Python FastAPI classification service
├── .github/workflows/ # CI/CD pipelines
├── firebase.json      # Firebase configuration
├── firestore.rules    # Firestore security rules
└── .kiro/specs/       # Detailed spec documents
```

## Features

- **Real-Time AI Classification**: Classify waste items via camera or upload
- **Barcode Scanning**: Product-specific disposal guidance
- **Multi-Object Detection**: Classify up to 10 items in one image
- **Gamification**: Earn points, badges, and climb leaderboards
- **Location Services**: Find nearby recycling centers
- **Offline Mode**: Basic classification without internet
- **Smart Bin Integration**: Conceptual IoT bin communication
- **Property-Based Testing**: 11 formal correctness properties verified

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- Firebase account
- Google Gemini API key

### Installation

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install

# Install gateway dependencies
cd ../gateway && npm install

# Install classifier dependencies
cd ../classifier && pip install -e ".[dev]"
```

### Environment Setup

Copy `.env.example` to `.env` and fill in your Firebase and Gemini API credentials.

### Development

```bash
# Run frontend dev server (port 3000)
npm run dev:frontend

# Run gateway dev server (port 4000)
npm run dev:gateway

# Run classifier dev server (port 8000)
cd classifier && uvicorn src.main:app --reload
```

## Documentation

- [Requirements](/.kiro/specs/ecoscan-ai/requirements.md) — Full requirements specification
- [Design](/.kiro/specs/ecoscan-ai/design.md) — Architecture and design decisions
- [Tasks](/.kiro/specs/ecoscan-ai/tasks.md) — Implementation task list

## Testing

```bash
# Run all tests
npm test

# Run frontend tests
npm test --workspace=frontend

# Run gateway tests
npm test --workspace=gateway

# Run Python tests
cd classifier && pytest --tb=short
```

## License

MIT

## Contributing

Contributions welcome! Please read the spec documents before submitting PRs.

---

**Built with ❤️ for Swachh Bharat**
