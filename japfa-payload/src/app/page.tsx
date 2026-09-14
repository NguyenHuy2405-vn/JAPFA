import { getAppUser } from "@/server/auth";
import { getRoleLandingPage } from "@/server/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const user = await getAppUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  redirect(getRoleLandingPage(user.role));
}
