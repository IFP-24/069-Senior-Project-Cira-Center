# 🚀 SkyIDE

A modern visual programming environment that bridges block-based coding with Python development, designed to help students, educators, and developers learn Python visually.

## 🌟 Features

- 🧩 **Block-Based Coding:** Drag-and-drop Blockly workspace.
- 🐍 **Bidirectional Sync:** Convert Blockly blocks to clean Python code and vice versa in real time.
- 🎮 **Game Sandbox:** Integrated event-driven game block libraries and sprite management.
- 🔐 **Persistence:** Save, load, and manage projects.

---

## 🛠️ Project Structure

```text
SkyIDE/
├── ide-frontend/          # React + Vite frontend application
│   ├── components/        # UI components
│   ├── blocks/            # Blockly custom blocks & generators
│   └── src/               # State management and utilities
├── api-backend/           # Flask REST API backend
│   ├── app.py             # Flask entrypoint
│   └── routes/            # Route controllers
└── package.json           # Root workspace configuration
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v22.20.0+
- **Python** v3.8+

### Quick Start
1. **Clone the repository:**
   ```bash
   git clone https://github.com/rbriggs560/SkyIDE.git
   cd SkyIDE
   ```

2. **Install dependencies and start development servers:**
   ```bash
   npm install
   npm run dev
   ```
   This command starts the local Flask API backend (`http://127.0.0.1:5055`) and the Vite React frontend (`http://localhost:5173`).

---

## 🧪 Testing & CI

### Run Frontend Tests
```bash
cd ide-frontend
npm run test
```

### Run Backend Tests
```bash
cd api-backend
source venv/bin/activate
python -m pytest tests/
```

### Local CI Check
Run the integration check to format, lint, and run tests locally:
```bash
npm run ci
```

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more details.
