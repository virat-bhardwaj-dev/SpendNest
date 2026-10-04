import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  CircleDollarSign,
  Clock3,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";

import {
  addMoneyRecord,
  deleteMoneyRecord,
  getMoneyRecords,
  updateMoneyRecord,
} from "../services/moneyTrackerService";

/* =========================================================
   HELPERS
========================================================= */

const initialForm = {
  personName: "",
  type: "owe",
  amount: "",
  paidAmount: "",
  note: "",
  dueDate: "",
};

function getCurrencyConfig() {
  const savedCurrency =
    localStorage.getItem("spendnest_currency") || "INR";

  const currencies = {
    INR: {
      code: "INR",
      symbol: "₹",
      locale: "en-IN",
    },
    USD: {
      code: "USD",
      symbol: "$",
      locale: "en-US",
    },
    EUR: {
      code: "EUR",
      symbol: "€",
      locale: "de-DE",
    },
    GBP: {
      code: "GBP",
      symbol: "£",
      locale: "en-GB",
    },
    JPY: {
      code: "JPY",
      symbol: "¥",
      locale: "ja-JP",
    },
    AED: {
      code: "AED",
      symbol: "د.إ",
      locale: "en-AE",
    },
    CAD: {
      code: "CAD",
      symbol: "CA$",
      locale: "en-CA",
    },
    AUD: {
      code: "AUD",
      symbol: "A$",
      locale: "en-AU",
    },
  };

  return currencies[savedCurrency] || currencies.INR;
}

