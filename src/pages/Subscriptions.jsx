import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CreditCard,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  addSubscription,
  deleteSubscription,
  getSubscriptions,
  updateSubscription,
} from "../services/subscriptionService";

const categories = [
  "Entertainment",
  "Music",
  "Streaming",
  "Software",
  "Education",
  "Fitness",
  "Cloud Storage",
  "Other",
];

const initialForm = {
  name: "",
  amount: "",
  billingCycle: "monthly",
  nextPaymentDate: "",
  category: "Entertainment",
  note: "",
};

const currencyNames = {
  INR: "Indian Rupee",
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
};

function getCurrency() {
  return localStorage.getItem("spendnest_currency") || "INR";
}

function formatCurrency(amount, currency) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function formatDate(dateString) {
  if (!dateString) return "No date";

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

function getDaysUntilPayment(dateString) {
  if (!dateString) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const paymentDate = new Date(
    `${dateString}T00:00:00`
  );

  if (Number.isNaN(paymentDate.getTime())) {
    return null;
  }

  return Math.ceil(
    (paymentDate.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState("all");
  const [billingFilter, setBillingFilter] =
    useState("all");

  const [form, setForm] = useState(initialForm);

  const [currency, setCurrency] = useState(getCurrency);

  // --------------------------------------------------
  // LOAD DATA
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    async function loadSubscriptions() {
      try {
        const data = await getSubscriptions();

        if (!active) return;

        setSubscriptions(
          Array.isArray(data) ? data : []
        );
      } catch (err) {
        console.error(
          "Subscriptions load error:",
          err
        );

        if (active) {
          setError(
            err?.message ||
              "Unable to load subscriptions."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSubscriptions();

    return () => {
      active = false;
    };
  }, []);

  // --------------------------------------------------
  // CURRENCY
  // --------------------------------------------------

  useEffect(() => {
    function handleStorageChange() {
      setCurrency(getCurrency());
    }

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };
  }, []);

  // --------------------------------------------------
  // REFRESH
  // --------------------------------------------------

  async function handleRefresh() {
    try {
      setRefreshing(true);
      setError("");

      const data = await getSubscriptions();

      setSubscriptions(
        Array.isArray(data) ? data : []
      );

      setCurrency(getCurrency());
    } catch (err) {
      console.error(
        "Subscriptions refresh error:",
        err
      );

      setError(
        err?.message ||
          "Unable to refresh subscriptions."
      );
    } finally {
      setRefreshing(false);
    }
  }

  // --------------------------------------------------
  // FORM
  // --------------------------------------------------

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function openAddModal() {
    resetForm();
    setError("");
    setShowModal(true);
  }

  function openEditModal(subscription) {
    setEditingId(subscription.id);

    setForm({
      name: subscription.name || "",
      amount: subscription.amount ?? "",
      billingCycle:
        subscription.billingCycle || "monthly",
      nextPaymentDate:
        subscription.nextPaymentDate || "",
      category:
        subscription.category || "Other",
      note: subscription.note || "",
    });

    setError("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    resetForm();
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // --------------------------------------------------
  // SAVE
  // --------------------------------------------------

  async function handleSubmit(event) {
    event.preventDefault();

    const name = form.name.trim();
    const amount = Number(form.amount);

    if (!name) {
      setError(
        "Please enter a subscription name."
      );
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError(
        "Please enter a valid subscription amount."
      );
      return;
    }

    if (!form.nextPaymentDate) {
      setError(
        "Please select the next payment date."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const subscriptionData = {
        name,
        amount,
        billingCycle: form.billingCycle,
        nextPaymentDate: form.nextPaymentDate,
        category: form.category,
        note: form.note.trim(),
        status: "active",
      };

      if (editingId) {
        const updatedSubscription =
          await updateSubscription(
            editingId,
            subscriptionData
          );

        setSubscriptions((previous) =>
          previous.map((subscription) =>
            subscription.id === editingId
              ? {
                  ...subscription,
                  ...updatedSubscription,
                  ...subscriptionData,
                }
              : subscription
          )
        );
      } else {
        const newSubscription =
          await addSubscription(
            subscriptionData
          );

        setSubscriptions((previous) => [
          newSubscription,
          ...previous,
        ]);
      }

      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error(
        "Save subscription error:",
        err
      );

      setError(
        err?.message ||
          "Unable to save subscription."
      );
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // DELETE
  // --------------------------------------------------

  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this subscription?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError("");

      await deleteSubscription(id);

      setSubscriptions((previous) =>
        previous.filter(
          (subscription) =>
            subscription.id !== id
        )
      );
    } catch (err) {
      console.error(
        "Delete subscription error:",
        err
      );

      setError(
        err?.message ||
          "Unable to delete subscription."
      );
    } finally {
      setDeletingId(null);
    }
  }

  // --------------------------------------------------
  // PROCESSED DATA
  // --------------------------------------------------

  const processedSubscriptions = useMemo(() => {
    return subscriptions.map((subscription) => {
      const amount = Number(
        subscription.amount || 0
      );

      const daysUntilPayment =
        getDaysUntilPayment(
          subscription.nextPaymentDate
        );

      const isPastDue =
        daysUntilPayment !== null &&
        daysUntilPayment < 0;

      const isUpcoming =
        daysUntilPayment !== null &&
        daysUntilPayment >= 0 &&
        daysUntilPayment <= 7;

      return {
        ...subscription,
        amount,
        daysUntilPayment,
        isPastDue,
        isUpcoming,
      };
    });
  }, [subscriptions]);

  // --------------------------------------------------
  // FILTERING
  // --------------------------------------------------

  const filteredSubscriptions = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return processedSubscriptions.filter(
      (subscription) => {
        const matchesSearch =
          !keyword ||
          [
            subscription.name,
            subscription.category,
            subscription.billingCycle,
            subscription.note,
            subscription.nextPaymentDate,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(keyword);

        const matchesCategory =
          categoryFilter === "all" ||
          subscription.category ===
            categoryFilter;

        const matchesBilling =
          billingFilter === "all" ||
          subscription.billingCycle ===
            billingFilter;

        return (
          matchesSearch &&
          matchesCategory &&
          matchesBilling
        );
      }
    );
  }, [
    processedSubscriptions,
    search,
    categoryFilter,
    billingFilter,
  ]);

  // --------------------------------------------------
  // SUMMARY
  // --------------------------------------------------

  const summary = useMemo(() => {
    let monthly = 0;
    let yearly = 0;

    processedSubscriptions.forEach(
      (subscription) => {
        if (
          subscription.billingCycle === "yearly"
        ) {
          yearly += subscription.amount;
          monthly +=
            subscription.amount / 12;
        } else {
          monthly += subscription.amount;
          yearly +=
            subscription.amount * 12;
        }
      }
    );

    const upcoming = processedSubscriptions.filter(
      (subscription) =>
        subscription.isUpcoming
    ).length;

    const pastDue = processedSubscriptions.filter(
      (subscription) =>
        subscription.isPastDue
    ).length;

    return {
      monthly,
      yearly,
      upcoming,
      pastDue,
      active: processedSubscriptions.length,
    };
  }, [processedSubscriptions]);

  const upcomingSubscriptions = useMemo(() => {
    return processedSubscriptions
      .filter(
        (subscription) =>
          subscription.isUpcoming
      )
      .sort(
        (a, b) =>
          (a.daysUntilPayment ?? 9999) -
          (b.daysUntilPayment ?? 9999)
      );
  }, [processedSubscriptions]);

  const currencyLabel =
    currencyNames[currency] || currency;

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* ================================================
          HEADER
      ================================================= */}

      <section
        className="
          overflow-hidden rounded-3xl
          border border-slate-200
          bg-white shadow-sm
          dark:border-slate-800
          dark:bg-slate-900
        "
      >
        <div className="flex flex-col gap-6 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span
                className="
                  flex h-9 w-9 items-center
                  justify-center rounded-xl
                  bg-indigo-50 text-indigo-600
                  dark:bg-indigo-500/15
                  dark:text-indigo-400
                "
              >
                <CreditCard size={18} />
              </span>

              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Recurring payments
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Subscriptions
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Keep track of recurring payments, upcoming
              renewals, and your subscription costs.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="
                inline-flex h-11 items-center
                justify-center gap-2 rounded-xl
                border border-slate-200
                bg-white px-4
                text-sm font-semibold
                text-slate-600 shadow-sm
                transition hover:bg-slate-50
                disabled:cursor-not-allowed
                disabled:opacity-50
                dark:border-slate-700
                dark:bg-slate-800
                dark:text-slate-300
                dark:hover:bg-slate-700
              "
            >
              <RefreshCw
                size={16}
                className={
                  refreshing ? "animate-spin" : ""
                }
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={openAddModal}
              className="
                inline-flex h-11 items-center
                justify-center gap-2 rounded-xl
                bg-indigo-600 px-5
                text-sm font-semibold text-white
                shadow-sm shadow-indigo-500/20
                transition hover:bg-indigo-700
                dark:bg-indigo-500
                dark:hover:bg-indigo-400
              "
            >
              <Plus size={18} />
              Add Subscription
            </button>
          </div>
        </div>
      </section>

      {/* ================================================
          ERROR
      ================================================= */}

      {error && (
        <div
          role="alert"
          className="
            flex items-start gap-3 rounded-2xl
            border border-rose-200
            bg-rose-50 px-4 py-3
            text-sm text-rose-700
            dark:border-rose-500/20
            dark:bg-rose-500/10
            dark:text-rose-300
          "
        >
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              Something went wrong
            </p>

            <p className="mt-0.5 text-xs opacity-80">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setError("")}
            className="rounded-lg p-1 hover:bg-rose-100 dark:hover:bg-rose-500/10"
            aria-label="Dismiss error"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* ================================================
          SUMMARY
      ================================================= */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div
          className="
            rounded-2xl border border-slate-200
            bg-white p-5 shadow-sm
            dark:border-slate-800
            dark:bg-slate-900
          "
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Monthly cost
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {formatCurrency(
              summary.monthly,
              currency
            )}
          </p>

          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
            Estimated recurring monthly expense
          </p>
        </div>

        <div
          className="
            rounded-2xl border border-slate-200
            bg-white p-5 shadow-sm
            dark:border-slate-800
            dark:bg-slate-900
          "
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Yearly cost
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {formatCurrency(
              summary.yearly,
              currency
            )}
          </p>

          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
            Estimated cost over 12 months
          </p>
        </div>

        <div
          className="
            rounded-2xl border border-slate-200
            bg-white p-5 shadow-sm
            dark:border-slate-800
            dark:bg-slate-900
          "
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Active subscriptions
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
            {summary.active}
          </p>

          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
            Currently tracked recurring payments
          </p>
        </div>

        <div
          className="
            rounded-2xl border border-slate-200
            bg-white p-5 shadow-sm
            dark:border-slate-800
            dark:bg-slate-900
          "
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Upcoming
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
            {summary.upcoming}
          </p>

          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
            Payments due within 7 days
          </p>
        </div>
      </section>

      {/* ================================================
          UPCOMING PAYMENTS
      ================================================= */}

      {upcomingSubscriptions.length > 0 && (
        <section
          className="
            rounded-2xl border
            border-amber-200
            bg-amber-50/70
            p-5
            dark:border-amber-500/20
            dark:bg-amber-500/5
          "
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
              <CalendarDays size={19} />
            </div>

            <div>
              <h2 className="font-semibold text-amber-900 dark:text-amber-300">
                Upcoming payments
              </h2>

              <p className="mt-1 text-xs text-amber-700/70 dark:text-amber-400/70">
                You have {upcomingSubscriptions.length}{" "}
                payment
                {upcomingSubscriptions.length === 1
                  ? ""
                  : "s"}{" "}
                due within the next 7 days.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {upcomingSubscriptions.map(
              (subscription) => {
                const days =
                  subscription.daysUntilPayment;

                return (
                  <div
                    key={subscription.id}
                    className="
                      flex flex-col gap-3
                      rounded-xl
                      bg-white px-4 py-3
                      sm:flex-row
                      sm:items-center
                      sm:justify-between
                      dark:bg-slate-900/80
                    "
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {subscription.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(
                          subscription.nextPaymentDate
                        )}{" "}
                        ·{" "}
                        {formatCurrency(
                          subscription.amount,
                          currency
                        )}
                      </p>
                    </div>

                    <span className="shrink-0 self-start rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 sm:self-auto">
                      {days === 0
                        ? "Due today"
                        : days === 1
                        ? "Tomorrow"
                        : `${days} days`}
                    </span>
                  </div>
                );
              }
            )}
          </div>
        </section>
      )}

      {/* ================================================
          SEARCH + FILTERS
      ================================================= */}

      {!loading && subscriptions.length > 0 && (
        <section
          className="
            rounded-2xl border border-slate-200
            bg-white p-4 shadow-sm
            dark:border-slate-800
            dark:bg-slate-900
          "
        >
          <div className="flex flex-col gap-3 xl:flex-row">
            {/* Search */}
            <div className="relative min-w-0 flex-1">
              <Search
                size={17}
                className="
                  absolute left-3.5 top-1/2
                  -translate-y-1/2
                  text-slate-400
                  dark:text-slate-500
                "
              />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search subscriptions..."
                aria-label="Search subscriptions"
                className="
                  h-11 w-full rounded-xl
                  border border-slate-200
                  bg-slate-50
                  pl-10 pr-10
                  text-sm text-slate-800
                  outline-none transition
                  placeholder:text-slate-400
                  focus:border-indigo-400
                  focus:bg-white
                  focus:ring-4
                  focus:ring-indigo-500/10
                  dark:border-slate-700
                  dark:bg-slate-800
                  dark:text-slate-100
                  dark:placeholder:text-slate-500
                  dark:focus:border-indigo-500
                  dark:focus:bg-slate-950
                "
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="
                    absolute right-3 top-1/2
                    -translate-y-1/2 rounded-md
                    p-1 text-slate-400
                    hover:bg-slate-200
                    dark:hover:bg-slate-700
                  "
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Category */}
            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(
                  event.target.value
                )
              }
              aria-label="Filter by category"
              className="
                h-11 rounded-xl
                border border-slate-200
                bg-slate-50 px-4
                text-sm font-medium
                text-slate-700
                outline-none
                focus:border-indigo-400
                dark:border-slate-700
                dark:bg-slate-800
                dark:text-slate-200
              "
            >
              <option value="all">
                All categories
              </option>

              {categories.map((category) => (
                <option
                  key={category}
                  value={category}
                >
                  {category}
                </option>
              ))}
            </select>

            {/* Billing */}
            <select
              value={billingFilter}
              onChange={(event) =>
                setBillingFilter(
                  event.target.value
                )
              }
              aria-label="Filter by billing cycle"
              className="
                h-11 rounded-xl
                border border-slate-200
                bg-slate-50 px-4
                text-sm font-medium
                text-slate-700
                outline-none
                focus:border-indigo-400
                dark:border-slate-700
                dark:bg-slate-800
                dark:text-slate-200
              "
            >
              <option value="all">
                All billing cycles
              </option>

              <option value="monthly">
                Monthly
              </option>

              <option value="yearly">
                Yearly
              </option>
            </select>
          </div>

          {(search ||
            categoryFilter !== "all" ||
            billingFilter !== "all") && (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Showing{" "}
                {filteredSubscriptions.length}{" "}
                of {subscriptions.length} subscriptions
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("all");
                  setBillingFilter("all");
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                Reset filters
              </button>
            </div>
          )}
        </section>
      )}

      {/* ================================================
          LIST
      ================================================= */}

      <section>
        {loading ? (
          <div
            className="
              flex min-h-72 items-center
              justify-center rounded-2xl
              border border-slate-200
              bg-white shadow-sm
              dark:border-slate-800
              dark:bg-slate-900
            "
          >
            <div className="flex flex-col items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
              <Loader2
                size={25}
                className="animate-spin text-indigo-500"
              />

              <span>
                Loading subscriptions...
              </span>
            </div>
          </div>
        ) : subscriptions.length === 0 ? (
          <div
            className="
              rounded-3xl border border-dashed
              border-slate-300 bg-white
              px-6 py-16 text-center
              shadow-sm
              dark:border-slate-700
              dark:bg-slate-900
            "
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
              <CreditCard size={28} />
            </div>

            <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
              No subscriptions yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              Add your recurring payments so SpendNest
              can help you keep track of your monthly
              and yearly costs.
            </p>

            <button
              type="button"
              onClick={openAddModal}
              className="
                mt-6 inline-flex items-center
                gap-2 rounded-xl
                bg-indigo-600 px-5 py-3
                text-sm font-semibold text-white
                transition hover:bg-indigo-700
                dark:bg-indigo-500
                dark:hover:bg-indigo-400
              "
            >
              <Plus size={17} />
              Add your first subscription
            </button>
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div
            className="
              rounded-2xl border border-slate-200
              bg-white px-6 py-14
              text-center shadow-sm
              dark:border-slate-800
              dark:bg-slate-900
            "
          >
            <Search
              size={28}
              className="mx-auto text-slate-300 dark:text-slate-600"
            />

            <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
              No matching subscriptions
            </h3>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Try a different search or filter.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {filteredSubscriptions.map(
              (subscription) => {
                const days =
                  subscription.daysUntilPayment;

                const isDeleting =
                  deletingId === subscription.id;

                return (
                  <article
                    key={subscription.id}
                    className="
                      group rounded-2xl
                      border border-slate-200
                      bg-white p-5 shadow-sm
                      transition duration-200
                      hover:-translate-y-0.5
                      hover:shadow-md
                      dark:border-slate-800
                      dark:bg-slate-900
                      dark:hover:border-slate-700
                    "
                  >
                    {/* TOP */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <div
                          className={`
                            flex h-11 w-11
                            shrink-0 items-center
                            justify-center rounded-xl
                            ${
                              subscription.isPastDue
                                ? "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
                                : subscription.isUpcoming
                                ? "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
                                : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
                            }
                          `}
                        >
                          <CreditCard size={21} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate font-semibold text-slate-900 dark:text-white">
                              {subscription.name}
                            </h3>

                            {subscription.isPastDue && (
                              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                                Past due
                              </span>
                            )}

                            {subscription.isUpcoming && (
                              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                                Upcoming
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {subscription.category}
                            </span>

                            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium capitalize text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                              {subscription.billingCycle}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ACTIONS */}
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            openEditModal(
                              subscription
                            )
                          }
                          className="
                            rounded-lg p-2
                            text-slate-400
                            transition
                            hover:bg-slate-100
                            hover:text-slate-700
                            dark:text-slate-500
                            dark:hover:bg-slate-800
                            dark:hover:text-slate-200
                          "
                          title="Edit subscription"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(
                              subscription.id
                            )
                          }
                          disabled={isDeleting}
                          className="
                            rounded-lg p-2
                            text-slate-400
                            transition
                            hover:bg-rose-50
                            hover:text-rose-600
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                            dark:text-slate-500
                            dark:hover:bg-rose-500/10
                            dark:hover:text-rose-400
                          "
                          title="Delete subscription"
                        >
                          {isDeleting ? (
                            <Loader2
                              size={16}
                              className="animate-spin"
                            />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* AMOUNT */}
                    <div className="mt-6 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                          Amount
                        </p>

                        <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                          {formatCurrency(
                            subscription.amount,
                            currency
                          )}
                        </p>

                        <p className="mt-0.5 text-xs capitalize text-slate-400 dark:text-slate-500">
                          per{" "}
                          {subscription.billingCycle}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                          Next payment
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {formatDate(
                            subscription.nextPaymentDate
                          )}
                        </p>

                        {days !== null && (
                          <p
                            className={`
                              mt-1 text-xs font-semibold
                              ${
                                days < 0
                                  ? "text-rose-600 dark:text-rose-400"
                                  : days <= 7
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-slate-400 dark:text-slate-500"
                              }
                            `}
                          >
                            {days < 0
                              ? `${Math.abs(
                                  days
                                )} ${
                                  Math.abs(days) === 1
                                    ? "day"
                                    : "days"
                                } overdue`
                              : days === 0
                              ? "Due today"
                              : days === 1
                              ? "Tomorrow"
                              : `${days} days left`}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* NOTE */}
                    {subscription.note && (
                      <div className="mt-5 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/70">
                        <p className="line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          {subscription.note}
                        </p>
                      </div>
                    )}
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>

      {/* ================================================
          MODAL
      ================================================= */}

      {showModal && (
        <div
          className="
            fixed inset-0 z-50
            flex items-center justify-center
            bg-slate-950/60
            px-4 py-6
            backdrop-blur-sm
          "
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              closeModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="subscription-modal-title"
            className="
              max-h-[90vh] w-full max-w-lg
              overflow-y-auto rounded-3xl
              border border-slate-200
              bg-white shadow-2xl
              dark:border-slate-700
              dark:bg-slate-900
            "
          >
            {/* MODAL HEADER */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
                    <CreditCard size={17} />
                  </div>

                  <h2
                    id="subscription-modal-title"
                    className="text-lg font-bold text-slate-900 dark:text-white"
                  >
                    {editingId
                      ? "Edit Subscription"
                      : "Add Subscription"}
                  </h2>
                </div>

                <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                  Add the details of your recurring payment.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="
                  rounded-xl p-2
                  text-slate-400
                  transition
                  hover:bg-slate-100
                  hover:text-slate-700
                  disabled:opacity-40
                  dark:text-slate-500
                  dark:hover:bg-slate-800
                  dark:hover:text-slate-200
                "
                aria-label="Close modal"
              >
                <X size={19} />
              </button>
            </div>

            {/* FORM */}
            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >
              {/* NAME */}
              <div>
                <label
                  htmlFor="subscription-name"
                  className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Subscription name
                </label>

                <input
                  id="subscription-name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Netflix"
                  maxLength={80}
                  autoFocus
                  className="
                    w-full rounded-xl
                    border border-slate-200
                    bg-white px-4 py-3
                    text-sm text-slate-800
                    outline-none transition
                    placeholder:text-slate-400
                    focus:border-indigo-400
                    focus:ring-4
                    focus:ring-indigo-500/10
                    dark:border-slate-700
                    dark:bg-slate-800
                    dark:text-slate-100
                    dark:placeholder:text-slate-500
                    dark:focus:border-indigo-500
                  "
                />
              </div>

              {/* AMOUNT + BILLING */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="subscription-amount"
                    className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Amount
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      {currency}
                    </span>

                    <input
                      id="subscription-amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      name="amount"
                      value={form.amount}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="
                        w-full rounded-xl
                        border border-slate-200
                        bg-white py-3 pl-14 pr-4
                        text-sm text-slate-800
                        outline-none transition
                        focus:border-indigo-400
                        focus:ring-4
                        focus:ring-indigo-500/10
                        dark:border-slate-700
                        dark:bg-slate-800
                        dark:text-slate-100
                        dark:focus:border-indigo-500
                      "
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="subscription-billing"
                    className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Billing cycle
                  </label>

                  <select
                    id="subscription-billing"
                    name="billingCycle"
                    value={form.billingCycle}
                    onChange={handleChange}
                    className="
                      w-full rounded-xl
                      border border-slate-200
                      bg-white px-4 py-3
                      text-sm text-slate-800
                      outline-none transition
                      focus:border-indigo-400
                      focus:ring-4
                      focus:ring-indigo-500/10
                      dark:border-slate-700
                      dark:bg-slate-800
                      dark:text-slate-100
                      dark:focus:border-indigo-500
                    "
                  >
                    <option value="monthly">
                      Monthly
                    </option>

                    <option value="yearly">
                      Yearly
                    </option>
                  </select>
                </div>
              </div>

              {/* CATEGORY */}
              <div>
                <label
                  htmlFor="subscription-category"
                  className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Category
                </label>

                <select
                  id="subscription-category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="
                    w-full rounded-xl
                    border border-slate-200
                    bg-white px-4 py-3
                    text-sm text-slate-800
                    outline-none transition
                    focus:border-indigo-400
                    focus:ring-4
                    focus:ring-indigo-500/10
                    dark:border-slate-700
                    dark:bg-slate-800
                    dark:text-slate-100
                    dark:focus:border-indigo-500
                  "
                >
                  {categories.map((category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* DATE */}
              <div>
                <label
                  htmlFor="subscription-date"
                  className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Next payment date
                </label>

                <input
                  id="subscription-date"
                  type="date"
                  name="nextPaymentDate"
                  value={form.nextPaymentDate}
                  onChange={handleChange}
                  className="
                    w-full rounded-xl
                    border border-slate-200
                    bg-white px-4 py-3
                    text-sm text-slate-800
                    outline-none transition
                    focus:border-indigo-400
                    focus:ring-4
                    focus:ring-indigo-500/10
                    dark:border-slate-700
                    dark:bg-slate-800
                    dark:text-slate-100
                    dark:focus:border-indigo-500
                  "
                />
              </div>

              {/* NOTE */}
              <div>
                <label
                  htmlFor="subscription-note"
                  className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Note
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    optional
                  </span>
                </label>

                <textarea
                  id="subscription-note"
                  name="note"
                  value={form.note}
                  onChange={handleChange}
                  rows={3}
                  maxLength={300}
                  placeholder="Optional note..."
                  className="
                    w-full resize-none rounded-xl
                    border border-slate-200
                    bg-white px-4 py-3
                    text-sm text-slate-800
                    outline-none transition
                    placeholder:text-slate-400
                    focus:border-indigo-400
                    focus:ring-4
                    focus:ring-indigo-500/10
                    dark:border-slate-700
                    dark:bg-slate-800
                    dark:text-slate-100
                    dark:placeholder:text-slate-500
                    dark:focus:border-indigo-500
                  "
                />
              </div>

              {/* CURRENCY INFO */}
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
                <CreditCard
                  size={17}
                  className="shrink-0 text-indigo-500"
                />

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Amounts are displayed in{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {currency} · {currencyLabel}
                  </span>
                  .
                </p>
              </div>

              {/* BUTTONS */}
              <div className="flex gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="
                    flex-1 rounded-xl
                    border border-slate-200
                    bg-white px-4 py-3
                    text-sm font-semibold
                    text-slate-600
                    transition hover:bg-slate-50
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                    dark:border-slate-700
                    dark:bg-slate-800
                    dark:text-slate-300
                    dark:hover:bg-slate-700
                  "
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="
                    flex flex-1 items-center
                    justify-center gap-2
                    rounded-xl
                    bg-indigo-600 px-4 py-3
                    text-sm font-semibold text-white
                    transition hover:bg-indigo-700
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                    dark:bg-indigo-500
                    dark:hover:bg-indigo-400
                  "
                >
                  {saving && (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  )}

                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Subscription"
                    : "Add Subscription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Subscriptions;