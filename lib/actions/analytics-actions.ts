"use server";

import { createClient } from "@/lib/supabase/server";

const isUuid = (id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(id);

/**
 * Gets comprehensive analytics data for the current user's polls.
 * Returns vote counts, trends, and statistics.
 */
export async function getUserAnalytics() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { analytics: null, error: "Not authenticated" };

  try {
    // Get user's polls with vote counts
    const { data: polls, error: pollsError } = await supabase
      .from("polls")
      .select("id, question, options, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (pollsError) return { analytics: null, error: pollsError.message };
    if (!polls) return { analytics: null, error: "No polls found" };

    // Get all votes for user's polls
    const pollIds = polls.map(poll => poll.id);
    const { data: votes, error: votesError } = await supabase
      .from("votes")
      .select("poll_id, option_index, created_at, user_id")
      .in("poll_id", pollIds);

    if (votesError) return { analytics: null, error: votesError.message };

    // Process analytics data
    const analytics = processAnalyticsData(polls, votes || []);
    return { analytics, error: null };
  } catch (error) {
    return { analytics: null, error: "Failed to fetch analytics data" };
  }
}

/**
 * Gets analytics for a specific poll by ID.
 */
export async function getPollAnalytics(pollId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { analytics: null, error: "Not authenticated" };
  if (!isUuid(pollId)) return { analytics: null, error: "Invalid poll ID" };

  try {
    // Get the poll (ensure ownership)
    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .select("id, question, options, created_at")
      .eq("id", pollId)
      .eq("user_id", user.id)
      .single();

    if (pollError || !poll) return { analytics: null, error: "Poll not found or access denied" };

    // Get votes for this poll
    const { data: votes, error: votesError } = await supabase
      .from("votes")
      .select("option_index, created_at, user_id")
      .eq("poll_id", pollId);

    if (votesError) return { analytics: null, error: votesError.message };

    // Process single poll analytics
    const analytics = processPollAnalytics(poll, votes || []);
    return { analytics, error: null };
  } catch (error) {
    return { analytics: null, error: "Failed to fetch poll analytics" };
  }
}

/**
 * Gets voting trends over time for all user's polls.
 */
export async function getVotingTrends(days: number = 30) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { trends: null, error: "Not authenticated" };

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get user's polls
    const { data: polls, error: pollsError } = await supabase
      .from("polls")
      .select("id")
      .eq("user_id", user.id);

    if (pollsError) return { trends: null, error: pollsError.message };
    if (!polls || polls.length === 0) return { trends: [], error: null };

    const pollIds = polls.map(poll => poll.id);

    // Get votes from the last N days
    const { data: votes, error: votesError } = await supabase
      .from("votes")
      .select("created_at, poll_id")
      .in("poll_id", pollIds)
      .gte("created_at", cutoffDate.toISOString());

    if (votesError) return { trends: null, error: votesError.message };

    // Process trends data
    const trends = processVotingTrends(votes || [], days);
    return { trends, error: null };
  } catch (error) {
    return { trends: null, error: "Failed to fetch voting trends" };
  }
}

// Helper functions for processing analytics data

function processAnalyticsData(polls: any[], votes: any[]) {
  const totalPolls = polls.length;
  const totalVotes = votes.length;
  
  // Calculate votes per poll
  const votesByPoll = votes.reduce((acc, vote) => {
    acc[vote.poll_id] = (acc[vote.poll_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Find most popular poll
  let mostPopularPoll = null;
  let maxVotes = 0;
  for (const poll of polls) {
    const voteCount = votesByPoll[poll.id] || 0;
    if (voteCount > maxVotes) {
      maxVotes = voteCount;
      mostPopularPoll = { ...poll, voteCount };
    }
  }

  // Calculate engagement rate (polls with votes / total polls)
  const pollsWithVotes = Object.keys(votesByPoll).length;
  const engagementRate = totalPolls > 0 ? (pollsWithVotes / totalPolls) * 100 : 0;

  // Get unique voters
  const uniqueVoters = new Set(votes.map(v => v.user_id)).size;

  // Calculate recent activity (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentVotes = votes.filter(vote => new Date(vote.created_at) > sevenDaysAgo).length;
  const recentPolls = polls.filter(poll => new Date(poll.created_at) > sevenDaysAgo).length;

  // Poll performance breakdown
  const pollPerformance = polls.map(poll => {
    const pollVotes = votes.filter(v => v.poll_id === poll.id);
    const optionCounts = pollVotes.reduce((acc, vote) => {
      acc[vote.option_index] = (acc[vote.option_index] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const options = Array.isArray(poll.options) ? poll.options : [];
    const optionResults = options.map((option: string, index: number) => ({
      option,
      votes: optionCounts[index] || 0,
      percentage: pollVotes.length > 0 ? Math.round((optionCounts[index] || 0) / pollVotes.length * 100) : 0
    }));

    return {
      id: poll.id,
      question: poll.question,
      totalVotes: pollVotes.length,
      createdAt: poll.created_at,
      options: optionResults
    };
  });

  return {
    overview: {
      totalPolls,
      totalVotes,
      uniqueVoters,
      engagementRate: Math.round(engagementRate * 100) / 100,
      averageVotesPerPoll: totalPolls > 0 ? Math.round((totalVotes / totalPolls) * 100) / 100 : 0
    },
    mostPopularPoll,
    recentActivity: {
      votesLast7Days: recentVotes,
      pollsLast7Days: recentPolls
    },
    pollPerformance: pollPerformance.sort((a, b) => b.totalVotes - a.totalVotes)
  };
}

function processPollAnalytics(poll: any, votes: any[]) {
  const options = Array.isArray(poll.options) ? poll.options : [];
  const totalVotes = votes.length;

  // Calculate option results
  const optionCounts = votes.reduce((acc, vote) => {
    acc[vote.option_index] = (acc[vote.option_index] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const optionResults = options.map((option: string, index: number) => ({
    option,
    votes: optionCounts[index] || 0,
    percentage: totalVotes > 0 ? Math.round((optionCounts[index] || 0) / totalVotes * 100) : 0
  }));

  // Voting timeline (group by day)
  const votingTimeline = votes.reduce((acc, vote) => {
    const date = new Date(vote.created_at).toDateString();
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const timelineData = Object.entries(votingTimeline)
    .map(([date, count]) => ({ date, votes: count }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Unique voters
  const uniqueVoters = new Set(votes.map(v => v.user_id)).size;

  return {
    poll: {
      id: poll.id,
      question: poll.question,
      createdAt: poll.created_at
    },
    summary: {
      totalVotes,
      uniqueVoters,
      optionsCount: options.length
    },
    optionResults,
    votingTimeline: timelineData
  };
}

function processVotingTrends(votes: any[], days: number) {
  const trendData: { date: string; votes: number }[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toDateString();
    
    const votesForDay = votes.filter(vote => 
      new Date(vote.created_at).toDateString() === dateStr
    ).length;

    trendData.push({
      date: date.toLocaleDateString(),
      votes: votesForDay
    });
  }

  return trendData;
}
