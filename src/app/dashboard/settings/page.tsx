import * as React from "react";
import { getCurrentHost } from "@/lib/auth/session";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const host = await getCurrentHost();

  return (
    <SettingsClient
      email={host?.email}
      timezone={host?.timezone || "UTC"}
    />
  );
}
