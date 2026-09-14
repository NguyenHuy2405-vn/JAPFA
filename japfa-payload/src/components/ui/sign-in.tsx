"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";

export const LightLogin = () => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(result.message || "Không thể đăng nhập.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Không thể kết nối tới hệ thống.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
        <div className="absolute left-0 right-0 top-0 -mt-20 h-48 bg-gradient-to-b from-orange-100 via-orange-50 to-transparent opacity-50 blur-3xl" />
        <div className="relative p-8 sm:p-10">
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-6 rounded-2xl bg-white p-4 shadow-lg">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#f47b0a] text-3xl font-black text-white">
                J
              </div>
            </div>
            <h1 className="text-center text-2xl font-bold text-gray-900">
              JAPFA Control Tower
            </h1>
            <p className="mt-2 text-center text-gray-500">
              Đăng nhập để tiếp tục vào hệ thống
            </p>
          </div>

          <form className="space-y-6" onSubmit={submit}>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-gray-700"
                htmlFor="email"
              >
                Email công việc
              </label>
              <div className="flex h-12 items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20">
                <Mail aria-hidden="true" className="text-gray-400" size={18} />
                <input
                  className="h-full w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@japfa.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  className="text-sm font-medium text-gray-700"
                  htmlFor="password"
                >
                  Mật khẩu
                </label>
                <span className="text-xs text-gray-400">
                  Liên hệ quản trị viên nếu quên
                </span>
              </div>
              <div className="flex h-12 items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20">
                <LockKeyhole
                  aria-hidden="true"
                  className="text-gray-400"
                  size={18}
                />
                <input
                  className="h-full w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  className="rounded-md p-1 text-gray-400 transition-colors hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error ? (
              <p
                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <button
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-t from-orange-600 via-orange-500 to-orange-400 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:from-orange-700 hover:via-orange-600 hover:to-orange-500 hover:shadow-md hover:shadow-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang xác thực..." : "Đăng nhập"}
              <ArrowRight aria-hidden="true" size={18} />
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400">
            JAPFA Vietnam · Supply Chain Control Tower
          </p>
        </div>
      </div>
    </div>
  );
};
