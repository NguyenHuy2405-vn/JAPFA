import { isFarm } from "@/access/roles";
import { getAppUser, getRoleLandingPage } from "@/server/auth";
import { Topbar } from "@/components/layouts/Topbar";
import { FarmSidebar } from "@/components/layouts/FarmSidebar";
import { redirect } from "next/navigation";

export default async function FarmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAppUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  if (!isFarm(user.role)) redirect(getRoleLandingPage(user.role));

  return (
    <div className="min-h-screen bg-background text-ink">
      <Topbar
        role={user.role}
        userEmail={user.email}
        userName={user.fullName}
        notificationHref="/farm/notifications"
      />
      <div className="mx-auto flex w-full max-w-7xl flex-col md:flex-row">
        <FarmSidebar />
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
