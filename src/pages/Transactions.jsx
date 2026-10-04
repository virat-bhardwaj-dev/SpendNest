import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Search,
  Plus,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Utensils,
  ShoppingBag,
  Car,
  Home,
  GraduationCap,
  HeartPulse,
  Gamepad2,
  MoreHorizontal,
  Wallet,
  Loader2,
  RefreshCw,
  Trash2,
  Pencil,
  SlidersHorizontal,
  ChevronDown,
  Receipt,
  CalendarDays,
  CreditCard,
  CircleDollarSign,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  WalletCards,
  CircleAlert,
} from "lucide-react";

import {
  addTransaction,
  deleteTransaction,
  getTransactions,
  updateTransaction,
} from "../services/transactionService";

const CURRENCY_STORAGE_KEY = "spendnest_currency";

// ======================================================
// TRANSACTION OPTIONS
// ======================================================

const EXPENSE_CATEGORIES = [
  { name: "Food", icon: Utensils },
  { name: "Shopping", icon: ShoppingBag },
  { name: "Transport", icon: Car },
  { name: "Housing", icon: Home },
  { name: "Education", icon: GraduationCap },
  { name: "Health", icon: HeartPulse },
  { name: "Entertainment", icon: Gamepad2 },
  { name: "Other", icon: MoreHorizontal },
];

const INCOME_CATEGORIES = [
  { name: "Salary", icon: CircleDollarSign },
  { name: "Freelance", icon: CircleDollarSign },
  { name: "Other Income", icon: CircleDollarSign },
];

const PAYMENT_METHODS = [
  "UPI",
  "Cash",
  "Card",
  "Bank",
];

const CATEGORY_ICONS = {
  Food: Utensils,
  Shopping: ShoppingBag,
  Transport: Car,
  Housing: Home,
  Education: GraduationCap,
  Health: HeartPulse,
  Entertainment: Gamepad2,
  Other: MoreHorizontal,
  Salary: CircleDollarSign,
  Freelance: CircleDollarSign,
  "Other Income": CircleDollarSign,
};

// ======================================================
// HELPERS
// ======================================================

function getToday() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(
    2,
    "0"
  );
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createInitialForm() {
  return {
    type: "expense",
    amount: "",
    category: "Food",
    description: "",
    date: getToday(),
    paymentMethod: "UPI",
  };
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

function formatCurrency(amount, currency = "INR") {
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
        .find((part) => part.type === "currency")?.value ||
      "₹"
    );
  } catch {
    return "₹";
  }
}