function formatCurrency(amount) {
  const currency = getCurrencyConfig();

  return new Intl.NumberFormat(currency.locale, {
    style: "currency",
    currency: currency.code,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getTodayString() {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/* =========================================================
   MONEY TRACKER
========================================================= */

function MoneyTracker() {
  const [records, setRecords] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(initialForm);

  /* =======================================================
     LOAD DATA
  ======================================================= */

async function refreshRecords() {
  try {
    setRefreshing(true);
    setError("");

    const data = await getMoneyRecords();

    setRecords(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error("Money tracker refresh error:", err);

    setError(
      err?.message ||
        "Unable to refresh your money tracker records."
    );
  } finally {
    setRefreshing(false);
  }
}

useEffect(() => {
  let active = true;

  async function loadInitialRecords() {
    try {
      setError("");

      const data = await getMoneyRecords();

      if (!active) return;

      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(
        "Money tracker initial load error:",
        err
      );

      if (active) {
        setError(
          err?.message ||
            "Unable to load your money tracker records."
        );
      }
    } finally {
      if (active) {
        setLoading(false);
      }
    }
  }

  loadInitialRecords();

  return () => {
    active = false;
  };
}, []);

  /* =======================================================
     FORM
  ======================================================= */

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function openAddModal() {
    resetForm();
    setError("");
    setShowModal(true);
  }

  function openEditModal(record) {
    setEditingId(record.id);

    setForm({
      personName: record.personName || "",
      type: record.type || "owe",
      amount: record.amount ?? "",
      paidAmount: record.paidAmount ?? "",
      note: record.note || "",
      dueDate: record.dueDate || "",
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

  /* =======================================================
     SUBMIT
  ======================================================= */

  async function handleSubmit(event) {
    event.preventDefault();

    const personName = form.personName.trim();
    const amount = Number(form.amount);
    const paidAmount = Number(form.paidAmount || 0);

    if (!personName) {
      setError("Please enter the person's name.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Please enter a valid total amount.");
      return;
    }

    if (!Number.isFinite(paidAmount) || paidAmount < 0) {
      setError("Please enter a valid paid amount.");
      return;
    }

    if (paidAmount > amount) {
      setError(
        "Paid amount cannot be greater than the total amount."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const status =
        paidAmount >= amount ? "paid" : "pending";

      const data = {
        personName,
        type: form.type,
        amount,
        paidAmount,
        note: form.note.trim(),
        dueDate: form.dueDate,
        status,
      };

      if (editingId) {
        const updatedRecord = await updateMoneyRecord(
          editingId,
          data
        );

        setRecords((previous) =>
          previous.map((record) =>
            record.id === editingId
              ? {
                  ...record,
                  ...updatedRecord,
                  ...data,
                }
              : record
          )
        );
      } else {
        const newRecord = await addMoneyRecord(data);

        setRecords((previous) => [
          newRecord,
          ...previous,
        ]);
      }

      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error("Money tracker save error:", err);

      setError(
        err?.message || "Unable to save money record."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     DELETE
  ======================================================= */

  async function handleDelete(recordId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this money record?"
    );

    if (!confirmed) return;

    try {
      setProcessingId(recordId);
      setError("");

      await deleteMoneyRecord(recordId);

      setRecords((previous) =>
        previous.filter((record) => record.id !== recordId)
      );
    } catch (err) {
      console.error("Money tracker delete error:", err);

      setError(
        err?.message || "Unable to delete this record."
      );
    } finally {
      setProcessingId(null);
    }
  }

  /* =======================================================
     MARK PAID
  ======================================================= */

  async function handleMarkPaid(record) {
    if (processingId) return;

    try {
      setProcessingId(record.id);
      setError("");

      const amount = Number(record.amount || 0);

      const updatedRecord = await updateMoneyRecord(
        record.id,
        {
          ...record,
          paidAmount: amount,
          status: "paid",
        }
      );

      setRecords((previous) =>
        previous.map((item) =>
          item.id === record.id
            ? {
                ...item,
                ...updatedRecord,
                paidAmount: amount,
                status: "paid",
              }
            : item
        )
      );
    } catch (err) {
      console.error(
        "Money tracker mark paid error:",
        err
      );

      setError(
        err?.message ||
          "Unable to mark this record as paid."
      );
    } finally {
      setProcessingId(null);
    }
  }

  /* =======================================================
     DERIVED RECORD DATA
  ======================================================= */

  const enrichedRecords = useMemo(() => {
    const today = getTodayString();

    return records.map((record) => {
      const amount = Number(record.amount || 0);
      const paidAmount = Number(record.paidAmount || 0);

      const remaining = Math.max(
        amount - paidAmount,
        0
      );

      const progress =
        amount > 0
          ? Math.min((paidAmount / amount) * 100, 100)
          : 0;

      const isPaid =
        record.status === "paid" ||
        remaining <= 0;

      const isOverdue =
        !isPaid &&
        Boolean(record.dueDate) &&
        record.dueDate < today;

      return {
        ...record,
        amount,
        paidAmount,
        remaining,
        progress,
        isPaid,
        isOverdue,
      };
    });
  }, [records]);

  /* =======================================================
     FILTERING
  ======================================================= */

  const filteredRecords = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return enrichedRecords.filter((record) => {
      const searchableText = [
        record.personName,
        record.note,
        record.type,
        record.status,
        record.dueDate,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !keyword ||
        searchableText.includes(keyword);

      let matchesFilter = true;

      if (filter === "owe") {
        matchesFilter = record.type === "owe";
      }

      if (filter === "owed") {
        matchesFilter = record.type === "owed";
      }

      if (filter === "pending") {
        matchesFilter = !record.isPaid;
      }

      if (filter === "paid") {
        matchesFilter = record.isPaid;
      }

      if (filter === "overdue") {
        matchesFilter = record.isOverdue;
      }

      return matchesSearch && matchesFilter;
    });
  }, [enrichedRecords, search, filter]);

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary = useMemo(() => {
    let youOwe = 0;
    let owedToYou = 0;

    let pendingCount = 0;
    let paidCount = 0;
    let overdueCount = 0;

    enrichedRecords.forEach((record) => {
      if (record.type === "owe") {
        youOwe += record.remaining;
      }

      if (record.type === "owed") {
        owedToYou += record.remaining;
      }

      if (record.isPaid) {
        paidCount += 1;
      } else {
        pendingCount += 1;
      }

      if (record.isOverdue) {
        overdueCount += 1;
      }
    });

    return {
      youOwe,
      owedToYou,
      net: owedToYou - youOwe,
      pendingCount,
      paidCount,
      overdueCount,
      totalRecords: enrichedRecords.length,
    };
  }, [enrichedRecords]);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="space-y-6 pb-10">
      {/* ===================================================
          PAGE HEADER
      =================================================== */}

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
        <div className="relative px-5 py-6 sm:px-7 sm:py-7">
          <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-indigo-500/5 blur-3xl dark:bg-indigo-500/10" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div
                  className="
                    flex h-9 w-9 items-center justify-center
                    rounded-xl
                    bg-indigo-50
                    text-indigo-600
                    dark:bg-indigo-500/10
                    dark:text-indigo-400
                  "
                >
                  <Users size={18} />
                </div>

                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600 dark:text-indigo-400">
                  Shared money
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Money Tracker
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Keep track of money you owe and money
                others owe you — all in one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={refreshRecords}
                disabled={refreshing}
                className="
                  inline-flex items-center justify-center gap-2
                  rounded-xl
                  border border-slate-200
                  bg-white
                  px-4 py-2.5
                  text-sm font-semibold
                  text-slate-600
                  shadow-sm
                  transition
                  hover:border-slate-300
                  hover:bg-slate-50
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                  dark:border-slate-700
                  dark:bg-slate-900
                  dark:text-slate-300
                  dark:hover:bg-slate-800
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
                  inline-flex items-center justify-center gap-2
                  rounded-xl
                  bg-indigo-600
                  px-4 py-2.5
                  text-sm font-semibold
                  text-white
                  shadow-sm
                  transition
                  hover:bg-indigo-700
                  hover:shadow-md
                  dark:bg-indigo-500
                  dark:hover:bg-indigo-400
                "
              >
                <Plus size={17} />
                Add Record
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
          ERROR
      =================================================== */}

      {error && (
        <div
          role="alert"
          className="
            flex items-start justify-between gap-4
            rounded-2xl
            border border-rose-200
            bg-rose-50
            px-4 py-3
            text-sm text-rose-700
            dark:border-rose-900/50
            dark:bg-rose-950/30
            dark:text-rose-300
          "
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={() => setError("")}
            className="
              shrink-0 rounded-lg p-1
              text-rose-400
              transition
              hover:bg-rose-100
              hover:text-rose-600
              dark:hover:bg-rose-900/40
            "
            aria-label="Dismiss error"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* ===================================================
          SUMMARY
      =================================================== */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* You Owe */}

        <div
          className="
            rounded-2xl
            border border-slate-200
            bg-white
            p-5
            shadow-sm
            transition
            hover:-translate-y-0.5
            hover:shadow-md
            dark:border-slate-800
            dark:bg-slate-900
          "
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                You owe
              </p>

              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {formatCurrency(summary.youOwe)}
              </p>

              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                Money you need to pay
              </p>
            </div>

            <div
              className="
                flex h-11 w-11 shrink-0
                items-center justify-center
                rounded-xl
                bg-rose-50
                text-rose-600
                dark:bg-rose-500/10
                dark:text-rose-400
              "
            >
              <ArrowUpRight size={21} />
            </div>
          </div>
        </div>

        {/* Owed To You */}

        <div
          className="
            rounded-2xl
            border border-slate-200
            bg-white
            p-5
            shadow-sm
            transition
            hover:-translate-y-0.5
            hover:shadow-md
            dark:border-slate-800
            dark:bg-slate-900
          "
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Owed to you
              </p>

              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {formatCurrency(summary.owedToYou)}
              </p>

              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                Money others need to pay
              </p>
            </div>

            <div
              className="
                flex h-11 w-11 shrink-0
                items-center justify-center
                rounded-xl
                bg-emerald-50
                text-emerald-600
                dark:bg-emerald-500/10
                dark:text-emerald-400
              "
            >
              <ArrowDownLeft size={21} />
            </div>
          </div>
        </div>

        {/* Net */}

        <div
          className="
            rounded-2xl
            border border-slate-200
            bg-white
            p-5
            shadow-sm
            transition
            hover:-translate-y-0.5
            hover:shadow-md
            dark:border-slate-800
            dark:bg-slate-900
          "
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Net balance
              </p>

              <p
                className={`mt-2 text-2xl font-bold tracking-tight ${
                  summary.net >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {summary.net >= 0 ? "+" : ""}
                {formatCurrency(summary.net)}
              </p>

              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                Owed to you minus what you owe
              </p>
            </div>

            <div
              className="
                flex h-11 w-11 shrink-0
                items-center justify-center
                rounded-xl
                bg-indigo-50
                text-indigo-600
                dark:bg-indigo-500/10
                dark:text-indigo-400
              "
            >
              <CircleDollarSign size={21} />
            </div>
          </div>
        </div>

        {/* Pending */}

        <div
          className="
            rounded-2xl
            border border-slate-200
            bg-white
            p-5
            shadow-sm
            transition
            hover:-translate-y-0.5
            hover:shadow-md
            dark:border-slate-800
            dark:bg-slate-900
          "
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Pending
              </p>

              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {summary.pendingCount}
              </p>

              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                {summary.overdueCount > 0
                  ? `${summary.overdueCount} overdue`
                  : "Nothing overdue"}
              </p>
            </div>

            <div
              className="
                flex h-11 w-11 shrink-0
                items-center justify-center
                rounded-xl
                bg-amber-50
                text-amber-600
                dark:bg-amber-500/10
                dark:text-amber-400
              "
            >
              <Clock3 size={21} />
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
          TOOLBAR
      =================================================== */}

      <section
        className="
          rounded-2xl
          border border-slate-200
          bg-white
          shadow-sm
          dark:border-slate-800
          dark:bg-slate-900
        "
      >
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
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
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search people, notes..."
              aria-label="Search money records"
              className="
                h-11 w-full
                rounded-xl
                border border-slate-200
                bg-slate-50
                pl-10 pr-10
                text-sm text-slate-800
                outline-none
                transition
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
                  -translate-y-1/2
                  rounded-md p-1
                  text-slate-400
                  transition
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

          {/* Filter */}

          <div className="relative lg:w-52">
            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value)
              }
              aria-label="Filter money records"
              className="
                h-11 w-full
                appearance-none
                rounded-xl
                border border-slate-200
                bg-slate-50
                px-4 pr-9
                text-sm font-medium
                text-slate-700
                outline-none
                transition
                focus:border-indigo-400
                focus:ring-4
                focus:ring-indigo-500/10
                dark:border-slate-700
                dark:bg-slate-800
                dark:text-slate-200
                dark:focus:border-indigo-500
              "
            >
              <option value="all">All records</option>
              <option value="owe">You owe</option>
              <option value="owed">Owed to you</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>

        {/* Filter summary */}

        {(search || filter !== "all") && (
          <div
            className="
              flex flex-wrap items-center justify-between gap-2
              border-t border-slate-100
              px-4 py-3
              dark:border-slate-800
            "
          >
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {filteredRecords.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {records.length}
              </span>{" "}
              records
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
              className="
                text-xs font-semibold
                text-indigo-600
                hover:text-indigo-700
                dark:text-indigo-400
                dark:hover:text-indigo-300
              "
            >
              Clear filters
            </button>
          </div>
        )}
      </section>

      {/* ===================================================
          RECORDS
      =================================================== */}

      <section>
        {loading ? (
          <div
            className="
              flex min-h-72
              items-center justify-center
              rounded-2xl
              border border-slate-200
              bg-white
              shadow-sm
              dark:border-slate-800
              dark:bg-slate-900
            "
          >
            <div className="text-center">
              <Loader2
                size={28}
                className="mx-auto animate-spin text-indigo-500"
              />

              <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                Loading money tracker...
              </p>

              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Fetching your records
              </p>
            </div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div
            className="
              rounded-2xl
              border border-dashed
              border-slate-300
              bg-white
              px-6 py-16
              text-center
              shadow-sm
              dark:border-slate-700
              dark:bg-slate-900
            "
          >
            <div
              className="
                mx-auto flex h-14 w-14
                items-center justify-center
                rounded-2xl
                bg-slate-100
                text-slate-400
                dark:bg-slate-800
                dark:text-slate-500
              "
            >
              {search || filter !== "all" ? (
                <Search size={24} />
              ) : (
                <Users size={24} />
              )}
            </div>

            <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
              {search || filter !== "all"
                ? "No matching records"
                : "No money records yet"}
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              {search || filter !== "all"
                ? "Try a different search term or clear your filters."
                : "Start tracking borrowed and owed money by adding your first record."}
            </p>

            {search || filter !== "all" ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
                className="
                  mt-5 rounded-xl
                  border border-slate-200
                  px-4 py-2.5
                  text-sm font-semibold
                  text-slate-600
                  transition
                  hover:bg-slate-50
                  dark:border-slate-700
                  dark:text-slate-300
                  dark:hover:bg-slate-800
                "
              >
                Clear filters
              </button>
            ) : (
              <button
                type="button"
                onClick={openAddModal}
                className="
                  mt-5 inline-flex
                  items-center gap-2
                  rounded-xl
                  bg-indigo-600
                  px-4 py-2.5
                  text-sm font-semibold
                  text-white
                  transition
                  hover:bg-indigo-700
                  dark:bg-indigo-500
                  dark:hover:bg-indigo-400
                "
              >
                <Plus size={16} />
                Add your first record
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecords.map((record) => {
              const isOwed = record.type === "owed";
              const processing =
                processingId === record.id;

              return (
                <article
                  key={record.id}
                  className="
                    overflow-hidden
                    rounded-2xl
                    border border-slate-200
                    bg-white
                    shadow-sm
                    transition
                    hover:shadow-md
                    dark:border-slate-800
                    dark:bg-slate-900
                  "
                >
                  <div className="p-5 sm:p-6">
                    {/* Top */}

                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex min-w-0 gap-4">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                            isOwed
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                          }`}
                        >
                          {isOwed ? (
                            <ArrowDownLeft size={22} />
                          ) : (
                            <ArrowUpRight size={22} />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-bold text-slate-900 dark:text-white">
                              {record.personName}
                            </h3>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                isOwed
                                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                                  : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                              }`}
                            >
                              {isOwed
                                ? "Owes you"
                                : "You owe"}
                            </span>

                            {record.isPaid ? (
                              <span
                                className="
                                  inline-flex items-center gap-1
                                  rounded-full
                                  bg-emerald-50
                                  px-2.5 py-1
                                  text-[11px]
                                  font-semibold
                                  text-emerald-600
                                  dark:bg-emerald-500/10
                                  dark:text-emerald-400
                                "
                              >
                                <Check size={11} />
                                Paid
                              </span>
                            ) : record.isOverdue ? (
                              <span
                                className="
                                  inline-flex items-center gap-1
                                  rounded-full
                                  bg-rose-50
                                  px-2.5 py-1
                                  text-[11px]
                                  font-semibold
                                  text-rose-600
                                  dark:bg-rose-500/10
                                  dark:text-rose-400
                                "
                              >
                                <Clock3 size={11} />
                                Overdue
                              </span>
                            ) : (
                              <span
                                className="
                                  rounded-full
                                  bg-amber-50
                                  px-2.5 py-1
                                  text-[11px]
                                  font-semibold
                                  text-amber-600
                                  dark:bg-amber-500/10
                                  dark:text-amber-400
                                "
                              >
                                Pending
                              </span>
                            )}
                          </div>

                          {record.note && (
                            <p className="mt-1.5 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                              {record.note}
                            </p>
                          )}

                          {record.dueDate && (
                            <div
                              className={`mt-2 inline-flex items-center gap-1.5 text-xs ${
                                record.isOverdue
                                  ? "font-semibold text-rose-600 dark:text-rose-400"
                                  : "text-slate-400 dark:text-slate-500"
                              }`}
                            >
                              <CalendarDays size={13} />
                              Due {formatDate(record.dueDate)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Amount */}

                      <div className="shrink-0 xl:text-right">
                        <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                          {formatCurrency(record.remaining)}
                        </p>

                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                          remaining of{" "}
                          {formatCurrency(record.amount)}
                        </p>
                      </div>
                    </div>

                    {/* Progress */}

                    <div className="mt-6">
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>
                            Paid{" "}
                            <strong className="font-semibold text-slate-700 dark:text-slate-300">
                              {formatCurrency(
                                record.paidAmount
                              )}
                            </strong>
                          </span>

                          <span className="text-slate-300 dark:text-slate-700">
                            /
                          </span>

                          <span>
                            {formatCurrency(
                              record.amount
                            )}
                          </span>
                        </div>

                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {Math.round(record.progress)}%
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            record.isPaid
                              ? "bg-emerald-500"
                              : isOwed
                              ? "bg-emerald-500"
                              : "bg-indigo-500"
                          }`}
                          style={{
                            width: `${record.progress}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Actions */}

                    <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                      {!record.isPaid && (
                        <button
                          type="button"
                          onClick={() =>
                            handleMarkPaid(record)
                          }
                          disabled={processingId !== null}
                          className="
                            inline-flex items-center gap-2
                            rounded-xl
                            border border-emerald-200
                            bg-emerald-50
                            px-3.5 py-2
                            text-xs font-semibold
                            text-emerald-600
                            transition
                            hover:bg-emerald-100
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                            dark:border-emerald-500/20
                            dark:bg-emerald-500/10
                            dark:text-emerald-400
                            dark:hover:bg-emerald-500/20
                          "
                        >
                          {processing ? (
                            <Loader2
                              size={14}
                              className="animate-spin"
                            />
                          ) : (
                            <Check size={14} />
                          )}
                          Mark paid
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          openEditModal(record)
                        }
                        disabled={processing}
                        className="
                          inline-flex items-center gap-2
                          rounded-xl
                          border border-slate-200
                          bg-white
                          px-3.5 py-2
                          text-xs font-semibold
                          text-slate-600
                          transition
                          hover:bg-slate-50
                          disabled:cursor-not-allowed
                          disabled:opacity-50
                          dark:border-slate-700
                          dark:bg-slate-900
                          dark:text-slate-300
                          dark:hover:bg-slate-800
                        "
                      >
                        <Pencil size={14} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(record.id)
                        }
                        disabled={processing}
                        className="
                          inline-flex items-center gap-2
                          rounded-xl
                          border border-rose-200
                          bg-rose-50
                          px-3.5 py-2
                          text-xs font-semibold
                          text-rose-600
                          transition
                          hover:bg-rose-100
                          disabled:cursor-not-allowed
                          disabled:opacity-50
                          dark:border-rose-500/20
                          dark:bg-rose-500/10
                          dark:text-rose-400
                          dark:hover:bg-rose-500/20
                        "
                      >
                        {processing ? (
                          <Loader2
                            size={14}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ===================================================
          ADD / EDIT MODAL
      =================================================== */}

      {showModal && (
        <div
          className="
            fixed inset-0 z-50
            flex items-center justify-center
            bg-slate-950/60
            px-4 py-6
            backdrop-blur-sm
          "
          role="dialog"
          aria-modal="true"
          aria-labelledby="money-modal-title"
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
            className="
              flex max-h-[92vh]
              w-full max-w-lg
              flex-col
              overflow-hidden
              rounded-3xl
              border border-slate-200
              bg-white
              shadow-2xl
              dark:border-slate-700
              dark:bg-slate-900
            "
          >
            {/* Modal Header */}

            <div
              className="
                flex items-center justify-between
                border-b border-slate-100
                px-5 py-5
                sm:px-6
                dark:border-slate-800
              "
            >
              <div>
                <h2
                  id="money-modal-title"
                  className="text-lg font-bold text-slate-900 dark:text-white"
                >
                  {editingId
                    ? "Edit money record"
                    : "Add money record"}
                </h2>

                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  Record who owes whom and how much.
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
                  hover:text-slate-600
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  dark:hover:bg-slate-800
                  dark:hover:text-slate-200
                "
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}

            <form
              onSubmit={handleSubmit}
              className="overflow-y-auto p-5 sm:p-6"
            >
              <div className="space-y-5">
                {/* Person */}

                <div>
                  <label
                    htmlFor="personName"
                    className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Person
                  </label>

                  <input
                    id="personName"
                    name="personName"
                    type="text"
                    value={form.personName}
                    onChange={handleChange}
                    placeholder="e.g. Rahul"
                    autoComplete="off"
                    disabled={saving}
                    className="
                      h-11 w-full
                      rounded-xl
                      border border-slate-200
                      bg-white
                      px-4
                      text-sm text-slate-800
                      outline-none
                      transition
                      placeholder:text-slate-400
                      focus:border-indigo-400
                      focus:ring-4
                      focus:ring-indigo-500/10
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                      dark:border-slate-700
                      dark:bg-slate-800
                      dark:text-slate-100
                      dark:placeholder:text-slate-500
                    "
                  />
                </div>

                {/* Type */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Who owes whom?
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        setForm((previous) => ({
                          ...previous,
                          type: "owe",
                        }))
                      }
                      className={`rounded-xl border px-4 py-3 text-left transition ${
                        form.type === "owe"
                          ? "border-rose-300 bg-rose-50 text-rose-700 ring-2 ring-rose-500/10 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ArrowUpRight size={17} />

                        <span className="text-sm font-semibold">
                          I owe them
                        </span>
                      </div>

                      <p className="mt-1 text-[11px] opacity-70">
                        You need to pay them
                      </p>
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        setForm((previous) => ({
                          ...previous,
                          type: "owed",
                        }))
                      }
                      className={`rounded-xl border px-4 py-3 text-left transition ${
                        form.type === "owed"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/10 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ArrowDownLeft size={17} />

                        <span className="text-sm font-semibold">
                          They owe me
                        </span>
                      </div>

                      <p className="mt-1 text-[11px] opacity-70">
                        They need to pay you
                      </p>
                    </button>
                  </div>
                </div>

                {/* Amount */}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="amount"
                      className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Total amount
                    </label>

                    <div className="relative">
                      <input
                        id="amount"
                        name="amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={form.amount}
                        onChange={handleChange}
                        placeholder="0.00"
                        disabled={saving}
                        className="
                          h-11 w-full
                          rounded-xl
                          border border-slate-200
                          bg-white
                          px-4
                          text-sm text-slate-800
                          outline-none
                          transition
                          placeholder:text-slate-400
                          focus:border-indigo-400
                          focus:ring-4
                          focus:ring-indigo-500/10
                          dark:border-slate-700
                          dark:bg-slate-800
                          dark:text-slate-100
                        "
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="paidAmount"
                      className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Already paid
                    </label>

                    <input
                      id="paidAmount"
                      name="paidAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.paidAmount}
                      onChange={handleChange}
                      placeholder="0.00"
                      disabled={saving}
                      className="
                        h-11 w-full
                        rounded-xl
                        border border-slate-200
                        bg-white
                        px-4
                        text-sm text-slate-800
                        outline-none
                        transition
                        placeholder:text-slate-400
                        focus:border-indigo-400
                        focus:ring-4
                        focus:ring-indigo-500/10
                        dark:border-slate-700
                        dark:bg-slate-800
                        dark:text-slate-100
                      "
                    />
                  </div>
                </div>

                {/* Live remaining */}

                {Number(form.amount) > 0 && (
                  <div
                    className="
                      flex items-center justify-between
                      rounded-xl
                      border border-slate-200
                      bg-slate-50
                      px-4 py-3
                      dark:border-slate-700
                      dark:bg-slate-800/60
                    "
                  >
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Remaining
                    </span>

                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {formatCurrency(
                        Math.max(
                          Number(form.amount) -
                            Number(form.paidAmount || 0),
                          0
                        )
                      )}
                    </span>
                  </div>
                )}

                {/* Note */}

                <div>
                  <label
                    htmlFor="note"
                    className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Note
                    <span className="ml-1 font-normal text-slate-400">
                      (optional)
                    </span>
                  </label>

                  <textarea
                    id="note"
                    name="note"
                    value={form.note}
                    onChange={handleChange}
                    rows={3}
                    placeholder="e.g. Dinner split, project expense..."
                    disabled={saving}
                    className="
                      w-full resize-none
                      rounded-xl
                      border border-slate-200
                      bg-white
                      px-4 py-3
                      text-sm text-slate-800
                      outline-none
                      transition
                      placeholder:text-slate-400
                      focus:border-indigo-400
                      focus:ring-4
                      focus:ring-indigo-500/10
                      dark:border-slate-700
                      dark:bg-slate-800
                      dark:text-slate-100
                      dark:placeholder:text-slate-500
                    "
                  />
                </div>

                {/* Due Date */}

                <div>
                  <label
                    htmlFor="dueDate"
                    className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Due date
                    <span className="ml-1 font-normal text-slate-400">
                      (optional)
                    </span>
                  </label>

                  <input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    value={form.dueDate}
                    onChange={handleChange}
                    min={getTodayString()}
                    disabled={saving}
                    className="
                      h-11 w-full
                      rounded-xl
                      border border-slate-200
                      bg-white
                      px-4
                      text-sm text-slate-800
                      outline-none
                      transition
                      focus:border-indigo-400
                      focus:ring-4
                      focus:ring-indigo-500/10
                      dark:border-slate-700
                      dark:bg-slate-800
                      dark:text-slate-100
                    "
                  />
                </div>
              </div>

              {/* Footer */}

              <div
                className="
                  mt-6 flex gap-3
                  border-t border-slate-100
                  pt-5
                  dark:border-slate-800
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
                    transition
                    hover:bg-slate-50
                    disabled:cursor-not-allowed
                    disabled:opacity-50
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
                    items-center justify-center gap-2
                    rounded-xl
                    bg-indigo-600
                    px-4 py-3
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
                    ? "Update record"
                    : "Add record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MoneyTracker;