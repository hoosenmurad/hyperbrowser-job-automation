"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  ExternalLink,
  Send,
  Loader2,
  CheckCircle,
  Clock,
  Eye,
} from "lucide-react";
import type { Job, JobStatistics } from "@/types";

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<JobStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchJobs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const response = await fetch(`/api/jobs?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setJobs(data.jobs);
        setStats(data.statistics);
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const applyToJob = async (index: number) => {
    setApplying(index);
    try {
      const response = await fetch("/api/jobs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIndex: index }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh jobs to update status
        fetchJobs();
        alert("Application submitted successfully!");
      } else {
        alert(`Application failed: ${data.error}`);
      }
    } catch (error) {
      console.error("Failed to apply:", error);
      alert("Failed to apply to job");
    } finally {
      setApplying(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "found":
        return <span className="badge badge-found">Found</span>;
      case "reviewed":
        return <span className="badge badge-reviewed">Reviewed</span>;
      case "applied":
        return <span className="badge badge-applied">Applied</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Jobs</h2>
          <p className="text-[var(--muted)] mt-1">
            {stats?.totalJobs || 0} jobs tracked • {stats?.appliedCount || 0} applied
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search jobs..."
            className="input w-full pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--muted)]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
          >
            <option value="all">All Status</option>
            <option value="found">Found</option>
            <option value="reviewed">Reviewed</option>
            <option value="applied">Applied</option>
          </select>
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {jobs.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-[var(--muted)]">No jobs found</p>
            <p className="text-sm text-[var(--muted)] mt-2">
              Start a search from the dashboard to find jobs
            </p>
          </div>
        ) : (
          jobs.map((job, index) => (
            <div key={index} className="card p-5 hover:border-[var(--accent)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white truncate">
                      {job.jobTitle}
                    </h3>
                    {getStatusBadge(job.status)}
                  </div>

                  <p className="text-[var(--muted)]">{job.company}</p>

                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-[var(--muted)]">
                    {job.location && (
                      <span className="flex items-center gap-1">
                        📍 {job.location}
                      </span>
                    )}
                    {job.salaryRange && job.salaryRange !== "Not specified" && (
                      <span className="flex items-center gap-1">
                        💰 {job.salaryRange}
                      </span>
                    )}
                    {job.jobBoard && (
                      <span className="flex items-center gap-1">
                        🌐 {job.jobBoard}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(job.lastUpdated).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {job.jobUrl && (
                    <a
                      href={job.jobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary text-sm py-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View
                    </a>
                  )}

                  {job.status !== "applied" && job.jobUrl && (
                    <button
                      onClick={() => applyToJob(index)}
                      disabled={applying === index}
                      className="btn btn-primary text-sm py-2"
                    >
                      {applying === index ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Apply
                    </button>
                  )}

                  {job.status === "applied" && (
                    <span className="flex items-center gap-1 text-green-500 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Applied
                    </span>
                  )}
                </div>
              </div>

              {/* Additional Info */}
              {typeof job.additionalInfo?.matchReason === "string" && (
                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                  <p className="text-sm text-[var(--muted)]">
                    <span className="text-white">Match Reason:</span>{" "}
                    {job.additionalInfo.matchReason}
                  </p>
                </div>
              )}

              {/* Application Proof */}
              {job.additionalInfo?.applicationProof != null && (
                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                  <div className="flex flex-wrap gap-3">
                    {(job.additionalInfo.applicationProof as { browserUrl?: string }).browserUrl && (
                      <a
                        href={(job.additionalInfo.applicationProof as { browserUrl: string }).browserUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        View Browser Session
                      </a>
                    )}
                    {(job.additionalInfo.applicationProof as { recordingUrl?: string }).recordingUrl && (
                      <a
                        href={(job.additionalInfo.applicationProof as { recordingUrl: string }).recordingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
                      >
                        📹 View Recording
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

