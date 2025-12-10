import { NextRequest, NextResponse } from "next/server";
import { getJobTracker } from "@/lib/job-tracker";
import { JobStatus } from "@/types";

// GET /api/jobs - List all jobs
export async function GET(request: NextRequest) {
  try {
    const jobTracker = getJobTracker();
    await jobTracker.initialize();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as JobStatus | null;
    const company = searchParams.get("company");
    const search = searchParams.get("search");

    let jobs = jobTracker.getAllJobs();

    // Filter by status
    if (status) {
      jobs = jobs.filter((job) => job.status === status);
    }

    // Filter by company
    if (company) {
      jobs = jobs.filter((job) =>
        job.company.toLowerCase().includes(company.toLowerCase())
      );
    }

    // Search
    if (search) {
      const searchLower = search.toLowerCase();
      jobs = jobs.filter(
        (job) =>
          job.jobTitle.toLowerCase().includes(searchLower) ||
          job.company.toLowerCase().includes(searchLower) ||
          job.location?.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({
      success: true,
      jobs,
      statistics: jobTracker.getStatistics(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/jobs - Add a new job
export async function POST(request: NextRequest) {
  try {
    const jobData = await request.json();
    const jobTracker = getJobTracker();

    const index = await jobTracker.addJob({
      company: jobData.company,
      jobTitle: jobData.jobTitle,
      location: jobData.location || "",
      jobUrl: jobData.jobUrl || "",
      salaryRange: jobData.salaryRange || "",
      jobBoard: jobData.jobBoard || "",
      additionalInfo: jobData.additionalInfo,
    });

    return NextResponse.json({
      success: true,
      index,
      job: jobTracker.getJob(index),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// PATCH /api/jobs - Update job status
export async function PATCH(request: NextRequest) {
  try {
    const { index, status, note } = await request.json();
    const jobTracker = getJobTracker();

    const success = await jobTracker.updateJobStatus(index, status, note);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Failed to update job" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      job: jobTracker.getJob(index),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

