"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Validation schemas and helpers
const PollOptionSchema = z.string().transform((s) => s.trim()).pipe(z.string().min(1).max(100));
const PollSchema = z.object({
  question: z.string().transform((s) => s.trim()).pipe(z.string().min(1).max(200)),
  options: z.array(PollOptionSchema).min(2).max(10),
});

const isUuid = (id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(id);

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

// CREATE POLL
export async function createPoll(formData: FormData) {
  const supabase = await createClient();

  const question = (formData.get("question") as string) ?? "";
  const options = normalizeOptions((formData.getAll("options") as string[]) ?? []);

  const parsed = PollSchema.safeParse({ question, options });
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
      options: parsed.data.options,
    },
  ]);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/polls");
  return { error: null };
}

// GET USER POLLS
export async function getUserPolls() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { polls: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("polls")
    // limit fields to reduce accidental data exposure
    .select("id, question, options, user_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { polls: [], error: error.message };
  return { polls: data ?? [], error: null };
}

// GET POLL BY ID
export async function getPollById(id: string) {
  const supabase = await createClient();
  if (!isUuid(id)) {
    return { poll: null, error: "Invalid poll id." };
  }
  const { data, error } = await supabase
    .from("polls")
    .select("id, question, options, user_id, created_at")
    .eq("id", id)
    .single();

  if (error) return { poll: null, error: error.message };
  return { poll: data, error: null };
}

// SUBMIT VOTE
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
    .select("id, options")
    .eq("id", pollId)
    .single();
  if (pollError || !poll) return { error: "Poll not found." };
  const optionsArr: unknown = (poll as any).options;
  const optionsLen = Array.isArray(optionsArr) ? optionsArr.length : 0;
  if (optionIndex >= optionsLen) return { error: "Invalid option selected." };

  // Prevent duplicate votes by same user for the same poll
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

// DELETE POLL
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

// UPDATE POLL
export async function updatePoll(pollId: string, formData: FormData) {
  const supabase = await createClient();

  if (!isUuid(pollId)) return { error: "Invalid poll id." };

  const question = (formData.get("question") as string) ?? "";
  const options = normalizeOptions((formData.getAll("options") as string[]) ?? []);

  const parsed = PollSchema.safeParse({ question, options });
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
    .update({ question: parsed.data.question, options: parsed.data.options })
    .eq("id", pollId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/polls");
  revalidatePath(`/polls/${pollId}`);
  return { error: null };
}
