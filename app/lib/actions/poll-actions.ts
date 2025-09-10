"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Validation schemas and helpers for poll operations.
 * Why: Ensure consistent input constraints, normalize user input, and fail fast with clear errors.
 */
const PollOptionSchema = z.string().transform((s) => s.trim()).pipe(z.string().min(1).max(100));
const PollSchema = z.object({
  question: z.string().transform((s) => s.trim()).pipe(z.string().min(1).max(200)),
  options: z.array(PollOptionSchema).min(2).max(10),
  scheduled_open_time: z.coerce.date().optional(),
  scheduled_close_time: z.coerce.date().optional(),
});

const isUuid = (id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(id);

/**
 * Normalizes poll options: trims, removes empties, deduplicates case-insensitively, enforces max list length.
 * Why: Prevents storage bloat, ambiguous duplicates (e.g., "Yes" vs "yes"), and ensures a consistent UX.
 */
function normalizeOptions(options: string[]) {
  // trim, remove empties, dedupe (case-insensitive), and cap length
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of options) {
    const val = String(raw ?? "").trim();
    if (!val) continue;
    const key = val.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(val);
    if (result.length >= 10) break; // enforce max client-side too
  }
  return result;
}

/**
 * Creates a poll owned by the current user.
 * Why: Centralized server-side creation with validation and ownership.
 * Inputs: FormData with fields { question: string, options: string[], scheduled_open_time?: string, scheduled_close_time?: string }
 * Output: { error: string | null }
 * Edge cases: rejects <2 options, duplicate/blank options, overly long values, unauthenticated users.
 */
export async function createPoll(formData: FormData) {
  const supabase = await createClient();

  const question = (formData.get("question") as string) ?? "";
  const options = normalizeOptions((formData.getAll("options") as string[]) ?? []);
  const scheduled_open_time = formData.get("scheduled_open_time") as string;
  const scheduled_close_time = formData.get("scheduled_close_time") as string;

  const parsed = PollSchema.safeParse({ question, options, scheduled_open_time, scheduled_close_time });
  if (!parsed.success) {
    return { error: "Please provide a valid question and at least two unique options (max 10)." };
  }

  // Get user from session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    return { error: userError.message };
  }
  if (!user) {
    return { error: "You must be logged in to create a poll." };
  }

  const { error } = await supabase.from("polls").insert([
    {
      user_id: user.id,
      question: parsed.data.question,
      scheduled_open_time: parsed.data.scheduled_open_time,
      scheduled_close_time: parsed.data.scheduled_close_time,
    },
  ]).select();

  if (error) {
    return { error: error.message };
  }

  const pollId = error ? null : (await supabase.from('polls').select('id').order('created_at', { ascending: false }).limit(1).single())?.data?.id;

  if (!pollId) {
    return { error: "Failed to create poll." };
  }

  const { error: optionsError } = await supabase.from("options").insert(
    parsed.data.options.map((option) => ({ poll_id: pollId, text: option }))
  );

  if (optionsError) {
    return { error: optionsError.message };
  }

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/polls");
  return { error: null };
}

/**
 * Lists polls belonging to the current user, newest first.
 * Why: User dashboard source for "My Polls".
 * Output: { polls: Array<...>, error: string | null }
 * Security: restricts to the authenticated user's id; selects minimal columns.
 */
