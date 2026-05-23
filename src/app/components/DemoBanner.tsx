/**
 * Floating role switcher visible only while DEMO_MODE is on.
 */
import { useState } from 'react';
import { DEMO_MODE, DEMO_USERS } from '@/lib/demo-mode';
import { useDemoAuth } from '../contexts/DemoAuthContext';
import type { UserRole } from '../types';
import { ChevronUp, ChevronDown, User, LogOut, Sparkles } from 'lucide-react';

const ROLE_LABELS: Record<UserRole, string> = {
  customer: 'Customer',
  admin: 'Admin',
  technician: 'Technician',
  driver: 'Driver',
};

export function DemoBanner() {
  if (!DEMO_MODE) return null;
  return <DemoBannerInner />;
}

function DemoBannerInner() {
  const [open, setOpen] = useState(true);
  const { demoRole, setDemoRole, user } = useDemoAuth();

  return (
    <div className="fixed bottom-4 right-4 z-[9999] font-sans">
      <div className="rounded-2xl bg-amber-500 text-black shadow-2xl border-2 border-amber-700 overflow-hidden">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-2 px-4 py-2 font-bold text-sm hover:bg-amber-400 transition"
        >
          <Sparkles className="w-4 h-4" />
          DEMO MODE
          {user && <span className="text-xs opacity-80">— {user.displayName}</span>}
          {open ? <ChevronDown className="w-4 h-4 ml-auto" /> : <ChevronUp className="w-4 h-4 ml-auto" />}
        </button>

        {open && (
          <div className="p-3 bg-amber-100 dark:bg-amber-50 space-y-2 min-w-[220px]">
            <div className="text-[11px] text-amber-900 leading-tight">
              Backend disconnected. Switch roles to preview the UI.
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(DEMO_USERS) as UserRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => setDemoRole(role)}
                  className={`flex items-center gap-1.5 px-2 py-2 rounded-lg text-xs font-bold transition border-2 ${
                    demoRole === role
                      ? 'bg-amber-600 text-white border-amber-700'
                      : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  <User className="w-3 h-3" />
                  {ROLE_LABELS[role]}
                </button>
              ))}
            </div>
            <button
              onClick={() => setDemoRole(null)}
              disabled={!demoRole}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-white text-red-700 border-2 border-red-300 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <LogOut className="w-3 h-3" />
              Sign out
            </button>
            <div className="text-[10px] text-amber-900/70 pt-1 border-t border-amber-300">
              Set <code>DEMO_MODE = false</code> in <code>src/lib/demo-mode.ts</code> to reconnect.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
