<div align="center">
  <img src="frontend/public/edubuddy_full_logo.svg" alt="EduBuddy Logo" width="300" />
  
  <h3>AI-Powered Personalized Study Companion</h3>
  <p><em>Tackling SDG 4 (Quality Education) for Hackathon Sedia!</em></p>
</div>

---

## 🌍 The Problem (SDG 4: Quality Education)
In many classrooms, there are limited teachers and limited resources for a large number of students. Teachers are forced to use a "one-size-fits-all" lesson plan, making it impossible to detect individual student weaknesses or adapt to each student's current skill level. As a result, struggling students are often left behind.

## 💡 Our Solution: EduBuddy AI
EduBuddy AI is a hybrid platform designed to bridge this gap by providing **personalized adaptive learning for students** and **powerful analytics for teachers and admins**. 

By leveraging the Google Gemini API, EduBuddy acts as a 24/7 personalized tutor that adapts to what the student actually needs to practice.

### ✨ Key Features
- **📄 Smart Notes Generator:** Upload a PDF lecture. The AI automatically extracts the core topics, summarizes them, and generates study materials (Notes, Flashcards, Key Points).
- **🧠 Adaptive Quiz Arena:** AI generates multiple-choice quizzes based directly on the uploaded material, tailored to the student's chosen difficulty (Easy, Medium, Hard).
- **💬 AI Tutor Chat (Coming Soon):** A conversational interface where students can ask for explanations on topics they are struggling with.
- **👨‍🏫 Teacher Dashboard (Cinema View):** A simple, visual "Cinema Seat" concept for teachers. Red indicates a student needs immediate attention, yellow means they need practice, and green means they have mastered the topic.
- **🏢 Admin Dashboard:** High-level analytical data for school administrators to allocate resources effectively.

---

## 🛠 Tech Stack

EduBuddy uses a decoupled hybrid architecture:

| Layer | Technology |
|---|---|
| **Frontend** | React + Vite + Framer Motion (Styling: Neo-Minimalist / Apple Style) |
| **Backend** | Next.js API Routes (TypeScript) |
| **AI Engine** | Google Gemini API (Vision + Text) |
| **Database** | Firebase Firestore (with an in-memory fallback for local testing) |

---

## 🚀 Getting Started (How to Run Locally)

Since the project uses a separate frontend and backend, you need to run both concurrently in two different terminal windows.

### 1. Backend Setup (Next.js)
Open a terminal in the **root** folder of the project.
```bash
# Install dependencies
npm install

# Copy the example environment file
cp .env.example .env.local

# Add your API keys to .env.local (See below)
# GEMINI_API_KEY=your_key_here

# Start the backend server
npm run dev
```
*(The backend runs on `http://localhost:3000`)*

### 2. Frontend Setup (React/Vite)
Open a **second terminal** and navigate to the frontend folder.
```bash
cd frontend

# Install frontend dependencies
npm install

# Start the frontend dev server
npm run dev
```
*(The frontend runs on `http://localhost:5173`)*

### 3. Open the App
Navigate to **[http://localhost:5173](http://localhost:5173)** in your browser!

---

## 🔑 Environment Variables
To get the full AI experience, you need a free Google Gemini API Key.
Place these in the `.env.local` file in the root directory:

```env
# Get this from https://aistudio.google.com/apikey
GEMINI_API_KEY=your_gemini_api_key

# (Optional) For data persistence. If empty, uses in-memory mock storage.
FIREBASE_SERVICE_ACCOUNT_JSON=
```

> **Note:** If you don't provide a Gemini API key, the app will automatically fall back to **Mock AI Mode**, returning hardcoded responses so you can still test the UI!

---
*Built with ❤️ for Hackathon Sedia!*
