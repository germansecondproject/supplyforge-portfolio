'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { authAvailable, browserClient } from '@/lib/supabase-browser';
import { useShop } from './Providers';

export interface Profile {
  name: string;
  company: string;
  phone: string;
  address: string;
  city: string;
  postcode: string;
  mode: 'diy' | 'biz';
}

interface AuthCtx {
  available: boolean;
  ready: boolean;
  user: User | null;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, profile: Partial<Profile>) => Promise<{ error: string | null; confirm: boolean }>;
  signOut: () => Promise<void>;
  token: () => Promise<string | null>;
}

const A = createContext<AuthCtx | null>(null);
export const useAuth = () => {
  const v = useContext(A);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
};

const toProfile = (u: User | null): Profile | null => {
  if (!u) return null;
  const m = u.user_metadata ?? {};
  const s = (k: string) => (typeof m[k] === 'string' ? (m[k] as string) : '');
  return { name: s('name'), company: s('company'), phone: s('phone'), address: s('address'), city: s('city'), postcode: s('postcode'), mode: m.mode === 'biz' ? 'biz' : 'diy' };
};

const friendly = (msg: string) =>
  /invalid login/i.test(msg) ? 'The email or password is not right.'
  : /already registered/i.test(msg) ? 'There is already an account with this email. Sign in instead.'
  : /password/i.test(msg) ? 'Choose a password with at least 8 characters.'
  : /rate limit/i.test(msg) ? 'Too many attempts. Wait a minute and try again.'
  : msg;

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { mode, setMode } = useShop();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!authAvailable);

  useEffect(() => {
    if (!authAvailable) return;
    const sb = browserClient();
    sb.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setReady(true); });
    const { data } = sb.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      // guest orders placed with this email join the account
      if (event === 'SIGNED_IN') sb.rpc('link_guest_orders').then(() => undefined, () => undefined);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await browserClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) return friendly(error.message);
    const p = toProfile(data.user);
    if (p && p.mode !== mode) setMode(p.mode);
    return null;
  }, [mode, setMode]);

  const signUp = useCallback(async (email: string, password: string, profile: Partial<Profile>) => {
    const { data, error } = await browserClient().auth.signUp({
      email: email.trim(), password, options: { data: profile, emailRedirectTo: window.location.origin + '/account' },
    });
    if (error) return { error: friendly(error.message), confirm: false };
    return { error: null, confirm: !data.session };
  }, []);

  const signOut = useCallback(async () => { await browserClient().auth.signOut(); }, []);
  const token = useCallback(async () => (authAvailable ? (await browserClient().auth.getSession()).data.session?.access_token ?? null : null), []);

  const value = useMemo(
    () => ({ available: authAvailable, ready, user, profile: toProfile(user), signIn, signUp, signOut, token }),
    [ready, user, signIn, signUp, signOut, token],
  );
  return <A.Provider value={value}>{children}</A.Provider>;
}
