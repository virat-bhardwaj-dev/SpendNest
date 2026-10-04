import { useEffect, useState } from "react";

import {
  User,
  Mail,
  ShieldCheck,
  Palette,
  IndianRupee,
  LogOut,
  Check,
  Moon,
  Sun,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/useAuth";
import { logoutUser } from "../services/authService";


function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();


  // ==================================================
  // USER PREFERENCES
  // ==================================================

  const [currency, setCurrency] = useState(
    localStorage.getItem("spendnest_currency") || "INR"
  );

  const [appearance, setAppearance] = useState(
    localStorage.getItem("spendnest_appearance") || "light"
  );

  const [loggingOut, setLoggingOut] = useState(false);


  // ==================================================
  // APPLY THEME
  // ==================================================

  useEffect(() => {
    const isDark = appearance === "dark";

    document.documentElement.classList.toggle(
      "dark",
      isDark
    );

    localStorage.setItem(
      "spendnest_appearance",
      appearance
    );
  }, [appearance]);


  // ==================================================
  // SAVE CURRENCY
  // ==================================================

  useEffect(() => {
    localStorage.setItem(
      "spendnest_currency",
      currency
    );
  }, [currency]);


  // ==================================================
  // LOGOUT
  // ==================================================

  const handleLogout = async () => {
    try {
      setLoggingOut(true);

      await logoutUser();

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error("Logout error:", error);
      setLoggingOut(false);
    }
  };


  // ==================================================
  // USER DATA
  // ==================================================

  const displayName =
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "User";

  const email =
    user?.email ||
    "No email available";

  const photoURL = user?.photoURL;


  // ==================================================
  // UI
  // ==================================================

  return (
    <div className="mx-auto max-w-5xl space-y-6">


      {/* ==================================================
          HEADER
      ================================================== */}

      <div>

        <h1
          className="
            text-3xl font-bold tracking-tight
            text-slate-900
            dark:text-slate-100
          "
        >
          Settings
        </h1>

        <p
          className="
            mt-1 text-sm
            text-slate-500
            dark:text-slate-400
          "
        >
          Manage your SpendNest account and preferences.
        </p>

      </div>


      {/* ==================================================
          ACCOUNT
      ================================================== */}

      <section
        className="
          rounded-2xl border
          border-slate-200
          bg-white
          shadow-sm
          dark:border-slate-700
          dark:bg-slate-900
          dark:shadow-none
        "
      >

        <div
          className="
            border-b
            border-slate-100
            px-6 py-5
            dark:border-slate-800
          "
        >

          <h2
            className="
              font-semibold
              text-slate-900
              dark:text-slate-100
            "
          >
            Account
          </h2>

          <p
            className="
              mt-1 text-xs
              text-slate-400
              dark:text-slate-500
            "
          >
            Your Google account information
          </p>

        </div>


        <div className="p-6">

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">


            {/* AVATAR */}

            <div
              className="
                flex h-16 w-16 shrink-0
                items-center justify-center
                overflow-hidden rounded-2xl
                bg-indigo-600
                text-xl font-bold text-white
              "
            >

              {photoURL ? (
                <img
                  src={photoURL}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}

            </div>


            {/* USER INFORMATION */}

            <div className="min-w-0">

              <h3
                className="
                  text-lg font-semibold
                  text-slate-900
                  dark:text-slate-100
                "
              >
                {displayName}
              </h3>


              <div
                className="
                  mt-1 flex items-center gap-2
                  text-sm
                  text-slate-500
                  dark:text-slate-400
                "
              >

                <Mail size={15} />

                <span className="truncate">
                  {email}
                </span>

              </div>


              <div
                className="
                  mt-2 inline-flex items-center gap-1.5
                  rounded-full
                  bg-emerald-50
                  px-2.5 py-1
                  text-xs font-medium
                  text-emerald-700
                  dark:bg-emerald-500/10
                  dark:text-emerald-400
                "
              >

                <Check size={13} />

                Google account connected

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* ==================================================
          PREFERENCES
      ================================================== */}

      <section
        className="
          rounded-2xl border
          border-slate-200
          bg-white
          shadow-sm
          dark:border-slate-700
          dark:bg-slate-900
          dark:shadow-none
        "
      >

        <div
          className="
            border-b
            border-slate-100
            px-6 py-5
            dark:border-slate-800
          "
        >

          <h2
            className="
              font-semibold
              text-slate-900
              dark:text-slate-100
            "
          >
            Preferences
          </h2>

          <p
            className="
              mt-1 text-xs
              text-slate-400
              dark:text-slate-500
            "
          >
            Customize how SpendNest works for you.
          </p>

        </div>


        <div
          className="
            divide-y divide-slate-100
            dark:divide-slate-800
          "
        >


          {/* ==================================================
              CURRENCY
          ================================================== */}

          <div
            className="
              flex flex-col gap-4
              px-6 py-5
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >

            <div className="flex items-center gap-4">

              <div
                className="
                  flex h-10 w-10
                  items-center justify-center
                  rounded-xl
                  bg-indigo-50
                  text-indigo-600
                  dark:bg-indigo-500/10
                  dark:text-indigo-400
                "
              >
                <IndianRupee size={19} />
              </div>


              <div>

                <h3
                  className="
                    text-sm font-semibold
                    text-slate-800
                    dark:text-slate-200
                  "
                >
                  Currency
                </h3>

                <p
                  className="
                    mt-1 text-xs
                    text-slate-400
                    dark:text-slate-500
                  "
                >
                  Choose your preferred currency.
                </p>

              </div>

            </div>


            <select
              value={currency}
              onChange={(e) =>
                setCurrency(e.target.value)
              }
              className="
                rounded-xl
                border border-slate-200
                bg-white
                px-4 py-2.5
                text-sm font-medium
                text-slate-700
                outline-none
                transition

                focus:border-indigo-400

                dark:border-slate-700
                dark:bg-slate-800
                dark:text-slate-200
                dark:focus:border-indigo-500
              "
            >

              <option value="INR">
                ₹ INR — Indian Rupee
              </option>

              <option value="USD">
                $ USD — US Dollar
              </option>

              <option value="EUR">
                € EUR — Euro
              </option>

              <option value="GBP">
                £ GBP — British Pound
              </option>

            </select>

          </div>


          {/* ==================================================
              APPEARANCE
          ================================================== */}

          <div
            className="
              flex flex-col gap-4
              px-6 py-5
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >

            <div className="flex items-center gap-4">

              <div
                className="
                  flex h-10 w-10
                  items-center justify-center
                  rounded-xl
                  bg-amber-50
                  text-amber-600
                  dark:bg-amber-500/10
                  dark:text-amber-400
                "
              >
                <Palette size={19} />
              </div>


              <div>

                <h3
                  className="
                    text-sm font-semibold
                    text-slate-800
                    dark:text-slate-200
                  "
                >
                  Appearance
                </h3>

                <p
                  className="
                    mt-1 text-xs
                    text-slate-400
                    dark:text-slate-500
                  "
                >
                  Choose your preferred interface theme.
                </p>

              </div>

            </div>


            {/* THEME SWITCH */}

            <div
              className="
                flex rounded-xl
                border border-slate-200
                bg-slate-50
                p-1

                dark:border-slate-700
                dark:bg-slate-800
              "
            >

              {/* LIGHT */}

              <button
                type="button"
                onClick={() => setAppearance("light")}
                className={`
                  flex items-center gap-2
                  rounded-lg
                  px-3 py-2
                  text-xs font-semibold
                  transition

                  ${
                    appearance === "light"
                      ? `
                        bg-white
                        text-indigo-600
                        shadow-sm
                        dark:bg-slate-700
                        dark:text-indigo-300
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

                <Sun size={15} />

                Light

              </button>


              {/* DARK */}

              <button
                type="button"
                onClick={() => setAppearance("dark")}
                className={`
                  flex items-center gap-2
                  rounded-lg
                  px-3 py-2
                  text-xs font-semibold
                  transition

                  ${
                    appearance === "dark"
                      ? `
                        bg-slate-900
                        text-white
                        shadow-sm
                        dark:bg-slate-950
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

                <Moon size={15} />

                Dark

              </button>

            </div>

          </div>

        </div>

      </section>


      {/* ==================================================
          SECURITY
      ================================================== */}

      <section
        className="
          rounded-2xl border
          border-slate-200
          bg-white
          shadow-sm
          dark:border-slate-700
          dark:bg-slate-900
          dark:shadow-none
        "
      >

        <div
          className="
            border-b
            border-slate-100
            px-6 py-5
            dark:border-slate-800
          "
        >

          <h2
            className="
              font-semibold
              text-slate-900
              dark:text-slate-100
            "
          >
            Security
          </h2>

          <p
            className="
              mt-1 text-xs
              text-slate-400
              dark:text-slate-500
            "
          >
            Your authentication and account security.
          </p>

        </div>


        <div className="p-6">

          <div
            className="
              flex items-center justify-between
              rounded-xl
              bg-slate-50
              p-4

              dark:bg-slate-800
            "
          >

            <div className="flex items-center gap-4">

              <div
                className="
                  flex h-10 w-10
                  items-center justify-center
                  rounded-xl
                  bg-emerald-50
                  text-emerald-600

                  dark:bg-emerald-500/10
                  dark:text-emerald-400
                "
              >
                <ShieldCheck size={19} />
              </div>


              <div>

                <p
                  className="
                    text-sm font-semibold
                    text-slate-800
                    dark:text-slate-200
                  "
                >
                  Google Authentication
                </p>

                <p
                  className="
                    mt-1 text-xs
                    text-slate-400
                    dark:text-slate-500
                  "
                >
                  Your account is secured through Google
                  Sign-In.
                </p>

              </div>

            </div>


            <span
              className="
                rounded-full
                bg-emerald-100
                px-3 py-1
                text-xs font-semibold
                text-emerald-700

                dark:bg-emerald-500/15
                dark:text-emerald-400
              "
            >
              Active
            </span>

          </div>

        </div>

      </section>


      {/* ==================================================
          LOGOUT
      ================================================== */}

      <section
        className="
          rounded-2xl
          border border-red-100
          bg-white
          shadow-sm

          dark:border-red-900/40
          dark:bg-slate-900
          dark:shadow-none
        "
      >

        <div className="p-6">

          <div
            className="
              flex flex-col gap-4
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >

            <div className="flex items-center gap-4">

              <div
                className="
                  flex h-10 w-10
                  items-center justify-center
                  rounded-xl
                  bg-red-50
                  text-red-600

                  dark:bg-red-500/10
                  dark:text-red-400
                "
              >
                <LogOut size={19} />
              </div>


              <div>

                <h2
                  className="
                    text-sm font-semibold
                    text-slate-800
                    dark:text-slate-200
                  "
                >
                  Sign out of SpendNest
                </h2>

                <p
                  className="
                    mt-1 text-xs
                    text-slate-400
                    dark:text-slate-500
                  "
                >
                  You'll need to sign in again to access
                  your account.
                </p>

              </div>

            </div>


            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="
                flex items-center
                justify-center gap-2
                rounded-xl
                bg-red-600
                px-5 py-2.5
                text-sm font-semibold
                text-white
                transition
                hover:bg-red-700
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >

              <LogOut size={16} />

              {loggingOut
                ? "Signing out..."
                : "Logout"}

            </button>

          </div>

        </div>

      </section>


      {/* ==================================================
          ACCOUNT FOOTER
      ================================================== */}

      <div
        className="
          flex items-center gap-3
          rounded-xl
          bg-slate-100
          px-5 py-4
          text-xs
          text-slate-500

          dark:bg-slate-900
          dark:text-slate-400
        "
      >

        <User size={16} />

        <span>
          SpendNest account · {email}
        </span>

      </div>

    </div>
  );
}

export default Settings;