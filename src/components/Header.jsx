import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Search,
  X,
  Users,
  Wallet,
  Target,
  Repeat,
  Receipt,
  ChevronRight,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/useAuth";

import { getTransactions } from "../services/transactionService";
import { getMoneyRecords } from "../services/moneyTrackerService";
import { getBudgets } from "../services/budgetService";
import { getGoals } from "../services/goalService";
import { getSubscriptions } from "../services/subscriptionService";

// ======================================================
// CONSTANTS
// ======================================================

const CURRENCY_STORAGE_KEY = "spendnest_currency";

const SEARCH_CONFIG = {
  Transactions: {
    icon: Receipt,
    iconClass:
      "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400",
  },

  "Money Tracker": {
    icon: Users,
    iconClass:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  },

  Budgets: {
    icon: Wallet,
    iconClass:
      "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  },

  Goals: {
    icon: Target,
    iconClass:
      "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
  },

  Subscriptions: {
    icon: Repeat,
    iconClass:
      "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
  },
};

const CURRENCY_MAP = {
  INR: {
    code: "INR",
    symbol: "₹",
  },

  USD: {
    code: "USD",
    symbol: "$",
  },

  EUR: {
    code: "EUR",
    symbol: "€",
  },

  GBP: {
    code: "GBP",
    symbol: "£",
  },

  JPY: {
    code: "JPY",
    symbol: "¥",
  },

  CAD: {
    code: "CAD",
    symbol: "C$",
  },

  AUD: {
    code: "AUD",
    symbol: "A$",
  },
};

// ======================================================
// HELPERS
// ======================================================

function getStoredCurrency() {
  if (typeof window === "undefined") {
    return "INR";
  }

  const savedCurrency =
    localStorage.getItem(
      CURRENCY_STORAGE_KEY
    );

  if (!savedCurrency) {
    return "INR";
  }

  const normalized =
    savedCurrency.toUpperCase();

  if (CURRENCY_MAP[normalized]) {
    return normalized;
  }

  const symbolEntry = Object.entries(
    CURRENCY_MAP
  ).find(
    ([, value]) =>
      value.symbol === savedCurrency
  );

  return symbolEntry?.[0] || "INR";
}

function formatCurrency(
  amount,
  currency = "INR"
) {
  const numericAmount =
    Number(amount) || 0;

  const currencyConfig =
    CURRENCY_MAP[currency] ||
    CURRENCY_MAP.INR;

  try {
    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: currencyConfig.code,
        maximumFractionDigits: 0,
      }
    ).format(numericAmount);
  } catch {
    return `${currencyConfig.symbol}${numericAmount.toLocaleString(
      "en-IN"
    )}`;
  }
}

// ======================================================
// SEARCH RESULT ITEM
// ======================================================

function SearchResultItem({
  result,
  currency,
  onResultClick,
}) {
  const Icon = result.icon;

  const isIncome =
    result.type === "income";

  return (
    <button
      type="button"
      onClick={() =>
        onResultClick(result)
      }
      className="
        group
        flex
        w-full
        items-center
        gap-3
        border-b
        border-slate-100
        px-4
        py-3
        text-left
        transition-colors
        last:border-b-0
        hover:bg-slate-50
        dark:border-slate-800
        dark:hover:bg-slate-800/60
      "
    >
      {/* Icon */}

      <div
        className={`
          flex
          h-10
          w-10
          shrink-0
          items-center
          justify-center
          rounded-xl
          transition-transform
          duration-200
          group-hover:scale-105
          ${result.iconClass}
        `}
      >
        {Icon && <Icon size={18} />}
      </div>

      {/* Info */}

      <div className="min-w-0 flex-1">
        <p
          className="
            truncate
            text-sm
            font-semibold
            text-slate-800
            dark:text-slate-100
          "
        >
          {result.title}
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
          {result.subtitle}
        </p>

        <span
          className="
            mt-1.5
            inline-flex
            rounded-md
            bg-slate-100
            px-1.5
            py-0.5
            text-[10px]
            font-semibold
            text-slate-500
            dark:bg-slate-800
            dark:text-slate-400
          "
        >
          {result.section}
        </span>
      </div>

      {/* Amount */}

      <div
        className="
          flex
          shrink-0
          items-center
          gap-2
        "
      >
        {result.amount > 0 && (
          <span
            className={`
              text-xs
              font-semibold
              ${
                isIncome
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-700 dark:text-slate-200"
              }
            `}
          >
            {isIncome ? "+" : ""}
            {formatCurrency(
              result.amount,
              currency
            )}
          </span>
        )}

        <ChevronRight
          size={15}
          className="
            text-slate-300
            transition-transform
            duration-200
            group-hover:translate-x-0.5
            dark:text-slate-600
          "
        />
      </div>
    </button>
  );
}

