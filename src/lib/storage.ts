/**
 * localStorage with a safe in-memory fallback, so the app still runs inside
 * sandboxed previews (or Safari private mode) instead of crashing on boot.
 *
 * The key is unchanged from the v1 single-file build on purpose: anyone who
 * used the old page on this origin keeps their progress after the React port.
 */
export const KEY = 'hld-lld-tracker/v1';
export const SCHEMA = 3;

interface Driver {
  mode: 'localStorage' | 'memory';
  get(k: string): string | null;
  set(k: string, v: string): void;
  del(k: string): void;
}

function makeDriver(): Driver {
  try {
    const probe = '__hlt_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return {
      mode: 'localStorage',
      get: (k) => localStorage.getItem(k),
      set: (k, v) => localStorage.setItem(k, v),
      del: (k) => localStorage.removeItem(k),
    };
  } catch {
    const mem: Record<string, string> = Object.create(null);
    return {
      mode: 'memory',
      get: (k) => (k in mem ? mem[k] : null),
      set: (k, v) => {
        mem[k] = String(v);
      },
      del: (k) => {
        delete mem[k];
      },
    };
  }
}

export const Storage: Driver = makeDriver();
export const PERSISTENT = Storage.mode === 'localStorage';
