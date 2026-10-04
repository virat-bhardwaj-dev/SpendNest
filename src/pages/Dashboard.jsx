import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Utensils,
  ShoppingBag,
  Car,
  Home,
  BookOpen,
  HeartPulse,
  Clapperboard,
  MoreHorizontal,
  Lightbulb,
  RefreshCw,
  Target,
  Repeat,
  Users,
  Plus,
  BarChart3,
  ChevronRight,
  Receipt,
  CalendarDays,
  
  AlertCircle,
} from "lucide-react";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useNavigate } from "react-router-dom";

import StatCard from "../components/StatCard";
import { useAuth } from "../context/useAuth";

import { getTransactions } from "../services/transactionService";
import { getGoals } from "../services/goalService";
import { getSubscriptions } from "../services/subscriptionService";
import { getMoneyRecords } from "../services/moneyTrackerService";

// ======================================================
// CONSTANTS
// ======================================================

const CURRENCY_STORAGE_KEY = "spendnest_currency";

const CATEGORY_ICONS = {
  Food: Utensils,
  Shopping: ShoppingBag,
  Transport: Car,
  Housing: Home,
  Education: BookOpen,
  Health: HeartPulse,
  Entertainment: Clapperboard,
  Other: MoreHorizontal,
};

const CATEGORY_TONES = [
  {
    icon: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
    bar: "bg-indigo-500",
  },
  {
    icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    bar: "bg-emerald-500",
  },
  {
    icon: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    bar: "bg-amber-500",
  },
  {
    icon: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    bar: "bg-violet-500",
  },
];

// ======================================================
// HELPERS
// ======================================================

function parseDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (
    typeof value === "object" &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();

    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (
    typeof value === "object" &&
    typeof value.seconds === "number"
  ) {
    const date = new Date(value.seconds * 1000);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  const stringValue = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
    const [year, month, day] = stringValue
      .split("-")
      .map(Number);

    const date = new Date(year, month - 1, day);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(stringValue);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getDateKey(date) {
  if (!date) return "";

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getTransactionDate(transaction) {
  return parseDate(transaction?.date);
}

function getCreatedDate(transaction) {
  return (
    parseDate(transaction?.createdAt) ||
    getTransactionDate(transaction)
  );
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";

  return "Good evening";
}

function formatTransactionDate(value) {
  const date = parseDate(value);

  if (!date) return value || "";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function normalizeCurrency(value) {
  const currencyMap = {
    "₹": "INR",
    INR: "INR",

    "$": "USD",
    USD: "USD",

    "€": "EUR",
    EUR: "EUR",

    "£": "GBP",
    GBP: "GBP",

    "¥": "JPY",
    JPY: "JPY",

    "A$": "AUD",
    AUD: "AUD",

    "C$": "CAD",
    CAD: "CAD",

    "S$": "SGD",
    SGD: "SGD",

    AED: "AED",
  };

  return currencyMap[value] || "INR";
}

function getStoredCurrency() {
  if (typeof window === "undefined") {
    return "INR";
  }

  return normalizeCurrency(
    localStorage.getItem(CURRENCY_STORAGE_KEY)
  );
}

function formatMoney(value, currency = "INR") {
  const amount = Number(value) || 0;

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `₹${amount.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  }
}

function formatAxisMoney(value, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(Number(value) || 0);
  } catch {
    return formatMoney(value, currency);
  }
}

function getDaysInMonth(year, monthIndex) {
  return new Date(
    year,
    monthIndex + 1,
    0
  ).getDate();
}

function getFullMonthLabel(date) {
  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

// ======================================================
// DASHBOARD
// ======================================================

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [moneyTracker, setMoneyTracker] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [initialError, setInitialError] = useState("");
  const [refreshError, setRefreshError] = useState("");

  const [chartFilter, setChartFilter] =
    useState("Last 7 days");

  const [currency, setCurrency] =
    useState(getStoredCurrency);

  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  // ====================================================
  // CURRENCY SYNC
  // ====================================================

  useEffect(() => {
    const updateCurrency = () => {
      setCurrency(getStoredCurrency());
    };

    window.addEventListener(
      "storage",
      updateCurrency
    );

    window.addEventListener(
      "spendnest_currency_changed",
      updateCurrency
    );

    window.addEventListener(
      "focus",
      updateCurrency
    );

    return () => {
      window.removeEventListener(
        "storage",
        updateCurrency
      );

      window.removeEventListener(
        "spendnest_currency_changed",
        updateCurrency
      );

      window.removeEventListener(
        "focus",
        updateCurrency
      );
    };
  }, []);

  // ====================================================
  // THEME SYNC
  // ====================================================

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(
        document.documentElement.classList.contains(
          "dark"
        )
      );
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // ====================================================
  // FIREBASE FETCH
  // ====================================================

  const fetchDashboardData = useCallback(async () => {
    const [
      transactionData,
      goalData,
      subscriptionData,
      moneyTrackerData,
    ] = await Promise.all([
      getTransactions(),
      getGoals(),
      getSubscriptions(),
      getMoneyRecords(),
    ]);

    return {
      transactions: transactionData || [],
      goals: goalData || [],
      subscriptions: subscriptionData || [],
      moneyTracker: moneyTrackerData || [],
    };
  }, []);

  // ====================================================
  // INITIAL LOAD
  // ====================================================

  useEffect(() => {
    let active = true;

    async function loadInitialDashboard() {
      try {
        const data = await fetchDashboardData();

        if (!active) return;

        setTransactions(data.transactions);
        setGoals(data.goals);
        setSubscriptions(data.subscriptions);
        setMoneyTracker(data.moneyTracker);

        setInitialError("");
      } catch (err) {
        console.error(
          "Dashboard loading error:",
          err
        );

        if (active) {
          setInitialError(
            "We couldn't load your dashboard data. Please try again."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadInitialDashboard();

    return () => {
      active = false;
    };
  }, [fetchDashboardData]);

  // ====================================================
  // REFRESH
  // ====================================================

  async function handleRefresh() {
    if (refreshing) return;

    try {
      setRefreshing(true);
      setRefreshError("");

      const data = await fetchDashboardData();

      setTransactions(data.transactions);
      setGoals(data.goals);
      setSubscriptions(data.subscriptions);
      setMoneyTracker(data.moneyTracker);
    } catch (err) {
      console.error(
        "Dashboard refresh error:",
        err
      );

      setRefreshError(
        "Couldn't refresh your latest data."
      );
    } finally {
      setRefreshing(false);
    }
  }

  // ====================================================
  // CURRENT DATE / MONTH
  // ====================================================

const today = useMemo(() => new Date(), []);

const currentMonth = getMonthKey(today);

const currentMonthLabel = getFullMonthLabel(today);

  // ====================================================
  // MONTHLY TRANSACTIONS
  // ====================================================

  const monthlyTransactions = useMemo(() => {
    return transactions.filter((transaction) =>
      String(transaction?.date || "").startsWith(
        currentMonth
      )
    );
  }, [transactions, currentMonth]);

  // ====================================================
  // FINANCIAL SUMMARY
  // ====================================================

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;

    monthlyTransactions.forEach(
      (transaction) => {
        const amount =
          Number(transaction?.amount) || 0;

        if (transaction?.type === "income") {
          income += amount;
        }

        if (transaction?.type === "expense") {
          expense += amount;
        }
      }
    );

    return {
      income,
      expense,
      savings: income - expense,
    };
  }, [monthlyTransactions]);

  // ====================================================
  // TOTAL BALANCE
  // ====================================================

  const totalBalance = useMemo(() => {
    return transactions.reduce(
      (balance, transaction) => {
        const amount =
          Number(transaction?.amount) || 0;

        if (transaction?.type === "income") {
          return balance + amount;
        }

        if (transaction?.type === "expense") {
          return balance - amount;
        }

        return balance;
      },
      0
    );
  }, [transactions]);

  // ====================================================
  // SAVINGS RATE
  // ====================================================

  const savingsRate = useMemo(() => {
    if (summary.income <= 0) return 0;

    return Math.round(
      (summary.savings / summary.income) * 100
    );
  }, [summary.income, summary.savings]);

  // ====================================================
  // AVERAGE DAILY SPEND
  // ====================================================

  const averageDailySpend = useMemo(() => {
    const daysElapsed = Math.max(
      today.getDate(),
      1
    );

    return summary.expense / daysElapsed;
  }, [summary.expense, today]);

  // ====================================================
  // SPENDING CHART
  // ====================================================

  const spendingData = useMemo(() => {
    const now = new Date();

    let dates = [];

    if (chartFilter === "Last 7 days") {
      dates = Array.from(
        { length: 7 },
        (_, index) => {
          const date = new Date(now);

          date.setHours(0, 0, 0, 0);
          date.setDate(
            now.getDate() - (6 - index)
          );

          return date;
        }
      );
    }

    if (chartFilter === "This month") {
      dates = Array.from(
        { length: now.getDate() },
        (_, index) =>
          new Date(
            now.getFullYear(),
            now.getMonth(),
            index + 1
          )
      );
    }

    if (chartFilter === "Last month") {
      const previousMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
      );

      const daysInPreviousMonth =
        getDaysInMonth(
          previousMonth.getFullYear(),
          previousMonth.getMonth()
        );

      dates = Array.from(
        { length: daysInPreviousMonth },
        (_, index) =>
          new Date(
            previousMonth.getFullYear(),
            previousMonth.getMonth(),
            index + 1
          )
      );
    }

    const expenseByDate = new Map();

    transactions.forEach((transaction) => {
      if (transaction?.type !== "expense") {
        return;
      }

      const date =
        getTransactionDate(transaction);

      if (!date) return;

      const key = getDateKey(date);

      expenseByDate.set(
        key,
        (expenseByDate.get(key) || 0) +
          (Number(transaction?.amount) || 0)
      );
    });

    return dates.map((date) => {
      const key = getDateKey(date);

      return {
        dateKey: key,
        date,
        label:
          chartFilter === "Last 7 days"
            ? date.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })
            : String(date.getDate()),
        tooltipDate:
          date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        amount:
          expenseByDate.get(key) || 0,
      };
    });
  }, [transactions, chartFilter]);

  const hasSpendingData =
    spendingData.some(
      (item) => item.amount > 0
    );

  // ====================================================
  // TOP CATEGORIES
  // ====================================================

  const categories = useMemo(() => {
    const categoryTotals = {};

    monthlyTransactions
      .filter(
        (transaction) =>
          transaction?.type === "expense"
      )
      .forEach((transaction) => {
        const category =
          transaction?.category?.trim() ||
          "Other";

        categoryTotals[category] =
          (categoryTotals[category] || 0) +
          (Number(transaction?.amount) || 0);
      });

    return Object.entries(categoryTotals)
      .map(([name, amount], index) => ({
        name,
        amount,
        percentage:
          summary.expense > 0
            ? Math.round(
                (amount / summary.expense) * 100
              )
            : 0,
        iconComponent:
          CATEGORY_ICONS[name] ||
          MoreHorizontal,
        tone:
          CATEGORY_TONES[
            index % CATEGORY_TONES.length
          ],
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);
  }, [monthlyTransactions, summary.expense]);

  const topCategory = categories[0];

  // ====================================================
  // RECENT TRANSACTIONS
  // ====================================================

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => {
        const dateA = getCreatedDate(a);
        const dateB = getCreatedDate(b);

        return (
          (dateB?.getTime() || 0) -
          (dateA?.getTime() || 0)
        );
      })
      .slice(0, 5);
  }, [transactions]);

  // ====================================================
  // QUICK OVERVIEW
  // ====================================================

  const activeGoalsCount = useMemo(() => {
    return goals.filter(
      (goal) =>
        String(
          goal?.status || ""
        ).toLowerCase() !== "completed"
    ).length;
  }, [goals]);

  const activeSubscriptionsCount =
    useMemo(() => {
      return subscriptions.filter(
        (subscription) =>
          String(
            subscription?.status || ""
          ).toLowerCase() !== "cancelled"
      ).length;
    }, [subscriptions]);

  const pendingMoneyRecords = useMemo(() => {
    return moneyTracker.filter(
      (item) =>
        String(
          item?.status || ""
        ).toLowerCase() !== "paid"
    );
  }, [moneyTracker]);

  const pendingMoneyAmount = useMemo(() => {
    return pendingMoneyRecords.reduce(
      (total, item) => {
        const amount =
          Number(item?.amount) || 0;

        const paidAmount =
          Number(item?.paidAmount) || 0;

        return (
          total +
          Math.max(
            amount - paidAmount,
            0
          )
        );
      },
      0
    );
  }, [pendingMoneyRecords]);

  // ====================================================
  // INSIGHT
  // ====================================================

  const insight = useMemo(() => {
    if (
      summary.income === 0 &&
      summary.expense === 0
    ) {
      return {
        title:
          "Start with your first transaction",
        text:
          "Add your income and expenses to get useful spending insights.",
        tone: "neutral",
      };
    }

    if (
      summary.income === 0 &&
      summary.expense > 0
    ) {
      return {
        title:
          "Your expenses need attention",
        text:
          "You've recorded expenses this month but no income yet. Make sure your income records are up to date.",
        tone: "warning",
      };
    }

    if (summary.savings < 0) {
      return {
        title:
          "Spending is above income",
        text:
          `Your expenses are ${formatMoney(
            Math.abs(summary.savings),
            currency
          )} higher than your income this month. Reviewing ${
            topCategory?.name || "your largest"
          } spending could help.`,
        tone: "warning",
      };
    }

    if (
      topCategory &&
      topCategory.percentage >= 40
    ) {
      return {
        title: `${topCategory.name} is your biggest expense`,
        text:
          `${topCategory.name} makes up ${topCategory.percentage}% of your monthly spending. Keeping an eye on this category could make the biggest difference.`,
        tone: "positive",
      };
    }

    if (savingsRate >= 20) {
      return {
        title:
          "You're building a healthy buffer",
        text:
          `You're currently saving ${savingsRate}% of your income this month. Keep the momentum going.`,
        tone: "positive",
      };
    }

    if (summary.savings > 0) {
      return {
        title:
          "You're ending the month positive",
        text:
          `You've saved ${formatMoney(
            summary.savings,
            currency
          )} so far this month. Consistency will help grow that buffer.`,
        tone: "positive",
      };
    }

    return {
      title:
        "Keep an eye on your spending",
      text:
        "Your income and expenses are currently close. Tracking daily spending can help keep your month on plan.",
      tone: "neutral",
    };
  }, [
    summary.income,
    summary.expense,
    summary.savings,
    savingsRate,
    topCategory,
    currency,
  ]);

  // ====================================================
  // CHART COLORS
  // ====================================================

  const chartColors = useMemo(
    () => ({
      grid: isDark
        ? "#263449"
        : "#e2e8f0",

      text: isDark
        ? "#94a3b8"
        : "#64748b",

      tooltipBackground: isDark
        ? "#111827"
        : "#ffffff",

      tooltipBorder: isDark
        ? "#334155"
        : "#e2e8f0",

      tooltipText: isDark
        ? "#e2e8f0"
        : "#0f172a",
    }),
    [isDark]
  );

  // ====================================================
  // USER
  // ====================================================

  const firstName =
    user?.displayName
      ?.trim()
      ?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "there";

  // ====================================================
  // INITIAL ERROR
  // ====================================================

  if (loading) {
    return (
      <DashboardSkeleton />
    );
  }

  if (
    initialError &&
    transactions.length === 0 &&
    goals.length === 0 &&
    subscriptions.length === 0 &&
    moneyTracker.length === 0
  ) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center">
        <div
          className="
            w-full rounded-3xl
            border border-rose-200
            bg-white p-8 text-center
            shadow-sm
            dark:border-rose-900/50
            dark:bg-slate-900
          "
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
            <AlertCircle size={24} />
          </div>

          <h2 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
            Dashboard couldn't load
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {initialError}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="
              mt-6 inline-flex items-center
              gap-2 rounded-xl
              bg-indigo-600
              px-5 py-2.5
              text-sm font-semibold text-white
              transition
              hover:bg-indigo-700
              dark:bg-indigo-500
              dark:hover:bg-indigo-400
            "
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ====================================================
  // MAIN
  // ====================================================

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      {/* ==================================================
          HERO / HEADER
      ================================================== */}

      <section
        className="
          relative overflow-hidden
          rounded-3xl
          border border-slate-200
          bg-white
          shadow-sm
          dark:border-slate-800
          dark:bg-slate-900
        "
      >
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-indigo-500/5 blur-3xl dark:bg-indigo-500/10" />
        <div className="absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-violet-500/5 blur-3xl dark:bg-violet-500/10" />

        <div className="relative flex flex-col gap-6 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />

              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-400">
                {getGreeting()} 👋
              </p>
            </div>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Welcome back, {firstName}
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Here's a clear view of what's happening
              with your money today.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-800">
                <CalendarDays size={13} />
                {currentMonthLabel}
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-800">
                <Receipt size={13} />
                {monthlyTransactions.length}{" "}
                transactions
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="
                inline-flex h-10
                items-center justify-center gap-2
                rounded-xl
                border border-slate-200
                bg-white px-4
                text-sm font-semibold
                text-slate-600
                shadow-sm
                transition
                hover:border-slate-300
                hover:bg-slate-50
                disabled:cursor-not-allowed
                disabled:opacity-60
                dark:border-slate-700
                dark:bg-slate-800
                dark:text-slate-300
                dark:hover:bg-slate-700
              "
            >
              <RefreshCw
                size={15}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/transactions")
              }
              className="
                inline-flex h-10
                items-center justify-center gap-2
                rounded-xl
                bg-indigo-600
                px-4
                text-sm font-semibold
                text-white
                shadow-sm
                transition
                hover:-translate-y-0.5
                hover:bg-indigo-700
                hover:shadow-md
                active:translate-y-0
                dark:bg-indigo-500
                dark:hover:bg-indigo-400
              "
            >
              <Plus size={16} />
              Add transaction
            </button>
          </div>
        </div>
      </section>

      {/* ==================================================
          REFRESH ERROR
      ================================================== */}

      {refreshError && (
        <div
          className="
            flex flex-col gap-3
            rounded-2xl
            border border-amber-200
            bg-amber-50
            px-4 py-3
            sm:flex-row
            sm:items-center
            sm:justify-between
            dark:border-amber-900/40
            dark:bg-amber-950/20
          "
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              size={17}
              className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
            />

            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Couldn't refresh your data
              </p>

              <p className="mt-0.5 text-xs text-amber-700/70 dark:text-amber-400/70">
                Your previously loaded dashboard is
                still displayed.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="
              self-start rounded-lg px-3 py-1.5
              text-xs font-semibold
              text-amber-700
              hover:bg-amber-100
              disabled:opacity-50
              dark:text-amber-400
              dark:hover:bg-amber-500/10
              sm:self-auto
            "
          >
            Retry
          </button>
        </div>
      )}

      {/* ==================================================
          PRIMARY STATS
      ================================================== */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Balance"
          amount={formatMoney(
            totalBalance,
            currency
          )}
          subtitle="All-time net balance"
          icon={Wallet}
        />

        <StatCard
          title="Total Income"
          amount={formatMoney(
            summary.income,
            currency
          )}
          subtitle={currentMonthLabel}
          icon={TrendingUp}
          iconBg="bg-emerald-50 dark:bg-emerald-500/10"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />

        <StatCard
          title="Total Expenses"
          amount={formatMoney(
            summary.expense,
            currency
          )}
          subtitle={currentMonthLabel}
          icon={TrendingDown}
          iconBg="bg-rose-50 dark:bg-rose-500/10"
          iconColor="text-rose-600 dark:text-rose-400"
        />

        <StatCard
          title="Total Savings"
          amount={formatMoney(
            summary.savings,
            currency
          )}
          subtitle={
            summary.income > 0
              ? `${Math.max(
                  savingsRate,
                  0
                )}% savings rate`
              : "No income recorded"
          }
          icon={PiggyBank}
          iconBg={
            summary.savings >= 0
              ? "bg-amber-50 dark:bg-amber-500/10"
              : "bg-rose-50 dark:bg-rose-500/10"
          }
          iconColor={
            summary.savings >= 0
              ? "text-amber-600 dark:text-amber-400"
              : "text-rose-600 dark:text-rose-400"
          }
        />
      </section>

      {/* ==================================================
          MONTHLY SNAPSHOT
      ================================================== */}

      <section
        className="
          overflow-hidden rounded-2xl
          border border-slate-200
          bg-white shadow-sm
          dark:border-slate-800
          dark:bg-slate-900
        "
      >
        <div className="grid divide-y divide-slate-100 dark:divide-slate-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <SnapshotItem
            icon={TrendingDown}
            iconClass="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
            label="Average daily spend"
            value={formatMoney(
              averageDailySpend,
              currency
            )}
            helper={`Based on ${today.getDate()} day${
              today.getDate() === 1
                ? ""
                : "s"
            }`}
          />

          <SnapshotItem
            icon={
              topCategory
                ? CATEGORY_ICONS[
                    topCategory.name
                  ] || MoreHorizontal
                : Wallet
            }
            iconClass="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
            label="Top spending area"
            value={
              topCategory?.name ||
              "No expenses"
            }
            helper={
              topCategory
                ? formatMoney(
                    topCategory.amount,
                    currency
                  )
                : "Nothing recorded"
            }
          />

          <SnapshotItem
            icon={
              summary.savings >= 0
                ? TrendingUp
                : TrendingDown
            }
            iconClass={
              summary.savings >= 0
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
            }
            label="Monthly savings"
            value={`${summary.savings >= 0 ? "+" : ""}${formatMoney(
              summary.savings,
              currency
            )}`}
            helper={
              summary.income > 0
                ? `${savingsRate}% of income`
                : "No income recorded"
            }
          />
        </div>
      </section>

      {/* ==================================================
          CHART + CATEGORIES
      ================================================== */}

      <section className="grid gap-6 xl:grid-cols-3">
        {/* Spending Chart */}

        <section
          className="
            rounded-2xl
            border border-slate-200
            bg-white
            p-5
            shadow-sm
            dark:border-slate-800
            dark:bg-slate-900
            sm:p-6
            xl:col-span-2
          "
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <BarChart3 size={17} />
                </div>

                <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                  Spending overview
                </h2>
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-400 dark:text-slate-500">
                Track your daily expenses and spot
                spending changes.
              </p>
            </div>

            <select
              value={chartFilter}
              onChange={(event) =>
                setChartFilter(event.target.value)
              }
              aria-label="Spending chart period"
              className="
                h-9 rounded-xl
                border border-slate-200
                bg-slate-50
                px-3
                text-xs font-semibold
                text-slate-600
                outline-none
                transition
                focus:border-indigo-400
                focus:ring-4
                focus:ring-indigo-500/10
                dark:border-slate-700
                dark:bg-slate-800
                dark:text-slate-300
                dark:focus:border-indigo-500
              "
            >
              <option value="Last 7 days">
                Last 7 days
              </option>

              <option value="This month">
                This month
              </option>

              <option value="Last month">
                Last month
              </option>
            </select>
          </div>

          <div className="mt-6 h-72">
            {!hasSpendingData ? (
              <EmptyChartState
                icon={BarChart3}
                title="No spending data yet"
                text="Add an expense to see your spending trend here."
                onClick={() =>
                  navigate("/transactions")
                }
              />
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <AreaChart
                  data={spendingData}
                  margin={{
                    top: 8,
                    right: 8,
                    left: -18,
                    bottom: 0,
                  }}
                >
                  <defs>
                    <linearGradient
                      id="dashboardSpendingGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#6366f1"
                        stopOpacity={0.22}
                      />

                      <stop
                        offset="95%"
                        stopColor="#6366f1"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={false}
                    stroke={chartColors.grid}
                  />

                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 10,
                      fill: chartColors.text,
                    }}
                    interval={
                      chartFilter ===
                      "Last 7 days"
                        ? 0
                        : 3
                    }
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 10,
                      fill: chartColors.text,
                    }}
                    tickFormatter={(value) =>
                      formatAxisMoney(
                        value,
                        currency
                      )
                    }
                  />

                  <Tooltip
                    cursor={{
                      stroke: chartColors.grid,
                      strokeDasharray: "4 4",
                    }}
                    formatter={(value) => [
                      formatMoney(
                        value,
                        currency
                      ),
                      "Spent",
                    ]}
                    labelFormatter={(
                      _label,
                      payload
                    ) =>
                      payload?.[0]?.payload
                        ?.tooltipDate || ""
                    }
                    contentStyle={{
                      borderRadius: "14px",
                      border: `1px solid ${chartColors.tooltipBorder}`,
                      backgroundColor:
                        chartColors.tooltipBackground,
                      color:
                        chartColors.tooltipText,
                      boxShadow: isDark
                        ? "0 16px 40px rgba(0,0,0,0.30)"
                        : "0 16px 40px rgba(15,23,42,0.10)",
                      fontSize: "12px",
                    }}
                    labelStyle={{
                      color:
                        chartColors.tooltipText,
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fill="url(#dashboardSpendingGradient)"
                    activeDot={{
                      r: 5,
                      strokeWidth: 2,
                      fill: "#6366f1",
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Categories */}

        <section
          className="
            rounded-2xl
            border border-slate-200
            bg-white
            p-5
            shadow-sm
            dark:border-slate-800
            dark:bg-slate-900
            sm:p-6
          "
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                Top categories
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-400 dark:text-slate-500">
                Where your money is going this month.
              </p>
            </div>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <Wallet size={17} />
            </div>
          </div>

          {categories.length === 0 ? (
            <EmptyChartState
              icon={Wallet}
              title="No expenses this month"
              text="Your category breakdown will appear here."
              className="mt-6 min-h-60"
              showButton={false}
            />
          ) : (
            <div className="mt-6 space-y-5">
              {categories.map((category) => {
                const Icon =
                  category.iconComponent;

                return (
                  <div key={category.name}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${category.tone.icon}`}
                        >
                          <Icon size={17} />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                            {category.name}
                          </p>

                          <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                            {category.percentage}% of
                            expenses
                          </p>
                        </div>
                      </div>

                      <p className="shrink-0 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {formatMoney(
                          category.amount,
                          currency
                        )}
                      </p>
                    </div>

                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${category.tone.bar}`}
                        style={{
                          width: `${Math.min(
                            category.percentage,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              navigate("/analytics")
            }
            className="
              mt-6 flex w-full items-center
              justify-center gap-2
              rounded-xl
              border border-slate-200
              py-2.5
              text-sm font-semibold
              text-slate-600
              transition
              hover:bg-slate-50
              dark:border-slate-700
              dark:text-slate-300
              dark:hover:bg-slate-800
            "
          >
            View full analytics
            <ChevronRight size={15} />
          </button>
        </section>
      </section>

      {/* ==================================================
          RECENT + SMART INSIGHT
      ================================================== */}

      <section className="grid gap-6 lg:grid-cols-2">
        {/* Recent transactions */}

        <section
          className="
            rounded-2xl
            border border-slate-200
            bg-white
            p-5
            shadow-sm
            dark:border-slate-800
            dark:bg-slate-900
            sm:p-6
          "
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                Recent transactions
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-400 dark:text-slate-500">
                Your latest recorded activity.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/transactions")
              }
              className="
                inline-flex items-center gap-1
                text-xs font-semibold
                text-indigo-600
                transition
                hover:text-indigo-700
                dark:text-indigo-400
                dark:hover:text-indigo-300
              "
            >
              View all
              <ChevronRight size={14} />
            </button>
          </div>

          {recentTransactions.length ===
          0 ? (
            <EmptyChartState
              icon={Receipt}
              title="No transactions yet"
              text="Start tracking your money with your first transaction."
              onClick={() =>
                navigate("/transactions")
              }
              className="mt-6 min-h-60"
              buttonLabel="Add transaction"
            />
          ) : (
            <div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
              {recentTransactions.map(
                (transaction) => {
                  const Icon =
                    CATEGORY_ICONS[
                      transaction?.category
                    ] || MoreHorizontal;

                  const isIncome =
                    transaction?.type ===
                    "income";

                  return (
                    <button
                      key={transaction.id}
                      type="button"
                      onClick={() =>
                        navigate(
                          "/transactions"
                        )
                      }
                      className="
                        group flex w-full
                        items-center
                        justify-between
                        gap-3
                        py-3.5
                        text-left
                        transition
                        first:pt-0
                        last:pb-0
                      "
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`
                            flex h-10 w-10 shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            transition-transform
                            group-hover:scale-105
                            ${
                              isIncome
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            }
                          `}
                        >
                          <Icon size={18} />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {transaction?.description ||
                              transaction?.category ||
                              "Transaction"}
                          </p>

                          <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">
                            {transaction?.category ||
                              "Other"}
                            {" · "}
                            {formatTransactionDate(
                              transaction?.date
                            )}
                            {transaction?.paymentMethod
                              ? ` · ${transaction.paymentMethod}`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <div
                          className={`
                            flex items-center
                            gap-1
                            text-sm font-semibold
                            ${
                              isIncome
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }
                          `}
                        >
                          {isIncome ? (
                            <ArrowUpRight
                              size={14}
                            />
                          ) : (
                            <ArrowDownRight
                              size={14}
                            />
                          )}

                          {isIncome ? "+" : "-"}
                          {formatMoney(
                            transaction?.amount,
                            currency
                          )}
                        </div>

                        <ChevronRight
                          size={14}
                          className="
                            ml-1
                            text-slate-300
                            transition-transform
                            group-hover:translate-x-0.5
                            dark:text-slate-600
                          "
                        />
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* Smart insight */}

        <section
          className="
            relative overflow-hidden
            rounded-2xl
            border border-indigo-400/20
            bg-linear-to-br
            from-indigo-600
            via-indigo-600
            to-violet-600
            p-6
            text-white
            shadow-lg
            shadow-indigo-200/40
            dark:shadow-indigo-950/30
          "
        >
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
          <div className="absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-white/5" />
          <div className="absolute right-12 top-20 h-2 w-2 rounded-full bg-white/30" />
          <div className="absolute right-24 top-28 h-1.5 w-1.5 rounded-full bg-white/20" />

          <div className="relative flex h-full flex-col">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                  <Lightbulb size={21} />
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-200">
                    Smart insight
                  </p>

                  <h2 className="mt-0.5 font-semibold text-white">
                    {insight.title}
                  </h2>
                </div>
              </div>

              <span className="hidden rounded-lg border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-indigo-100 sm:inline-flex">
                {currentMonthLabel}
              </span>
            </div>

            <p className="mt-6 max-w-xl text-sm leading-6 text-indigo-100">
              {insight.text}
            </p>

            <div className="mt-6 rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-start gap-2 text-sm font-semibold leading-5 text-white">
                {summary.savings >= 0 ? (
                  <TrendingUp
                    size={17}
                    className="mt-0.5 shrink-0"
                  />
                ) : (
                  <TrendingDown
                    size={17}
                    className="mt-0.5 shrink-0"
                  />
                )}

                <span>
                  {summary.savings >= 0
                    ? `You're currently saving ${formatMoney(
                        summary.savings,
                        currency
                      )} this month.`
                    : `You're spending ${formatMoney(
                        Math.abs(
                          summary.savings
                        ),
                        currency
                      )} more than you're earning this month.`}
                </span>
              </div>
            </div>

            <div className="mt-auto pt-6">
              <button
                type="button"
                onClick={() =>
                  navigate("/analytics")
                }
                className="
                  inline-flex items-center
                  gap-2 rounded-xl
                  bg-white/10
                  px-3.5 py-2
                  text-xs font-semibold
                  text-white
                  transition
                  hover:bg-white/15
                "
              >
                Explore analytics
                <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        </section>
      </section>

      {/* ==================================================
          QUICK OVERVIEW
      ================================================== */}

      <section>
        <div className="mb-4">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">
            Quick overview
          </h2>

          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Jump into the areas you're actively
            tracking.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <OverviewCard
            icon={Target}
            iconClass="bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
            title="Goals"
            value={activeGoalsCount}
            description={
              activeGoalsCount === 1
                ? "Active financial goal"
                : "Active financial goals"
            }
            onClick={() => navigate("/goals")}
          />

          <OverviewCard
            icon={Repeat}
            iconClass="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
            title="Subscriptions"
            value={
              activeSubscriptionsCount
            }
            description={
              activeSubscriptionsCount ===
              1
                ? "Active subscription"
                : "Active subscriptions"
            }
            onClick={() =>
              navigate("/subscriptions")
            }
          />

          <OverviewCard
            icon={Users}
            iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
            title="Money tracker"
            value={
              pendingMoneyRecords.length
            }
            description={
              pendingMoneyRecords.length === 0
                ? "No pending records"
                : `${formatMoney(
                    pendingMoneyAmount,
                    currency
                  )} still pending`
            }
            onClick={() =>
              navigate("/money-tracker")
            }
          />
        </div>
      </section>
    </div>
  );
}

// ======================================================
// SNAPSHOT ITEM
// ======================================================

function SnapshotItem({
  icon: Icon,
  iconClass,
  label,
  value,
  helper,
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
          {label}
        </p>

        <p className="mt-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
          {value}
        </p>

        <p className="mt-0.5 truncate text-[11px] text-slate-400 dark:text-slate-500">
          {helper}
        </p>
      </div>

      <div
        className={`
          flex h-9 w-9 shrink-0
          items-center justify-center
          rounded-xl
          ${iconClass}
        `}
      >
        <Icon size={17} />
      </div>
    </div>
  );
}

// ======================================================
// OVERVIEW CARD
// ======================================================

function OverviewCard({
  icon: Icon,
  iconClass,
  title,
  value,
  description,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        group flex items-center
        justify-between gap-4
        rounded-2xl
        border border-slate-200
        bg-white
        p-5
        text-left
        shadow-sm
        transition
        hover:-translate-y-0.5
        hover:border-slate-300
        hover:shadow-md
        dark:border-slate-800
        dark:bg-slate-900
        dark:hover:border-slate-700
      "
    >
      <div className="flex min-w-0 items-center gap-3.5">
        <div
          className={`
            flex h-11 w-11 shrink-0
            items-center justify-center
            rounded-xl
            ${iconClass}
          `}
        >
          <Icon size={20} />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
            {title}
          </p>

          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {value}
          </p>

          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>

      <ChevronRight
        size={17}
        className="
          shrink-0
          text-slate-300
          transition-transform
          group-hover:translate-x-0.5
          dark:text-slate-600
        "
      />
    </button>
  );
}

// ======================================================
// EMPTY CHART STATE
// ======================================================

function EmptyChartState({
  icon: Icon,
  title,
  text,
  onClick,
  buttonLabel = "Add expense",
  showButton = true,
  className = "",
}) {
  return (
    <div
      className={`
        flex min-h-full flex-col
        items-center justify-center
        rounded-2xl
        bg-slate-50/70
        px-6 py-8
        text-center
        dark:bg-slate-800/40
        ${className}
      `}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm dark:bg-slate-800 dark:text-slate-600">
        <Icon size={21} />
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {title}
      </p>

      <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400 dark:text-slate-500">
        {text}
      </p>

      {showButton && onClick && (
        <button
          type="button"
          onClick={onClick}
          className="
            mt-4 inline-flex items-center
            gap-1.5
            text-xs font-semibold
            text-indigo-600
            transition
            hover:text-indigo-700
            dark:text-indigo-400
            dark:hover:text-indigo-300
          "
        >
          {buttonLabel}
          <ArrowUpRight size={14} />
        </button>
      )}
    </div>
  );
}

// ======================================================
// SKELETON
// ======================================================

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div
        className="
          rounded-3xl
          border border-slate-200
          bg-white p-7
          dark:border-slate-800
          dark:bg-slate-900
        "
      >
        <div className="space-y-3">
          <div className="h-4 w-28 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />

          <div className="h-9 w-64 max-w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />

          <div className="h-4 w-80 max-w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/70" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map(
          (_, index) => (
            <div
              key={index}
              className="
                h-32 animate-pulse
                rounded-2xl
                border border-slate-200
                bg-white
                dark:border-slate-800
                dark:bg-slate-900
              "
            />
          )
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 xl:col-span-2" />

        <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />

        <div className="h-80 animate-pulse rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/10" />
      </div>
    </div>
  );
}

export default Dashboard;