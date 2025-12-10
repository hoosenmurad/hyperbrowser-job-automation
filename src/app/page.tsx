"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Play, Loader2, CheckCircle, XCircle, Briefcase, Target, Zap } from "lucide-react";

interface SearchResult {
  query: string;
  platform: string;
  success: boolean;
  jobsFound: number;
  browserUrl?: string;
  recordingUrl?: string;
  error?: string;
}

export default function Dashboard() {
  const [isSearching, setIsSearching] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [searchQueries, setSearchQueries] = useState("Software Engineer, Full Stack Developer");
  const [platforms, setPlatforms] = useState("remoteok, weworkremotely");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle");
  const [stats, setStats] = useState<{ totalJobs: number; appliedCount: number } | null>(null);

  const testConnection = async () => {
    setIsTesting(true);
    setTestStatus("idle");

    try {
      const response = await fetch("/api/sessions");
      const data = await response.json();

      if (data.success) {
        setTestStatus("success");
      } else {
        setTestStatus("error");
      }
    } catch {
      setTestStatus("error");
    } finally {
      setIsTesting(false);
    }
  };

  const startSearch = async () => {
    setIsSearching(true);
    setResults([]);

    try {
      const queries = searchQueries.split(",").map((q) => q.trim()).filter(Boolean);
      const platformList = platforms.split(",").map((p) => p.trim()).filter(Boolean);

      const response = await fetch("/api/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queries, platforms: platformList }),
      });

      const data = await response.json();

      if (data.results) {
        setResults(data.results);
      }
      if (data.statistics) {
        setStats({
          totalJobs: data.statistics.totalJobs,
          appliedCount: data.statistics.appliedCount,
        });
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-white">Dashboard</h2>
        <p className="text-[var(--muted)] mt-2">
          AI-powered job search and application automation
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10">
              <Briefcase className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-[var(--muted)] text-sm">Total Jobs</p>
              <p className="text-2xl font-bold text-white">{stats?.totalJobs || 0}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/10">
              <Target className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-[var(--muted)] text-sm">Applied</p>
              <p className="text-2xl font-bold text-white">{stats?.appliedCount || 0}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-500/10">
              <Zap className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-[var(--muted)] text-sm">Connection</p>
              <div className="flex items-center gap-2">
                {testStatus === "idle" && (
                  <button
                    onClick={testConnection}
                    disabled={isTesting}
                    className="text-sm text-[var(--accent)] hover:underline"
                  >
                    {isTesting ? "Testing..." : "Test Connection"}
                  </button>
                )}
                {testStatus === "success" && (
                  <span className="flex items-center gap-1 text-green-500">
                    <CheckCircle className="w-4 h-4" /> Connected
                  </span>
                )}
                {testStatus === "error" && (
                  <span className="flex items-center gap-1 text-red-500">
                    <XCircle className="w-4 h-4" /> Failed
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Form */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Start Job Search</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--muted)] mb-2">
              Search Queries (comma-separated)
            </label>
            <input
              type="text"
              value={searchQueries}
              onChange={(e) => setSearchQueries(e.target.value)}
              className="input w-full"
              placeholder="e.g., Software Engineer, Full Stack Developer"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--muted)] mb-2">
              Platforms (comma-separated)
            </label>
            <input
              type="text"
              value={platforms}
              onChange={(e) => setPlatforms(e.target.value)}
              className="input w-full"
              placeholder="e.g., remoteok, weworkremotely, glassdoor"
            />
            <p className="text-xs text-[var(--muted)] mt-1">
              Available: remoteok, weworkremotely, glassdoor, angellist, dice, nodesk, jobspresso
            </p>
          </div>

          <button
            onClick={startSearch}
            disabled={isSearching}
            className="btn btn-primary w-full"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Start Job Search
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Search Results</h3>

          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.success
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-red-500/30 bg-red-500/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">
                      {result.platform} — &ldquo;{result.query}&rdquo;
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      {result.success
                        ? `Found ${result.jobsFound} jobs`
                        : `Error: ${result.error}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>

                {result.browserUrl && (
                  <div className="mt-2 flex gap-2">
                    <a
                      href={result.browserUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--accent)] hover:underline"
                    >
                      🌐 Live View
                    </a>
                    {result.recordingUrl && (
                      <a
                        href={result.recordingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--accent)] hover:underline"
                      >
                        📹 Recording
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link href="/jobs" className="btn btn-secondary">
            <Briefcase className="w-4 h-4" />
            View All Jobs
          </Link>
          <button
            onClick={testConnection}
            disabled={isTesting}
            className="btn btn-secondary"
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Test Browser
          </button>
        </div>
      </div>
    </div>
  );
}

