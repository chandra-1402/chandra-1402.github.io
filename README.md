# 🏏 IPL Akinator

**Developed by Team InnoServe**

Welcome to the **IPL Akinator**! This is an interactive, AI-driven web application designed to guess the exact Indian Premier League (IPL) cricket player you are thinking of. Through a series of dynamic, intelligently calculated questions, the "AI Cricket Brain" narrows down its search from a database of over 150+ active and historical IPL players to find your player!

---

## ✨ Features

- **🧠 Intelligent Guessing Engine**: Built with a custom Python/Flask backend, the engine uses **Information Theory (Entropy)**. It calculates the mathematically optimal question to ask next in order to halve the candidate pool.
- **⚡ Real-Time Probability Tracking**: The left sidebar features an "AI's Top Suspects" list. As you answer questions, you can watch the AI's internal thoughts calculate probabilities live, watching player percentages fluctuate in real-time.
- **🎨 Premium Cyberpunk UI**: The frontend is a highly polished, interactive experience featuring:
  - 3D Interactive Glassmorphism Panels that tilt based on your mouse position.
  - Ambient glowing cursors and cyber-scanline overlays.
  - Floating background particle physics.
  - Smooth animations powered by GSAP.
- **🛡️ Guided Filtering**: To ensure high accuracy, the game forces the user through a 3-step mandatory selection filter (Nationality, Role, Current Team) before transitioning to probabilistic scoring.
- **📊 Local State Management**: The game tracks your win/loss streak and coins in your browser's LocalStorage.

---

## 🛠️ Technology Stack

**Frontend:**
- HTML5 / CSS3 (Vanilla)
- JavaScript (ES6+)
- **GSAP (GreenSock)** for advanced UI animations
- **FontAwesome** for icons

**Backend:**
- **Python 3**
- **Flask** (Web Server & API)
- **Flask-CORS** (Cross-Origin Resource Sharing)

---

## 🚀 How It Works

1. **The Setup**: You start by choosing your player's basic info (Indian/Overseas, Player Role, Current Team) using the visually interactive grid selection.
2. **The Interrogation**: The Flask backend calculates the highest entropy question from the `data.json` dataset and asks you via the frontend.
3. **The Scoring**: Every time you answer "Yes", "No", or "Probably", the backend assigns `+3` or `-3` points to the matching boolean traits of every player in the pool.
4. **The Lock-In**: Once the AI forces at least 8 questions and its confidence in the top candidate breaches a specific threshold, it reveals its guess!
5. **The Verdict**: You confirm whether the AI was right or wrong, and your overall game streak updates.

---

## 💻 Local Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/chandra-1402/iplakinator.git
   cd iplakinator
   ```

2. **Set up a Python Virtual Environment** (Optional but recommended):
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the Backend Server**:
   ```bash
   python app.py
   ```
   *The Flask server will start running on `http://127.0.0.1:5000`*

5. **Launch the Game**:
   Simply double-click the `index.html` file in your project directory to open it in your web browser. Ensure the backend is running for the logic to work!

---

## 👥 About Team InnoServe

**Team InnoServe** is dedicated to building robust, visually stunning, and highly interactive software solutions. This project was built to demonstrate our capabilities in integrating complex backend sorting algorithms with modern, high-fidelity frontend design systems.

---
*Created with ❤️ for IPL Fans.*