function formatDate(dateString) {
  if (!dateString) return "-";

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getTransactionDateValue(transaction) {
  if (!transaction?.date) return 0;

  const date = new Date(`${transaction.date}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? 0
    : date.getTime();
}

function getCreatedAtValue(value) {
  if (!value) return 0;

  if (typeof value?.toMillis === "function") {
    return value.toMillis();
  }

  if (
    typeof value === "object" &&
    typeof value.seconds === "number"
  ) {
    return value.seconds * 1000;
  }

  const parsed = new Date(value).getTime();

  return Number.isNaN(parsed) ? 0 : parsed;
}

function getFormFromTransaction(transaction) {
  return {
    type: transaction?.type || "expense",
    amount:
      transaction?.amount !== undefined
        ? String(transaction.amount)
        : "",
    category:
      transaction?.category ||
      (transaction?.type === "income"
        ? "Salary"
        : "Food"),
    description: transaction?.description || "",
    date: transaction?.date || getToday(),
    paymentMethod:
      transaction?.paymentMethod || "UPI",
  };
}

const FIELD_CLASS = `
  w-full
  rounded-xl
  border border-slate-200
  bg-slate-50
  px-3.5 py-3
  text-sm font-medium
  text-slate-800
  outline-none
  transition-all
  duration-200
  placeholder:text-slate-400
  hover:border-slate-300
  focus:border-indigo-400
  focus:bg-white
  focus:ring-4
  focus:ring-indigo-500/10
  dark:border-slate-700
  dark:bg-slate-800
  dark:text-slate-100
  dark:placeholder:text-slate-500
  dark:hover:border-slate-600
  dark:focus:border-indigo-500
  dark:focus:bg-slate-900
`;

const SELECT_CLASS = `
  w-full
  rounded-xl
  border border-slate-200
  bg-white
  px-3.5 py-3
  text-sm font-medium
  text-slate-700
  outline-none
  transition-all
  duration-200
  hover:border-slate-300
  focus:border-indigo-400
  focus:ring-4
  focus:ring-indigo-500/10
  dark:border-slate-700
  dark:bg-slate-800
  dark:text-slate-200
  dark:hover:border-slate-600
  dark:focus:border-indigo-500
`;

// ======================================================
// COMPONENT
// ======================================================

function Transactions() {
  const [transactions, setTransactions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState(null);

  const [transactionToDelete, setTransactionToDelete] =
    useState(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] =
    useState("all");
  const [paymentFilter, setPaymentFilter] =
    useState("all");

  const [filtersOpen, setFiltersOpen] = useState(false);

  const [form, setForm] = useState(
    createInitialForm
  );

  const [currency, setCurrency] = useState(
    getStoredCurrency
  );

  const mountedRef = useRef(true);

  // ====================================================
  // MOUNT / CLEANUP
  // ====================================================

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
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

    return () => {
      window.removeEventListener(
        "storage",
        updateCurrency
      );

      window.removeEventListener(
        "spendnest_currency_changed",
        updateCurrency
      );
    };
  }, []);

  // ====================================================
  // BODY SCROLL LOCK
  // ====================================================

  useEffect(() => {
    const modalIsOpen =
      isModalOpen || Boolean(transactionToDelete);

    if (!modalIsOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [isModalOpen, transactionToDelete]);

  // ====================================================
  // LOAD TRANSACTIONS
  // ====================================================

  const loadTransactions = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const data = await getTransactions();

        if (!mountedRef.current) {
          return;
        }

        setTransactions(data || []);
      } catch (err) {
        console.error(
          "Transactions loading error:",
          err
        );

        if (!mountedRef.current) {
          return;
        }

        setError(
          "Unable to load transactions. Please try again."
        );
      } finally {
  if (mountedRef.current) {
    setLoading(false);
    setRefreshing(false);
  }
}

        
    },
    []
  );

useEffect(() => {
  let cancelled = false;

  async function loadInitialTransactions() {
    try {
      setError("");

      const data = await getTransactions();

      if (!cancelled) {
        setTransactions(data || []);
      }
    } catch (err) {
      console.error(
        "Transactions loading error:",
        err
      );

      if (!cancelled) {
        setError(
          "Unable to load transactions. Please try again."
        );
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  loadInitialTransactions();

  return () => {
    cancelled = true;
  };
}, []);

  // ====================================================
  // FILTER OPTIONS
  // ====================================================

  const availableCategories = useMemo(() => {
    const categories = new Set(
      transactions
        .map((transaction) => transaction.category)
        .filter(Boolean)
    );

    return [...categories].sort();
  }, [transactions]);

  const activeFilterCount = useMemo(() => {
    return [
      typeFilter !== "all",
      categoryFilter !== "all",
      paymentFilter !== "all",
    ].filter(Boolean).length;
  }, [
    typeFilter,
    categoryFilter,
    paymentFilter,
  ]);

  // ====================================================
  // FILTER TRANSACTIONS
  // ====================================================

  const filteredTransactions = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return [...transactions]
      .filter((transaction) => {
        const searchableText = [
          transaction.description,
          transaction.category,
          transaction.paymentMethod,
          transaction.type,
          transaction.date,
          transaction.amount,
        ]
          .filter(
            (value) =>
              value !== undefined &&
              value !== null
          )
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !keyword ||
          searchableText.includes(keyword);

        const matchesType =
          typeFilter === "all" ||
          transaction.type === typeFilter;

        const matchesCategory =
          categoryFilter === "all" ||
          transaction.category === categoryFilter;

        const matchesPayment =
          paymentFilter === "all" ||
          transaction.paymentMethod === paymentFilter;

        return (
          matchesSearch &&
          matchesType &&
          matchesCategory &&
          matchesPayment
        );
      })
      .sort((a, b) => {
        const dateDifference =
          getTransactionDateValue(b) -
          getTransactionDateValue(a);

        if (dateDifference !== 0) {
          return dateDifference;
        }

        return (
          getCreatedAtValue(b.createdAt) -
          getCreatedAtValue(a.createdAt)
        );
      });
  }, [
    transactions,
    search,
    typeFilter,
    categoryFilter,
    paymentFilter,
  ]);

  // ====================================================
  // TOTALS
  // ====================================================

  const totals = useMemo(() => {
    return transactions.reduce(
      (result, transaction) => {
        const amount =
          Number(transaction.amount) || 0;

        if (transaction.type === "income") {
          result.income += amount;
        }

        if (transaction.type === "expense") {
          result.expense += amount;
        }

        return result;
      },
      {
        income: 0,
        expense: 0,
      }
    );
  }, [transactions]);

  const balance =
    totals.income - totals.expense;

  const hasActiveFilters =
    Boolean(search.trim()) ||
    activeFilterCount > 0;

  // ====================================================
  // FORM
  // ====================================================

  function handleInputChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (formError) {
      setFormError("");
    }
  }

  function handleTypeChange(type) {
    setForm((previous) => {
      const isIncome = type === "income";

      const categoryIsValid = isIncome
        ? INCOME_CATEGORIES.some(
            (item) =>
              item.name === previous.category
          )
        : EXPENSE_CATEGORIES.some(
            (item) =>
              item.name === previous.category
          );

      return {
        ...previous,
        type,
        category: categoryIsValid
          ? previous.category
          : isIncome
          ? "Salary"
          : "Food",
      };
    });

    setFormError("");
  }

  function openAddModal() {
    setEditingTransaction(null);
    setForm(createInitialForm());
    setFormError("");
    setIsModalOpen(true);
  }

  function openEditModal(transaction) {
    setEditingTransaction(transaction);
    setForm(getFormFromTransaction(transaction));
    setFormError("");
    setIsModalOpen(true);
  }

  const closeModal = useCallback(() => {
    if (saving) {
      return;
    }

    setIsModalOpen(false);
    setEditingTransaction(null);
    setFormError("");
    setForm(createInitialForm());
  }, [saving]);

  // ====================================================
  // MODAL KEYBOARD
  // ====================================================

  useEffect(() => {
    if (!isModalOpen && !transactionToDelete) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") {
        return;
      }

      if (transactionToDelete) {
        if (!deletingId) {
          setTransactionToDelete(null);
        }

        return;
      }

      closeModal();
    };

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
    isModalOpen,
    transactionToDelete,
    deletingId,
    closeModal,
  ]);

  // ====================================================
  // SAVE TRANSACTION
  // ====================================================

  async function handleSubmit(event) {
    event.preventDefault();

    const amount = Number(form.amount);

    if (
      !form.amount ||
      !Number.isFinite(amount)
    ) {
      setFormError(
        "Please enter a valid amount."
      );
      return;
    }

    if (amount <= 0) {
      setFormError(
        "Amount must be greater than zero."
      );
      return;
    }

    if (!form.category) {
      setFormError(
        "Please select a category."
      );
      return;
    }

    if (!form.date) {
      setFormError(
        "Please select a transaction date."
      );
      return;
    }

    try {
      setSaving(true);
      setFormError("");
      setError("");

      const transactionData = {
        type: form.type,
        amount,
        category: form.category,
        description:
          form.description.trim() ||
          form.category,
        date: form.date,
        paymentMethod: form.paymentMethod,
      };

      if (editingTransaction) {
        const updatedTransaction =
          await updateTransaction(
            editingTransaction.id,
            transactionData
          );

        setTransactions((previous) =>
          previous.map((transaction) =>
            transaction.id ===
            editingTransaction.id
              ? {
                  ...transaction,
                  ...updatedTransaction,
                  ...transactionData,
                }
              : transaction
          )
        );
      } else {
        const savedTransaction =
          await addTransaction(
            transactionData
          );

        setTransactions((previous) => [
          savedTransaction,
          ...previous,
        ]);
      }

      setIsModalOpen(false);
      setEditingTransaction(null);
      setFormError("");
      setForm(createInitialForm());
    } catch (err) {
      console.error(
        "Transaction save error:",
        err
      );

      setFormError(
        editingTransaction
          ? "Unable to update the transaction. Please try again."
          : "Unable to save the transaction. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  // ====================================================
  // DELETE
  // ====================================================

  function requestDelete(transaction) {
    setTransactionToDelete(transaction);
  }

  async function handleDeleteConfirmed() {
    if (!transactionToDelete) {
      return;
    }

    const id = transactionToDelete.id;

    try {
      setDeletingId(id);
      setError("");

      await deleteTransaction(id);

      setTransactions((previous) =>
        previous.filter(
          (transaction) =>
            transaction.id !== id
        )
      );

      setTransactionToDelete(null);
    } catch (err) {
      console.error(
        "Transaction delete error:",
        err
      );

      setError(
        "Unable to delete the transaction. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  }

  // ====================================================
  // FILTER RESET
  // ====================================================

  function clearFilters() {
    setSearch("");
    setTypeFilter("all");
    setCategoryFilter("all");
    setPaymentFilter("all");
  }

  // ====================================================
  // FORM CATEGORIES
  // ====================================================


  const formCategoryNames = useMemo(() => {
    const baseCategories =
      form.type === "income"
        ? INCOME_CATEGORIES.map(
            (item) => item.name
          )
        : EXPENSE_CATEGORIES.map(
            (item) => item.name
          );

    if (
      form.category &&
      !baseCategories.includes(form.category)
    ) {
      return [
        form.category,
        ...baseCategories,
      ];
    }

    return baseCategories;
  }, [form.type, form.category]);

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-6">
      {/* ==================================================
          PAGE HEADER
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
              inline-flex items-center gap-2
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
            <Receipt size={13} />
            Financial activity
          </div>

          <h1
            className="
              mt-3
              text-2xl font-bold tracking-tight
              text-slate-900
              dark:text-white
              sm:text-3xl
            "
          >
            Transactions
          </h1>

          <p
            className="
              mt-1.5 max-w-2xl
              text-sm leading-6
              text-slate-500
              dark:text-slate-400
            "
          >
            Keep your income and expenses
            organized, searchable and easy to
            review.
          </p>
        </div>

        <div className="flex w-full gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() =>
              loadTransactions(true)
            }
            disabled={refreshing}
            className="
              inline-flex h-11
              flex-1 sm:flex-none
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
            "
            title="Refresh transactions"
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
              flex-1 sm:flex-none
              items-center justify-center
              gap-2
              rounded-xl
              bg-indigo-600
              px-4.5
              text-sm font-semibold
              text-white
              shadow-lg
              shadow-indigo-500/20
              transition-all
              duration-200
              hover:-translate-y-0.5
              hover:bg-indigo-700
              hover:shadow-xl
              hover:shadow-indigo-500/20
              active:translate-y-0
              active:scale-[0.98]
              dark:bg-indigo-500
              dark:hover:bg-indigo-400
            "
          >
            <Plus size={17} />
            Add transaction
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
                flex h-9 w-9 shrink-0
                items-center justify-center
                rounded-xl
                bg-rose-100
                text-rose-600
                dark:bg-rose-500/10
                dark:text-rose-400
              "
            >
              <CircleAlert size={16} />
            </div>

            <div className="min-w-0">
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
                  mt-0.5 text-xs leading-5
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
            onClick={() =>
              loadTransactions(true)
            }
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
          SUMMARY
      ================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total activity"
          value={transactions.length}
          subtitle={
            hasActiveFilters
              ? `${filteredTransactions.length} matching`
              : "All recorded transactions"
          }
          icon={Receipt}
          iconClass="
            bg-indigo-50 text-indigo-600
            dark:bg-indigo-500/10
            dark:text-indigo-400
          "
        />

        <SummaryCard
          title="Total income"
          value={formatCurrency(
            totals.income,
            currency
          )}
          subtitle="All recorded income"
          icon={TrendingUp}
          iconClass="
            bg-emerald-50 text-emerald-600
            dark:bg-emerald-500/10
            dark:text-emerald-400
          "
          valueClass="
            text-emerald-600
            dark:text-emerald-400
          "
        />

        <SummaryCard
          title="Total expenses"
          value={formatCurrency(
            totals.expense,
            currency
          )}
          subtitle="All recorded expenses"
          icon={TrendingDown}
          iconClass="
            bg-rose-50 text-rose-600
            dark:bg-rose-500/10
            dark:text-rose-400
          "
          valueClass="
            text-rose-600
            dark:text-rose-400
          "
        />

        <SummaryCard
          title="Net balance"
          value={formatCurrency(
            balance,
            currency
          )}
          subtitle={
            balance >= 0
              ? "Income is ahead of expenses"
              : "Expenses are ahead of income"
          }
          icon={WalletCards}
          iconClass={
            balance >= 0
              ? `
                bg-sky-50 text-sky-600
                dark:bg-sky-500/10
                dark:text-sky-400
              `
              : `
                bg-amber-50 text-amber-600
                dark:bg-amber-500/10
                dark:text-amber-400
              `
          }
          valueClass={
            balance >= 0
              ? `
                text-sky-600
                dark:text-sky-400
              `
              : `
                text-amber-600
                dark:text-amber-400
              `
          }
        />
      </div>

      {/* ==================================================
          MAIN TRANSACTIONS CARD
      ================================================== */}

      <section
        className="
          overflow-hidden
          rounded-3xl
          border border-slate-200
          bg-white
          shadow-sm
          dark:border-slate-800
          dark:bg-slate-900
        "
      >
        {/* ==================================================
            TOOLBAR
        ================================================== */}

        <div
          className="
            border-b border-slate-100
            p-4
            dark:border-slate-800
            sm:p-5
          "
        >
          <div
            className="
              flex flex-col gap-3
              xl:flex-row
              xl:items-center
            "
          >
            {/* Search */}

            <div className="relative min-w-0 flex-1">
              <Search
                size={17}
                className="
                  pointer-events-none
                  absolute left-3.5 top-1/2
                  -translate-y-1/2
                  text-slate-400
                  dark:text-slate-500
                "
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search transactions..."
                aria-label="Search transactions"
                className="
                  h-11 w-full
                  rounded-xl
                  border border-slate-200
                  bg-slate-50
                  pl-10 pr-10
                  text-sm
                  text-slate-800
                  outline-none
                  transition-all
                  placeholder:text-slate-400
                  hover:border-slate-300
                  focus:border-indigo-400
                  focus:bg-white
                  focus:ring-4
                  focus:ring-indigo-500/10
                  dark:border-slate-700
                  dark:bg-slate-800
                  dark:text-slate-100
                  dark:placeholder:text-slate-500
                  dark:hover:border-slate-600
                  dark:focus:border-indigo-500
                  dark:focus:bg-slate-900
                "
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  className="
                    absolute right-3 top-1/2
                    -translate-y-1/2
                    rounded-lg p-1
                    text-slate-400
                    transition
                    hover:bg-slate-200
                    hover:text-slate-700
                    dark:hover:bg-slate-700
                    dark:hover:text-slate-200
                  "
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Filter controls */}

            <div className="flex flex-wrap gap-2">
              <div
                className="
                  flex
                  items-center
                  rounded-xl
                  border border-slate-200
                  bg-slate-100
                  p-1
                  dark:border-slate-700
                  dark:bg-slate-800
                "
              >
                {[
                  {
                    value: "all",
                    label: "All",
                  },
                  {
                    value: "income",
                    label: "Income",
                  },
                  {
                    value: "expense",
                    label: "Expenses",
                  },
                ].map((filter) => {
                  const active =
                    typeFilter === filter.value;

                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() =>
                        setTypeFilter(
                          filter.value
                        )
                      }
                      aria-pressed={active}
                      className={`
                        h-9
                        rounded-lg
                        px-3
                        text-xs
                        font-semibold
                        transition-all
                        duration-200
                        ${
                          active
                            ? `
                              bg-white
                              text-slate-900
                              shadow-sm
                              dark:bg-slate-700
                              dark:text-white
                            `
                            : `
                              text-slate-500
                              hover:text-slate-800
                              dark:text-slate-400
                              dark:hover:text-slate-200
                            `
                        }
                      `}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() =>
                  setFiltersOpen(
                    (value) => !value
                  )
                }
                aria-expanded={filtersOpen}
                className={`
                  inline-flex h-11
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  px-3.5
                  text-xs
                  font-semibold
                  transition-all
                  duration-200
                  ${
                    filtersOpen ||
                    activeFilterCount > 0
                      ? `
                        border-indigo-200
                        bg-indigo-50
                        text-indigo-600
                        hover:bg-indigo-100
                        dark:border-indigo-500/30
                        dark:bg-indigo-500/10
                        dark:text-indigo-400
                        dark:hover:bg-indigo-500/15
                      `
                      : `
                        border-slate-200
                        bg-white
                        text-slate-600
                        hover:border-slate-300
                        hover:bg-slate-50
                        dark:border-slate-700
                        dark:bg-slate-900
                        dark:text-slate-300
                        dark:hover:border-slate-600
                        dark:hover:bg-slate-800
                      `
                  }
                `}
              >
                <SlidersHorizontal size={15} />
                Filters

                {activeFilterCount > 0 && (
                  <span
                    className="
                      flex h-5 min-w-5
                      items-center justify-center
                      rounded-md
                      bg-indigo-600
                      px-1
                      text-[10px]
                      font-bold
                      text-white
                      dark:bg-indigo-500
                    "
                  >
                    {activeFilterCount}
                  </span>
                )}

                <ChevronDown
                  size={14}
                  className={`
                    transition-transform
                    duration-200
                    ${
                      filtersOpen
                        ? "rotate-180"
                        : ""
                    }
                  `}
                />
              </button>
            </div>
          </div>

          {/* ==================================================
              ADVANCED FILTERS
          ================================================== */}

          {filtersOpen && (
            <div
              className="
                mt-4
                rounded-2xl
                border border-slate-100
                bg-slate-50/80
                p-4
                dark:border-slate-800
                dark:bg-slate-800/40
              "
            >
              <div
                className="
                  grid gap-3
                  sm:grid-cols-2
                  lg:grid-cols-3
                "
              >
                <FilterSelect
                  label="Category"
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  options={availableCategories}
                />

                <FilterSelect
                  label="Payment method"
                  value={paymentFilter}
                  onChange={setPaymentFilter}
                  options={PAYMENT_METHODS}
                />

                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className="
                    mt-auto
                    inline-flex h-11
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    border border-slate-200
                    bg-white
                    px-4
                    text-xs
                    font-semibold
                    text-slate-500
                    transition-all
                    hover:border-slate-300
                    hover:bg-slate-100
                    hover:text-slate-700
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                    dark:border-slate-700
                    dark:bg-slate-900
                    dark:text-slate-400
                    dark:hover:border-slate-600
                    dark:hover:bg-slate-800
                    dark:hover:text-slate-200
                  "
                >
                  <RotateCcw size={14} />
                  Clear filters
                </button>
              </div>
            </div>
          )}

          {/* ==================================================
              RESULT SUMMARY
          ================================================== */}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p
              className="
                text-xs
                text-slate-400
                dark:text-slate-500
              "
            >
              {hasActiveFilters
                ? `Showing ${filteredTransactions.length} of ${transactions.length} transactions`
                : `${transactions.length} transaction${
                    transactions.length === 1
                      ? ""
                      : "s"
                  }`}
            </p>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="
                  inline-flex
                  items-center gap-1
                  text-xs font-semibold
                  text-indigo-600
                  transition
                  hover:text-indigo-700
                  dark:text-indigo-400
                  dark:hover:text-indigo-300
                "
              >
                Reset all
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* ==================================================
            LOADING
        ================================================== */}

        {loading ? (
          <div className="p-5 sm:p-6">
            <div className="space-y-4">
              {Array.from({
                length: 6,
              }).map((_, index) => (
                <div
                  key={index}
                  className="
                    flex items-center gap-4
                    rounded-xl
                    border border-slate-100
                    p-3
                    dark:border-slate-800
                  "
                >
                  <div
                    className="
                      h-11 w-11 shrink-0
                      animate-pulse
                      rounded-xl
                      bg-slate-200
                      dark:bg-slate-800
                    "
                  />

                  <div className="flex-1 space-y-2">
                    <div
                      className="
                        h-3.5 w-40
                        animate-pulse
                        rounded
                        bg-slate-200
                        dark:bg-slate-800
                      "
                    />

                    <div
                      className="
                        h-3 w-24
                        animate-pulse
                        rounded
                        bg-slate-100
                        dark:bg-slate-800/70
                      "
                    />
                  </div>

                  <div
                    className="
                      h-4 w-24
                      animate-pulse
                      rounded
                      bg-slate-200
                      dark:bg-slate-800
                    "
                  />
                </div>
              ))}
            </div>
          </div>
        ) : filteredTransactions.length ===
          0 ? (
          /* ==================================================
              EMPTY STATE
          ================================================== */

          <div
            className="
              flex min-h-105
              flex-col items-center
              justify-center
              px-6 py-14
              text-center
            "
          >
            <div
              className="
                flex h-16 w-16
                items-center justify-center
                rounded-2xl
                border border-slate-200
                bg-slate-50
                text-slate-400
                dark:border-slate-700
                dark:bg-slate-800
                dark:text-slate-500
              "
            >
              {hasActiveFilters ? (
                <Search size={25} />
              ) : (
                <Wallet size={25} />
              )}
            </div>

            <h3
              className="
                mt-5
                text-base font-bold
                text-slate-900
                dark:text-white
              "
            >
              {hasActiveFilters
                ? "No matching transactions"
                : "No transactions yet"}
            </h3>

            <p
              className="
                mt-1.5
                max-w-md
                text-sm leading-6
                text-slate-400
                dark:text-slate-500
              "
            >
              {hasActiveFilters
                ? "Try changing your search or filters to find the transaction you're looking for."
                : "Start adding your income and expenses to build your financial history."}
            </p>

            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="
                  mt-5
                  inline-flex
                  items-center gap-2
                  rounded-xl
                  border border-slate-200
                  bg-white
                  px-4 py-2.5
                  text-xs font-semibold
                  text-slate-600
                  shadow-sm
                  transition-all
                  hover:-translate-y-0.5
                  hover:bg-slate-50
                  dark:border-slate-700
                  dark:bg-slate-900
                  dark:text-slate-300
                  dark:hover:bg-slate-800
                "
              >
                <RotateCcw size={14} />
                Clear filters
              </button>
            ) : (
              <button
                type="button"
                onClick={openAddModal}
                className="
                  mt-5
                  inline-flex
                  items-center gap-2
                  rounded-xl
                  bg-indigo-600
                  px-4 py-2.5
                  text-xs font-semibold
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
                Add first transaction
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ==================================================
                DESKTOP TABLE
            ================================================== */}

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-225">
                <thead>
                  <tr
                    className="
                      border-b
                      border-slate-100
                      bg-slate-50/80
                      dark:border-slate-800
                      dark:bg-slate-800/40
                    "
                  >
                    <th
                      className="
                        px-6 py-3.5
                        text-left
                        text-[10px]
                        font-bold uppercase
                        tracking-[0.12em]
                        text-slate-400
                        dark:text-slate-500
                      "
                    >
                      Transaction
                    </th>

                    <th
                      className="
                        px-4 py-3.5
                        text-left
                        text-[10px]
                        font-bold uppercase
                        tracking-[0.12em]
                        text-slate-400
                        dark:text-slate-500
                      "
                    >
                      Category
                    </th>

                    <th
                      className="
                        px-4 py-3.5
                        text-left
                        text-[10px]
                        font-bold uppercase
                        tracking-[0.12em]
                        text-slate-400
                        dark:text-slate-500
                      "
                    >
                      Date
                    </th>

                    <th
                      className="
                        px-4 py-3.5
                        text-left
                        text-[10px]
                        font-bold uppercase
                        tracking-[0.12em]
                        text-slate-400
                        dark:text-slate-500
                      "
                    >
                      Payment
                    </th>

                    <th
                      className="
                        px-4 py-3.5
                        text-right
                        text-[10px]
                        font-bold uppercase
                        tracking-[0.12em]
                        text-slate-400
                        dark:text-slate-500
                      "
                    >
                      Amount
                    </th>

                    <th
                      className="
                        px-6 py-3.5
                        text-right
                        text-[10px]
                        font-bold uppercase
                        tracking-[0.12em]
                        text-slate-400
                        dark:text-slate-500
                      "
                    >
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTransactions.map(
                    (transaction) => {
                      const Icon =
                        CATEGORY_ICONS[
                          transaction.category
                        ] ||
                        MoreHorizontal;

                      const isIncome =
                        transaction.type ===
                        "income";

                      const isDeleting =
                        deletingId ===
                        transaction.id;

                      return (
                        <tr
                          key={transaction.id}
                          className="
                            border-b
                            border-slate-100
                            transition-colors
                            last:border-0
                            hover:bg-slate-50/60
                            dark:border-slate-800
                            dark:hover:bg-slate-800/35
                          "
                        >
                          {/* Transaction */}

                          <td className="px-6 py-4.5">
                            <div className="flex items-center gap-3">
                              <div
                                className={`
                                  flex h-11 w-11
                                  shrink-0
                                  items-center
                                  justify-center
                                  rounded-xl
                                  ${
                                    isIncome
                                      ? `
                                        bg-emerald-50
                                        text-emerald-600
                                        dark:bg-emerald-500/10
                                        dark:text-emerald-400
                                      `
                                      : `
                                        bg-slate-100
                                        text-slate-600
                                        dark:bg-slate-800
                                        dark:text-slate-300
                                      `
                                  }
                                `}
                              >
                                <Icon size={18} />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p
                                    className="
                                      max-w-65
                                      truncate
                                      text-sm font-semibold
                                      text-slate-800
                                      dark:text-slate-100
                                    "
                                  >
                                    {transaction.description ||
                                      transaction.category ||
                                      "Transaction"}
                                  </p>
                                </div>

                                <div className="mt-1.5 flex items-center gap-2">
                                  <span
                                    className={`
                                      rounded-full
                                      px-2 py-0.5
                                      text-[10px]
                                      font-bold
                                      ${
                                        isIncome
                                          ? `
                                            bg-emerald-50
                                            text-emerald-600
                                            dark:bg-emerald-500/10
                                            dark:text-emerald-400
                                          `
                                          : `
                                            bg-rose-50
                                            text-rose-600
                                            dark:bg-rose-500/10
                                            dark:text-rose-400
                                          `
                                      }
                                    `}
                                  >
                                    {isIncome
                                      ? "Income"
                                      : "Expense"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Category */}

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="
                                  text-sm font-medium
                                  text-slate-600
                                  dark:text-slate-300
                                "
                              >
                                {transaction.category ||
                                  "Other"}
                              </span>
                            </div>
                          </td>

                          {/* Date */}

                          <td className="px-4 py-4">
                            <div
                              className="
                                inline-flex
                                items-center gap-2
                                text-sm
                                text-slate-500
                                dark:text-slate-400
                              "
                            >
                              <CalendarDays
                                size={14}
                              />

                              {formatDate(
                                transaction.date
                              )}
                            </div>
                          </td>

                          {/* Payment */}

                          <td className="px-4 py-4">
                            <div
                              className="
                                inline-flex
                                items-center gap-2
                                rounded-lg
                                bg-slate-50
                                px-2.5 py-1.5
                                text-xs font-medium
                                text-slate-500
                                dark:bg-slate-800
                                dark:text-slate-400
                              "
                            >
                              <CreditCard size={13} />

                              {transaction.paymentMethod ||
                                "-"}
                            </div>
                          </td>

                          {/* Amount */}

                          <td className="px-4 py-4 text-right">
                            <div
                              className={`
                                inline-flex
                                items-center
                                gap-1
                                text-sm
                                font-bold
                                ${
                                  isIncome
                                    ? `
                                      text-emerald-600
                                      dark:text-emerald-400
                                    `
                                    : `
                                      text-rose-600
                                      dark:text-rose-400
                                    `
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

                              {formatCurrency(
                                transaction.amount,
                                currency
                              )}
                            </div>
                          </td>

                          {/* Actions */}

                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  openEditModal(
                                    transaction
                                  )
                                }
                                disabled={isDeleting}
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
                                title="Edit transaction"
                                aria-label="Edit transaction"
                              >
                                <Pencil size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  requestDelete(
                                    transaction
                                  )
                                }
                                disabled={isDeleting}
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
                                  disabled:opacity-40
                                  dark:hover:border-rose-500/20
                                  dark:hover:bg-rose-500/10
                                  dark:hover:text-rose-400
                                "
                                title="Delete transaction"
                                aria-label="Delete transaction"
                              >
                                {isDeleting ? (
                                  <Loader2
                                    size={14}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Trash2
                                    size={14}
                                  />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>

            {/* ==================================================
                MOBILE CARDS
            ================================================== */}

            <div
              className="
                divide-y
                divide-slate-100
                md:hidden
                dark:divide-slate-800
              "
            >
              {filteredTransactions.map(
                (transaction) => {
                  const Icon =
                    CATEGORY_ICONS[
                      transaction.category
                    ] ||
                    MoreHorizontal;

                  const isIncome =
                    transaction.type ===
                    "income";

                  const isDeleting =
                    deletingId ===
                    transaction.id;

                  return (
                    <article
                      key={transaction.id}
                      className="
                        p-4
                        transition-colors
                        hover:bg-slate-50/60
                        dark:hover:bg-slate-800/30
                      "
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`
                            flex h-11 w-11
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            ${
                              isIncome
                                ? `
                                  bg-emerald-50
                                  text-emerald-600
                                  dark:bg-emerald-500/10
                                  dark:text-emerald-400
                                `
                                : `
                                  bg-slate-100
                                  text-slate-600
                                  dark:bg-slate-800
                                  dark:text-slate-300
                                `
                            }
                          `}
                        >
                          <Icon size={18} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3
                                className="
                                  truncate
                                  text-sm font-semibold
                                  text-slate-800
                                  dark:text-slate-100
                                "
                              >
                                {transaction.description ||
                                  transaction.category ||
                                  "Transaction"}
                              </h3>

                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                <span
                                  className="
                                    text-xs
                                    font-medium
                                    text-slate-500
                                    dark:text-slate-400
                                  "
                                >
                                  {transaction.category ||
                                    "Other"}
                                </span>

                                <span className="text-slate-300 dark:text-slate-700">
                                  •
                                </span>

                                <span
                                  className="
                                    text-xs
                                    text-slate-400
                                    dark:text-slate-500
                                  "
                                >
                                  {formatDate(
                                    transaction.date
                                  )}
                                </span>
                              </div>
                            </div>

                            <div
                              className={`
                                shrink-0
                                text-right
                                text-sm font-bold
                                ${
                                  isIncome
                                    ? `
                                      text-emerald-600
                                      dark:text-emerald-400
                                    `
                                    : `
                                      text-rose-600
                                      dark:text-rose-400
                                    `
                                }
                              `}
                            >
                              <div className="flex items-center gap-1">
                                {isIncome ? (
                                  <ArrowUpRight
                                    size={14}
                                  />
                                ) : (
                                  <ArrowDownRight
                                    size={14}
                                  />
                                )}

                                {isIncome
                                  ? "+"
                                  : "-"}

                                {formatCurrency(
                                  transaction.amount,
                                  currency
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={`
                                  rounded-full
                                  px-2 py-1
                                  text-[10px]
                                  font-bold
                                  ${
                                    isIncome
                                      ? `
                                        bg-emerald-50
                                        text-emerald-600
                                        dark:bg-emerald-500/10
                                        dark:text-emerald-400
                                      `
                                      : `
                                        bg-rose-50
                                        text-rose-600
                                        dark:bg-rose-500/10
                                        dark:text-rose-400
                                      `
                                  }
                                `}
                              >
                                {isIncome
                                  ? "Income"
                                  : "Expense"}
                              </span>

                              <span
                                className="
                                  inline-flex
                                  items-center gap-1.5
                                  text-xs
                                  text-slate-400
                                  dark:text-slate-500
                                "
                              >
                                <CreditCard
                                  size={13}
                                />

                                {transaction.paymentMethod ||
                                  "-"}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  openEditModal(
                                    transaction
                                  )
                                }
                                disabled={isDeleting}
                                className="
                                  inline-flex h-8
                                  items-center gap-1.5
                                  rounded-lg
                                  px-2.5
                                  text-xs
                                  font-semibold
                                  text-slate-500
                                  transition
                                  hover:bg-slate-100
                                  hover:text-indigo-600
                                  disabled:opacity-40
                                  dark:text-slate-400
                                  dark:hover:bg-slate-800
                                  dark:hover:text-indigo-400
                                "
                              >
                                <Pencil size={13} />
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  requestDelete(
                                    transaction
                                  )
                                }
                                disabled={isDeleting}
                                className="
                                  inline-flex h-8
                                  items-center gap-1.5
                                  rounded-lg
                                  px-2.5
                                  text-xs
                                  font-semibold
                                  text-slate-500
                                  transition
                                  hover:bg-rose-50
                                  hover:text-rose-600
                                  disabled:opacity-40
                                  dark:text-slate-400
                                  dark:hover:bg-rose-500/10
                                  dark:hover:text-rose-400
                                "
                              >
                                {isDeleting ? (
                                  <Loader2
                                    size={13}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Trash2
                                    size={13}
                                  />
                                )}

                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          </>
        )}
      </section>

      {/* ==================================================
          ADD / EDIT MODAL
      ================================================== */}

      {isModalOpen && (
        <div
          className="
            fixed inset-0 z-50
            flex items-center justify-center
            bg-slate-950/50
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
            aria-labelledby="transaction-modal-title"
            className="
              flex
              max-h-[92vh]
              w-full
              max-w-xl
              flex-col
              overflow-hidden
              rounded-3xl
              border border-slate-200
              bg-white
              shadow-2xl
              shadow-slate-950/20
              dark:border-slate-700
              dark:bg-slate-900
              dark:shadow-black/50
            "
          >
            {/* Modal Header */}

            <div
              className="
                border-b border-slate-100
                px-5 py-4
                dark:border-slate-800
                sm:px-6 sm:py-5
              "
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`
                      flex h-10 w-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      ${
                        form.type ===
                        "income"
                          ? `
                            bg-emerald-50
                            text-emerald-600
                            dark:bg-emerald-500/10
                            dark:text-emerald-400
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
                    {editingTransaction ? (
                      <Pencil size={17} />
                    ) : (
                      <Plus size={18} />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h2
                      id="transaction-modal-title"
                      className="
                        truncate
                        text-base font-bold
                        text-slate-900
                        dark:text-white
                      "
                    >
                      {editingTransaction
                        ? "Edit transaction"
                        : "Add transaction"}
                    </h2>

                    <p
                      className="
                        mt-0.5
                        text-xs
                        text-slate-400
                        dark:text-slate-500
                      "
                    >
                      {editingTransaction
                        ? "Update your transaction details."
                        : "Record a new income or expense."}
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
                  aria-label="Close transaction form"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Form */}

            <form
              onSubmit={handleSubmit}
              className="overflow-y-auto"
            >
              <div className="space-y-5 p-5 sm:p-6">
                {/* Type */}

                <div>
                  <label
                    className="
                      mb-2 block
                      text-xs font-semibold
                      uppercase tracking-wide
                      text-slate-500
                      dark:text-slate-400
                    "
                  >
                    Transaction type
                  </label>

                  <div
                    className="
                      grid grid-cols-2
                      gap-1.5
                      rounded-2xl
                      bg-slate-100
                      p-1.5
                      dark:bg-slate-800
                    "
                  >
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        handleTypeChange(
                          "expense"
                        )
                      }
                      className={`
                        flex items-center
                        justify-center
                        gap-2
                        rounded-xl
                        py-2.5
                        text-sm font-semibold
                        transition-all
                        ${
                          form.type ===
                          "expense"
                            ? `
                              bg-white
                              text-rose-600
                              shadow-sm
                              dark:bg-slate-700
                              dark:text-rose-400
                            `
                            : `
                              text-slate-500
                              hover:text-slate-700
                              dark:text-slate-400
                              dark:hover:text-slate-200
                            `
                        }
                      `}
                    >
                      <ArrowDownRight
                        size={15}
                      />
                      Expense
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        handleTypeChange(
                          "income"
                        )
                      }
                      className={`
                        flex items-center
                        justify-center
                        gap-2
                        rounded-xl
                        py-2.5
                        text-sm font-semibold
                        transition-all
                        ${
                          form.type ===
                          "income"
                            ? `
                              bg-white
                              text-emerald-600
                              shadow-sm
                              dark:bg-slate-700
                              dark:text-emerald-400
                            `
                            : `
                              text-slate-500
                              hover:text-slate-700
                              dark:text-slate-400
                              dark:hover:text-slate-200
                            `
                        }
                      `}
                    >
                      <ArrowUpRight
                        size={15}
                      />
                      Income
                    </button>
                  </div>
                </div>

                {/* Amount */}

                <div>
                  <label
                    htmlFor="transaction-amount"
                    className="
                      mb-2 block
                      text-xs font-semibold
                      uppercase tracking-wide
                      text-slate-500
                      dark:text-slate-400
                    "
                  >
                    Amount
                  </label>

                  <div className="relative">
                    <span
                      className="
                        pointer-events-none
                        absolute left-4 top-1/2
                        -translate-y-1/2
                        text-base font-bold
                        text-slate-400
                        dark:text-slate-500
                      "
                    >
                      {getCurrencySymbol(
                        currency
                      )}
                    </span>

                    <input
                      id="transaction-amount"
                      required
                      autoFocus
                      disabled={saving}
                      type="number"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      name="amount"
                      value={form.amount}
                      onChange={
                        handleInputChange
                      }
                      placeholder="0.00"
                      className="
                        w-full
                        rounded-2xl
                        border
                        border-slate-200
                        bg-slate-50
                        py-4
                        pl-10 pr-4
                        text-2xl
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
                </div>

                {/* Category */}

                <div>
                  <label
                    htmlFor="transaction-category"
                    className="
                      mb-2 block
                      text-xs font-semibold
                      uppercase tracking-wide
                      text-slate-500
                      dark:text-slate-400
                    "
                  >
                    Category
                  </label>

                  <select
                    id="transaction-category"
                    name="category"
                    value={form.category}
                    onChange={
                      handleInputChange
                    }
                    disabled={saving}
                    className={
                      SELECT_CLASS
                    }
                  >
                    {formCategoryNames.map(
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
                </div>

                {/* Description */}

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label
                      htmlFor="transaction-description"
                      className="
                        text-xs font-semibold
                        uppercase tracking-wide
                        text-slate-500
                        dark:text-slate-400
                      "
                    >
                      Description
                    </label>

                    <span
                      className="
                        text-[10px]
                        text-slate-400
                        dark:text-slate-600
                      "
                    >
                      {form.description.length}/120
                    </span>
                  </div>

                  <input
                    id="transaction-description"
                    type="text"
                    name="description"
                    value={form.description}
                    onChange={
                      handleInputChange
                    }
                    disabled={saving}
                    maxLength={120}
                    placeholder={
                      form.type === "income"
                        ? "e.g. Monthly salary"
                        : "e.g. Lunch with friends"
                    }
                    className={
                      FIELD_CLASS
                    }
                  />
                </div>

                {/* Date + Payment */}

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Date */}

                  <div>
                    <label
                      htmlFor="transaction-date"
                      className="
                        mb-2 block
                        text-xs font-semibold
                        uppercase tracking-wide
                        text-slate-500
                        dark:text-slate-400
                      "
                    >
                      Date
                    </label>

                    <div className="relative">
                      <CalendarDays
                        size={15}
                        className="
                          pointer-events-none
                          absolute left-3.5 top-1/2
                          -translate-y-1/2
                          text-slate-400
                          dark:text-slate-500
                        "
                      />

                      <input
                        id="transaction-date"
                        required
                        disabled={saving}
                        type="date"
                        name="date"
                        value={form.date}
                        onChange={
                          handleInputChange
                        }
                        className="
                          w-full
                          rounded-xl
                          border border-slate-200
                          bg-white
                          py-3 pl-10 pr-3
                          text-sm font-medium
                          text-slate-700
                          outline-none
                          transition-all
                          hover:border-slate-300
                          focus:border-indigo-400
                          focus:ring-4
                          focus:ring-indigo-500/10
                          dark:border-slate-700
                          dark:bg-slate-800
                          dark:text-slate-200
                          dark:hover:border-slate-600
                          dark:focus:border-indigo-500
                        "
                      />
                    </div>
                  </div>

                  {/* Payment */}

                  <div>
                    <label
                      htmlFor="transaction-payment"
                      className="
                        mb-2 block
                        text-xs font-semibold
                        uppercase tracking-wide
                        text-slate-500
                        dark:text-slate-400
                      "
                    >
                      Payment method
                    </label>

                    <div className="relative">
                      <CreditCard
                        size={15}
                        className="
                          pointer-events-none
                          absolute left-3.5 top-1/2
                          -translate-y-1/2
                          text-slate-400
                          dark:text-slate-500
                        "
                      />

                      <select
                        id="transaction-payment"
                        name="paymentMethod"
                        value={
                          form.paymentMethod
                        }
                        onChange={
                          handleInputChange
                        }
                        disabled={saving}
                        className="
                          w-full
                          rounded-xl
                          border border-slate-200
                          bg-white
                          py-3 pl-10 pr-3
                          text-sm font-medium
                          text-slate-700
                          outline-none
                          transition-all
                          hover:border-slate-300
                          focus:border-indigo-400
                          focus:ring-4
                          focus:ring-indigo-500/10
                          dark:border-slate-700
                          dark:bg-slate-800
                          dark:text-slate-200
                          dark:hover:border-slate-600
                          dark:focus:border-indigo-500
                        "
                      >
                        {PAYMENT_METHODS.map(
                          (method) => (
                            <option
                              key={method}
                              value={method}
                            >
                              {method}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Form Error */}

                {formError && (
                  <div
                    className="
                      flex items-start gap-2.5
                      rounded-xl
                      border border-rose-200
                      bg-rose-50
                      px-3.5 py-3
                      text-xs font-medium
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
                    <span>{formError}</span>
                  </div>
                )}
              </div>

              {/* Footer */}

              <div
                className="
                  flex gap-3
                  border-t border-slate-100
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
                    border border-slate-200
                    bg-white
                    px-4 py-3
                    text-sm font-semibold
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
                  disabled={saving}
                  className="
                    flex flex-1
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-indigo-600
                    px-4 py-3
                    text-sm font-semibold
                    text-white
                    shadow-sm
                    transition-all
                    hover:bg-indigo-700
                    hover:shadow-md
                    disabled:cursor-not-allowed
                    disabled:opacity-70
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
                    ? editingTransaction
                      ? "Updating..."
                      : "Saving..."
                    : editingTransaction
                    ? "Update transaction"
                    : "Save transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================
          DELETE CONFIRMATION
      ================================================== */}

      {transactionToDelete && (
        <div
          className="
            fixed inset-0 z-60
            flex items-center justify-center
            bg-slate-950/50
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
              setTransactionToDelete(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            className="
              w-full max-w-sm
              rounded-3xl
              border border-slate-200
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
              id="delete-title"
              className="
                mt-5
                text-lg font-bold
                text-slate-900
                dark:text-white
              "
            >
              Delete transaction?
            </h2>

            <p
              className="
                mt-2
                text-sm leading-6
                text-slate-500
                dark:text-slate-400
              "
            >
              This action will permanently
              remove{" "}
              <span
                className="
                  font-semibold
                  text-slate-700
                  dark:text-slate-200
                "
              >
                {transactionToDelete.description ||
                  transactionToDelete.category ||
                  "this transaction"}
              </span>
              .
            </p>

            <div
              className="
                mt-4
                rounded-2xl
                border border-slate-100
                bg-slate-50
                p-3.5
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
                    Amount
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs
                      text-slate-500
                      dark:text-slate-400
                    "
                  >
                    {formatDate(
                      transactionToDelete.date
                    )}
                  </p>
                </div>

                <span
                  className={`
                    text-sm font-bold
                    ${
                      transactionToDelete.type ===
                      "income"
                        ? `
                          text-emerald-600
                          dark:text-emerald-400
                        `
                        : `
                          text-rose-600
                          dark:text-rose-400
                        `
                    }
                  `}
                >
                  {transactionToDelete.type ===
                  "income"
                    ? "+"
                    : "-"}

                  {formatCurrency(
                    transactionToDelete.amount,
                    currency
                  )}
                </span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() =>
                  setTransactionToDelete(null)
                }
                disabled={Boolean(
                  deletingId
                )}
                className="
                  flex-1
                  rounded-xl
                  border border-slate-200
                  bg-white
                  px-4 py-2.5
                  text-sm font-semibold
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
                  text-sm font-semibold
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
                  : "Delete"}
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
        border border-slate-200
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
              text-[11px]
              font-bold uppercase
              tracking-[0.08em]
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
// FILTER SELECT
// ======================================================

function FilterSelect({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <div>
      <label
        className="
          mb-1.5 block
          text-[10px]
          font-bold uppercase
          tracking-wide
          text-slate-400
          dark:text-slate-500
        "
      >
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="
          h-11 w-full
          rounded-xl
          border border-slate-200
          bg-white
          px-3.5
          text-xs font-semibold
          text-slate-600
          outline-none
          transition-all
          hover:border-slate-300
          focus:border-indigo-400
          focus:ring-4
          focus:ring-indigo-500/10
          dark:border-slate-700
          dark:bg-slate-900
          dark:text-slate-300
          dark:hover:border-slate-600
          dark:focus:border-indigo-500
        "
      >
        <option value="all">
          All
        </option>

        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export default Transactions;