import { motion } from "framer-motion";
import { Volume2, VolumeX, Trophy, Calculator, Home, Users } from "lucide-react";
import { SFX } from "@/lib/audio";
import type { ScreenId } from "@/types";

interface Props {
  current: ScreenId;
  muted: boolean;
  onToggleMute: () => void;
  onNavigate: (s: ScreenId) => void;
  playerName?: string;
}

export function TopNav({ current, muted, onToggleMute, onNavigate, playerName }: Props) {
  const NavBtn = ({
    id,
    icon,
    label,
  }: {
    id: ScreenId;
    icon: React.ReactNode;
    label: string;
  }) => {
    const active = current === id;
    return (
      <button
        onClick={() => {
          SFX.click();
          onNavigate(id);
        }}
        className={`relative inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          active ? "text-white" : "text-white/60 hover:text-white"
        }`}
      >
        {active && (
          <motion.span
            layoutId="topnav-active"
            className="absolute inset-0 rounded-lg bg-white/10 border border-white/10"
            transition={{ type: "spring", stiffness: 500, damping: 40 }}
          />
        )}
        <span className="relative flex items-center gap-2">
          {icon}
          <span className="hidden sm:inline">{label}</span>
        </span>
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-ink-950/40 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 h-14 flex items-center justify-between gap-3">
        <button
          onClick={() => {
            SFX.click();
            onNavigate("menu");
          }}
          className="flex items-center gap-2 font-display tracking-tight"
        >
          <span className="relative inline-block h-7 w-7 rounded-md overflow-hidden">
            <span
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, #8b5cf6 0%, #d946ef 60%, #f5c451 100%)",
              }}
            />
            <span className="absolute inset-[3px] rounded-sm bg-ink-950" />
            <span
              className="absolute inset-x-[6px] bottom-[5px] h-[3px] rounded-sm"
              style={{ background: "linear-gradient(90deg,#a78bfa,#f0abfc,#fde68a)" }}
            />
            <span className="absolute inset-x-[8px] bottom-[10px] h-[3px] rounded-sm bg-royale-violet/80" />
            <span className="absolute inset-x-[10px] bottom-[15px] h-[3px] rounded-sm bg-royale-fuchsia/80" />
          </span>
          <span className="text-base sm:text-lg">
            Hanoi <span className="gradient-text">Royale</span>
          </span>
        </button>

        <nav className="flex items-center gap-1">
          <NavBtn id="menu" icon={<Home className="h-4 w-4" />} label="Menu" />
          <NavBtn id="leaderboard" icon={<Trophy className="h-4 w-4" />} label="Leaderboard" />
          <NavBtn id="scoring" icon={<Calculator className="h-4 w-4" />} label="Scoring" />
          <NavBtn id="profiles" icon={<Users className="h-4 w-4" />} label="Profiles" />
        </nav>

        <div className="flex items-center gap-2">
          {playerName && (
            <span className="hidden md:inline-flex chip">
              <span className="h-1.5 w-1.5 rounded-full bg-royale-mint" />
              {playerName}
            </span>
          )}
          <button
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={onToggleMute}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
