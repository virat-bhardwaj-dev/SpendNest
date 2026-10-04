import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import {
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  RefreshCw,
  Receipt,
  Target,
  Activity,
  PieChart as PieChartIcon,
  BarChart3,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { getTransactions } from "../services/transactionService";

// ======================================================
// CONSTANTS
// ======================================================

const CURRENCY_STORAGE_KEY = "spendnest_currency";

const CHART_COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#14b8a6",
];

// ======================================================
// HELPERS
// ======================================================

function getCurrentMonth() {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function getMonthLabel(month) {
  if (!month) return "";

  const [year, monthNumber] = month.split("-");

  return new Date(
    Number(year),
    Number(monthNumber) - 1,
    1
  ).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function getAvailableMonths(count = 12) {
  const months = [];
  const current = new Date();

  for (let index = 0; index < count; index += 1) {
    const date = new Date(
      current.getFullYear(),
      current.getMonth() - index,
      1
    );

    months.push(
      `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`
    );
  }

  return months;
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

function formatCurrency(value, currency = "INR") {
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

function formatCompactCurrency(
  value,
  currency = "INR"
) {
  const amount = Number(value) || 0;

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return amount.toLocaleString("en-IN", {
      notation: "compact",
      maximumFractionDigits: 1,
    });
  }
}

function getCurrencySymbol(currency = "INR") {
  try {
    return (
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        currencyDisplay: "narrowSymbol",
      })
        .formatToParts(0)
        .find((part) => part.type === "currency")?.value ||
      "₹"
    );
  } catch {
    return "₹";
  }
}

function getDaysInMonth(month) {
  if (!month) return 31;

  const [year, monthNumber] = month.split("-");

  return new Date(
    Number(year),
    Number(monthNumber),
    0
  ).getDate();
}

function getDayNumber(dateString) {
  if (!dateString) return null;

  const parts = String(dateString).split("-");

  if (parts.length !== 3) return null;

  const day = Number(parts[2]);

  return Number.isFinite(day) ? day : null;
}

function getPercentage(value, total) {
  if (!total || total <= 0) return 0;

  return (value / total) * 100;
}

// ======================================================
// TOOLTIP
// ======================================================

function ChartTooltip({
  active,
  payload,
  label,
  currency,
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div
      className="
        min-w-44
        rounded-2xl
        border border-slate-200
        bg-white
        px-4 py-3
        shadow-xl
        dark:border-slate-700
        dark:bg-slate-900
      "
    >
      {label && (
        <p
          className="
            mb-2
            text-xs
            font-semibold
            text-slate-500
            dark:text-slate-400
          "
        >
          {label}
        </p>
      )}

      <div className="space-y-2">
        {payload.map((item, index) => (
          <div
            key={`${item.dataKey || item.name}-${index}`}
            className="
              flex
              items-center
              justify-between
              gap-5
            "
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor:
                    item.color ||
                    CHART_COLORS[0],
                }}
              />

              <span
                className="
                  text-xs
                  text-slate-500
                  dark:text-slate-400
                "
              >
                {item.name || item.dataKey}
              </span>
            </div>

            <span
              className="
                text-xs
                font-bold
                text-slate-800
                dark:text-slate-100
              "
            >
              {formatCurrency(
                item.value,
                currency
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DailyTooltip({
  active,
  payload,
  currency,
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0];
  const day = item?.payload?.day;
  const value = Number(item?.value) || 0;

  return (
    <div
      className="
        min-w-40
        rounded-2xl
        border border-slate-200
        bg-white
        px-4 py-3
        shadow-xl
        dark:border-slate-700
        dark:bg-slate-900
      "
    >
      <p
        className="
          text-xs
          font-semibold
          text-slate-500
          dark:text-slate-400
        "
      >
        Day {day}
      </p>

      <div className="mt-2 flex items-center justify-between gap-4">
        <span
          className="
            text-xs
            text-slate-400
            dark:text-slate-500
          "
        >
          Spent
        </span>

        <span
          className="
            text-sm
            font-bold
            text-slate-900
            dark:text-white
          "
        >
          {formatCurrency(value, currency)}
        </span>
      </div>

      {value === 0 && (
        <p
          className="
            mt-1.5
            text-[10px]
            text-slate-400
            dark:text-slate-500
          "
        >
          No spending recorded
        </p>
      )}
    </div>
  );
}

// ======================================================
// ANALYTICS
// ======================================================

function Analytics() {
  const navigate = useNavigate();

  const [transactions, setTransactions] =
    useState([]);

  const [selectedMonth, setSelectedMonth] =
    useState(getCurrentMonth);

  const [currency, setCurrency] =
    useState(getStoredCurrency);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  // ====================================================
  // THEME
  // ====================================================

  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains(
      "dark"
    )
  );

  useEffect(() => {
    const observer = new MutationObserver(
      () => {
        setIsDark(
          document.documentElement.classList.contains(
            "dark"
          )
        );
      }
    );

    observer.observe(
      document.documentElement,
      {
        attributes: true,
        attributeFilter: ["class"],
      }
    );

    return () => observer.disconnect();
  }, []);

  // ====================================================
  // CURRENCY
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
  // FIREBASE FETCH
  // ====================================================

  const fetchTransactions =
    useCallback(async () => {
      return getTransactions();
    }, []);

  // ====================================================
  // INITIAL LOAD
  // ====================================================

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      try {
        const data =
          await fetchTransactions();

        if (!active) {
          return;
        }

        setTransactions(data || []);
        setError("");
      } catch (err) {
        console.error(
          "Analytics loading error:",
          err
        );

        if (active) {
          setError(
            "Unable to load your analytics right now."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      active = false;
    };
  }, [fetchTransactions]);

  // ====================================================
  // REFRESH
  // ====================================================

  const handleRefresh = async () => {
    if (refreshing) return;

    try {
      setRefreshing(true);
      setError("");

      const data =
        await fetchTransactions();

      setTransactions(data || []);
    } catch (err) {
      console.error(
        "Analytics refresh error:",
        err
      );

      setError(
        "Unable to refresh your analytics."
      );
    } finally {
      setRefreshing(false);
    }
  };

  // ====================================================
  // AVAILABLE MONTHS
  // ====================================================

  const availableMonths = useMemo(() => {
    const transactionMonths = transactions
      .map((transaction) =>
        transaction?.date?.slice(0, 7)
      )
      .filter(Boolean);

    return [
      ...new Set([
        ...getAvailableMonths(12),
        ...transactionMonths,
      ]),
    ].sort((a, b) =>
      b.localeCompare(a)
    );
  }, [transactions]);

  // ====================================================
  // MONTHLY TRANSACTIONS
  // ====================================================

  const monthlyTransactions =
    useMemo(() => {
      return transactions.filter(
        (transaction) =>
          transaction?.date?.startsWith(
            selectedMonth
          )
      );
    }, [
      transactions,
      selectedMonth,
    ]);

  // ====================================================
  // SUMMARY
  // ====================================================

  const summary = useMemo(() => {
    return monthlyTransactions.reduce(
      (result, transaction) => {
        const amount =
          Number(transaction?.amount) || 0;

        if (transaction?.type === "income") {
          result.income += amount;
        }

        if (
          transaction?.type === "expense"
        ) {
          result.expense += amount;
        }

        return result;
      },
      {
        income: 0,
        expense: 0,
      }
    );
  }, [monthlyTransactions]);

  const savings =
    summary.income - summary.expense;

  const savingsRate =
    summary.income > 0
      ? (savings / summary.income) * 100
      : 0;

  const savingsRateDisplay =
    Number.isFinite(savingsRate)
      ? savingsRate
      : 0;

  // ====================================================
  // CATEGORY DATA
  // ====================================================

  const categoryData = useMemo(() => {
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
        color:
          CHART_COLORS[
            index % CHART_COLORS.length
          ],
      }))
      .sort(
        (a, b) => b.amount - a.amount
      );
  }, [monthlyTransactions]);

  // ====================================================
  // DAILY SPENDING
  // ====================================================

  const dailyData = useMemo(() => {
    const daysInMonth =
      getDaysInMonth(selectedMonth);

    const dailyExpenses = {};

    monthlyTransactions
      .filter(
        (transaction) =>
          transaction?.type === "expense"
      )
      .forEach((transaction) => {
        const day = getDayNumber(
          transaction?.date
        );

        if (!day) {
          return;
        }

        dailyExpenses[day] =
          (dailyExpenses[day] || 0) +
          (Number(transaction?.amount) || 0);
      });

    return Array.from(
      { length: daysInMonth },
      (_, index) => {
        const day = index + 1;

        return {
          day,
          amount: dailyExpenses[day] || 0,
        };
      }
    );
  }, [
    monthlyTransactions,
    selectedMonth,
  ]);

  // ====================================================
  // INCOME VS EXPENSE
  // ====================================================

  const incomeExpenseData = useMemo(
    () => [
      {
        name: "Income",
        amount: summary.income,
      },
      {
        name: "Expenses",
        amount: summary.expense,
      },
    ],
    [summary]
  );

  // ====================================================
  // TOP CATEGORY
  // ====================================================

  const topCategory =
    categoryData.length > 0
      ? categoryData[0]
      : null;

  // ====================================================
  // ACTIVE DAYS
  // ====================================================

  const activeSpendingDays = useMemo(
    () =>
      dailyData.filter(
        (item) => item.amount > 0
      ).length,
    [dailyData]
  );

  // ====================================================
  // HIGHEST DAY
  // ====================================================

  const highestSpendingDay = useMemo(() => {
    if (!dailyData.length) {
      return null;
    }

    return dailyData.reduce(
      (highest, current) =>
        current.amount > highest.amount
          ? current
          : highest,
      dailyData[0]
    );
  }, [dailyData]);

  // ====================================================
  // AVERAGE DAILY SPEND
  // ====================================================

  const averageDailySpend = useMemo(() => {
    if (activeSpendingDays === 0) {
      return 0;
    }

    return (
      summary.expense / activeSpendingDays
    );
  }, [
    summary.expense,
    activeSpendingDays,
  ]);

  // ====================================================
  // EXPENSE COUNT
  // ====================================================

  const expenseTransactionCount =
    useMemo(
      () =>
        monthlyTransactions.filter(
          (transaction) =>
            transaction?.type === "expense"
        ).length,
      [monthlyTransactions]
    );

  const incomeTransactionCount =
    useMemo(
      () =>
        monthlyTransactions.filter(
          (transaction) =>
            transaction?.type === "income"
        ).length,
      [monthlyTransactions]
    );

  // ====================================================
  // OTHER INSIGHTS
  // ====================================================

  const largestExpense = useMemo(() => {
    const expenses =
      monthlyTransactions.filter(
        (transaction) =>
          transaction?.type === "expense"
      );

    if (!expenses.length) {
      return null;
    }

    return expenses.reduce(
      (largest, current) =>
        Number(current.amount) >
        Number(largest.amount)
          ? current
          : largest,
      expenses[0]
    );
  }, [monthlyTransactions]);

  const hasMonthlyData =
    monthlyTransactions.length > 0;

  const expenseShareOfIncome =
    summary.income > 0
      ? (summary.expense /
          summary.income) *
        100
      : 0;

  // ====================================================
  // LOADING
  // ====================================================

  if (loading) {
    return (
      <AnalyticsSkeleton />
    );
  }

  // ====================================================
  // FULL ERROR
  // ====================================================

  if (
    error &&
    transactions.length === 0
  ) {
    return (
      <div
        className="
          mx-auto max-w-2xl
          py-12
        "
      >
        <div
          className="
            rounded-3xl
            border
            border-rose-200
            bg-rose-50
            p-7
            dark:border-rose-900/40
            dark:bg-rose-950/20
          "
        >
          <div className="flex items-start gap-4">
            <div
              className="
                flex h-11 w-11
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-rose-100
                text-rose-600
                dark:bg-rose-500/10
                dark:text-rose-400
              "
            >
              <AlertCircle size={20} />
            </div>

            <div>
              <h2
                className="
                  font-semibold
                  text-rose-800
                  dark:text-rose-300
                "
              >
                Analytics unavailable
              </h2>

              <p
                className="
                  mt-1
                  text-sm
                  leading-6
                  text-rose-600/80
                  dark:text-rose-400/70
                "
              >
                {error}
              </p>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="
                  mt-5
                  inline-flex
                  items-center
                  gap-2
                  rounded-xl
                  bg-rose-600
                  px-4 py-2.5
                  text-xs
                  font-semibold
                  text-white
                  transition
                  hover:bg-rose-700
                  disabled:opacity-60
                  dark:bg-rose-500
                "
              >
                <RefreshCw
                  size={14}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ====================================================
  // MAIN
  // ====================================================

  return (
    <div
      className="
        mx-auto
        max-w-7xl
        space-y-6
        pb-6
      "
    >
      {/* ==================================================
          HEADER
      ================================================== */}

      <section
        className="
          flex flex-col gap-5
          rounded-3xl
          border
          border-slate-200
          bg-white
          p-5
          shadow-sm
          dark:border-slate-800
          dark:bg-slate-900
          sm:p-6
          lg:flex-row
          lg:items-end
          lg:justify-between
        "
      >
        <div className="min-w-0">
          <div
            className="
              inline-flex
              items-center gap-2
              rounded-full
              border
              border-indigo-100
              bg-indigo-50
              px-3 py-1.5
              text-xs font-semibold
              text-indigo-600
              dark:border-indigo-500/20
              dark:bg-indigo-500/10
              dark:text-indigo-400
            "
          >
            <Activity size={13} />
            Financial insights
          </div>

          <h1
            className="
              mt-3
              text-2xl
              font-bold
              tracking-tight
              text-slate-900
              dark:text-white
              sm:text-3xl
            "
          >
            Analytics
          </h1>

          <p
            className="
              mt-1.5
              max-w-2xl
              text-sm
              leading-6
              text-slate-500
              dark:text-slate-400
            "
          >
            Understand your spending,
            savings and financial habits at a
            glance.
          </p>
        </div>

        <div
          className="
            flex w-full
            flex-col gap-2
            sm:w-auto sm:flex-row
          "
        >
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="
              inline-flex h-11
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-slate-200
              bg-slate-50
              px-4
              text-xs
              font-semibold
              text-slate-600
              transition-all
              hover:border-slate-300
              hover:bg-white
              disabled:cursor-not-allowed
              disabled:opacity-60
              dark:border-slate-700
              dark:bg-slate-800
              dark:text-slate-300
              dark:hover:border-slate-600
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

          <div
            className="
              flex h-11
              items-center
              gap-2
              rounded-xl
              border
              border-slate-200
              bg-white
              px-3
              shadow-sm
              dark:border-slate-700
              dark:bg-slate-900
            "
          >
            <CalendarDays
              size={15}
              className="
                shrink-0
                text-slate-400
                dark:text-slate-500
              "
            />

            <select
              value={selectedMonth}
              onChange={(event) =>
                setSelectedMonth(
                  event.target.value
                )
              }
              aria-label="Select analytics month"
              className="
                min-w-32
                bg-transparent
                text-xs
                font-semibold
                text-slate-700
                outline-none
                dark:text-slate-200
              "
            >
              {availableMonths.map(
                (month) => (
                  <option
                    key={month}
                    value={month}
                  >
                    {getMonthLabel(month)}
                  </option>
                )
              )}
            </select>
          </div>
        </div>
      </section>

      {/* ==================================================
          ERROR
      ================================================== */}

      {error && (
        <div
          className="
            flex flex-col gap-3
            rounded-2xl
            border
            border-amber-200
            bg-amber-50
            px-4 py-3.5
            dark:border-amber-900/40
            dark:bg-amber-950/20
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              size={17}
              className="
                mt-0.5
                shrink-0
                text-amber-600
                dark:text-amber-400
              "
            />

            <p
              className="
                text-xs
                font-medium
                text-amber-700
                dark:text-amber-400
              "
            >
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="
              self-start
              text-xs
              font-semibold
              text-amber-700
              hover:underline
              disabled:opacity-50
              dark:text-amber-400
              sm:self-auto
            "
          >
            Retry
          </button>
        </div>
      )}

      {/* ==================================================
          MONTH OVERVIEW
      ================================================== */}

      <section
        className="
          overflow-hidden
          rounded-3xl
          border
          border-indigo-100
          bg-linear-to-r
          from-indigo-50
          via-white
          to-white
          p-5
          dark:border-indigo-500/20
          dark:from-indigo-500/10
          dark:via-slate-900
          dark:to-slate-900
          sm:p-6
        "
      >
        <div
          className="
            flex flex-col gap-5
            lg:flex-row
            lg:items-center
            lg:justify-between
          "
        >
          <div className="flex items-center gap-3">
            <div
              className="
                flex h-11 w-11
                shrink-0
                items-center
                justify-center
                rounded-2xl
                bg-indigo-100
                text-indigo-600
                dark:bg-indigo-500/15
                dark:text-indigo-400
              "
            >
              <Activity size={19} />
            </div>

            <div>
              <p
                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.12em]
                  text-indigo-500
                  dark:text-indigo-400
                "
              >
                Analytics for
              </p>

              <h2
                className="
                  mt-0.5
                  text-base
                  font-bold
                  text-slate-900
                  dark:text-white
                "
              >
                {getMonthLabel(
                  selectedMonth
                )}
              </h2>
            </div>
          </div>

          <div
            className="
              grid
              grid-cols-2
              gap-2
              sm:grid-cols-4
              lg:min-w-120
              
            "
          >
            <ContextStat
              label="Transactions"
              value={
                monthlyTransactions.length
              }
            />

            <ContextStat
              label="Income entries"
              value={
                incomeTransactionCount
              }
            />

            <ContextStat
              label="Expense entries"
              value={
                expenseTransactionCount
              }
            />

            <ContextStat
              label="Currency"
              value={getCurrencySymbol(
                currency
              )}
            />
          </div>
        </div>
      </section>

      {/* ==================================================
          EMPTY MONTH
      ================================================== */}

      {!hasMonthlyData && (
        <section
          className="
            flex flex-col gap-4
            rounded-3xl
            border
            border-slate-200
            bg-white
            p-5
            shadow-sm
            dark:border-slate-800
            dark:bg-slate-900
            sm:flex-row
            sm:items-center
            sm:justify-between
            sm:p-6
          "
        >
          <div className="flex items-center gap-3">
            <div
              className="
                flex h-11 w-11
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-slate-100
                text-slate-500
                dark:bg-slate-800
                dark:text-slate-400
              "
            >
              <Receipt size={18} />
            </div>

            <div>
              <p
                className="
                  text-sm
                  font-semibold
                  text-slate-800
                  dark:text-slate-100
                "
              >
                No transactions for this
                month
              </p>

              <p
                className="
                  mt-0.5
                  text-xs
                  text-slate-400
                  dark:text-slate-500
                "
              >
                Add some activity to unlock
                useful analytics.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate("/transactions")
            }
            className="
              inline-flex
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-indigo-600
              px-4 py-2.5
              text-xs
              font-semibold
              text-white
              transition-all
              hover:-translate-y-0.5
              hover:bg-indigo-700
              dark:bg-indigo-500
              dark:hover:bg-indigo-400
            "
          >
            Add transaction
            <ArrowRight size={14} />
          </button>
        </section>
      )}

      {/* ==================================================
          SUMMARY
      ================================================== */}

      <section
        className="
          grid gap-4
          sm:grid-cols-2
          xl:grid-cols-4
        "
      >
        <AnalyticsCard
          title="Total income"
          value={formatCurrency(
            summary.income,
            currency
          )}
          subtitle={`Received in ${getMonthLabel(
            selectedMonth
          )}`}
          icon={ArrowUpRight}
          iconClass="
            bg-emerald-50
            text-emerald-600
            dark:bg-emerald-500/10
            dark:text-emerald-400
          "
          valueClass="
            text-emerald-600
            dark:text-emerald-400
          "
        />

        <AnalyticsCard
          title="Total expenses"
          value={formatCurrency(
            summary.expense,
            currency
          )}
          subtitle={
            summary.income > 0
              ? `${expenseShareOfIncome.toFixed(
                  0
                )}% of income`
              : "No income recorded"
          }
          icon={ArrowDownRight}
          iconClass="
            bg-rose-50
            text-rose-600
            dark:bg-rose-500/10
            dark:text-rose-400
          "
          valueClass="
            text-rose-600
            dark:text-rose-400
          "
        />

        <AnalyticsCard
          title="Net savings"
          value={formatCurrency(
            savings,
            currency
          )}
          subtitle={
            savings >= 0
              ? "Income is ahead"
              : "Expenses are ahead"
          }
          icon={Wallet}
          iconClass={
            savings >= 0
              ? `
                bg-indigo-50
                text-indigo-600
                dark:bg-indigo-500/10
                dark:text-indigo-400
              `
              : `
                bg-amber-50
                text-amber-600
                dark:bg-amber-500/10
                dark:text-amber-400
              `
          }
          valueClass={
            savings >= 0
              ? `
                text-indigo-600
                dark:text-indigo-400
              `
              : `
                text-rose-600
                dark:text-rose-400
              `
          }
        />

        <AnalyticsCard
          title="Savings rate"
          value={`${savingsRateDisplay.toFixed(
            1
          )}%`}
          subtitle={
            summary.income > 0
              ? "Of monthly income"
              : "No income recorded"
          }
          icon={TrendingUp}
          iconClass="
            bg-violet-50
            text-violet-600
            dark:bg-violet-500/10
            dark:text-violet-400
          "
          valueClass="
            text-violet-600
            dark:text-violet-400
          "
        />
      </section>

      {/* ==================================================
          QUICK INSIGHTS
      ================================================== */}

      <section
        className="
          grid gap-4
          sm:grid-cols-2
          lg:grid-cols-4
        "
      >
        <InsightCard
          icon={Target}
          title="Top spending area"
          value={
            topCategory?.name ||
            "No expenses"
          }
          description={
            topCategory
              ? `${formatCurrency(
                  topCategory.amount,
                  currency
                )} · ${getPercentage(
                  topCategory.amount,
                  summary.expense
                ).toFixed(0)}% of expenses`
              : "Nothing to analyse yet"
          }
        />

        <InsightCard
          icon={TrendingDown}
          title="Average daily spend"
          value={formatCurrency(
            averageDailySpend,
            currency
          )}
          description={
            activeSpendingDays > 0
              ? `Across ${activeSpendingDays} spending day${
                  activeSpendingDays !== 1
                    ? "s"
                    : ""
                }`
              : "No spending days"
          }
        />

        <InsightCard
          icon={CalendarDays}
          title="Highest spending day"
          value={
            highestSpendingDay?.amount > 0
              ? `Day ${highestSpendingDay.day}`
              : "No spending"
          }
          description={
            highestSpendingDay?.amount > 0
              ? formatCurrency(
                  highestSpendingDay.amount,
                  currency
                )
              : "Nothing recorded"
          }
        />

        <InsightCard
          icon={Receipt}
          title="Largest expense"
          value={
            largestExpense
              ? formatCurrency(
                  largestExpense.amount,
                  currency
                )
              : "No expense"
          }
          description={
            largestExpense
              ? largestExpense.category ||
                largestExpense.description ||
                "Expense"
              : "Nothing recorded"
          }
        />
      </section>

      {/* ==================================================
          CHARTS
      ================================================== */}

      <section
        className="
          grid gap-6
          xl:grid-cols-2
        "
      >
        {/* Income vs expense */}

        <ChartCard
          icon={BarChart3}
          title="Income vs expenses"
          description="Compare money coming in with money going out."
        >
          <div
            className="
              grid gap-5
              sm:grid-cols-[1fr_auto]
              sm:items-center
            "
          >
            <div className="h-72">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={incomeExpenseData}
                  margin={{
                    top: 10,
                    right: 5,
                    left: -18,
                    bottom: 5,
                  }}
                  barCategoryGap="28%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={
                      isDark
                        ? "#263449"
                        : "#e2e8f0"
                    }
                  />

                  <XAxis
                    dataKey="name"
                    tick={{
                      fill: isDark
                        ? "#94a3b8"
                        : "#64748b",
                      fontSize: 11,
                    }}
                    axisLine={{
                      stroke: isDark
                        ? "#334155"
                        : "#e2e8f0",
                    }}
                    tickLine={false}
                  />

                  <YAxis
                    tick={{
                      fill: isDark
                        ? "#94a3b8"
                        : "#64748b",
                      fontSize: 10,
                    }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) =>
                      formatCompactCurrency(
                        value,
                        currency
                      )
                    }
                  />

                  <Tooltip
                    content={
                      <ChartTooltip
                        currency={currency}
                      />
                    }
                  />

                  <Bar
                    dataKey="amount"
                    name="Amount"
                    fill="#6366f1"
                    radius={[
                      8,
                      8,
                      3,
                      3,
                    ]}
                    maxBarSize={58}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div
              className="
                grid
                grid-cols-2
                gap-3
                sm:w-36
                sm:grid-cols-1
              "
            >
              <LegendStat
                label="Income"
                value={formatCurrency(
                  summary.income,
                  currency
                )}
                dotClass="bg-emerald-500"
              />

              <LegendStat
                label="Expenses"
                value={formatCurrency(
                  summary.expense,
                  currency
                )}
                dotClass="bg-rose-500"
              />
            </div>
          </div>
        </ChartCard>

        {/* Category donut */}

        <ChartCard
          icon={PieChartIcon}
          title="Expense by category"
          description="See which categories consume most of your spending."
        >
          {categoryData.length === 0 ? (
            <EmptyChart
              icon={PieChartIcon}
              text="No expense data for this month."
            />
          ) : (
            <div
              className="
                grid gap-4
                sm:grid-cols-[1fr_160px]
              "
            >
              <div className="relative h-72">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius="58%"
                      outerRadius="78%"
                      paddingAngle={3}
                      stroke="none"
                    >
                      {categoryData.map(
                        (category) => (
                          <Cell
                            key={category.name}
                            fill={
                              category.color
                            }
                          />
                        )
                      )}
                    </Pie>

                    <Tooltip
                      content={
                        <ChartTooltip
                          currency={currency}
                        />
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div
                  className="
                    pointer-events-none
                    absolute
                    inset-0
                    flex
                    items-center
                    justify-center
                  "
                >
                  <div className="text-center">
                    <p
                      className="
                        text-[10px]
                        font-semibold
                        uppercase
                        tracking-wide
                        text-slate-400
                        dark:text-slate-500
                      "
                    >
                      Total spent
                    </p>

                    <p
                      className="
                        mt-1
                        text-sm
                        font-bold
                        text-slate-900
                        dark:text-white
                      "
                    >
                      {formatCurrency(
                        summary.expense,
                        currency
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="
                  flex
                  max-h-72
                  flex-col
                  justify-center
                  gap-3
                  overflow-y-auto
                  pr-1
                "
              >
                {categoryData.map(
                  (category) => {
                    const percentage =
                      getPercentage(
                        category.amount,
                        summary.expense
                      );

                    return (
                      <div
                        key={category.name}
                        className="
                          rounded-xl
                          border
                          border-slate-100
                          bg-slate-50/70
                          px-3 py-2.5
                          dark:border-slate-800
                          dark:bg-slate-800/40
                        "
                      >
                        <div
                          className="
                            flex
                            items-center
                            justify-between
                            gap-2
                          "
                        >
                          <div
                            className="
                              flex
                              min-w-0
                              items-center
                              gap-2
                            "
                          >
                            <span
                              className="
                                h-2.5 w-2.5
                                shrink-0
                                rounded-full
                              "
                              style={{
                                backgroundColor:
                                  category.color,
                              }}
                            />

                            <span
                              className="
                                truncate
                                text-xs
                                font-medium
                                text-slate-600
                                dark:text-slate-300
                              "
                            >
                              {category.name}
                            </span>
                          </div>

                          <span
                            className="
                              shrink-0
                              text-[10px]
                              font-bold
                              text-slate-400
                              dark:text-slate-500
                            "
                          >
                            {percentage.toFixed(
                              0
                            )}
                            %
                          </span>
                        </div>

                        <p
                          className="
                            mt-1.5
                            text-xs
                            font-bold
                            text-slate-800
                            dark:text-slate-100
                          "
                        >
                          {formatCurrency(
                            category.amount,
                            currency
                          )}
                        </p>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}
        </ChartCard>
      </section>

      {/* ==================================================
          DAILY SPENDING
      ================================================== */}

      <ChartCard
        icon={Activity}
        title="Daily spending"
        description={`Track how your expenses moved throughout ${getMonthLabel(
          selectedMonth
        )}.`}
        action={
          summary.expense > 0 ? (
            <span
              className="
                rounded-full
                bg-indigo-50
                px-3 py-1.5
                text-[10px]
                font-bold
                text-indigo-600
                dark:bg-indigo-500/10
                dark:text-indigo-400
              "
            >
              {formatCurrency(
                summary.expense,
                currency
              )}
            </span>
          ) : null
        }
      >
        {summary.expense === 0 ? (
          <EmptyChart
            icon={Activity}
            text="No expenses have been recorded for this month."
          />
        ) : (
          <div>
            <div
              className="
                mb-5
                grid
                grid-cols-2
                gap-3
                sm:grid-cols-4
              "
            >
              <SmallMetric
                label="Total spent"
                value={formatCurrency(
                  summary.expense,
                  currency
                )}
              />

              <SmallMetric
                label="Active days"
                value={
                  activeSpendingDays
                }
              />

              <SmallMetric
                label="Peak day"
                value={
                  highestSpendingDay?.amount >
                  0
                    ? `Day ${highestSpendingDay.day}`
                    : "—"
                }
              />

              <SmallMetric
                label="Daily average"
                value={formatCurrency(
                  averageDailySpend,
                  currency
                )}
              />
            </div>

            <div className="h-72">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={dailyData}
                  margin={{
                    top: 8,
                    right: 5,
                    left: -16,
                    bottom: 4,
                  }}
                  barCategoryGap="18%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={
                      isDark
                        ? "#263449"
                        : "#e2e8f0"
                    }
                  />

                  <XAxis
                    dataKey="day"
                    tick={{
                      fill: isDark
                        ? "#94a3b8"
                        : "#64748b",
                      fontSize: 10,
                    }}
                    axisLine={{
                      stroke: isDark
                        ? "#334155"
                        : "#e2e8f0",
                    }}
                    tickLine={false}
                    interval={
                      dailyData.length > 20
                        ? 2
                        : 0
                    }
                  />

                  <YAxis
                    tick={{
                      fill: isDark
                        ? "#94a3b8"
                        : "#64748b",
                      fontSize: 10,
                    }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) =>
                      formatCompactCurrency(
                        value,
                        currency
                      )
                    }
                  />

                  <Tooltip
                    cursor={{
                      fill: isDark
                        ? "rgba(99,102,241,0.08)"
                        : "rgba(99,102,241,0.05)",
                    }}
                    content={
                      <DailyTooltip
                        currency={currency}
                      />
                    }
                  />

                  <Bar
                    dataKey="amount"
                    name="Spent"
                    fill="#6366f1"
                    radius={[
                      5,
                      5,
                      2,
                      2,
                    ]}
                    maxBarSize={22}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {highestSpendingDay?.amount >
              0 && (
              <div
                className="
                  mt-4
                  flex flex-col gap-2
                  rounded-2xl
                  border
                  border-slate-100
                  bg-slate-50
                  px-4 py-3
                  dark:border-slate-800
                  dark:bg-slate-800/40
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                "
              >
                <div className="flex items-center gap-2">
                  <span
                    className="
                      h-2 w-2
                      rounded-full
                      bg-indigo-500
                    "
                  />

                  <span
                    className="
                      text-xs
                      text-slate-500
                      dark:text-slate-400
                    "
                  >
                    Highest spending day
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className="
                      text-xs
                      font-semibold
                      text-slate-700
                      dark:text-slate-200
                    "
                  >
                    Day{" "}
                    {highestSpendingDay.day}
                  </span>

                  <span
                    className="
                      text-xs
                      font-bold
                      text-indigo-600
                      dark:text-indigo-400
                    "
                  >
                    {formatCurrency(
                      highestSpendingDay.amount,
                      currency
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </ChartCard>

      {/* ==================================================
          CATEGORY BREAKDOWN
      ================================================== */}

      <section
        className="
          rounded-3xl
          border
          border-slate-200
          bg-white
          p-5
          shadow-sm
          dark:border-slate-800
          dark:bg-slate-900
          sm:p-6
        "
      >
        <div
          className="
            flex flex-col gap-3
            sm:flex-row
            sm:items-end
            sm:justify-between
          "
        >
          <div>
            <div className="flex items-center gap-2">
              <div
                className="
                  flex h-9 w-9
                  items-center
                  justify-center
                  rounded-xl
                  bg-indigo-50
                  text-indigo-600
                  dark:bg-indigo-500/10
                  dark:text-indigo-400
                "
              >
                <Receipt size={16} />
              </div>

              <h2
                className="
                  text-base
                  font-bold
                  text-slate-900
                  dark:text-white
                "
              >
                Category breakdown
              </h2>
            </div>

            <p
              className="
                mt-2
                text-xs
                leading-5
                text-slate-500
                dark:text-slate-400
              "
            >
              See exactly how your expenses
              are distributed.
            </p>
          </div>

          {categoryData.length > 0 && (
            <span
              className="
                text-xs
                font-medium
                text-slate-400
                dark:text-slate-500
              "
            >
              {categoryData.length}{" "}
              categor
              {categoryData.length === 1
                ? "y"
                : "ies"}
            </span>
          )}
        </div>

        {categoryData.length === 0 ? (
          <div className="py-12 text-center">
            <div
              className="
                mx-auto
                flex h-12 w-12
                items-center
                justify-center
                rounded-2xl
                bg-slate-100
                text-slate-400
                dark:bg-slate-800
                dark:text-slate-500
              "
            >
              <Receipt size={20} />
            </div>

            <p
              className="
                mt-3
                text-sm
                font-semibold
                text-slate-700
                dark:text-slate-200
              "
            >
              Nothing to analyse yet
            </p>

            <p
              className="
                mt-1
                text-xs
                text-slate-400
                dark:text-slate-500
              "
            >
              Add expenses to see your
              category distribution.
            </p>
          </div>
        ) : (
          <div
            className="
              mt-6
              grid gap-3
              sm:grid-cols-2
              lg:grid-cols-3
            "
          >
            {categoryData.map(
              (category) => {
                const percentage =
                  getPercentage(
                    category.amount,
                    summary.expense
                  );

                return (
                  <div
                    key={category.name}
                    className="
                      rounded-2xl
                      border
                      border-slate-100
                      bg-slate-50/70
                      p-4
                      transition-all
                      duration-200
                      hover:-translate-y-0.5
                      hover:border-slate-200
                      hover:bg-slate-50
                      dark:border-slate-800
                      dark:bg-slate-800/40
                      dark:hover:border-slate-700
                      dark:hover:bg-slate-800
                    "
                  >
                    <div
                      className="
                        flex
                        items-center
                        justify-between
                        gap-3
                      "
                    >
                      <div
                        className="
                          flex
                          min-w-0
                          items-center
                          gap-2.5
                        "
                      >
                        <span
                          className="
                            h-2.5 w-2.5
                            shrink-0
                            rounded-full
                          "
                          style={{
                            backgroundColor:
                              category.color,
                          }}
                        />

                        <span
                          className="
                            truncate
                            text-sm
                            font-semibold
                            text-slate-700
                            dark:text-slate-200
                          "
                        >
                          {category.name}
                        </span>
                      </div>

                      <span
                        className="
                          shrink-0
                          text-sm
                          font-bold
                          text-slate-900
                          dark:text-white
                        "
                      >
                        {formatCurrency(
                          category.amount,
                          currency
                        )}
                      </span>
                    </div>

                    <div
                      className="
                        mt-3
                        flex
                        items-center
                        gap-3
                      "
                    >
                      <div
                        className="
                          h-1.5
                          flex-1
                          overflow-hidden
                          rounded-full
                          bg-slate-200
                          dark:bg-slate-700
                        "
                      >
                        <div
                          className="
                            h-full
                            rounded-full
                            transition-all
                            duration-500
                          "
                          style={{
                            width: `${Math.min(
                              percentage,
                              100
                            )}%`,
                            backgroundColor:
                              category.color,
                          }}
                        />
                      </div>

                      <span
                        className="
                          w-10
                          text-right
                          text-[10px]
                          font-semibold
                          text-slate-400
                          dark:text-slate-500
                        "
                      >
                        {percentage.toFixed(
                          0
                        )}
                        %
                      </span>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </section>

      {/* ==================================================
          FOOTER
      ================================================== */}

      <div
        className="
          flex flex-col gap-2
          rounded-2xl
          border
          border-slate-200
          bg-slate-50
          px-5 py-4
          text-xs
          text-slate-500
          dark:border-slate-800
          dark:bg-slate-900
          dark:text-slate-400
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >
        <p>
          Showing{" "}
          <span
            className="
              font-semibold
              text-slate-700
              dark:text-slate-200
            "
          >
            {monthlyTransactions.length}
          </span>{" "}
          transaction
          {monthlyTransactions.length !==
          1
            ? "s"
            : ""}{" "}
          for{" "}
          <span
            className="
              font-semibold
              text-slate-700
              dark:text-slate-200
            "
          >
            {getMonthLabel(selectedMonth)}
          </span>
          .
        </p>

        <p
          className="
            text-[10px]
            text-slate-400
            dark:text-slate-500
          "
        >
          SpendNest Analytics
        </p>
      </div>
    </div>
  );
}

// ======================================================
// ANALYTICS SKELETON
// ======================================================

function AnalyticsSkeleton() {
  return (
    <div
      className="
        mx-auto
        max-w-7xl
        space-y-6
      "
    >
      <div
        className="
          rounded-3xl
          border
          border-slate-200
          bg-white
          p-6
          dark:border-slate-800
          dark:bg-slate-900
        "
      >
        <div className="space-y-3">
          <SkeletonBlock className="h-6 w-36" />
          <SkeletonBlock className="h-10 w-44" />
          <SkeletonBlock className="h-4 w-72 max-w-full" />
        </div>
      </div>

      <div
        className="
          grid gap-4
          sm:grid-cols-2
          xl:grid-cols-4
        "
      >
        {Array.from({
          length: 4,
        }).map((_, index) => (
          <div
            key={index}
            className="
              h-36
              animate-pulse
              rounded-2xl
              border
              border-slate-200
              bg-white
              dark:border-slate-800
              dark:bg-slate-900
            "
          />
        ))}
      </div>

      <div
        className="
          grid gap-6
          xl:grid-cols-2
        "
      >
        {Array.from({
          length: 2,
        }).map((_, index) => (
          <div
            key={index}
            className="
              h-96
              animate-pulse
              rounded-3xl
              border
              border-slate-200
              bg-white
              dark:border-slate-800
              dark:bg-slate-900
            "
          />
        ))}
      </div>

      <div
        className="
          h-96
          animate-pulse
          rounded-3xl
          bg-slate-100
          dark:bg-slate-900
        "
      />
    </div>
  );
}

function SkeletonBlock({
  className = "",
}) {
  return (
    <div
      className={`
        animate-pulse
        rounded-lg
        bg-slate-200
        dark:bg-slate-800
        ${className}
      `}
    />
  );
}

// ======================================================
// ANALYTICS CARD
// ======================================================

function AnalyticsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClass,
  valueClass,
}) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-5
        shadow-sm
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:shadow-md
        dark:border-slate-800
        dark:bg-slate-900
      "
    >
      <div
        className="
          flex
          items-start
          justify-between
          gap-4
        "
      >
        <div className="min-w-0">
          <p
            className="
              text-[10px]
              font-bold
              uppercase
              tracking-[0.12em]
              text-slate-400
              dark:text-slate-500
            "
          >
            {title}
          </p>

          <p
            className={`
              mt-2
              truncate
              text-2xl
              font-bold
              tracking-tight
              ${
                valueClass ||
                "text-slate-900 dark:text-white"
              }
            `}
          >
            {value}
          </p>

          <p
            className="
              mt-1.5
              truncate
              text-xs
              text-slate-400
              dark:text-slate-500
            "
          >
            {subtitle}
          </p>
        </div>

        <div
          className={`
            flex h-11 w-11
            shrink-0
            items-center
            justify-center
            rounded-xl
            ${iconClass}
          `}
        >
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
}

// ======================================================
// CONTEXT STAT
// ======================================================

function ContextStat({
  label,
  value,
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-indigo-100/80
        bg-white/70
        px-3 py-2.5
        dark:border-indigo-500/10
        dark:bg-slate-900/50
      "
    >
      <p
        className="
          text-[10px]
          font-semibold
          uppercase
          tracking-wide
          text-slate-400
          dark:text-slate-500
        "
      >
        {label}
      </p>

      <p
        className="
          mt-1
          truncate
          text-sm
          font-bold
          text-slate-800
          dark:text-slate-100
        "
      >
        {value}
      </p>
    </div>
  );
}

// ======================================================
// INSIGHT CARD
// ======================================================

function InsightCard({
  icon: Icon,
  title,
  value,
  description,
}) {
  return (
    <div
      className="
        flex
        items-start
        gap-3
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-4
        shadow-sm
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:shadow-md
        dark:border-slate-800
        dark:bg-slate-900
      "
    >
      <div
        className="
          flex h-10 w-10
          shrink-0
          items-center
          justify-center
          rounded-xl
          bg-slate-100
          text-slate-600
          dark:bg-slate-800
          dark:text-slate-300
        "
      >
        <Icon size={18} />
      </div>

      <div className="min-w-0">
        <p
          className="
            text-[10px]
            font-semibold
            uppercase
            tracking-wide
            text-slate-400
            dark:text-slate-500
          "
        >
          {title}
        </p>

        <p
          className="
            mt-1
            truncate
            text-sm
            font-bold
            text-slate-800
            dark:text-slate-100
          "
        >
          {value}
        </p>

        <p
          className="
            mt-0.5
            truncate
            text-xs
            text-slate-400
            dark:text-slate-500
          "
        >
          {description}
        </p>
      </div>
    </div>
  );
}

// ======================================================
// SMALL METRIC
// ======================================================

function SmallMetric({
  label,
  value,
}) {
  return (
    <div
      className="
        rounded-xl
        bg-slate-50
        px-3 py-3
        dark:bg-slate-800/60
      "
    >
      <p
        className="
          text-[10px]
          font-semibold
          uppercase
          tracking-wide
          text-slate-400
          dark:text-slate-500
        "
      >
        {label}
      </p>

      <p
        className="
          mt-1
          truncate
          text-sm
          font-bold
          text-slate-800
          dark:text-slate-100
        "
      >
        {value}
      </p>
    </div>
  );
}

// ======================================================
// LEGEND STAT
// ======================================================

function LegendStat({
  label,
  value,
  dotClass,
}) {
  return (
    <div
      className="
        rounded-xl
        bg-slate-50
        px-3 py-3
        dark:bg-slate-800/60
      "
    >
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${dotClass}`}
        />

        <span
          className="
            text-[10px]
            font-semibold
            uppercase
            tracking-wide
            text-slate-400
            dark:text-slate-500
          "
        >
          {label}
        </span>
      </div>

      <p
        className="
          mt-1
          text-xs
          font-bold
          text-slate-800
          dark:text-slate-100
        "
      >
        {value}
      </p>
    </div>
  );
}

// ======================================================
// CHART CARD
// ======================================================

function ChartCard({
  icon: Icon,
  title,
  description,
  action,
  children,
}) {
  return (
    <section
      className="
        overflow-hidden
        rounded-3xl
        border
        border-slate-200
        bg-white
        p-5
        shadow-sm
        dark:border-slate-800
        dark:bg-slate-900
        sm:p-6
      "
    >
      <div
        className="
          mb-5
          flex
          items-start
          justify-between
          gap-4
        "
      >
        <div
          className="
            flex
            min-w-0
            items-start
            gap-3
          "
        >
          <div
            className="
              flex h-10 w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-indigo-50
              text-indigo-600
              dark:bg-indigo-500/10
              dark:text-indigo-400
            "
          >
            <Icon size={17} />
          </div>

          <div className="min-w-0">
            <h2
              className="
                text-base
                font-bold
                text-slate-900
                dark:text-white
              "
            >
              {title}
            </h2>

            <p
              className="
                mt-1
                text-xs
                leading-5
                text-slate-400
                dark:text-slate-500
              "
            >
              {description}
            </p>
          </div>
        </div>

        {action}
      </div>

      {children}
    </section>
  );
}

// ======================================================
// EMPTY CHART
// ======================================================

function EmptyChart({
  icon: Icon,
  text,
}) {
  return (
    <div
      className="
        flex
        h-72
        flex-col
        items-center
        justify-center
        text-center
        sm:h-80
      "
    >
      <div
        className="
          flex h-12 w-12
          items-center
          justify-center
          rounded-2xl
          bg-slate-100
          text-slate-400
          dark:bg-slate-800
          dark:text-slate-500
        "
      >
        <Icon size={20} />
      </div>

      <p
        className="
          mt-3
          text-sm
          font-semibold
          text-slate-700
          dark:text-slate-200
        "
      >
        No data available
      </p>

      <p
        className="
          mt-1
          max-w-xs
          text-xs
          leading-5
          text-slate-400
          dark:text-slate-500
        "
      >
        {text}
      </p>
    </div>
  );
}

export default Analytics;
