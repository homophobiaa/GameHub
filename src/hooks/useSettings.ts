import { useCallback, useEffect, useState } from "react";
import type { AppSettings } from "@/types";
import { loadSettings, saveSettings } from "@/storage/storage";
import { setMuted as setAudioMuted } from "@/lib/audio";

export function useSettings(): {
  settings: AppSettings;
  toggleMute: () => void;
  setMuted: (v: boolean) => void;
} {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  useEffect(() => {
    setAudioMuted(settings.muted);
    saveSettings(settings);
  }, [settings]);

  const setMuted = useCallback((v: boolean) => {
    setSettings((s) => ({ ...s, muted: v }));
  }, []);

  const toggleMute = useCallback(() => {
    setSettings((s) => ({ ...s, muted: !s.muted }));
  }, []);

  return { settings, toggleMute, setMuted };
}
