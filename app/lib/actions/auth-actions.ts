'use server';

import { createClient } from '@/lib/supabase/server';
import { LoginFormData, RegisterFormData } from '../types';

/**
 * Authenticates a user with email/password via Supabase.
 * Why: Centralized server action to sign users in and surface friendly errors.
 * Input: LoginFormData { email, password }
 * Output: { error: string | null }
 * Notes: Returns a generic error string for UI; session cookies are set by Supabase middleware.
 */
export async function login(data: LoginFormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) {
    return { error: error.message };
  }

  // Success: no error
  return { error: null };
}

/**
 * Registers a new user account via Supabase Auth with profile metadata.
 * Why: Creates an auth identity and stores display name in user metadata.
 * Input: RegisterFormData { name, email, password }
 * Output: { error: string | null }
 */
export async function register(data: RegisterFormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        name: data.name,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Success: no error
  return { error: null };
}

/**
 * Signs the current user out.
 * Why: Clears auth session cookies and invalidates local session.
 * Output: { error: string | null }
 */
export async function logout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { error: error.message };
  }
  return { error: null };
}

/**
 * Retrieves the current authenticated user (server-side).
 * Why: Useful for SSR logic and access control in server actions.
 * Output: Supabase User | null
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/**
 * Retrieves the current auth session (server-side).
 * Why: Used for SSR flows that need access tokens or session details.
 * Output: Supabase Session | null
 */
export async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
}
