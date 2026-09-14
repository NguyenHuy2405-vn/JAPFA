"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { NotificationBell } from "@/components/layouts/NotificationBell";
import { UserMenu } from "@/components/layouts/UserMenu";
import { LanguageSwitcher } from "@/components/layouts/LanguageSwitcher";
import { t } from "@/utils/i18n";
import logo from "@/components/LegacyDashboardView/logo.png";

type TopbarProps = {
  role: string;
  userEmail: string;
  userName?: string | null;
  notificationHref: string;
};

export function Topbar({
  role,
  userEmail,
  userName,
  notificationHref,
}: TopbarProps) {
  const [lang, setLang] = useState<"vi" | "en">("vi");

  useEffect(() => {
    const applyStoredLanguage = () => {
      const saved = window.localStorage.getItem("japfa.lang");
      if (saved === "vi" || saved === "en") {
        setLang(saved);
      }
    };

    const onLanguageChanged = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail === "vi" || detail === "en") {
        setLang(detail);
      }
    };

    applyStoredLanguage();
    window.addEventListener("app-language-change", onLanguageChanged);
    window.addEventListener("storage", applyStoredLanguage);
    return () => {
      window.removeEventListener("app-language-change", onLanguageChanged);
      window.removeEventListener("storage", applyStoredLanguage);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-white shadow-sm">
            <Image src={logo} alt="JAPFA" className="h-9 w-9 object-contain" priority />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-heading text-base font-semibold leading-tight text-ink">
              {t("brandTitle", lang)}
            </span>
            <span className="block truncate text-xs text-ink-soft">
              {t("brandContext", lang)}
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <NotificationBell href={notificationHref} />
          <UserMenu role={role} userEmail={userEmail} userName={userName} />
        </div>
      </div>
    </header>
  );
}
