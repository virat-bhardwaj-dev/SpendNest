# 💰 SpendNest

### Smart Personal Finance & Expense Management App

SpendNest is a modern personal finance management application built to help users track their income, expenses, budgets, goals, subscriptions, and money owed in one place.

It is designed with a clean, responsive interface that works comfortably across desktop and mobile devices.

---

## ✨ Features

### 📊 Dashboard
- Financial overview at a glance
- Total balance
- Monthly income and expenses
- Monthly savings
- Average daily spending
- Top spending categories
- Recent transactions
- Spending trend visualization
- Smart financial insights

### 💳 Transactions
- Add income and expenses
- Categorize transactions
- Payment method tracking
- Search transactions
- Filter by type, category, and payment method
- Edit and delete transactions
- Income and expense summaries

### 📈 Analytics
- Monthly financial analysis
- Income vs expense overview
- Expense category breakdown
- Daily spending trends
- Visual charts and graphs
- Category-wise spending analysis

### 🎯 Budgets
- Create monthly budgets
- Category-based budgeting
- Track actual spending
- Budget progress indicators
- Spending warnings
- Edit and delete budgets

### 🤝 Money Tracker
Keep track of money you owe or money others owe you.

- Add people
- Track amount owed
- Track amount paid
- Due dates
- Notes
- Payment status
- Edit and delete records

### 🏆 Goals
- Create financial goals
- Set target amounts
- Track saved amount
- Progress tracking
- Deadline tracking
- Completed and overdue status
- Search and filtering

### 🔄 Subscriptions
- Track recurring subscriptions
- Monthly and yearly cost calculation
- Billing cycle tracking
- Next payment date
- Upcoming payment detection
- Past-due tracking
- Category and search filters

### ⚙️ Settings
- Currency selection
- Dark / light appearance
- Personal account preferences

Currency settings are reflected throughout the application.

---

## 🔐 Authentication

SpendNest uses Firebase Authentication with Google Sign-In.

Each user's financial data is stored and accessed according to their authenticated account.

---

## 🔥 Firebase

SpendNest uses Firebase for:

- Authentication
- Cloud Firestore
- User-specific data
- Secure database access

Firestore security rules ensure users can only access their own financial records.

---

## 🛠️ Tech Stack

### Frontend
- React
- React Router
- Tailwind CSS
- Lucide React
- Recharts

### Backend / Services
- Firebase Authentication
- Firebase Firestore

### Development
- Vite
- ESLint
- JavaScript (JSX)

---

## 📱 Responsive Design

SpendNest is designed for both desktop and mobile devices.

### Desktop
- Fixed navigation sidebar
- Full dashboard layout
- Responsive charts and cards
- Desktop-friendly tables and controls

### Mobile
- Mobile navigation drawer
- Bottom navigation
- Responsive cards
- Mobile-friendly forms
- Touch-friendly controls

---

## 📂 Project Structure

```text
SpendNest/
│
├── public/
│
├── src/
│   ├── assets/
│   │
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── Sidebar.jsx
│   │   └── StatCard.jsx
│   │
│   ├── context/
│   │   ├── AuthContext.js
│   │   ├── AuthProvider.jsx
│   │   └── useAuth.js
│   │
│   ├── firebase/
│   │   └── config.js
│   │
│   ├── pages/
│   │   ├── Analytics.jsx
│   │   ├── Budgets.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Goals.jsx
│   │   ├── Login.jsx
│   │   ├── MoneyTracker.jsx
│   │   ├── Settings.jsx
│   │   ├── Subscriptions.jsx
│   │   └── Transactions.jsx
│   │
│   ├── services/
│   │   ├── authService.js
│   │   ├── budgetService.js
│   │   ├── goalService.js
│   │   ├── moneyTrackerService.js
│   │   ├── subscriptionService.js
│   │   └── transactionService.js
│   │
│   ├── App.css
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
│
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── README.md
└── vite.config.js
