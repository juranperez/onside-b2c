"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isLight = mounted && resolvedTheme === "light";
  return (
    <button
      onClick={() => setTheme(isLight ? "dark" : "light")}
      aria-label="Toggle light / dark theme"
      title="Toggle theme"
      className="p-2 rounded-lg text-mute hover:text-fg hover:bg-overlay/5 transition cursor-pointer"
    >
      {isLight ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
