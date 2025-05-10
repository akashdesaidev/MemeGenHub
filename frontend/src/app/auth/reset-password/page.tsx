"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/utils/api";

// Component that uses useSearchParams
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    // Get token from URL
    const tokenParam = searchParams.get("token");
    if (!tokenParam) {
      setError(
        "Missing reset token. Please request a new password reset link."
      );
      return;
    }

    setToken(tokenParam);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!token) {
      setError(
        "Missing reset token. Please request a new password reset link."
      );
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      setSuccessMessage("");

      // Send password reset request
      await api.post("/auth/reset-password", {
        token,
        newPassword,
      });

      setSuccessMessage("Password reset successful!");

      // Clear form
      setNewPassword("");
      setConfirmPassword("");

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/auth/signin");
      }, 3000);
    } catch (err: any) {
      console.error("Error resetting password:", err);
      setError(err.response?.data?.message || "Failed to reset password");

      // Handle specific errors
      if (err.response?.status === 401) {
        setError(
          "Invalid or expired token. Please request a new password reset link."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 card">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold">
            Reset Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your new password below
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
            {successMessage}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-gray-700"
            >
              New Password
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              placeholder="Enter new password"
              minLength={6}
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700"
            >
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              placeholder="Confirm new password"
              minLength={6}
            />
          </div>

          <div>
            <button
              type="submit"
              className="w-full btn btn-primary"
              disabled={isLoading || !token}
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <Link
            href="/auth/signin"
            className="text-primary hover:text-primary/90"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

// Loading fallback
function ResetPasswordLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 card">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold">
            Reset Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
