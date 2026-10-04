import {
  useEffect,
  useState,
} from "react";

import { NavLink } from "react-router-dom";

import {
  LayoutDashboard,
  ArrowLeftRight,
  BarChart3,
  WalletCards,
  HandCoins,
  Target,
  CreditCard,
  Settings,
  Wallet,
  Menu,
  X,
} from "lucide-react";

import { useAuth } from "../context/useAuth";

// ======================================================
// NAVIGATION ITEMS
// ======================================================

const menuItems = [
  {
    name: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Transactions",
    path: "/transactions",
    icon: ArrowLeftRight,
  },
  {
    name: "Analytics",
    path: "/analytics",
    icon: BarChart3,
  },
  {
    name: "Budgets",
    path: "/budgets",
    icon: WalletCards,
  },
  {
    name: "Money Tracker",
    path: "/money-tracker",
    icon: HandCoins,
  },
  {
    name: "Goals",
    path: "/goals",
    icon: Target,
  },
  {
    name: "Subscriptions",
    path: "/subscriptions",
    icon: CreditCard,
  },
];

// ======================================================
// NAVIGATION LINK
// ======================================================

function NavigationLink({
  item,
  onNavigate,
}) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      end={item.path === "/"}
      onClick={onNavigate}
      className={({ isActive }) =>
        `
          group
          flex
          min-h-11
          w-full
          items-center
          gap-3
          rounded-xl
          px-3
          py-2.5
          text-sm
          font-medium
          transition-colors
          duration-200

          ${
            isActive
              ? `
                bg-indigo-50
                text-indigo-600
                dark:bg-indigo-500/15
                dark:text-indigo-400
              `
              : `
                text-slate-500
                hover:bg-slate-50
                hover:text-slate-900
                dark:text-slate-400
                dark:hover:bg-slate-900
                dark:hover:text-slate-100
              `
          }
        `
      }
    >
      <Icon
        size={19}
        strokeWidth={2}
        className="shrink-0"
      />

      <span className="truncate">
        {item.name}
      </span>
    </NavLink>
  );
}

// ======================================================
// USER ACCOUNT
// ======================================================

function UserAccount({
  displayName,
  email,
  photoURL,
}) {
  const initial =
    displayName.charAt(0).toUpperCase();

  return (
    <div
      className="
        flex
        min-w-0
        items-center
        gap-3
        rounded-xl
        bg-slate-50
        p-3
        dark:bg-slate-900
      "
    >
      <div
        className="
          flex
          h-9
          w-9
          shrink-0
          items-center
          justify-center
          overflow-hidden
          rounded-full
          bg-indigo-100
          text-sm
          font-semibold
          text-indigo-600
          dark:bg-indigo-500/15
          dark:text-indigo-400
        "
      >
        {photoURL ? (
          <img
            src={photoURL}
            alt={displayName}
            className="
              h-full
              w-full
              object-cover
            "
          />
        ) : (
          initial
        )}
      </div>

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
          {displayName}
        </p>

        <p
          className="
            truncate
            text-xs
            text-slate-400
            dark:text-slate-500
          "
        >
          {email || "Personal account"}
        </p>
      </div>
    </div>
  );
}

// ======================================================
// SIDEBAR CONTENT
// ======================================================

