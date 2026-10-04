import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  NavLink,
} from "react-router-dom";

import {
  BarChart3,
  Home,
  ReceiptText,
  Settings as SettingsIcon,
  WalletCards,
} from "lucide-react";

import { AuthProvider } from "./context/AuthProvider";

import "./App.css";

import Login from "./pages/Login";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";

import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Analytics from "./pages/Analytics";
import Budgets from "./pages/Budgets";
import MoneyTracker from "./pages/MoneyTracker";
import Goals from "./pages/Goals";
import Subscriptions from "./pages/Subscriptions";
import Settings from "./pages/Settings";

// ======================================================
// MOBILE NAVIGATION
// ======================================================

const mobileNavItems = [
  {
    label: "Home",
    path: "/",
    icon: Home,
    end: true,
  },
  {
    label: "Transactions",
    path: "/transactions",
    icon: ReceiptText,
  },
  {
    label: "Analytics",
    path: "/analytics",
    icon: BarChart3,
  },
  {
    label: "Budgets",
    path: "/budgets",
    icon: WalletCards,
  },
  {
    label: "Settings",
    path: "/settings",
    icon: SettingsIcon,
  },
];

// ======================================================
// MOBILE NAVIGATION
// ======================================================

function MobileNavigation() {
  return (
    <nav
      className="
        fixed
        inset-x-0
        bottom-0
        z-50

        flex
        border-t
        border-slate-200/80
        bg-white/95
        px-2
        pt-2
        pb-[max(0.5rem,env(safe-area-inset-bottom))]
        shadow-[0_-4px_20px_rgba(15,23,42,0.06)]
        backdrop-blur-xl

        dark:border-slate-800/80
        dark:bg-slate-950/95
        dark:shadow-black/20

        lg:hidden
      "
      aria-label="Mobile navigation"
    >
      <div
        className="
          mx-auto
          flex
          w-full
          max-w-md
          items-center
          justify-around
          gap-1
        "
      >
        {mobileNavItems.map(
          ({
            label,
            path,
            icon: Icon,
            end,
          }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                `
                  flex
                  min-h-12
                  min-w-14.5
                  flex-1
                  flex-col
                  items-center
                  justify-center
                  gap-1
                  rounded-xl
                  px-1
                  py-1.5
                  text-[10px]
                  font-semibold
                  transition-all
                  duration-200

                  ${
                    isActive
                      ? `
                        bg-indigo-50
                        text-indigo-600

                        dark:bg-indigo-500/10
                        dark:text-indigo-400
                      `
                      : `
                        text-slate-400

                        hover:bg-slate-50
                        hover:text-slate-600

                        dark:text-slate-500
                        dark:hover:bg-slate-900
                        dark:hover:text-slate-300
                      `
                  }
                `
              }
            >
              <Icon
                size={19}
                strokeWidth={2}
              />

              <span>{label}</span>
            </NavLink>
          )
        )}
      </div>
    </nav>
  );
}

// ======================================================
// APPLICATION LAYOUT
// ======================================================

function AppLayout() {
  return (
    <div
      className="
        min-h-screen
        overflow-x-hidden
        bg-slate-50
        text-slate-900
        transition-colors
        duration-200

        dark:bg-slate-950
        dark:text-slate-100
      "
    >
      {/* ==================================================
          DESKTOP SIDEBAR
      ================================================== */}

      <Sidebar />

      {/* ==================================================
          MAIN APPLICATION AREA
      ================================================== */}

      <div
        className="
          min-h-screen
          min-w-0

          lg:ml-64
        "
      >
        {/* ==================================================
            HEADER
        ================================================== */}

        <Header />

        {/* ==================================================
            PAGE CONTENT
        ================================================== */}

        <main
          className="
            min-w-0

            px-4
            pt-4
            pb-24

            sm:px-5
            sm:pt-5

            lg:px-8
            lg:pt-8
            lg:pb-8
          "
        >
          <Outlet />
        </main>
      </div>

      {/* ==================================================
          MOBILE BOTTOM NAVIGATION
      ================================================== */}

      <MobileNavigation />
    </div>
  );
}

// ======================================================
// MAIN APP
// ======================================================

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ============================================
              PUBLIC ROUTE
          ============================================ */}

          <Route
            path="/login"
            element={<Login />}
          />

          {/* ============================================
              PROTECTED APPLICATION
          ============================================ */}

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {/* DASHBOARD */}

              <Route
                path="/"
                element={<Dashboard />}
              />

              {/* TRANSACTIONS */}

              <Route
                path="/transactions"
                element={<Transactions />}
              />

              {/* ANALYTICS */}

              <Route
                path="/analytics"
                element={<Analytics />}
              />

              {/* BUDGETS */}

              <Route
                path="/budgets"
                element={<Budgets />}
              />

              {/* MONEY TRACKER */}

              <Route
                path="/money-tracker"
                element={<MoneyTracker />}
              />

              {/* GOALS */}

              <Route
                path="/goals"
                element={<Goals />}
              />

              {/* SUBSCRIPTIONS */}

              <Route
                path="/subscriptions"
                element={<Subscriptions />}
              />

              {/* SETTINGS */}

              <Route
                path="/settings"
                element={<Settings />}
              />
            </Route>
          </Route>

          {/* ============================================
              UNKNOWN ROUTE
          ============================================ */}

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;