import { useEffect, useState } from "react";

/** Keep the mobile collapse control aligned with Tailwind's lg breakpoint. */
export function useStageCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      if (desktop.matches) setCollapsed(false);
    };
    desktop.addEventListener("change", sync);
    sync();
    return () => desktop.removeEventListener("change", sync);
  }, []);
  return [collapsed, setCollapsed] as const;
}