function SidebarContent({
  mobile = false,
  onClose,
  displayName,
  email,
  photoURL,
}) {
  return (
    <div
      className="
        flex
        h-full
        min-w-0
        flex-col
        overflow-hidden
      "
    >
      {/* ==================================================
          HEADER / LOGO
      ================================================== */}

      <div
        className="
          flex
          h-24
          shrink-0
          items-center
          gap-3
          border-b
          border-slate-100
          px-6
          dark:border-slate-800
        "
      >
        <div
          className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-xl
            bg-indigo-600
            text-white
            shadow-lg
            shadow-indigo-200/50
            dark:bg-indigo-500
            dark:shadow-indigo-950/40
          "
        >
          <Wallet size={21} />
        </div>

        <div className="min-w-0 flex-1">
          <h1
            className="
              truncate
              text-lg
              font-bold
              tracking-tight
              text-slate-900
              dark:text-slate-100
            "
          >
            SpendNest
          </h1>

          <p
            className="
              truncate
              text-xs
              text-slate-400
              dark:text-slate-500
            "
          >
            Money made simple
          </p>
        </div>

        {mobile && (
          <button
            type="button"
            onClick={onClose}
            className="
              flex
              h-16
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              text-slate-400
              transition-colors
              hover:bg-slate-100
              hover:text-slate-700
              active:scale-95
              dark:hover:bg-slate-800
              dark:hover:text-slate-200
            "
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* ==================================================
          NAVIGATION
      ================================================== */}

      <nav
        className="
          min-h-0
          flex-1
          overflow-x-hidden
          overflow-y-auto
          px-3
          py-5
        "
      >
        <p
          className="
            mb-3
            px-3
            text-[10px]
            font-bold
            uppercase
            tracking-[0.14em]
            text-slate-400
            dark:text-slate-500
          "
        >
          Overview
        </p>

        <div className="space-y-1">
          {menuItems.map((item) => (
            <NavigationLink
              key={item.name}
              item={item}
              onNavigate={onClose}
            />
          ))}
        </div>
      </nav>

      {/* ==================================================
          FOOTER
      ================================================== */}

      <div
        className="
          shrink-0
          border-t
          border-slate-100
          p-3
          dark:border-slate-800
        "
      >
        <NavLink
          to="/settings"
          onClick={onClose}
          className={({ isActive }) =>
            `
              flex
              min-h-11
              w-full
              items-center
              gap-3
              rounded-xl
              px-3
              py-2.5
              text-sm
              font-medium
              transition-colors
              duration-200

              ${
                isActive
                  ? `
                    bg-indigo-50
                    text-indigo-600
                    dark:bg-indigo-500/15
                    dark:text-indigo-400
                  `
                  : `
                    text-slate-500
                    hover:bg-slate-50
                    hover:text-slate-900
                    dark:text-slate-400
                    dark:hover:bg-slate-900
                    dark:hover:text-slate-100
                  `
              }
            `
          }
        >
          <Settings
            size={19}
            className="shrink-0"
          />

          <span>Settings</span>
        </NavLink>

        <div className="mt-3">
          <UserAccount
            displayName={displayName}
            email={email}
            photoURL={photoURL}
          />
        </div>
      </div>
    </div>
  );
}

// ======================================================
// SIDEBAR
// ======================================================

function Sidebar() {
  const { user } = useAuth();

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const displayName =
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "User";

  const email = user?.email || "";
  const photoURL = user?.photoURL;

  // ====================================================
  // CLOSE MOBILE SIDEBAR
  // ====================================================

  function closeMobileSidebar() {
    setMobileOpen(false);
  }

  // ====================================================
  // ESCAPE KEY
  // ====================================================

  useEffect(() => {
    if (!mobileOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
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
  }, [mobileOpen]);

  // ====================================================
  // LOCK PAGE SCROLL
  // ====================================================

  useEffect(() => {
    if (!mobileOpen) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [mobileOpen]);

  return (
    <>
      {/* ==================================================
          DESKTOP SIDEBAR
      ================================================== */}

      <aside
        className="
          fixed
          left-0
          top-0
          bottom-0
          z-40
          hidden
          w-64
          border-r
          border-slate-200
          bg-white
          dark:border-slate-800
          dark:bg-slate-950
          md:flex
        "
      >
        <SidebarContent
          displayName={displayName}
          email={email}
          photoURL={photoURL}
        />
      </aside>

      {/* ==================================================
          MOBILE MENU BUTTON
      ================================================== */}

      <button
        type="button"
        onClick={() =>
          setMobileOpen(true)
        }
        className="
          fixed
          left-4
          top-4
          z-50
          flex
          h-10
          w-10
          items-center
          justify-center
          rounded-xl
          border
          border-slate-200
          bg-white
          text-slate-600
          shadow-md
          transition-all
          active:scale-95
          dark:border-slate-700
          dark:bg-slate-900
          dark:text-slate-300
          md:hidden
        "
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
      >
        <Menu size={20} />
      </button>

      {/* ==================================================
          MOBILE OVERLAY
      ================================================== */}

      <div
        className={`
          fixed
          inset-0
          z-60
          bg-slate-950/50
          backdrop-blur-[2px]
          transition-opacity
          duration-300
          md:hidden

          ${
            mobileOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }
        `}
        onClick={closeMobileSidebar}
        aria-hidden="true"
      />

      {/* ==================================================
          MOBILE DRAWER
      ================================================== */}

      <aside
        className={`
          fixed
          left-0
          top-0
          bottom-0
          z-70
          w-[82vw]
          max-w-
          min-w-0
          overflow-hidden
          border-r
          border-slate-200
          bg-white
          shadow-2xl
          transition-transform
          duration-300
          ease-out
          dark:border-slate-800
          dark:bg-slate-950
          md:hidden

          ${
            mobileOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
        aria-label="Mobile navigation"
      >
        <SidebarContent
          mobile
          onClose={closeMobileSidebar}
          displayName={displayName}
          email={email}
          photoURL={photoURL}
        />
      </aside>
    </>
  );
}

export default Sidebar;