# 🎓 EduBuddy AI

**AI-Powered Personalized Study Companion**  
*Hackathon Sedia! | SDG 4: Quality Education*

---

## ✨ Features

- **📄 Smart Notes Generator** — Upload any PDF and get AI-generated study notes, summaries, and flashcards
- **🧠 Adaptive Quiz Engine** — Take AI-generated quizzes with adjustable difficulty
- **💬 AI Tutor Chat** — Ask questions and get clear, contextual explanations
- **📊 Progress Dashboard** — Track your study streak, scores, and improvement over time

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React + Vite |
| **Backend** | Python (FastAPI) |
| **AI** | Google Gemini API |
| **Styling** | Custom CSS (Dark Theme + Glassmorphism) |
| **Data** | localStorage (demo mode) |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- [Gemini API Key](https://aistudio.google.com/apikey) (free)

### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt

# Add your Gemini API key to .env
# GEMINI_API_KEY=your_key_here

uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Open in Browser
Navigate to **http://localhost:5173**

## 👥 Team
Built for Hackathon Sedia! by Team EduBuddy

## 📜 License
This project was created for Hackathon Sedia! 2026.