// ======================================================
// SEARCH CONTENT
// ======================================================

function SearchContent({
  searchResults,
  loadingSearchData,
  currency,
  onResultClick,
  mobile = false,
}) {
  // ----------------------------------------------------
  // LOADING
  // ----------------------------------------------------

  if (loadingSearchData) {
    return (
      <div
        className="
          px-5
          py-8
          text-center
        "
      >
        <div
          className="
            mx-auto
            h-6
            w-6
            animate-spin
            rounded-full
            border-2
            border-slate-200
            border-t-indigo-500
            dark:border-slate-700
            dark:border-t-indigo-400
          "
        />

        <p
          className="
            mt-3
            text-sm
            font-medium
            text-slate-600
            dark:text-slate-300
          "
        >
          Searching your data...
        </p>
      </div>
    );
  }

  // ----------------------------------------------------
  // EMPTY
  // ----------------------------------------------------

  if (searchResults.length === 0) {
    return (
      <div
        className="
          px-5
          py-9
          text-center
        "
      >
        <div
          className="
            mx-auto
            flex
            h-11
            w-11
            items-center
            justify-center
            rounded-xl
            bg-slate-100
            text-slate-400
            dark:bg-slate-800
            dark:text-slate-500
          "
        >
          <Search size={20} />
        </div>

        <p
          className="
            mt-3
            text-sm
            font-semibold
            text-slate-800
            dark:text-slate-100
          "
        >
          No results found
        </p>

        <p
          className="
            mx-auto
            mt-1.5
            max-w-xs
            text-xs
            leading-5
            text-slate-400
            dark:text-slate-500
          "
        >
          {mobile
            ? "Try another keyword."
            : "Try a transaction, person, budget, goal, or subscription name."}
        </p>
      </div>
    );
  }

  // ----------------------------------------------------
  // RESULTS
  // ----------------------------------------------------

  return (
    <>
      {/* Results Header */}

      <div
        className="
          flex
          items-center
          justify-between
          border-b
          border-slate-100
          px-4
          py-3
          dark:border-slate-800
        "
      >
        <div>
          <p
            className="
              text-xs
              font-semibold
              uppercase
              tracking-wider
              text-slate-400
              dark:text-slate-500
            "
          >
            Search results
          </p>

          <p
            className="
              mt-0.5
              text-[11px]
              text-slate-400
              dark:text-slate-600
            "
          >
            {searchResults.length}{" "}
            {searchResults.length === 1
              ? "result"
              : "results"}
          </p>
        </div>

        <span
          className="
            rounded-lg
            bg-indigo-50
            px-2
            py-1
            text-[10px]
            font-semibold
            text-indigo-600
            dark:bg-indigo-500/10
            dark:text-indigo-400
          "
        >
          Search
        </span>
      </div>

      {/* Results List */}

      <div
        className="
          max-h-96
          overflow-y-auto
        "
      >
        {searchResults.map(
          (result) => (
            <SearchResultItem
              key={`${result.section}-${result.id}`}
              result={result}
              currency={currency}
              onResultClick={
                onResultClick
              }
            />
          )
        )}
      </div>

      {/* Desktop Footer */}

      {!mobile && (
        <div
          className="
            border-t
            border-slate-100
            bg-slate-50/70
            px-4
            py-2.5
            dark:border-slate-800
            dark:bg-slate-950/40
          "
        >
          <p
            className="
              text-center
              text-[10px]
              text-slate-400
              dark:text-slate-500
            "
          >
            Transactions · Money Tracker ·
            Budgets · Goals · Subscriptions
          </p>
        </div>
      )}
    </>
  );
}

