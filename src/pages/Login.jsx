import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, Loader2 } from "lucide-react";

import { signInWithGoogle } from "../services/authService";
import { useAuth } from "../context/useAuth";

function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // ======================================================
  // REDIRECT IF ALREADY LOGGED IN
  // ======================================================

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // ======================================================
  // GOOGLE LOGIN
  // ======================================================

  async function handleGoogleLogin() {
    try {
      setLoading(true);
      setError("");

      await signInWithGoogle();

      // AuthContext will detect the user
      // and the useEffect above will redirect
      // to Dashboard.

    } catch (error) {
      console.error("Google login error:", error);

      setError(
        `${error.code || "Error"}: ${
          error.message || "Unable to sign in with Google."
        }`
      );
    } finally {
      setLoading(false);
    }
  }

  // ======================================================
  // AUTH LOADING
  // ======================================================

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2
          size={32}
          className="animate-spin text-indigo-600"
        />
      </div>
    );
  }

  // ======================================================
  // LOGIN UI
  // ======================================================

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">

      <div className="w-full max-w-md">

        {/* Logo */}

        <div className="mb-8 text-center">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <Wallet size={30} />
          </div>

          <h1 className="mt-5 text-3xl font-bold text-slate-900">
            SpendNest
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Your money, organized.
          </p>

        </div>


        {/* Login Card */}

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">

          <div className="text-center">

            <h2 className="text-xl font-bold text-slate-900">
              Welcome to SpendNest
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Sign in to manage your finances.
            </p>

          </div>


          {/* Error */}

          {error && (
            <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}


          {/* Google Button */}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >

            {loading ? (
              <Loader2
                size={20}
                className="animate-spin"
              />
            ) : (
              <span className="text-lg font-bold">
                G
              </span>
            )}

            {loading
              ? "Signing in..."
              : "Continue with Google"}

          </button>


          <p className="mt-6 text-center text-xs leading-5 text-slate-400">
            By continuing, you agree to use SpendNest
            for managing your personal finances.
          </p>

        </div>

      </div>

    </div>
  );
}

export default Login;