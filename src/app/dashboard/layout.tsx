import * as React from "react";
import { redirect } from "next/navigation";
import { getCurrentHost, logoutHost } from "@/lib/auth/session";
import { DashboardLayoutShell } from "@/components/dashboard/dashboard-layout-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const host = await getCurrentHost();
  if (!host) {
    redirect("/login");
  }

  async function handleLogout() {
    "use server";
    await logoutHost();
    redirect("/login");
  }

  return (
    <DashboardLayoutShell host={host} logoutAction={handleLogout}>
      {children}
    </DashboardLayoutShell>
  );
}
