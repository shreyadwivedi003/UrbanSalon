# 🔮 UrbanSalon | Bespoke AI Style Lab & Stylist Marketplace

UrbanSalon is a cutting-edge, high-end boutique styling engine that merges computer vision, multimodal artificial intelligence, and real-time ledger scheduling. Built as a highly optimized monolithic architecture for hackathon efficiency, the platform enables users to turn on their web camera, capture a live portrait snapshot, and immediately leverage **Google Gemini AI** to extract facial geometry parameters and return bespoke hair and aesthetic design recommendations.

---

## 🚀 Core Features

* **Multimodal Gemini AI Diagnostics:** Connects directly to `gemini-2.5-flash` using high-fidelity system prompt constraints to deliver structured styling matrices.
* **Live Web Cam Capture Engine:** Seamless integration with the browser's native HTML5 MediaDevices API for immediate, safe localized image snapshots.
* **Failover Safety Architecture:** Includes a built-in automated backup mock data node that seamlessly catches upstream Google `503 High Demand` server overloads without breaking the client-side user experience.
* **Unified Monolithic Routing:** A single Express backend server that manages custom REST endpoints (`/api/bookings`, `/api/partners`, `/api/analyze-face`) while serving compiled Vite static assets from a single domain, completely bypassing CORS obstacles.
* **Appointment Slot Ledger:** Reactive state managers tracking client appointment blocks and stylist network partner vetting pools.

---

## 🛠️ Architecture & Tech Stack

* **Frontend:** React 18, TypeScript, Vite (Modular Single Page Application Framework)
* **Backend Enclave:** Node.js, Express, TypeScript (`ts-node`)
* **AI Integration:** `@google/genai` (Google AI Studio Pipeline)
* **Deployment Vector:** Production optimized for Vercel and Google Cloud Run

---

## 🔧 Local Development Installation

Follow these steps to spin up the unified application locally:

### 1. Clone the Repository
```bash
git clone [https://github.com/shreyadwivedi003/UrbanSalon.git](https://github.com/shreyadwivedi003/UrbanSalon.git)
cd UrbanSalon/frontend
