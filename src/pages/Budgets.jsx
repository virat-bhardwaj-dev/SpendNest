import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  
  Film,
  GraduationCap,
  HeartPulse,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plane,
  Plus,
  Receipt,
  RefreshCw,
  ShoppingBag,
  Trash2,
  Utensils,
  Wallet,
  WalletCards,
  X,
} from "lucide-react";

import {
  addBudget,
  deleteBudget,
  getBudgets,
  updateBudget,
} from "../services/budgetService";

import { getTransactions } from "../services/transactionService";

// ======================================================
// CONSTANTS
// ======================================================

const CURRENCY_STORAGE_KEY = "spendnest_currency";

const CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Entertainment",
  "Bills",
  "Health",
  "Education",
  "Travel",
  "Other",
];

const CATEGORY_ICONS = {
  Food: Utensils,
  Transport: Car,
  Shopping: ShoppingBag,
  Entertainment: Film,
  Bills: Receipt,
  Health: HeartPulse,
  Education: GraduationCap,
  Travel: Plane,
  Other: MoreHorizontal,
};

const DEFAULT_FORM = {
  category: "Food",
  amount: "",
};

// ======================================================
// HELPERS
// ======================================================

function getCurrentMonth() {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function shiftMonth(month, amount) {
  const [year, monthNumber] = month.split("-");

  const date = new Date(
    Number(year),
    Number(monthNumber) - 1 + amount,
    1
  );

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function getMonthLabel(month) {
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

function formatCurrency(
  amount,
  currency = "INR"
) {
  const value = Number(amount) || 0;

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `₹${value.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
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
        .find(
          (part) => part.type === "currency"
        )?.value || "₹"
    );
  } catch {
    return "₹";
  }
}

function getProgressState(budget) {
  if (budget.exceeded) {
    return "exceeded";
  }

  if (budget.atLimit) {
    return "limit";
  }

  if (budget.warning) {
    return "warning";
  }

  return "healthy";
}

function createFreshForm() {
  return {
    ...DEFAULT_FORM,
  };
}

// ======================================================
// COMPONENT
// ======================================================

function Budgets() {
  // ====================================================
  // STATE
  // ====================================================

  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [selectedMonth, setSelectedMonth] =
    useState(getCurrentMonth);

  const [currency, setCurrency] =
    useState(getStoredCurrency);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] =
    useState(null);

  const [error, setError] = useState("");
  const [modalError, setModalError] =
    useState("");

  const [showModal, setShowModal] =
    useState(false);

  const [editingId, setEditingId] =
    useState(null);

  const [budgetToDelete, setBudgetToDelete] =
    useState(null);

  const [form, setForm] =
    useState(createFreshForm);

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
  // BODY SCROLL LOCK
  // ====================================================

  useEffect(() => {
    const shouldLock =
      showModal || Boolean(budgetToDelete);

    if (!shouldLock) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [showModal, budgetToDelete]);

  // ====================================================
  // LOAD DATA
  // ====================================================

  useEffect(() => {
    let active = true;

    async function loadMonthData() {
      try {
        const [
          budgetData,
          transactionData,
        ] = await Promise.all([
          getBudgets(selectedMonth),
          getTransactions(),
        ]);

        if (!active) {
          return;
        }

        setBudgets(budgetData || []);
        setTransactions(
          transactionData || []
        );
        setError("");
      } catch (err) {
        console.error(
          "Budget loading error:",
          err
        );

        if (active) {
          setError(
            err?.message ||
              "Unable to load budget data."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadMonthData();

    return () => {
      active = false;
    };
  }, [selectedMonth]);

  // ====================================================
  // REFRESH
  // ====================================================

  async function handleRefresh() {
    try {
      setRefreshing(true);
      setError("");

      const [
        budgetData,
        transactionData,
      ] = await Promise.all([
        getBudgets(selectedMonth),
        getTransactions(),
      ]);

      setBudgets(budgetData || []);
      setTransactions(
        transactionData || []
      );
    } catch (err) {
      console.error(
        "Budget refresh error:",
        err
      );

      setError(
        err?.message ||
          "Unable to refresh budget data."
      );
    } finally {
      setRefreshing(false);
    }
  }

  // ====================================================
  // MONTH NAVIGATION
  // ====================================================

  const isCurrentMonth =
    selectedMonth === getCurrentMonth();

  function goToPreviousMonth() {
    setSelectedMonth((previous) =>
      shiftMonth(previous, -1)
    );
  }

  function goToNextMonth() {
    setSelectedMonth((previous) =>
      shiftMonth(previous, 1)
    );
  }

  function goToCurrentMonth() {
    setSelectedMonth(getCurrentMonth());
  }

  // ====================================================
  // FORM
  // ====================================================

const resetForm = useCallback(() => {
  setForm(createFreshForm());
  setEditingId(null);
  setModalError("");
}, []);

  function openAddModal() {
    resetForm();
    setError("");
    setShowModal(true);
  }

  function openEditModal(budget) {
    setEditingId(budget.id);

    setForm({
      category: budget.category || "Food",
      amount: String(budget.amount ?? ""),
    });

    setModalError("");
    setError("");
    setShowModal(true);
  }

const closeModal = useCallback(() => {
  if (saving) {
    return;
  }

  setShowModal(false);
  resetForm();
}, [saving, resetForm]);

  function handleChange(event) {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (modalError) {
      setModalError("");
    }
  }

  // ====================================================
  // DUPLICATE CATEGORY
  // ====================================================

  const categoryAlreadyExists = useMemo(() => {
    return budgets.some(
      (budget) =>
        budget.category === form.category &&
        budget.id !== editingId
    );
  }, [
    budgets,
    form.category,
    editingId,
  ]);

  // ====================================================
  // SAVE
  // ====================================================

  async function handleSubmit(event) {
    event.preventDefault();

    const amount = Number(form.amount);

    if (!form.category) {
      setModalError(
        "Please select a category."
      );
      return;
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setModalError(
        "Please enter a valid budget amount."
      );
      return;
    }

    if (categoryAlreadyExists) {
      setModalError(
        `${form.category} already has a budget for this month.`
      );
      return;
    }

    try {
      setSaving(true);
      setModalError("");
      setError("");

      const budgetData = {
        category: form.category,
        amount,
        month: selectedMonth,
      };

      if (editingId) {
        const updatedBudget =
          await updateBudget(
            editingId,
            budgetData
          );

        setBudgets((previous) =>
          previous.map((budget) =>
            budget.id === editingId
              ? {
                  ...budget,
                  ...updatedBudget,
                  ...budgetData,
                }
              : budget
          )
        );
      } else {
        const newBudget =
          await addBudget(budgetData);

        setBudgets((previous) => [
          ...previous,
          newBudget,
        ]);
      }

      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error(
        "Budget save error:",
        err
      );

      setModalError(
        err?.message ||
          "Unable to save budget. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  // ====================================================
  // DELETE
  // ====================================================

  function requestDelete(budget) {
    setBudgetToDelete(budget);
  }

 const cancelDelete = useCallback(() => {
  if (deletingId) {
    return;
  }

  setBudgetToDelete(null);
}, [deletingId]);

  async function handleDeleteConfirmed() {
    if (!budgetToDelete) {
      return;
    }

    const id = budgetToDelete.id;

    try {
      setDeletingId(id);
      setError("");

      await deleteBudget(id);

      setBudgets((previous) =>
        previous.filter(
          (budget) => budget.id !== id
        )
      );

      setBudgetToDelete(null);
    } catch (err) {
      console.error(
        "Budget delete error:",
        err
      );

      setError(
        err?.message ||
          "Unable to delete budget. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  }

  // ====================================================
  // KEYBOARD SUPPORT
  // ====================================================
useEffect(() => {
  if (
    !showModal &&
    !budgetToDelete
  ) {
    return undefined;
  }

  function handleKeyDown(event) {
    if (event.key !== "Escape") {
      return;
    }

    if (budgetToDelete) {
      cancelDelete();
      return;
    }

    closeModal();
  }

  document.addEventListener(
    "keydown",
    handleKeyDown
  );

  return () => {
    document.removeEventListener(
      "keydown",
      handleKeyDown
    );
  };
}, [
  showModal,
  budgetToDelete,
  cancelDelete,
  closeModal,
]);

  // ====================================================
  // BUDGET CALCULATIONS
  // ====================================================

  const budgetData = useMemo(() => {
    return budgets
      .map((budget) => {
        const spent = transactions
          .filter(
            (transaction) =>
              transaction.type ===
                "expense" &&
              transaction.category ===
                budget.category &&
              transaction.date?.startsWith(
                selectedMonth
              )
          )
          .reduce(
            (total, transaction) =>
              total +
              Number(
                transaction.amount || 0
              ),
            0
          );

        const amount = Number(
          budget.amount || 0
        );

        const remaining =
          amount - spent;

        const rawPercentage =
          amount > 0
            ? (spent / amount) * 100
            : 0;

        const percentage = Math.min(
          Math.max(rawPercentage, 0),
          100
        );

        const exceeded =
          spent > amount;

        const atLimit =
          amount > 0 &&
          spent === amount;

        const warning =
          rawPercentage >= 80 &&
          rawPercentage < 100;

        return {
          ...budget,
          amount,
          spent,
          remaining,
          percentage,
          rawPercentage,
          exceeded,
          atLimit,
          warning,
        };
      })
      .sort((a, b) => {
        if (a.exceeded !== b.exceeded) {
          return a.exceeded ? -1 : 1;
        }

        if (a.warning !== b.warning) {
          return a.warning ? -1 : 1;
        }

        return b.spent - a.spent;
      });
  }, [
    budgets,
    transactions,
    selectedMonth,
  ]);

  // ====================================================
  // SUMMARY
  // ====================================================

  const summary = useMemo(() => {
    const totalBudget =
      budgetData.reduce(
        (total, budget) =>
          total + budget.amount,
        0
      );

    const totalSpent =
      budgetData.reduce(
        (total, budget) =>
          total + budget.spent,
        0
      );

    const remaining =
      totalBudget - totalSpent;

    const utilization =
      totalBudget > 0
        ? (totalSpent / totalBudget) * 100
        : 0;

    const exceededCount =
      budgetData.filter(
        (budget) => budget.exceeded
      ).length;

    const warningCount =
      budgetData.filter(
        (budget) => budget.warning
      ).length;

    const atLimitCount =
      budgetData.filter(
        (budget) => budget.atLimit
      ).length;

    return {
      totalBudget,
      totalSpent,
      remaining,
      utilization,
      exceededCount,
      warningCount,
      atLimitCount,
    };
  }, [budgetData]);

  // ====================================================
  // UNBUDGETED SPENDING
  // ====================================================

  const unbudgetedSpending = useMemo(() => {
    const budgetedCategories =
      new Set(
        budgets.map(
          (budget) => budget.category
        )
      );

    const grouped = {};

    transactions
      .filter(
        (transaction) =>
          transaction.type === "expense" &&
          transaction.date?.startsWith(
            selectedMonth
          ) &&
          !budgetedCategories.has(
            transaction.category
          )
      )
      .forEach((transaction) => {
        const category =
          transaction.category || "Other";

        grouped[category] =
          (grouped[category] || 0) +
          Number(transaction.amount || 0);
      });

    return Object.entries(grouped)
      .map(([category, amount]) => ({
        category,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [
    budgets,
    transactions,
    selectedMonth,
  ]);

  const totalUnbudgetedSpending =
    useMemo(
      () =>
        unbudgetedSpending.reduce(
          (total, item) =>
            total + item.amount,
          0
        ),
      [unbudgetedSpending]
    );

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-6">
      {/* ==================================================
          HEADER
      ================================================== */}

      <section
        className="
          flex flex-col gap-5
          rounded-3xl
          border border-slate-200
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
              border border-indigo-100
              bg-indigo-50
              px-3 py-1.5
              text-xs font-semibold
              text-indigo-600
              dark:border-indigo-500/20
              dark:bg-indigo-500/10
              dark:text-indigo-400
            "
          >
            <WalletCards size={13} />
            Spending control
          </div>

          <h1
            className="
              mt-3
              text-2xl font-bold
              tracking-tight
              text-slate-900
              dark:text-white
              sm:text-3xl
            "
          >
            Budgets
          </h1>

          <p
            className="
              mt-1.5
              max-w-2xl
              text-sm leading-6
              text-slate-500
              dark:text-slate-400
            "
          >
            Set category limits, monitor your
            spending and stay ahead of your
            monthly expenses.
          </p>
        </div>

        <div className="flex w-full gap-2 sm:w-auto">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="
              inline-flex h-11
              flex-1
              items-center justify-center
              gap-2
              rounded-xl
              border border-slate-200
              bg-slate-50
              px-4
              text-sm font-semibold
              text-slate-600
              transition-all
              duration-200
              hover:border-slate-300
              hover:bg-white
              active:scale-[0.98]
              disabled:cursor-not-allowed
              disabled:opacity-60
              dark:border-slate-700
              dark:bg-slate-800
              dark:text-slate-300
              dark:hover:border-slate-600
              dark:hover:bg-slate-700
              sm:flex-none
            "
          >
            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            <span className="hidden sm:inline">
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="
              inline-flex h-11
              flex-1
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-indigo-600
              px-4
              text-sm font-semibold
              text-white
              shadow-lg
              shadow-indigo-500/20
              transition-all
              duration-200
              hover:-translate-y-0.5
              hover:bg-indigo-700
              hover:shadow-xl
              active:translate-y-0
              active:scale-[0.98]
              dark:bg-indigo-500
              dark:hover:bg-indigo-400
              sm:flex-none
            "
          >
            <Plus size={17} />
            Add budget
          </button>
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
            border border-rose-200
            bg-rose-50
            px-4 py-3.5
            sm:flex-row
            sm:items-center
            sm:justify-between
            dark:border-rose-900/40
            dark:bg-rose-950/20
          "
        >
          <div className="flex items-start gap-3">
            <div
              className="
                mt-0.5
                flex h-9 w-9
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
              <CircleAlert size={16} />
            </div>

            <div>
              <p
                className="
                  text-sm font-semibold
                  text-rose-700
                  dark:text-rose-400
                "
              >
                Something went wrong
              </p>

              <p
                className="
                  mt-0.5
                  text-xs leading-5
                  text-rose-600/80
                  dark:text-rose-400/70
                "
              >
                {error}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="
              self-start
              rounded-lg
              px-3 py-2
              text-xs font-semibold
              text-rose-700
              transition
              hover:bg-rose-100
              disabled:opacity-50
              dark:text-rose-400
              dark:hover:bg-rose-500/10
              sm:self-auto
            "
          >
            Retry
          </button>
        </div>
      )}

      {/* ==================================================
          MONTH SELECTOR
      ================================================== */}

      <section
        className="
          overflow-hidden
          rounded-3xl
          border border-indigo-100
          bg-linear-to-r
          from-indigo-50
          via-white
          to-white
          p-4
          dark:border-indigo-500/20
          dark:from-indigo-500/10
          dark:via-slate-900
          dark:to-slate-900
          sm:p-5
        "
      >
        <div
          className="
            flex flex-col gap-4
            sm:flex-row
            sm:items-center
            sm:justify-between
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
                bg-indigo-100
                text-indigo-600
                dark:bg-indigo-500/15
                dark:text-indigo-400
              "
            >
              <Wallet size={19} />
            </div>

            <div className="min-w-0">
              <p
                className="
                  text-[10px]
                  font-bold uppercase
                  tracking-[0.12em]
                  text-indigo-500
                  dark:text-indigo-400
                "
              >
                Budget period
              </p>

              <p
                className="
                  mt-0.5
                  truncate
                  text-sm font-bold
                  text-slate-900
                  dark:text-white
                "
              >
                {getMonthLabel(selectedMonth)}
              </p>
            </div>
          </div>

          <div
            className="
              flex
              items-center
              justify-between
              gap-2
              sm:justify-end
            "
          >
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="
                flex h-10 w-10
                items-center
                justify-center
                rounded-xl
                border
                border-slate-200
                bg-white
                text-slate-500
                transition-all
                hover:border-slate-300
                hover:bg-slate-50
                hover:text-slate-800
                active:scale-95
                dark:border-slate-700
                dark:bg-slate-900
                dark:text-slate-400
                dark:hover:border-slate-600
                dark:hover:bg-slate-800
                dark:hover:text-slate-200
              "
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>

            <div
              className="
                min-w-32
                rounded-xl
                border
                border-slate-200
                bg-white
                px-4 py-2.5
                text-center
                text-xs
                font-bold
                text-slate-700
                shadow-sm
                dark:border-slate-700
                dark:bg-slate-900
                dark:text-slate-200
              "
            >
              {getMonthLabel(selectedMonth)}
            </div>

            <button
              type="button"
              onClick={goToNextMonth}
              className="
                flex h-10 w-10
                items-center
                justify-center
                rounded-xl
                border
                border-slate-200
                bg-white
                text-slate-500
                transition-all
                hover:border-slate-300
                hover:bg-slate-50
                hover:text-slate-800
                active:scale-95
                dark:border-slate-700
                dark:bg-slate-900
                dark:text-slate-400
                dark:hover:border-slate-600
                dark:hover:bg-slate-800
                dark:hover:text-slate-200
              "
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>

            {!isCurrentMonth && (
              <button
                type="button"
                onClick={
                  goToCurrentMonth
                }
                className="
                  rounded-xl
                  px-3 py-2.5
                  text-xs
                  font-bold
                  text-indigo-600
                  transition
                  hover:bg-indigo-100
                  dark:text-indigo-400
                  dark:hover:bg-indigo-500/10
                "
              >
                Current
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ==================================================
          SUMMARY CARDS
      ================================================== */}

      <section
        className="
          grid gap-4
          sm:grid-cols-2
          xl:grid-cols-4
        "
      >
        <SummaryCard
          title="Total budget"
          value={formatCurrency(
            summary.totalBudget,
            currency
          )}
          subtitle={`${budgetData.length} budget${
            budgetData.length === 1
              ? ""
              : "s"
          } set`}
          icon={Wallet}
          iconClass="
            bg-indigo-50
            text-indigo-600
            dark:bg-indigo-500/10
            dark:text-indigo-400
          "
        />

        <SummaryCard
          title="Total spent"
          value={formatCurrency(
            summary.totalSpent,
            currency
          )}
          subtitle={`${summary.utilization.toFixed(
            0
          )}% of budget used`}
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

        <SummaryCard
          title="Remaining"
          value={formatCurrency(
            summary.remaining,
            currency
          )}
          subtitle={
            summary.remaining > 0
              ? "Available to spend"
              : summary.remaining === 0
              ? "Budget fully used"
              : "Budget exceeded"
          }
          icon={
            summary.remaining >= 0
              ? ArrowUpRight
              : AlertTriangle
          }
          iconClass={
            summary.remaining > 0
              ? `
                bg-emerald-50
                text-emerald-600
                dark:bg-emerald-500/10
                dark:text-emerald-400
              `
              : summary.remaining === 0
              ? `
                bg-amber-50
                text-amber-600
                dark:bg-amber-500/10
                dark:text-amber-400
              `
              : `
                bg-rose-50
                text-rose-600
                dark:bg-rose-500/10
                dark:text-rose-400
              `
          }
          valueClass={
            summary.remaining > 0
              ? `
                text-emerald-600
                dark:text-emerald-400
              `
              : summary.remaining === 0
              ? `
                text-amber-600
                dark:text-amber-400
              `
              : `
                text-rose-600
                dark:text-rose-400
              `
          }
        />

        <SummaryCard
          title="Budget health"
          value={
            summary.exceededCount > 0
              ? `${summary.exceededCount} over`
              : summary.atLimitCount > 0
              ? `${summary.atLimitCount} at limit`
              : summary.warningCount > 0
              ? `${summary.warningCount} warning`
              : "On track"
          }
          subtitle={
            summary.exceededCount > 0
              ? "Needs attention"
              : summary.atLimitCount > 0
              ? "One or more limits reached"
              : summary.warningCount > 0
              ? "Approaching limits"
              : "Everything looks good"
          }
          icon={
            summary.exceededCount > 0
              ? AlertTriangle
              : summary.atLimitCount > 0
              ? AlertTriangle
              : summary.warningCount > 0
              ? AlertTriangle
              : CheckCircle2
          }
          iconClass={
            summary.exceededCount > 0
              ? `
                bg-rose-50
                text-rose-600
                dark:bg-rose-500/10
                dark:text-rose-400
              `
              : summary.atLimitCount > 0
              ? `
                bg-amber-50
                text-amber-600
                dark:bg-amber-500/10
                dark:text-amber-400
              `
              : summary.warningCount > 0
              ? `
                bg-amber-50
                text-amber-600
                dark:bg-amber-500/10
                dark:text-amber-400
              `
              : `
                bg-emerald-50
                text-emerald-600
                dark:bg-emerald-500/10
                dark:text-emerald-400
              `
          }
        />
      </section>

      {/* ==================================================
          OVERALL PROGRESS
      ================================================== */}

      {budgetData.length > 0 && (
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
              flex
              items-start
              justify-between
              gap-4
            "
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div
                  className="
                    flex h-8 w-8
                    items-center justify-center
                    rounded-lg
                    bg-indigo-50
                    text-indigo-600
                    dark:bg-indigo-500/10
                    dark:text-indigo-400
                  "
                >
                  <WalletCards size={15} />
                </div>

                <p
                  className="
                    text-sm
                    font-bold
                    text-slate-900
                    dark:text-white
                  "
                >
                  Overall budget progress
                </p>
              </div>

              <p
                className="
                  mt-2
                  text-xs leading-5
                  text-slate-400
                  dark:text-slate-500
                "
              >
                Total spending compared with
                your combined limits for{" "}
                {getMonthLabel(selectedMonth)}.
              </p>
            </div>

            <span
              className={`
                shrink-0
                rounded-full
                px-2.5 py-1.5
                text-xs font-bold
                ${
                  summary.utilization > 100
                    ? `
                      bg-rose-50
                      text-rose-600
                      dark:bg-rose-500/10
                      dark:text-rose-400
                    `
                    : summary.utilization >= 80
                    ? `
                      bg-amber-50
                      text-amber-600
                      dark:bg-amber-500/10
                      dark:text-amber-400
                    `
                    : `
                      bg-indigo-50
                      text-indigo-600
                      dark:bg-indigo-500/10
                      dark:text-indigo-400
                    `
                }
              `}
            >
              {summary.utilization.toFixed(0)}%
            </span>
          </div>

          <div
            className="
              mt-5
              h-3
              overflow-hidden
              rounded-full
              bg-slate-100
              dark:bg-slate-800
            "
          >
            <div
              className={`
                h-full
                rounded-full
                transition-all
                duration-500
                ${
                  summary.utilization > 100
                    ? "bg-rose-500"
                    : summary.utilization >= 80
                    ? "bg-amber-500"
                    : "bg-indigo-500"
                }
              `}
              style={{
                width: `${Math.min(
                  summary.utilization,
                  100
                )}%`,
              }}
            />
          </div>

          <div
            className="
              mt-3
              flex
              items-center
              justify-between
              gap-4
              text-[11px]
              text-slate-400
              dark:text-slate-500
            "
          >
            <span>
              {formatCurrency(
                summary.totalSpent,
                currency
              )}{" "}
              spent
            </span>

            <span>
              {formatCurrency(
                summary.totalBudget,
                currency
              )}{" "}
              budget
            </span>
          </div>
        </section>
      )}

      {/* ==================================================
          BUDGET LIST
      ================================================== */}

      <section>
        <div
          className="
            mb-4
            flex
            items-end
            justify-between
            gap-4
          "
        >
          <div>
            <div className="flex items-center gap-2">
              <h2
                className="
                  text-lg font-bold
                  text-slate-900
                  dark:text-white
                "
              >
                Your budgets
              </h2>

              {budgetData.length > 0 && (
                <span
                  className="
                    rounded-full
                    bg-slate-100
                    px-2
                    py-0.5
                    text-[10px]
                    font-bold
                    text-slate-500
                    dark:bg-slate-800
                    dark:text-slate-400
                  "
                >
                  {budgetData.length}
                </span>
              )}
            </div>

            <p
              className="
                mt-1
                text-xs
                text-slate-400
                dark:text-slate-500
              "
            >
              Track each category against its
              monthly spending limit.
            </p>
          </div>
        </div>

        {/* Loading */}

        {loading ? (
          <div
            className="
              grid gap-4
              lg:grid-cols-2
            "
          >
            {Array.from({
              length: 4,
            }).map((_, index) => (
              <BudgetSkeleton
                key={index}
              />
            ))}
          </div>
        ) : budgetData.length === 0 ? (
          <EmptyState
            onAdd={openAddModal}
            month={getMonthLabel(
              selectedMonth
            )}
          />
        ) : (
          <div
            className="
              grid gap-4
              lg:grid-cols-2
            "
          >
            {budgetData.map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                currency={currency}
                deleting={
                  deletingId === budget.id
                }
                onEdit={openEditModal}
                onDelete={requestDelete}
              />
            ))}
          </div>
        )}
      </section>

      {/* ==================================================
          UNBUDGETED SPENDING
      ================================================== */}

      {!loading &&
        unbudgetedSpending.length > 0 && (
          <section
            className="
              overflow-hidden
              rounded-3xl
              border
              border-amber-200
              bg-amber-50
              dark:border-amber-900/40
              dark:bg-amber-950/15
            "
          >
            <div className="p-5 sm:p-6">
              <div
                className="
                  flex flex-col gap-5
                  sm:flex-row
                  sm:items-start
                  sm:justify-between
                "
              >
                <div className="flex items-start gap-3">
                  <div
                    className="
                      flex h-10 w-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-amber-100
                      text-amber-600
                      dark:bg-amber-500/10
                      dark:text-amber-400
                    "
                  >
                    <AlertTriangle size={18} />
                  </div>

                  <div>
                    <p
                      className="
                        text-sm
                        font-bold
                        text-amber-800
                        dark:text-amber-300
                      "
                    >
                      Unbudgeted spending
                    </p>

                    <p
                      className="
                        mt-1
                        max-w-xl
                        text-xs
                        leading-5
                        text-amber-700/80
                        dark:text-amber-400/70
                      "
                    >
                      You have expenses in
                      categories without a
                      budget for{" "}
                      {getMonthLabel(
                        selectedMonth
                      )}
                      .
                    </p>
                  </div>
                </div>

                <div
                  className="
                    rounded-xl
                    border
                    border-amber-200
                    bg-white/70
                    px-3.5 py-2.5
                    dark:border-amber-900/40
                    dark:bg-amber-950/20
                  "
                >
                  <p
                    className="
                      text-[10px]
                      font-bold uppercase
                      tracking-wide
                      text-amber-600/70
                      dark:text-amber-400/60
                    "
                  >
                    Total
                  </p>

                  <p
                    className="
                      mt-0.5
                      text-sm font-bold
                      text-amber-800
                      dark:text-amber-300
                    "
                  >
                    {formatCurrency(
                      totalUnbudgetedSpending,
                      currency
                    )}
                  </p>
                </div>
              </div>

              <div
                className="
                  mt-5
                  grid gap-2
                  sm:grid-cols-2
                  lg:grid-cols-3
                "
              >
                {unbudgetedSpending.map(
                  (item) => {
                    const Icon =
                      CATEGORY_ICONS[
                        item.category
                      ] ||
                      MoreHorizontal;

                    return (
                      <div
                        key={item.category}
                        className="
                          flex
                          items-center
                          justify-between
                          gap-3
                          rounded-xl
                          border
                          border-amber-200/70
                          bg-white/60
                          px-3 py-2.5
                          dark:border-amber-900/30
                          dark:bg-amber-950/10
                        "
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="
                              flex h-8 w-8
                              items-center
                              justify-center
                              rounded-lg
                              bg-amber-100
                              text-amber-600
                              dark:bg-amber-500/10
                              dark:text-amber-400
                            "
                          >
                            <Icon size={14} />
                          </div>

                          <span
                            className="
                              text-xs
                              font-semibold
                              text-amber-800
                              dark:text-amber-300
                            "
                          >
                            {item.category}
                          </span>
                        </div>

                        <span
                          className="
                            text-xs
                            font-bold
                            text-amber-700
                            dark:text-amber-400
                          "
                        >
                          {formatCurrency(
                            item.amount,
                            currency
                          )}
                        </span>
                      </div>
                    );
                  }
                )}
              </div>

              <button
                type="button"
                onClick={openAddModal}
                className="
                  mt-4
                  text-xs
                  font-bold
                  text-amber-700
                  transition
                  hover:text-amber-900
                  hover:underline
                  dark:text-amber-400
                  dark:hover:text-amber-300
                "
              >
                Create a budget →
              </button>
            </div>
          </section>
        )}

      {/* ==================================================
          ADD / EDIT MODAL
      ================================================== */}

      {showModal && (
        <div
          className="
            fixed inset-0 z-50
            flex items-center
            justify-center
            bg-slate-950/55
            p-4
            backdrop-blur-md
            dark:bg-black/70
          "
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !saving
            ) {
              closeModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="budget-modal-title"
            className="
              flex
              max-h-[92vh]
              w-full
              max-w-md
              flex-col
              overflow-hidden
              rounded-3xl
              border
              border-slate-200
              bg-white
              shadow-2xl
              shadow-slate-950/20
              dark:border-slate-700
              dark:bg-slate-900
              dark:shadow-black/50
            "
          >
            {/* Header */}

            <div
              className="
                border-b
                border-slate-100
                px-5 py-4
                dark:border-slate-800
                sm:px-6 sm:py-5
              "
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
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
                    {editingId ? (
                      <Pencil size={17} />
                    ) : (
                      <Plus size={18} />
                    )}
                  </div>

                  <div>
                    <h2
                      id="budget-modal-title"
                      className="
                        text-base font-bold
                        text-slate-900
                        dark:text-white
                      "
                    >
                      {editingId
                        ? "Edit budget"
                        : "Add budget"}
                    </h2>

                    <p
                      className="
                        mt-0.5
                        text-xs
                        text-slate-400
                        dark:text-slate-500
                      "
                    >
                      Set a spending limit for{" "}
                      {getMonthLabel(
                        selectedMonth
                      )}
                      .
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="
                    flex h-9 w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    text-slate-400
                    transition
                    hover:bg-slate-100
                    hover:text-slate-700
                    disabled:opacity-40
                    dark:hover:bg-slate-800
                    dark:hover:text-slate-200
                  "
                  aria-label="Close budget form"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}

            <form
              onSubmit={handleSubmit}
              className="overflow-y-auto"
            >
              <div className="space-y-5 p-5 sm:p-6">
                {/* Category */}

                <div>
                  <label
                    htmlFor="budget-category"
                    className="
                      mb-2 block
                      text-xs
                      font-semibold
                      uppercase
                      tracking-wide
                      text-slate-500
                      dark:text-slate-400
                    "
                  >
                    Category
                  </label>

                  <div className="relative">
                    <select
                      id="budget-category"
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      disabled={saving}
                      className="
                        h-12
                        w-full
                        appearance-none
                        rounded-xl
                        border
                        border-slate-200
                        bg-slate-50
                        px-4 pr-10
                        text-sm
                        font-medium
                        text-slate-800
                        outline-none
                        transition-all
                        hover:border-slate-300
                        focus:border-indigo-400
                        focus:bg-white
                        focus:ring-4
                        focus:ring-indigo-500/10
                        disabled:opacity-60
                        dark:border-slate-700
                        dark:bg-slate-800
                        dark:text-slate-100
                        dark:hover:border-slate-600
                        dark:focus:border-indigo-500
                        dark:focus:bg-slate-900
                      "
                    >
                      {CATEGORIES.map(
                        (category) => (
                          <option
                            key={category}
                            value={category}
                          >
                            {category}
                          </option>
                        )
                      )}
                    </select>

                    <ChevronRight
                      size={16}
                      className="
                        pointer-events-none
                        absolute
                        right-3.5 top-1/2
                        -translate-y-1/2
                        rotate-90
                        text-slate-400
                      "
                    />
                  </div>
                </div>

                {/* Amount */}

                <div>
                  <label
                    htmlFor="budget-amount"
                    className="
                      mb-2 block
                      text-xs
                      font-semibold
                      uppercase
                      tracking-wide
                      text-slate-500
                      dark:text-slate-400
                    "
                  >
                    Monthly limit
                  </label>

                  <div className="relative">
                    <span
                      className="
                        pointer-events-none
                        absolute left-4
                        top-1/2
                        -translate-y-1/2
                        text-base
                        font-bold
                        text-slate-400
                        dark:text-slate-500
                      "
                    >
                      {getCurrencySymbol(
                        currency
                      )}
                    </span>

                    <input
                      id="budget-amount"
                      required
                      autoFocus
                      type="number"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      name="amount"
                      value={form.amount}
                      onChange={handleChange}
                      disabled={saving}
                      placeholder="5000"
                      className="
                        h-14
                        w-full
                        rounded-2xl
                        border
                        border-slate-200
                        bg-slate-50
                        pl-10 pr-4
                        text-xl
                        font-bold
                        tracking-tight
                        text-slate-900
                        outline-none
                        transition-all
                        placeholder:text-slate-300
                        hover:border-slate-300
                        focus:border-indigo-400
                        focus:bg-white
                        focus:ring-4
                        focus:ring-indigo-500/10
                        disabled:opacity-60
                        dark:border-slate-700
                        dark:bg-slate-800
                        dark:text-white
                        dark:placeholder:text-slate-600
                        dark:hover:border-slate-600
                        dark:focus:border-indigo-500
                        dark:focus:bg-slate-900
                      "
                    />
                  </div>

                  <p
                    className="
                      mt-2
                      text-[10px]
                      text-slate-400
                      dark:text-slate-500
                    "
                  >
                    Maximum amount you want to
                    spend in this category this
                    month.
                  </p>
                </div>

                {/* Preview */}

                <div
                  className="
                    rounded-2xl
                    border
                    border-indigo-100
                    bg-indigo-50/70
                    p-4
                    dark:border-indigo-500/20
                    dark:bg-indigo-500/5
                  "
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="
                        flex h-9 w-9
                        items-center
                        justify-center
                        rounded-xl
                        bg-white
                        text-indigo-600
                        shadow-sm
                        dark:bg-slate-800
                        dark:text-indigo-400
                      "
                    >
                      {(() => {
                        const Icon =
                          CATEGORY_ICONS[
                            form.category
                          ] ||
                          MoreHorizontal;

                        return (
                          <Icon size={16} />
                        );
                      })()}
                    </div>

                    <div>
                      <p
                        className="
                          text-xs
                          font-bold
                          text-slate-800
                          dark:text-slate-100
                        "
                      >
                        {form.category} budget
                      </p>

                      <p
                        className="
                          mt-0.5
                          text-[10px]
                          text-slate-400
                          dark:text-slate-500
                        "
                      >
                        {getMonthLabel(
                          selectedMonth
                        )}
                      </p>
                    </div>
                  </div>

                  {form.amount && (
                    <p
                      className="
                        mt-3
                        text-lg
                        font-bold
                        text-indigo-600
                        dark:text-indigo-400
                      "
                    >
                      {formatCurrency(
                        form.amount,
                        currency
                      )}
                    </p>
                  )}
                </div>

                {/* Duplicate */}

                {categoryAlreadyExists && (
                  <div
                    className="
                      flex items-start gap-2.5
                      rounded-xl
                      border
                      border-amber-200
                      bg-amber-50
                      px-3.5 py-3
                      text-xs
                      text-amber-700
                      dark:border-amber-900/40
                      dark:bg-amber-950/20
                      dark:text-amber-400
                    "
                  >
                    <AlertTriangle
                      size={15}
                      className="mt-0.5 shrink-0"
                    />

                    <span>
                      A budget for{" "}
                      <strong>
                        {form.category}
                      </strong>{" "}
                      already exists for this
                      month.
                    </span>
                  </div>
                )}

                {/* Error */}

                {modalError && (
                  <div
                    className="
                      flex items-start gap-2.5
                      rounded-xl
                      border
                      border-rose-200
                      bg-rose-50
                      px-3.5 py-3
                      text-xs
                      font-medium
                      text-rose-600
                      dark:border-rose-900/40
                      dark:bg-rose-950/20
                      dark:text-rose-400
                    "
                  >
                    <CircleAlert
                      size={14}
                      className="mt-0.5 shrink-0"
                    />

                    <span>
                      {modalError}
                    </span>
                  </div>
                )}
              </div>

              {/* Footer */}

              <div
                className="
                  flex gap-3
                  border-t
                  border-slate-100
                  px-5 py-4
                  dark:border-slate-800
                  sm:px-6 sm:py-5
                "
              >
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="
                    flex-1
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-4 py-3
                    text-sm
                    font-semibold
                    text-slate-600
                    transition-all
                    hover:bg-slate-50
                    disabled:opacity-40
                    dark:border-slate-700
                    dark:bg-slate-900
                    dark:text-slate-300
                    dark:hover:bg-slate-800
                  "
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    categoryAlreadyExists
                  }
                  className="
                    flex flex-1
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-indigo-600
                    px-4 py-3
                    text-sm
                    font-semibold
                    text-white
                    shadow-sm
                    transition-all
                    hover:bg-indigo-700
                    hover:shadow-md
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                    dark:bg-indigo-500
                    dark:hover:bg-indigo-400
                  "
                >
                  {saving && (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  {saving
                    ? editingId
                      ? "Updating..."
                      : "Creating..."
                    : editingId
                    ? "Update budget"
                    : "Create budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================
          DELETE MODAL
      ================================================== */}

      {budgetToDelete && (
        <div
          className="
            fixed inset-0 z-60
            flex items-center
            justify-center
            bg-slate-950/55
            p-4
            backdrop-blur-md
            dark:bg-black/70
          "
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !deletingId
            ) {
              cancelDelete();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-budget-title"
            className="
              w-full max-w-sm
              rounded-3xl
              border
              border-slate-200
              bg-white
              p-6
              shadow-2xl
              shadow-slate-950/20
              dark:border-slate-700
              dark:bg-slate-900
              dark:shadow-black/50
            "
          >
            <div
              className="
                flex h-12 w-12
                items-center justify-center
                rounded-2xl
                bg-rose-50
                text-rose-600
                dark:bg-rose-500/10
                dark:text-rose-400
              "
            >
              <Trash2 size={21} />
            </div>

            <h2
              id="delete-budget-title"
              className="
                mt-5
                text-lg font-bold
                text-slate-900
                dark:text-white
              "
            >
              Delete budget?
            </h2>

            <p
              className="
                mt-2
                text-sm leading-6
                text-slate-500
                dark:text-slate-400
              "
            >
              This will permanently remove the{" "}
              <span
                className="
                  font-semibold
                  text-slate-700
                  dark:text-slate-200
                "
              >
                {budgetToDelete.category}
              </span>{" "}
              budget for{" "}
              {getMonthLabel(selectedMonth)}.
            </p>

            <div
              className="
                mt-4
                rounded-2xl
                border
                border-slate-100
                bg-slate-50
                p-4
                dark:border-slate-800
                dark:bg-slate-800/70
              "
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p
                    className="
                      text-[10px]
                      font-bold uppercase
                      tracking-wide
                      text-slate-400
                      dark:text-slate-500
                    "
                  >
                    Monthly limit
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs
                      text-slate-500
                      dark:text-slate-400
                    "
                  >
                    {formatCurrency(
                      budgetToDelete.amount,
                      currency
                    )}
                  </p>
                </div>

                <div className="text-right">
                  <p
                    className="
                      text-[10px]
                      font-bold uppercase
                      tracking-wide
                      text-slate-400
                      dark:text-slate-500
                    "
                  >
                    Spent
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs font-bold
                      text-rose-600
                      dark:text-rose-400
                    "
                  >
                    {formatCurrency(
                      budgetToDelete.spent || 0,
                      currency
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={cancelDelete}
                disabled={Boolean(
                  deletingId
                )}
                className="
                  flex-1
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-4 py-2.5
                  text-sm
                  font-semibold
                  text-slate-600
                  transition-all
                  hover:bg-slate-50
                  disabled:opacity-40
                  dark:border-slate-700
                  dark:bg-slate-900
                  dark:text-slate-300
                  dark:hover:bg-slate-800
                "
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleDeleteConfirmed
                }
                disabled={Boolean(
                  deletingId
                )}
                className="
                  flex flex-1
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-rose-600
                  px-4 py-2.5
                  text-sm
                  font-semibold
                  text-white
                  shadow-sm
                  transition-all
                  hover:bg-rose-700
                  hover:shadow-md
                  disabled:cursor-not-allowed
                  disabled:opacity-70
                  dark:bg-rose-500
                  dark:hover:bg-rose-400
                "
              >
                {deletingId ? (
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                ) : (
                  <Trash2 size={15} />
                )}

                {deletingId
                  ? "Deleting..."
                  : "Delete budget"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ======================================================
// SUMMARY CARD
// ======================================================

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClass,
  valueClass = `
    text-slate-900
    dark:text-white
  `,
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
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            className="
              text-[10px]
              font-bold uppercase
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
              ${valueClass}
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
// BUDGET CARD
// ======================================================

function BudgetCard({
  budget,
  currency,
  deleting,
  onEdit,
  onDelete,
}) {
  const Icon =
    CATEGORY_ICONS[budget.category] ||
    MoreHorizontal;

  const state = getProgressState(budget);

  const stateConfig = {
    exceeded: {
      label: "Over budget",
      color: `
        text-rose-600
        dark:text-rose-400
      `,
      badge: `
        bg-rose-50
        text-rose-600
        dark:bg-rose-500/10
        dark:text-rose-400
      `,
      progress: "bg-rose-500",
    },
    limit: {
      label: "Limit reached",
      color: `
        text-amber-600
        dark:text-amber-400
      `,
      badge: `
        bg-amber-50
        text-amber-600
        dark:bg-amber-500/10
        dark:text-amber-400
      `,
      progress: "bg-amber-500",
    },
    warning: {
      label: "Close to limit",
      color: `
        text-amber-600
        dark:text-amber-400
      `,
      badge: `
        bg-amber-50
        text-amber-600
        dark:bg-amber-500/10
        dark:text-amber-400
      `,
      progress: "bg-amber-500",
    },
    healthy: {
      label: "On track",
      color: `
        text-emerald-600
        dark:text-emerald-400
      `,
      badge: `
        bg-emerald-50
        text-emerald-600
        dark:bg-emerald-500/10
        dark:text-emerald-400
      `,
      progress: "bg-indigo-500",
    },
  };

  const config =
    stateConfig[state];

  return (
    <article
      className="
        group
        rounded-3xl
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
        sm:p-6
      "
    >
      {/* Header */}

      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="
              flex h-12 w-12
              shrink-0
              items-center
              justify-center
              rounded-2xl
              bg-slate-100
              text-slate-600
              dark:bg-slate-800
              dark:text-slate-300
            "
          >
            <Icon size={20} />
          </div>

          <div className="min-w-0">
            <h3
              className="
                truncate
                text-sm
                font-bold
                text-slate-900
                dark:text-white
              "
            >
              {budget.category}
            </h3>

            <p
              className="
                mt-1
                text-xs
                text-slate-400
                dark:text-slate-500
              "
            >
              {formatCurrency(
                budget.spent,
                currency
              )}{" "}
              spent of{" "}
              {formatCurrency(
                budget.amount,
                currency
              )}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() =>
              onEdit(budget)
            }
            disabled={deleting}
            className="
              flex h-9 w-9
              items-center
              justify-center
              rounded-lg
              border
              border-transparent
              text-slate-400
              transition-all
              hover:border-indigo-100
              hover:bg-indigo-50
              hover:text-indigo-600
              disabled:opacity-40
              dark:hover:border-indigo-500/20
              dark:hover:bg-indigo-500/10
              dark:hover:text-indigo-400
            "
            title="Edit budget"
            aria-label={`Edit ${budget.category} budget`}
          >
            <Pencil size={14} />
          </button>

          <button
            type="button"
            onClick={() =>
              onDelete(budget)
            }
            disabled={deleting}
            className="
              flex h-9 w-9
              items-center
              justify-center
              rounded-lg
              border
              border-transparent
              text-slate-400
              transition-all
              hover:border-rose-100
              hover:bg-rose-50
              hover:text-rose-600
              disabled:cursor-not-allowed
              disabled:opacity-40
              dark:hover:border-rose-500/20
              dark:hover:bg-rose-500/10
              dark:hover:text-rose-400
            "
            title="Delete budget"
            aria-label={`Delete ${budget.category} budget`}
          >
            {deleting ? (
              <Loader2
                size={14}
                className="animate-spin"
              />
            ) : (
              <Trash2 size={14} />
            )}
          </button>
        </div>
      </div>

      {/* Progress */}

      <div className="mt-6">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <span
            className={`
              text-xs
              font-bold
              ${config.color}
            `}
          >
            {Math.round(
              budget.rawPercentage
            )}
            % used
          </span>

          <span
            className="
              text-xs
              font-semibold
              text-slate-500
              dark:text-slate-400
            "
          >
            {budget.remaining >= 0
              ? `${formatCurrency(
                  budget.remaining,
                  currency
                )} left`
              : `${formatCurrency(
                  Math.abs(
                    budget.remaining
                  ),
                  currency
                )} over`}
          </span>
        </div>

        <div
          className="
            h-3
            overflow-hidden
            rounded-full
            bg-slate-100
            dark:bg-slate-800
          "
        >
          <div
            className={`
              h-full
              rounded-full
              transition-all
              duration-500
              ${config.progress}
            `}
            style={{
              width: `${budget.percentage}%`,
            }}
          />
        </div>
      </div>

      {/* Bottom */}

      <div
        className="
          mt-5
          flex
          flex-wrap
          items-center
          justify-between
          gap-3
        "
      >
        <span
          className={`
            inline-flex
            items-center
            gap-1.5
            rounded-full
            px-2.5 py-1.5
            text-[10px]
            font-bold
            ${config.badge}
          `}
        >
          {state === "healthy" ? (
            <CheckCircle2 size={12} />
          ) : (
            <AlertTriangle size={12} />
          )}

          {config.label}
        </span>

        <span
          className="
            text-[10px]
            font-medium
            text-slate-400
            dark:text-slate-500
          "
        >
          Limit{" "}
          {formatCurrency(
            budget.amount,
            currency
          )}
        </span>
      </div>
    </article>
  );
}

// ======================================================
// BUDGET SKELETON
// ======================================================

function BudgetSkeleton() {
  return (
    <div
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="
              h-12 w-12
              animate-pulse
              rounded-2xl
              bg-slate-200
              dark:bg-slate-800
            "
          />

          <div className="space-y-2">
            <div
              className="
                h-3.5 w-28
                animate-pulse
                rounded
                bg-slate-200
                dark:bg-slate-800
              "
            />

            <div
              className="
                h-3 w-40
                animate-pulse
                rounded
                bg-slate-100
                dark:bg-slate-800/70
              "
            />
          </div>
        </div>

        <div className="flex gap-1.5">
          <div
            className="
              h-9 w-9
              animate-pulse
              rounded-lg
              bg-slate-100
              dark:bg-slate-800
            "
          />

          <div
            className="
              h-9 w-9
              animate-pulse
              rounded-lg
              bg-slate-100
              dark:bg-slate-800
            "
          />
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex justify-between">
          <div
            className="
              h-3 w-16
              animate-pulse
              rounded
              bg-slate-100
              dark:bg-slate-800
            "
          />

          <div
            className="
              h-3 w-20
              animate-pulse
              rounded
              bg-slate-100
              dark:bg-slate-800
            "
          />
        </div>

        <div
          className="
            h-3 w-full
            animate-pulse
            rounded-full
            bg-slate-100
            dark:bg-slate-800
          "
        />
      </div>

      <div className="mt-5 flex justify-between">
        <div
          className="
            h-6 w-24
            animate-pulse
            rounded-full
            bg-slate-100
            dark:bg-slate-800
          "
        />

        <div
          className="
            h-3 w-20
            animate-pulse
            rounded
            bg-slate-100
            dark:bg-slate-800
          "
        />
      </div>
    </div>
  );
}

// ======================================================
// EMPTY STATE
// ======================================================

function EmptyState({
  onAdd,
  month,
}) {
  return (
    <div
      className="
        flex min-h-90
        flex-col
        items-center
        justify-center
        rounded-3xl
        border
        border-dashed
        border-slate-300
        bg-white
        px-6 py-14
        text-center
        dark:border-slate-700
        dark:bg-slate-900
      "
    >
      <div
        className="
          flex h-16 w-16
          items-center
          justify-center
          rounded-2xl
          border
          border-indigo-100
          bg-indigo-50
          text-indigo-600
          dark:border-indigo-500/20
          dark:bg-indigo-500/10
          dark:text-indigo-400
        "
      >
        <Wallet size={25} />
      </div>

      <h3
        className="
          mt-5
          text-base
          font-bold
          text-slate-900
          dark:text-white
        "
      >
        No budgets for {month}
      </h3>

      <p
        className="
          mt-2
          max-w-md
          text-sm
          leading-6
          text-slate-400
          dark:text-slate-500
        "
      >
        Create category-based limits to
        control your spending and make your
        monthly money plan easier to follow.
      </p>

      <button
        type="button"
        onClick={onAdd}
        className="
          mt-5
          inline-flex
          items-center
          gap-2
          rounded-xl
          bg-indigo-600
          px-4 py-2.5
          text-xs
          font-semibold
          text-white
          shadow-sm
          transition-all
          hover:-translate-y-0.5
          hover:bg-indigo-700
          hover:shadow-md
          dark:bg-indigo-500
          dark:hover:bg-indigo-400
        "
      >
        <Plus size={15} />
        Create budget
      </button>
    </div>
  );
}

export default Budgets;