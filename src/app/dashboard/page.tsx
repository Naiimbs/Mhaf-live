import { requireHostAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { CalendarWorkspace } from "@/components/dashboard/calendar-workspace";

export default async function DashboardPage() {
  const host = await requireHostAuth();
  const eventTypes = await db.getEventTypesByHostId(host.id);
  return (
    <CalendarWorkspace
      hostTimeZone={host.timezone || "UTC"}
      eventTypes={eventTypes.filter((eventType) => eventType.isActive).map(({ id, slug, title, durationMinutes }) => ({
        id,
        slug,
        title,
        durationMinutes,
      }))}
    />
  );
}
