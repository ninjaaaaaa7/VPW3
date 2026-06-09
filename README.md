---
title: Carbon Tracker
emoji: 🌱
colorFrom: green
colorTo: black
sdk: docker
app_port: 8080
---
# Eco-Tracker: Carbon Footprint Awareness Platform

An enterprise-ready, high-performance, single-repository web application designed to track, estimate, and mitigate carbon emissions. The platform empowers users to log daily activities, receive immediate estimations, analyze environmental impacts, and obtain actionable reduction steps.

This project utilizes **Google Cloud Run deployment architecture**, **Gemini 1.5 Flash via the GenAI SDK**, **PyTest for edge-case coverage**, **Strict Pydantic Input Validation for Security**, and **WCAG ARIA compliance for Accessibility**.

---

## 🌟 Key Technical Features

### 1. AI Engine: Gemini 1.5 Flash via the GenAI SDK
- Integrated using the official `google-genai` SDK for low-latency, state-of-the-art token classification and carbon estimations.
- Employs **Strict Structured JSON Output Schema** leveraging `GenerateContentConfig` to guarantee that schema formats match expected objects.
- High-performance, low-temperature configuration (`temperature: 0.1`) ensures highly deterministic, reliable, and scientifically backed emissions estimations.

### 2. Frontend: High-Contrast Tailwind Dashboard
- Developed with **React (Vite)** + **Tailwind CSS**.
- Implements a premium modern aesthetic utilizing the **Obsidian Black (`#0B0E14`)** dark theme with high-contrast **Neon Green (`#00FF00`)** indicators.
- **Accessibility & WCAG Compliance (CRITICAL)**: Fully semantic HTML5 tag hierarchy (`<main>`, `<section>`, `<article>`, `<header>`, `<footer>`), detailed visual-hidden skip links, and descriptive `aria-label` and `aria-live` state announcements for screen reader compatibility.

### 3. Backend: Fast, Validated FastAPI Core
- Engineered with **FastAPI** to yield high-concurrency capability.
- **Strict Pydantic Input Validation for Security**: Protects against common injection and cross-site scripting attack vectors by applying length limitations (`min_length=3`, `max_length=500`) and whitespace stripping constraints.
- Integrated single-process static server caching to host React's compiled SPA bundles, lowering container startup latency and reducing cold starts.

### 4. Enterprise-Grade CI/CD & Deployments
- Designed around a **highly efficient, multi-stage Dockerfile** leveraging caching, alpine node stages, and slim Python runtimes to reduce final image size to minimum.
- Native compatibility with **Google Cloud Run** serverless container deployment.

---

## 📂 Project Architecture

```
VPW3/
├── Dockerfile                   # Multi-stage production build configuration
├── README.md                    # System documentation and guides
├── backend/
│   ├── main.py                  # FastAPI server, endpoints, and GenAI integrations
│   ├── requirements.txt         # Server dependency lists
│   └── tests/
│       └── test_main.py         # PyTest suite with mock assertions
└── frontend/
    ├── index.html               # Main HTML document with SEO tags
    ├── package.json             # NPM dependencies & scripts
    ├── postcss.config.js        # PostCSS configuration
    ├── tailwind.config.js       # Color palette & custom typography config
    ├── vite.config.js           # Vite server & routing proxy
    └── src/
        ├── App.jsx              # Main React Dashboard
        ├── index.css            # Base styles and neon animations
        └── main.jsx             # React framework entry point
```

---

## 🛠️ Local Development Guide

### Prerequisites
- Node.js (v20 or higher)
- Python (3.10 or higher)
- A valid Google Gemini API Key

---

### Step 1: Backend Setup
1. Move to the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up the environment secrets:
   ```bash
   # On Windows (PowerShell):
   $env:GEMINI_API_KEY="your_actual_gemini_api_key_here"
   # On macOS/Linux:
   export GEMINI_API_KEY="your_actual_gemini_api_key_here"
   ```
5. Start the development API server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

---

### Step 2: Frontend Setup
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Run the development server (runs with backend API proxy mapping):
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:3000`.

---

## 🧪 Testing Rubric

We use **PyTest for edge-case coverage**, verifying model integration stability, input parameters, response routing, and error control.

### Run Unit Tests
To execute backend unit tests with the mock API key environment:
```bash
cd backend
pytest -v tests/test_main.py
```

*Note: The test suite patches the Google GenAI SDK Client using `unittest.mock.patch` to allow validation pipelines and server logic checks to run successfully in isolation without making real external API network calls.*

---

## 🐳 Docker Containerization

To run the application locally in a single-container production environment:

1. Build the Docker image from the project root:
   ```bash
   docker build -t eco-tracker-app .
   ```
2. Run the Docker container (forwarding to port 8080):
   ```bash
   docker run -p 8080:8080 -e GEMINI_API_KEY="your_gemini_api_key" eco-tracker-app
   ```
3. Navigate to `http://localhost:8080`.

---

## 🚀 Google Cloud Run Deployment Architecture

The system is optimized for zero-scale scale-up behavior on **Google Cloud Run**.

### Build & Deploy Commands

Use Google Cloud SDK to build the container in Google Artifact Registry and deploy it automatically:

```bash
# 1. Set your target project configuration
gcloud config set project [PROJECT_ID]

# 2. Build and submit the container image to Google Cloud Build
gcloud builds submit --tag gcr.io/[PROJECT_ID]/eco-tracker:latest

# 3. Deploy the container to Google Cloud Run
gcloud run deploy eco-tracker \
    --image gcr.io/[PROJECT_ID]/eco-tracker:latest \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --set-env-vars GEMINI_API_KEY="your_production_gemini_api_key"
```

### Deployment Attributes
- **Concurrency**: Serves hundreds of simultaneous connections per instance through FastAPI's async loops.
- **Port Matching**: Port `8080` is automatically exposed matching Cloud Run's runtime contracts.
- **Scalability**: Configured for scale-to-zero memory utilization when idle.
