# fini. 🐷

**fini.** is a sleek, cartoony, and minimal financial statement analyzer that helps you see exactly where your money is going. Just upload your PDF bank statements, and let AI do the heavy lifting to categorize your expenses and provide actionable insights.

## Features

- 📄 **Direct PDF Uploads**: Simply drop your bank statement PDF to get started.
- 🧠 **AI-Powered Insights**: Uses Gemini 3.8 Flash to automatically read, understand, and categorize your transactions.
- 📊 **Beautiful Visualizations**:
  - Daily spending bar charts.
  - Expense category pie charts.
  - Top largest expenses breakdown.
- 🔒 **Secure Local Storage**: Your Gemini API key is stored locally in your browser and sent directly to Google. Your financial data is also stored locally in your browser for persistence.
- 🎨 **Fun & Sleek UI**: Designed with a neo-brutalism cartoony style, featuring pastel backgrounds, bright highlights, and smooth animations.

## Getting Started

### Prerequisites

- Node.js 18+
- A Google Gemini API Key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/TheJonathanC/fini.git
   cd fini
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser.

5. Click the Settings gear icon in the top right, enter your Gemini API Key, and save.

6. Upload a PDF bank statement and watch the magic happen!

## Tech Stack

- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Charts**: Recharts
- **AI Integration**: `@google/genai` (Gemini API)

## License

MIT License
