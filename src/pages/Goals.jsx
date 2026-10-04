import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Target,
  Trash2,
  X,
} from "lucide-react";

import {
  addGoal,
  deleteGoal,
  getGoals,
  updateGoal,
} from "../services/goalService";

const initialForm = {
  name: "",
  targetAmount: "",
  currentAmount: "",
  deadline: "",
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
  const safeAmount = Number(amount || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(safeAmount);
}

function formatDate(dateString) {
  if (!dateString) return "";

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

function getDaysRemaining(deadline) {
  if (!deadline) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(`${deadline}T00:00:00`);

  if (Number.isNaN(targetDate.getTime())) {
    return null;
  }

  return Math.ceil(
    (targetDate.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

function Goals() {
  const [goals, setGoals] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [currency, setCurrency] = useState(getCurrency);

  const [form, setForm] = useState(initialForm);

  // --------------------------------------------------
  // LOAD GOALS
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    async function loadInitialGoals() {
      try {
        const data = await getGoals();

        if (!active) return;

        setGoals(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Goals load error:", err);

        if (active) {
          setError(
            err?.message || "Unable to load your goals."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadInitialGoals();

    return () => {
      active = false;
    };
  }, []);

  // --------------------------------------------------
  // CURRENCY
  // --------------------------------------------------

  useEffect(() => {
    const handleStorageChange = () => {
      setCurrency(getCurrency());
    };

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

      const data = await getGoals();

      setGoals(Array.isArray(data) ? data : []);
      setCurrency(getCurrency());
    } catch (err) {
      console.error("Goals refresh error:", err);

      setError(
        err?.message || "Unable to refresh your goals."
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

  function openEditModal(goal) {
    setEditingId(goal.id);

    setForm({
      name: goal.name || "",
      targetAmount: goal.targetAmount ?? "",
      currentAmount: goal.currentAmount ?? "",
      deadline: goal.deadline || "",
      note: goal.note || "",
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
  // SAVE GOAL
  // --------------------------------------------------

  async function handleSubmit(event) {
    event.preventDefault();

    const name = form.name.trim();
    const targetAmount = Number(form.targetAmount);
    const currentAmount = Number(form.currentAmount || 0);

    if (!name) {
      setError("Please enter a goal name.");
      return;
    }

    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      setError("Please enter a valid target amount.");
      return;
    }

    if (!Number.isFinite(currentAmount) || currentAmount < 0) {
      setError("Saved amount cannot be negative.");
      return;
    }

    if (currentAmount > targetAmount) {
      setError(
        "Saved amount cannot be greater than the target."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const isCompleted =
        currentAmount >= targetAmount;

      const goalData = {
        name,
        targetAmount,
        currentAmount,
        deadline: form.deadline,
        note: form.note.trim(),
        status: isCompleted ? "completed" : "active",
      };

      if (editingId) {
        const updatedGoal = await updateGoal(
          editingId,
          goalData
        );

        setGoals((previous) =>
          previous.map((goal) =>
            goal.id === editingId
              ? {
                  ...goal,
                  ...updatedGoal,
                  ...goalData,
                }
              : goal
          )
        );
      } else {
        const newGoal = await addGoal(goalData);

        setGoals((previous) => [
          newGoal,
          ...previous,
        ]);
      }

      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error("Save goal error:", err);

      setError(
        err?.message || "Unable to save your goal."
      );
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // DELETE
  // --------------------------------------------------

  async function handleDelete(goalId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this goal?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(goalId);
      setError("");

      await deleteGoal(goalId);

      setGoals((previous) =>
        previous.filter((goal) => goal.id !== goalId)
      );
    } catch (err) {
      console.error("Delete goal error:", err);

      setError(
        err?.message || "Unable to delete this goal."
      );
    } finally {
      setDeletingId(null);
    }
  }

  // --------------------------------------------------
  // DERIVED GOALS
  // --------------------------------------------------

  const processedGoals = useMemo(() => {
    return goals.map((goal) => {
      const target = Number(goal.targetAmount || 0);
      const saved = Number(goal.currentAmount || 0);

      const percentage =
        target > 0
          ? Math.min((saved / target) * 100, 100)
          : 0;

      const remaining = Math.max(
        target - saved,
        0
      );

      const completed = saved >= target;

      const daysRemaining = getDaysRemaining(
        goal.deadline
      );

      const overdue =
        !completed &&
        daysRemaining !== null &&
        daysRemaining < 0;

      const status = completed
        ? "completed"
        : overdue
        ? "overdue"
        : "active";

      return {
        ...goal,
        target,
        saved,
        percentage,
        remaining,
        completed,
        daysRemaining,
        overdue,
        status,
      };
    });
  }, [goals]);

  // --------------------------------------------------
  // SEARCH + FILTER
  // --------------------------------------------------

  const filteredGoals = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return processedGoals.filter((goal) => {
      const matchesSearch =
        !keyword ||
        [
          goal.name,
          goal.note,
          goal.deadline,
          goal.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(keyword);

      const matchesStatus =
        statusFilter === "all" ||
        goal.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [processedGoals, search, statusFilter]);

  // --------------------------------------------------
  // SUMMARY
  // --------------------------------------------------

  const summary = useMemo(() => {
    const target = processedGoals.reduce(
      (total, goal) => total + goal.target,
      0
    );

    const saved = processedGoals.reduce(
      (total, goal) => total + goal.saved,
      0
    );

    const completed = processedGoals.filter(
      (goal) => goal.completed
    ).length;

    const active = processedGoals.filter(
      (goal) => !goal.completed
    ).length;

    const overallProgress =
      target > 0
        ? Math.min((saved / target) * 100, 100)
        : 0;

    return {
      target,
      saved,
      remaining: Math.max(target - saved, 0),
      completed,
      active,
      overallProgress,
    };
  }, [processedGoals]);

  const currencyLabel =
    currencyNames[currency] || currency;

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* ================================================
          PAGE HEADER
      ================================================= */}

      <section
        className="
          overflow-hidden rounded-3xl
          border border-slate-200
          bg-white
          shadow-sm
          dark:border-slate-800
          dark:bg-slate-900
        "
      >
        <div className="flex flex-col gap-6 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2">
              <span
                className="
                  flex h-9 w-9 items-center justify-center
                  rounded-xl
                  bg-indigo-50 text-indigo-600
                  dark:bg-indigo-500/15
                  dark:text-indigo-400
                "
              >
                <Target size={19} />
              </span>

              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Financial planning
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Goals
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Set meaningful financial targets and keep
              track of how close you are to achieving them.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="
                inline-flex h-11 items-center justify-center
                gap-2 rounded-xl
                border border-slate-200
                bg-white px-4
                text-sm font-semibold text-slate-600
                shadow-sm transition
                hover:bg-slate-50
                disabled:cursor-not-allowed
                disabled:opacity-50
                dark:border-slate-700
                dark:bg-slate-800
                dark:text-slate-300
                dark:hover:bg-slate-700
              "
              title="Refresh goals"
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
                inline-flex h-11 items-center justify-center
                gap-2 rounded-xl
                bg-indigo-600 px-5
                text-sm font-semibold text-white
                shadow-sm shadow-indigo-500/20
                transition
                hover:bg-indigo-700
                hover:shadow-md
                dark:bg-indigo-500
                dark:hover:bg-indigo-400
              "
            >
              <Plus size={18} />
              Add Goal
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
            className="rounded-lg p-1 transition hover:bg-rose-100 dark:hover:bg-rose-500/10"
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
            dark:border-slate-800 dark:bg-slate-900
          "
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Total target
              </p>

              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {formatCurrency(
                  summary.target,
                  currency
                )}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
              <Target size={19} />
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
            Across {goals.length}{" "}
            {goals.length === 1 ? "goal" : "goals"}
          </p>
        </div>

        <div
          className="
            rounded-2xl border border-slate-200
            bg-white p-5 shadow-sm
            dark:border-slate-800 dark:bg-slate-900
          "
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Total saved
              </p>

              <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {formatCurrency(
                  summary.saved,
                  currency
                )}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              <CircleDollarSign size={19} />
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
            {Math.round(summary.overallProgress)}%
            overall progress
          </p>
        </div>

        <div
          className="
            rounded-2xl border border-slate-200
            bg-white p-5 shadow-sm
            dark:border-slate-800 dark:bg-slate-900
          "
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Remaining
              </p>

              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {formatCurrency(
                  summary.remaining,
                  currency
                )}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
              <Clock3 size={19} />
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
            Amount needed to reach all targets
          </p>
        </div>

        <div
          className="
            rounded-2xl border border-slate-200
            bg-white p-5 shadow-sm
            dark:border-slate-800 dark:bg-slate-900
          "
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Completed
              </p>

              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {summary.completed}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              <CheckCircle2 size={19} />
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
            {summary.active} active{" "}
            {summary.active === 1 ? "goal" : "goals"}
          </p>
        </div>
      </section>

      {/* ================================================
          OVERALL PROGRESS
      ================================================= */}

      {goals.length > 0 && (
        <section
          className="
            rounded-2xl border border-slate-200
            bg-white p-5 shadow-sm
            dark:border-slate-800 dark:bg-slate-900
          "
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Overall progress
              </p>

              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Your progress across all financial goals
              </p>
            </div>

            <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              {Math.round(summary.overallProgress)}%
            </p>
          </div>

          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-linear-to-r from-indigo-500 to-violet-500 transition-all duration-500"
              style={{
                width: `${summary.overallProgress}%`,
              }}
            />
          </div>
        </section>
      )}

      {/* ================================================
          SEARCH + FILTER
      ================================================= */}

      {!loading && goals.length > 0 && (
        <section
          className="
            rounded-2xl border border-slate-200
            bg-white p-4 shadow-sm
            dark:border-slate-800 dark:bg-slate-900
          "
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
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
                placeholder="Search goals..."
                aria-label="Search goals"
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
                    hover:text-slate-600
                    dark:hover:bg-slate-700
                    dark:hover:text-slate-200
                  "
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              {[
                {
                  value: "all",
                  label: "All",
                },
                {
                  value: "active",
                  label: "Active",
                },
                {
                  value: "completed",
                  label: "Completed",
                },
                {
                  value: "overdue",
                  label: "Overdue",
                },
              ].map((filter) => {
                const active =
                  statusFilter === filter.value;

                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() =>
                      setStatusFilter(filter.value)
                    }
                    className={`
                      rounded-lg px-3 py-2
                      text-xs font-semibold
                      transition
                      ${
                        active
                          ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      }
                    `}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          {(search || statusFilter !== "all") && (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Showing {filteredGoals.length} of{" "}
                {goals.length} goals
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                Reset
              </button>
            </div>
          )}
        </section>
      )}

      {/* ================================================
          GOALS
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

              <span>Loading your goals...</span>
            </div>
          </div>
        ) : goals.length === 0 ? (
          <div
            className="
              rounded-3xl border border-dashed
              border-slate-300 bg-white
              px-6 py-16 text-center shadow-sm
              dark:border-slate-700
              dark:bg-slate-900
            "
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
              <Target size={29} />
            </div>

            <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
              No financial goals yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              Create a goal for something important and
              start tracking your progress.
            </p>

            <button
              type="button"
              onClick={openAddModal}
              className="
                mt-6 inline-flex items-center gap-2
                rounded-xl bg-indigo-600
                px-5 py-3 text-sm font-semibold
                text-white transition
                hover:bg-indigo-700
                dark:bg-indigo-500
                dark:hover:bg-indigo-400
              "
            >
              <Plus size={17} />
              Create your first goal
            </button>
          </div>
        ) : filteredGoals.length === 0 ? (
          <div
            className="
              rounded-2xl border border-slate-200
              bg-white px-6 py-14 text-center
              shadow-sm
              dark:border-slate-800
              dark:bg-slate-900
            "
          >
            <Search
              size={28}
              className="mx-auto text-slate-300 dark:text-slate-600"
            />

            <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
              No matching goals
            </h3>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Try a different search or status filter.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {filteredGoals.map((goal) => {
              const isDeleting =
                deletingId === goal.id;

              return (
                <article
                  key={goal.id}
                  className="
                    group rounded-2xl
                    border border-slate-200
                    bg-white p-5
                    shadow-sm
                    transition duration-200
                    hover:-translate-y-0.5
                    hover:shadow-md
                    dark:border-slate-800
                    dark:bg-slate-900
                    dark:hover:border-slate-700
                  "
                >
                  {/* Goal top */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={`
                          flex h-11 w-11 shrink-0
                          items-center justify-center
                          rounded-xl
                          ${
                            goal.completed
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                              : goal.overdue
                              ? "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
                              : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
                          }
                        `}
                      >
                        {goal.completed ? (
                          <CheckCircle2 size={21} />
                        ) : (
                          <Target size={21} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-semibold text-slate-900 dark:text-white">
                            {goal.name}
                          </h3>

                          <span
                            className={`
                              rounded-full px-2.5 py-1
                              text-[10px] font-bold
                              uppercase tracking-wide
                              ${
                                goal.completed
                                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                                  : goal.overdue
                                  ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                                  : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                              }
                            `}
                          >
                            {goal.completed
                              ? "Completed"
                              : goal.overdue
                              ? "Overdue"
                              : "Active"}
                          </span>
                        </div>

                        {goal.note && (
                          <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                            {goal.note}
                          </p>
                        )}

                        {goal.deadline && (
                          <div
                            className={`
                              mt-2 flex items-center gap-1.5
                              text-xs
                              ${
                                goal.overdue
                                  ? "text-rose-500 dark:text-rose-400"
                                  : goal.daysRemaining !==
                                      null &&
                                    goal.daysRemaining <= 30
                                  ? "text-amber-500 dark:text-amber-400"
                                  : "text-slate-400 dark:text-slate-500"
                              }
                            `}
                          >
                            <CalendarDays size={13} />

                            <span>
                              {formatDate(
                                goal.deadline
                              )}
                            </span>

                            {goal.completed ? (
                              <span>
                                · Goal completed
                              </span>
                            ) : goal.overdue ? (
                              <span>
                                · {Math.abs(
                                  goal.daysRemaining
                                )}{" "}
                                {Math.abs(
                                  goal.daysRemaining
                                ) === 1
                                  ? "day"
                                  : "days"}{" "}
                                overdue
                              </span>
                            ) : goal.daysRemaining ===
                              0 ? (
                              <span>
                                · Due today
                              </span>
                            ) : (
                              goal.daysRemaining !==
                                null && (
                                <span>
                                  ·{" "}
                                  {goal.daysRemaining}{" "}
                                  {goal.daysRemaining ===
                                  1
                                    ? "day"
                                    : "days"}{" "}
                                  left
                                </span>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          openEditModal(goal)
                        }
                        className="
                          rounded-lg p-2
                          text-slate-400 transition
                          hover:bg-slate-100
                          hover:text-slate-700
                          dark:text-slate-500
                          dark:hover:bg-slate-800
                          dark:hover:text-slate-200
                        "
                        title="Edit goal"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(goal.id)
                        }
                        disabled={isDeleting}
                        className="
                          rounded-lg p-2
                          text-slate-400 transition
                          hover:bg-rose-50
                          hover:text-rose-600
                          disabled:cursor-not-allowed
                          disabled:opacity-50
                          dark:text-slate-500
                          dark:hover:bg-rose-500/10
                          dark:hover:text-rose-400
                        "
                        title="Delete goal"
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

                  {/* Amounts */}
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                        Saved
                      </p>

                      <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                        {formatCurrency(
                          goal.saved,
                          currency
                        )}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                        Target
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-300">
                        {formatCurrency(
                          goal.target,
                          currency
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span
                        className={`
                          text-xs font-semibold
                          ${
                            goal.completed
                              ? "text-emerald-600 dark:text-emerald-400"
                              : goal.overdue
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-indigo-600 dark:text-indigo-400"
                          }
                        `}
                      >
                        {Math.round(
                          goal.percentage
                        )}
                        % complete
                      </span>

                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {goal.completed
                          ? "Target reached"
                          : `${formatCurrency(
                              goal.remaining,
                              currency
                            )} remaining`}
                      </span>
                    </div>

                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`
                          h-full rounded-full
                          transition-all duration-500
                          ${
                            goal.completed
                              ? "bg-emerald-500"
                              : goal.overdue
                              ? "bg-rose-500"
                              : "bg-indigo-500"
                          }
                        `}
                        style={{
                          width: `${goal.percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
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
            aria-labelledby="goal-modal-title"
            className="
              max-h-[90vh] w-full max-w-lg
              overflow-y-auto rounded-3xl
              border border-slate-200
              bg-white shadow-2xl
              dark:border-slate-700
              dark:bg-slate-900
            "
          >
            {/* Modal header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
                    <Target size={17} />
                  </div>

                  <h2
                    id="goal-modal-title"
                    className="text-lg font-bold text-slate-900 dark:text-white"
                  >
                    {editingId
                      ? "Edit Goal"
                      : "Create Financial Goal"}
                  </h2>
                </div>

                <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                  Set your target and keep your progress
                  updated.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="
                  rounded-xl p-2
                  text-slate-400 transition
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

            {/* Modal body */}
            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >
              {/* Name */}
              <div>
                <label
                  htmlFor="goal-name"
                  className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Goal name
                </label>

                <input
                  id="goal-name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. New Laptop"
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

              {/* Amounts */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="goal-target"
                    className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Target amount
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      {currency}
                    </span>

                    <input
                      id="goal-target"
                      type="number"
                      min="0.01"
                      step="0.01"
                      name="targetAmount"
                      value={form.targetAmount}
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
                    htmlFor="goal-current"
                    className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Already saved
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      {currency}
                    </span>

                    <input
                      id="goal-current"
                      type="number"
                      min="0"
                      step="0.01"
                      name="currentAmount"
                      value={form.currentAmount}
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
              </div>

              {/* Deadline */}
              <div>
                <label
                  htmlFor="goal-deadline"
                  className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Deadline
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    optional
                  </span>
                </label>

                <input
                  id="goal-deadline"
                  type="date"
                  name="deadline"
                  value={form.deadline}
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

              {/* Note */}
              <div>
                <label
                  htmlFor="goal-note"
                  className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Note
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    optional
                  </span>
                </label>

                <textarea
                  id="goal-note"
                  name="note"
                  value={form.note}
                  onChange={handleChange}
                  rows={3}
                  maxLength={300}
                  placeholder="What are you saving for?"
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

              {/* Currency info */}
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
                <CircleDollarSign
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

              {/* Buttons */}
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
                    text-slate-600 transition
                    hover:bg-slate-50
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
                    text-sm font-semibold
                    text-white
                    shadow-sm
                    transition
                    hover:bg-indigo-700
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
                    ? "Update Goal"
                    : "Create Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Goals;