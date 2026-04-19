import { CommandCenterShell } from "@/components/CommandCenterShell";
import { getDashboard, getEvents } from "@/lib/queries";
import { worldLocations, worldViewBox } from "@/lib/world-map";

export default function HomePage() {
  const dashboard = getDashboard();
  const events = getEvents();

  return (
    <CommandCenterShell
      dashboard={dashboard}
      events={events}
      countries={worldLocations}
      worldViewBox={worldViewBox}
    />
  );
}
