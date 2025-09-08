'use client';

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { Session, User } from '@supabase/supabase-js';

interface SignUpResult {
  error: string | null;
  needsConfirmation?: boolean;
  message?: string;
}

const AuthContext = createContext<{ 
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{error: string | null}>;
  signUp: (email: string, password: string, name: string) => Promise<SignUpResult>;
  loading: boolean;
}>({ 
  session: null, 
  user: null,
  signOut: async () => {},
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        // Avoid noisy error logs when there's simply no session
        if (error && error.message !== 'Auth session missing!') {
          console.warn('Auth: getSession error', error);
        }
        if (mounted) {
          setSession(data.session ?? null);
          setUser(data.session?.user ?? null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to get session:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, !!session);
      setSession(session);
      setUser(session?.user ?? null);
      
      // Handle auth state changes
      if (event === 'SIGNED_IN' && session) {
        router.push('/polls');
      } else if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase, router]);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
      }
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return { error: error.message };
      }
      
      return { error: null };
    } catch (error) {
      return { error: 'An unexpected error occurred during sign in' };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      });
      
      if (error) {
        return { error: error.message };
      }
      
      // Check if email confirmation is required
      if (data.user && !data.session) {
        return { 
          error: null, 
          needsConfirmation: true,
          message: 'Please check your email and click the confirmation link to activate your account.' 
        };
      }
      
      return { error: null };
    } catch (error) {
      return { error: 'An unexpected error occurred during sign up' };
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, signOut, signIn, signUp, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