// ======================================================
// HEADER
// ======================================================

function Header() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const searchRef = useRef(null);
  const inputRef = useRef(null);

  // ====================================================
  // SEARCH STATE
  // ====================================================

  const [searchOpen, setSearchOpen] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [
    loadingSearchData,
    setLoadingSearchData,
  ] = useState(true);

  const [transactions, setTransactions] =
    useState([]);

  const [moneyRecords, setMoneyRecords] =
    useState([]);

  const [budgets, setBudgets] =
    useState([]);

  const [goals, setGoals] =
    useState([]);

  const [subscriptions, setSubscriptions] =
    useState([]);

  // ====================================================
  // CURRENCY
  // ====================================================

  const [currency, setCurrency] =
    useState(getStoredCurrency);

  // ====================================================
  // LOAD SEARCH DATA
  // ====================================================

  useEffect(() => {
    let active = true;

    async function loadSearchData() {
      try {
        const now = new Date();

        const currentMonth =
          `${now.getFullYear()}-${String(
            now.getMonth() + 1
          ).padStart(2, "0")}`;

        const [
          transactionData,
          moneyData,
          budgetData,
          goalData,
          subscriptionData,
        ] = await Promise.all([
          getTransactions(),
          getMoneyRecords(),
          getBudgets(currentMonth),
          getGoals(),
          getSubscriptions(),
        ]);

        if (!active) {
          return;
        }

        setTransactions(
          transactionData || []
        );

        setMoneyRecords(
          moneyData || []
        );

        setBudgets(
          budgetData || []
        );

        setGoals(
          goalData || []
        );

        setSubscriptions(
          subscriptionData || []
        );
      } catch (error) {
        console.error(
          "Global search data error:",
          error
        );
      } finally {
        if (active) {
          setLoadingSearchData(false);
        }
      }
    }

    loadSearchData();

    return () => {
      active = false;
    };
  }, []);

  // ====================================================
  // CURRENCY SYNC
  // ====================================================

  useEffect(() => {
    function syncCurrency() {
      setCurrency(
        getStoredCurrency()
      );
    }

    window.addEventListener(
      "spendnest_currency_changed",
      syncCurrency
    );

    window.addEventListener(
      "storage",
      syncCurrency
    );

    return () => {
      window.removeEventListener(
        "spendnest_currency_changed",
        syncCurrency
      );

      window.removeEventListener(
        "storage",
        syncCurrency
      );
    };
  }, []);

  // ====================================================
  // SEARCH RESULTS
  // ====================================================

  const searchResults = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    if (!keyword) {
      return [];
    }

    const results = [];

    function addResult({
      id,
      section,
      title,
      subtitle,
      amount = 0,
      type,
      path,
    }) {
      const config =
        SEARCH_CONFIG[section];

      results.push({
        id,
        section,
        title,
        subtitle,
        amount: Number(amount || 0),
        type,
        path,
        icon: config?.icon,
        iconClass: config?.iconClass,
      });
    }

    // ==================================================
    // TRANSACTIONS
    // ==================================================

    transactions.forEach(
      (transaction) => {
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

        if (
          !searchableText.includes(keyword)
        ) {
          return;
        }

        addResult({
          id: transaction.id,
          section: "Transactions",
          title:
            transaction.description ||
            transaction.category ||
            "Transaction",
          subtitle:
            `${transaction.category || "Other"}${
              transaction.date
                ? ` · ${transaction.date}`
                : ""
            }`,
          amount: transaction.amount,
          type: transaction.type,
          path: "/transactions",
        });
      }
    );

    // ==================================================
    // MONEY TRACKER
    // ==================================================

    moneyRecords.forEach(
      (record) => {
        const searchableText = [
          record.personName,
          record.note,
          record.type,
          record.status,
          record.dueDate,
          record.amount,
        ]
          .filter(
            (value) =>
              value !== undefined &&
              value !== null
          )
          .join(" ")
          .toLowerCase();

        if (
          !searchableText.includes(keyword)
        ) {
          return;
        }

        addResult({
          id: record.id,
          section: "Money Tracker",
          title:
            record.personName ||
            "Money Record",
          subtitle:
            `${
              record.type === "owe"
                ? "You owe"
                : "Owed to you"
            } · ${
              record.note || "No note"
            }`,
          amount: record.amount,
          type: "money",
          path: "/money-tracker",
        });
      }
    );

    // ==================================================
    // BUDGETS
    // ==================================================

    budgets.forEach(
      (budget) => {
        const searchableText = [
          budget.category,
          budget.note,
          budget.month,
          budget.amount,
          budget.limit,
          budget.budgetAmount,
        ]
          .filter(
            (value) =>
              value !== undefined &&
              value !== null
          )
          .join(" ")
          .toLowerCase();

        if (
          !searchableText.includes(keyword)
        ) {
          return;
        }

        const budgetAmount =
          budget.amount ??
          budget.limit ??
          budget.budgetAmount ??
          0;

        addResult({
          id: budget.id,
          section: "Budgets",
          title:
            budget.category ||
            "Budget",
          subtitle:
            `${
              budget.month ||
              "Current month"
            } · Budget`,
          amount: budgetAmount,
          type: "budget",
          path: "/budgets",
        });
      }
    );

    // ==================================================
    // GOALS
    // ==================================================

    goals.forEach(
      (goal) => {
        const searchableText = [
          goal.name,
          goal.note,
          goal.deadline,
          goal.status,
          goal.targetAmount,
          goal.currentAmount,
        ]
          .filter(
            (value) =>
              value !== undefined &&
              value !== null
          )
          .join(" ")
          .toLowerCase();

        if (
          !searchableText.includes(keyword)
        ) {
          return;
        }

        addResult({
          id: goal.id,
          section: "Goals",
          title:
            goal.name || "Goal",
          subtitle:
            `${goal.status || "Active"} · ${
              goal.deadline ||
              "No deadline"
            }`,
          amount: goal.targetAmount,
          type: "goal",
          path: "/goals",
        });
      }
    );

    // ==================================================
    // SUBSCRIPTIONS
    // ==================================================

    subscriptions.forEach(
      (subscription) => {
        const searchableText = [
          subscription.name,
          subscription.category,
          subscription.note,
          subscription.billingCycle,
          subscription.nextPaymentDate,
          subscription.status,
          subscription.amount,
        ]
          .filter(
            (value) =>
              value !== undefined &&
              value !== null
          )
          .join(" ")
          .toLowerCase();

        if (
          !searchableText.includes(keyword)
        ) {
          return;
        }

        addResult({
          id: subscription.id,
          section: "Subscriptions",
          title:
            subscription.name ||
            "Subscription",
          subtitle:
            `${
              subscription.billingCycle ||
              "Subscription"
            } · ${
              subscription.category ||
              "Other"
            }`,
          amount: subscription.amount,
          type: "subscription",
          path: "/subscriptions",
        });
      }
    );

    return results.slice(0, 10);
  }, [
    search,
    transactions,
    moneyRecords,
    budgets,
    goals,
    subscriptions,
  ]);

  // ====================================================
  // CURRENT DATE
  // ====================================================

  const currentDate = useMemo(
    () =>
      new Date().toLocaleDateString(
        "en-IN",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      ),
    []
  );

  // ====================================================
  // SEARCH CONTROLS
  // ====================================================

  const openSearch = useCallback(() => {
    setSearchOpen(true);

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, []);

  const closeSearch = useCallback(() => {
    setSearch("");
    setSearchOpen(false);
  }, []);

  const handleResultClick =
    useCallback(
      (result) => {
        closeSearch();
        navigate(result.path);
      },
      [closeSearch, navigate]
    );

  // ====================================================
  // KEYBOARD + OUTSIDE CLICK
  // ====================================================

  useEffect(() => {
    if (!searchOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closeSearch();
      }
    }

    function handleClickOutside(event) {
      if (
        searchRef.current &&
        !searchRef.current.contains(
          event.target
        )
      ) {
        closeSearch();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, [
    searchOpen,
    closeSearch,
  ]);

  // ====================================================
  // USER
  // ====================================================

  const userName =
    user?.displayName?.trim() ||
    user?.email?.split("@")[0] ||
    "User";

  const userInitial =
    userName.charAt(0).toUpperCase() ||
    "U";

  const userPhoto =
    user?.photoURL;

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <header
      className="
        sticky
        top-0
        z-30
        flex
        h-16
        items-center
        justify-between
        gap-3
        border-b
        border-slate-200/80
        bg-white/90
        px-4
        pl-16
        backdrop-blur-xl
        transition-colors
        duration-200
        dark:border-slate-800/80
        dark:bg-slate-950/90

        sm:h-20
        sm:px-6
        sm:pl-6

        lg:px-8
      "
    >
      {/* ==================================================
          LEFT
      ================================================== */}

      <div className="min-w-0 flex-1">
        {/* Desktop */}

        <p
          className="
            hidden
            text-xs
            font-medium
            text-slate-400
            dark:text-slate-500
            sm:block
            sm:text-sm
          "
        >
          {currentDate}
        </p>

        <h2
          className="
            hidden
            truncate
            text-lg
            font-semibold
            tracking-tight
            text-slate-900
            dark:text-slate-100
            sm:mt-0.5
            sm:block
          "
        >
          Financial Overview
        </h2>

        {/* Mobile */}

        <div
          className="
            flex
            items-center
            gap-2
            sm:hidden
          "
        >
          <div
            className="
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-lg
              bg-indigo-600
              text-white
              dark:bg-indigo-500
            "
          >
            <Wallet size={17} />
          </div>

          <div className="min-w-0">
            <p
              className="
                truncate
                text-sm
                font-bold
                tracking-tight
                text-slate-900
                dark:text-slate-100
              "
            >
              SpendNest
            </p>

            <p
              className="
                text-[10px]
                text-slate-400
                dark:text-slate-500
              "
            >
              Financial Overview
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================
          RIGHT
      ================================================== */}

      <div
        ref={searchRef}
        className="
          flex
          shrink-0
          items-center
          gap-2
          sm:gap-3
        "
      >
        {/* ==================================================
            SEARCH OPEN
        ================================================== */}

        {searchOpen ? (
          <>
            {/* ==================================================
                DESKTOP SEARCH
            ================================================== */}

            <div
              className="
                relative
                hidden
                sm:block
              "
            >
              <div
                className="
                  flex
                  h-10
                  w-72
                  items-center
                  gap-2.5
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-3
                  shadow-sm
                  transition-all
                  focus-within:border-indigo-400
                  focus-within:ring-4
                  focus-within:ring-indigo-500/10
                  dark:border-slate-700
                  dark:bg-slate-900
                  dark:focus-within:border-indigo-500
                  dark:focus-within:ring-indigo-500/10
                  lg:w-80
                "
              >
                <Search
                  size={18}
                  className="
                    shrink-0
                    text-slate-400
                    dark:text-slate-500
                  "
                />

                <input
                  ref={inputRef}
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search anything..."
                  aria-label="Search SpendNest"
                  className="
                    min-w-0
                    flex-1
                    bg-transparent
                    text-sm
                    text-slate-700
                    outline-none
                    placeholder:text-slate-400
                    dark:text-slate-200
                    dark:placeholder:text-slate-500
                  "
                />

                {search && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearch("")
                    }
                    className="
                      rounded-md
                      p-1
                      text-slate-400
                      transition
                      hover:bg-slate-100
                      hover:text-slate-600
                      dark:hover:bg-slate-800
                      dark:hover:text-slate-300
                    "
                    aria-label="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={closeSearch}
                  className="
                    rounded-md
                    p-1
                    text-slate-400
                    transition
                    hover:bg-slate-100
                    hover:text-slate-600
                    dark:hover:bg-slate-800
                    dark:hover:text-slate-300
                  "
                  aria-label="Close search"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Desktop Results */}

              {search.trim() && (
                <div
                  className="
                    absolute
                    right-0
                    top-12
                    z-50
                    w-[min(24rem,calc(100vw-2rem))]
                    overflow-hidden
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    shadow-2xl
                    shadow-slate-900/10
                    dark:border-slate-700
                    dark:bg-slate-900
                    dark:shadow-black/30
                  "
                >
                  <SearchContent
                    searchResults={
                      searchResults
                    }
                    loadingSearchData={
                      loadingSearchData
                    }
                    currency={currency}
                    onResultClick={
                      handleResultClick
                    }
                  />
                </div>
              )}
            </div>

            {/* ==================================================
                MOBILE SEARCH
            ================================================== */}

            <div
              className="
                fixed
                inset-x-0
                top-0
                z-50
                flex
                min-h-16
                items-center
                gap-2
                border-b
                border-slate-200
                bg-white
                px-3
                shadow-sm
                dark:border-slate-800
                dark:bg-slate-950
                sm:hidden
              "
            >
              <div
                className="
                  flex
                  h-10
                  min-w-0
                  flex-1
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-50
                  px-3
                  transition
                  focus-within:border-indigo-400
                  focus-within:ring-4
                  focus-within:ring-indigo-500/10
                  dark:border-slate-700
                  dark:bg-slate-900
                  dark:focus-within:border-indigo-500
                "
              >
                <Search
                  size={18}
                  className="
                    shrink-0
                    text-slate-400
                  "
                />

                <input
                  ref={inputRef}
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search anything..."
                  aria-label="Search SpendNest"
                  className="
                    min-w-0
                    flex-1
                    bg-transparent
                    text-sm
                    text-slate-800
                    outline-none
                    placeholder:text-slate-400
                    dark:text-slate-200
                    dark:placeholder:text-slate-500
                  "
                />

                {search && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearch("")
                    }
                    className="
                      shrink-0
                      rounded-md
                      p-1
                      text-slate-400
                    "
                    aria-label="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={closeSearch}
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-slate-200
                  text-slate-500
                  transition
                  active:scale-95
                  hover:bg-slate-50
                  dark:border-slate-700
                  dark:text-slate-400
                  dark:hover:bg-slate-800
                "
                aria-label="Close search"
              >
                <X size={18} />
              </button>

              {/* Mobile Results */}

              {search.trim() && (
                <div
                  className="
                    absolute
                    inset-x-3
                    top-68px
                    z-50
                    max-h-[calc(100dvh-84px)]
                    overflow-hidden
                    overflow-y-auto
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    shadow-2xl
                    dark:border-slate-700
                    dark:bg-slate-900
                  "
                >
                  <SearchContent
                    searchResults={
                      searchResults
                    }
                    loadingSearchData={
                      loadingSearchData
                    }
                    currency={currency}
                    onResultClick={
                      handleResultClick
                    }
                    mobile
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          /* ==================================================
             SEARCH BUTTON
          ================================================== */

          <button
            type="button"
            onClick={openSearch}
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-slate-200
              text-slate-500
              transition-all
              hover:border-indigo-200
              hover:bg-indigo-50
              hover:text-indigo-600
              active:scale-95
              dark:border-slate-700
              dark:text-slate-400
              dark:hover:border-indigo-500/30
              dark:hover:bg-indigo-500/10
              dark:hover:text-indigo-400
            "
            title="Search"
            aria-label="Open search"
          >
            <Search size={19} />
          </button>
        )}

        {/* ==================================================
            PROFILE
        ================================================== */}

        <button
          type="button"
          onClick={() =>
            navigate("/settings")
          }
          className="
            group
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            overflow-hidden
            rounded-xl
            bg-indigo-600
            font-semibold
            text-white
            shadow-sm
            ring-2
            ring-transparent
            transition-all
            hover:bg-indigo-700
            hover:shadow-md
            hover:ring-indigo-500/20
            active:scale-95
            dark:bg-indigo-500
            dark:hover:bg-indigo-400
            dark:hover:ring-indigo-400/20
          "
          title={`${userName} · Open Settings`}
          aria-label={`Open settings for ${userName}`}
        >
          {userPhoto ? (
            <img
              src={userPhoto}
              alt={userName}
              className="
                h-full
                w-full
                object-cover
              "
            />
          ) : (
            userInitial
          )}
        </button>
      </div>
    </header>
  );
}

export default Header;