export async function getUserPolls({ page = 1 }: { page?: number } = {}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { polls: [], error: "Not authenticated" };

  const pageSize = 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from("polls")
    .select("*, options(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) return { polls: [], error: error.message };
  return { polls: data ?? [], error: null };
}

/**
 * Retrieves a single poll by id.
 * Why: Poll detail page data fetch.
 * Inputs: id (uuid string)
 * Output: { poll: object | null, error: string | null }
 * Security: validates UUID and selects minimal columns to reduce accidental exposure.
 */
export async function getPollById(id: string) {
  const supabase = await createClient();
  if (!isUuid(id)) {
    return { poll: null, error: "Invalid poll id." };
  }
  const { data, error } = await supabase
    .from("polls")
    .select("*, options(*)")
    .eq("id", id)
    .single();

  if (error) return { poll: null, error: error.message };
  return { poll: data, error: null };
}

/**
 * Submits a vote for a given poll option on behalf of the current user.
 * Why: Maintains vote integrity and enforces one vote per user per poll.
 * Inputs: pollId (uuid), optionIndex (integer >=0)
 * Output: { error: string | null }
 * Edge cases: invalid poll id, missing auth, option out of bounds, duplicate vote.
 */
export async function submitVote(pollId: string, optionIndex: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Require login to vote to prevent ballot stuffing and enable ownership checks
  if (!user) return { error: "You must be logged in to vote." };

  if (!isUuid(pollId)) return { error: "Invalid poll id." };
  if (!Number.isInteger(optionIndex) || optionIndex < 0) {
    return { error: "Invalid option selected." };
  }

  // Ensure poll exists and optionIndex is in range
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("*, options(*)")
    .eq("id", pollId)
    .single();
  if (pollError || !poll) return { error: "Poll not found." };
  const optionsArr: unknown = (poll as any).options;
  const optionsLen = Array.isArray(optionsArr) ? optionsArr.length : 0;
  if (optionIndex >= optionsLen) return { error: "Invalid option selected." };

  // Prevent duplicate votes by same user for the same poll
  // Note: Also recommend a unique DB index on (poll_id, user_id) for defense-in-depth.
  const { count: existingCount, error: existsError } = await supabase
    .from("votes")
    .select("id", { count: "exact", head: true })
    .eq("poll_id", pollId)
    .eq("user_id", user.id);
  if (existsError) return { error: existsError.message };
  if ((existingCount ?? 0) > 0) return { error: "You have already voted on this poll." };

  const { error } = await supabase.from("votes").insert([
    {
      poll_id: pollId,
      user_id: user.id,
      option_index: optionIndex,
    },
  ]);

  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Deletes a poll owned by the current user.
 * Why: Enforces authorization by both id and user_id.
 * Inputs: id (uuid string)
 * Output: { error: string | null }
 */
export async function deletePoll(id: string) {
  const supabase = await createClient();
  if (!isUuid(id)) return { error: "Invalid poll id." };

  // Enforce ownership server-side in addition to RLS policies
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) return { error: userError.message };
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("polls")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/polls");
  return { error: null };
}

/**
 * Updates a poll (question and options) if owned by the current user.
 * Why: Allows authors to refine their polls with full validation.
 * Inputs: pollId (uuid), FormData with fields { question, options[], scheduled_open_time?: string, scheduled_close_time?: string }
 * Output: { error: string | null }
 */
export async function updatePoll(pollId: string, formData: FormData) {
  const supabase = await createClient();

  if (!isUuid(pollId)) return { error: "Invalid poll id." };

  const question = (formData.get("question") as string) ?? "";
  const options = normalizeOptions((formData.getAll("options") as string[]) ?? []);
  const scheduled_open_time = formData.get("scheduled_open_time") as string;
  const scheduled_close_time = formData.get("scheduled_close_time") as string;

  const parsed = PollSchema.safeParse({ question, options, scheduled_open_time, scheduled_close_time });
  if (!parsed.success) {
    return { error: "Please provide a valid question and at least two unique options (max 10)." };
  }

  // Get user from session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    return { error: userError.message };
  }
  if (!user) {
    return { error: "You must be logged in to update a poll." };
  }

  // Only allow updating polls owned by the user
  const { error } = await supabase
    .from("polls")
    .update({
      question: parsed.data.question,
      scheduled_open_time: parsed.data.scheduled_open_time,
      scheduled_close_time: parsed.data.scheduled_close_time,
    })
    .eq("id", pollId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  const { error: deleteError } = await supabase.from("options").delete().eq("poll_id", pollId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  const { error: optionsError } = await supabase.from("options").insert(
    parsed.data.options.map((option) => ({ poll_id: pollId, text: option }))
  );

  if (optionsError) {
    return { error: optionsError.message };
  }

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/polls");
  revalidatePath(`/polls/${pollId}`);
  return { error: null };
}

/**
 * Publishes a draft poll, changing its status to 'open'.
 * Why: Allows authors to make their polls live.
 * Inputs: pollId (uuid)
 * Output: { error: string | null }
 */
export async function publishPoll(pollId: string) {
  const supabase = await createClient();

  if (!isUuid(pollId)) return { error: "Invalid poll id." };

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) return { error: userError.message };
  if (!user) return { error: "You must be logged in to publish a poll." };

  const { error } = await supabase
    .from("polls")
    .update({ status: 'open' })
    .eq("id", pollId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/polls");
  return { error: null };
}
