"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole } from "lucide-react";

type ChangePasswordResponse = {
  success?: boolean;
  ok?: boolean;
  message?: string;
  data?: {
    message?: string;
    redirectTo?: string;
  };
};

export default function ChangePasswordPage() {
  const router = useRouter();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const result = (await response.json()) as ChangePasswordResponse;

      if (!response.ok || !result.success) {
        setError(result.message || "Không thể đổi mật khẩu.");
        return;
      }

      setSuccess(result.data?.message || "Đổi mật khẩu thành công.");
      const redirectTo = result.data?.redirectTo || "/";
      router.replace(redirectTo);
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
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#f47b0a] text-white">
                <KeyRound aria-hidden="true" size={28} />
              </div>
            </div>
            <h1 className="text-center text-2xl font-bold text-gray-900">
              Đổi mật khẩu đăng nhập
            </h1>
            <p className="mt-2 text-center text-gray-500">
              Cập nhật mật khẩu mới để tiếp tục sử dụng hệ thống
            </p>
          </div>

          <form className="space-y-5" onSubmit={submit}>
            <PasswordField
              id="currentPassword"
              label="Mật khẩu hiện tại"
              placeholder="Nhập mật khẩu hiện tại"
              value={currentPassword}
              onChange={setCurrentPassword}
              show={showCurrentPassword}
              onToggleShow={() => setShowCurrentPassword((value) => !value)}
            />

            <PasswordField
              id="newPassword"
              label="Mật khẩu mới"
              placeholder="Tối thiểu 8 ký tự, gồm chữ và số"
              value={newPassword}
              onChange={setNewPassword}
              show={showNewPassword}
              onToggleShow={() => setShowNewPassword((value) => !value)}
            />

            <PasswordField
              id="confirmPassword"
              label="Xác nhận mật khẩu mới"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirmPassword}
              onToggleShow={() => setShowConfirmPassword((value) => !value)}
            />

            {error ? (
              <p
                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            {success ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {success}
              </p>
            ) : null}

            <button
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-t from-orange-600 via-orange-500 to-orange-400 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:from-orange-700 hover:via-orange-600 hover:to-orange-500 hover:shadow-md hover:shadow-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang cập nhật..." : "Xác nhận đổi mật khẩu"}
              <ArrowRight aria-hidden="true" size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

type PasswordFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
};

function PasswordField({
  id,
  label,
  placeholder,
  value,
  onChange,
  show,
  onToggleShow,
}: PasswordFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700" htmlFor={id}>
        {label}
      </label>
      <div className="flex h-12 items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20">
        <LockKeyhole aria-hidden="true" className="text-gray-400" size={18} />
        <input
          className="h-full w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="current-password"
          required
        />
        <button
          type="button"
          aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          className="rounded-md p-1 text-gray-400 transition-colors hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          onClick={onToggleShow}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}
