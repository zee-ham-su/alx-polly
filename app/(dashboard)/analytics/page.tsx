import { getUserAnalytics, getVotingTrends } from "@/lib/actions/analytics-actions";
import { StatCard } from "@/components/analytics/StatCard";
import { SimpleChart } from "@/components/analytics/SimpleChart";
import { PollPerformanceTable } from "@/components/analytics/PollPerformanceTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, Vote, TrendingUp, Activity, Target } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AnalyticsPage() {
  const [analyticsResult, trendsResult] = await Promise.all([
    getUserAnalytics(),
    getVotingTrends(30)
  ]);

  if (analyticsResult.error || !analyticsResult.analytics) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              {analyticsResult.error || "Unable to load analytics data"}
            </p>
            <Button asChild className="mt-4">
              <Link href="/polls/create">Create your first poll</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { analytics } = analyticsResult;
  const trends = trendsResult.trends || [];

  const trendChartData = trends.map(trend => ({
    label: trend.date,
    value: trend.votes
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Insights and trends for your polling data
          </p>
        </div>
        <Button asChild>
          <Link href="/polls/create">Create New Poll</Link>
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Polls"
          value={analytics.overview.totalPolls}
          description="Polls you've created"
          icon={BarChart3}
        />
        <StatCard
          title="Total Votes"
          value={analytics.overview.totalVotes}
          description="Votes across all polls"
          icon={Vote}
        />
        <StatCard
          title="Unique Voters"
          value={analytics.overview.uniqueVoters}
          description="People who have voted"
          icon={Users}
        />
        <StatCard
          title="Engagement Rate"
          value={`${analytics.overview.engagementRate}%`}
          description="Polls with at least 1 vote"
          icon={Target}
        />
        <StatCard
          title="Avg Votes/Poll"
          value={analytics.overview.averageVotesPerPoll}
          description="Average engagement per poll"
          icon={TrendingUp}
        />
        <StatCard
          title="Recent Activity"
          value={analytics.recentActivity.votesLast7Days}
          description="Votes in last 7 days"
          icon={Activity}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Voting Trends */}
        <SimpleChart
          title="Voting Trends (30 Days)"
          description="Daily votes over the last month"
          data={trendChartData}
          type="line"
        />

        {/* Most Popular Poll */}
        {analytics.mostPopularPoll && (
          <Card>
            <CardHeader>
              <CardTitle>Most Popular Poll</CardTitle>
              <CardDescription>
                Your poll with the most votes ({analytics.mostPopularPoll.voteCount} votes)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <h3 className="font-medium">{analytics.mostPopularPoll.question}</h3>
                <div className="text-sm text-muted-foreground">
                  Created {new Date(analytics.mostPopularPoll.created_at).toLocaleDateString()}
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/polls/${analytics.mostPopularPoll.id}`}>
                    View Details
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Activity Summary */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">New Polls</span>
                <span className="font-medium">{analytics.recentActivity.pollsLast7Days}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">New Votes</span>
                <span className="font-medium">{analytics.recentActivity.votesLast7Days}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {analytics.overview.totalPolls > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Active Polls</span>
                  <span className="font-medium">
                    {analytics.pollPerformance.filter(p => p.totalVotes > 0).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Inactive Polls</span>
                  <span className="font-medium">
                    {analytics.pollPerformance.filter(p => p.totalVotes === 0).length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Poll Performance Table */}
      <PollPerformanceTable polls={analytics.pollPerformance.slice(0, 10)} />

      {analytics.pollPerformance.length > 10 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Showing top 10 polls. You have {analytics.pollPerformance.length - 10} more polls.
            </p>
            <Button variant="outline" size="sm" asChild className="mt-2">
              <Link href="/polls">View All Polls</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
