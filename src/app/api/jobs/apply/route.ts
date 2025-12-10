import { NextRequest, NextResponse } from "next/server";
import { getHyperbrowserClient } from "@/lib/hyperbrowser/client";
import { BrowserAgent } from "@/lib/hyperbrowser/browser-agent";
import { getJobTracker, JobStatus } from "@/lib/job-tracker";
import { loadPersonalInfo } from "@/lib/resume/parser";
import { config } from "@/lib/config";
import { log } from "@/lib/logger";
import type { ApplicationData } from "@/types";

// POST /api/jobs/apply - Apply to a job
export async function POST(request: NextRequest) {
  try {
    const { jobIndex, jobUrl, additionalInstructions } = await request.json();

    const jobTracker = getJobTracker();
    await jobTracker.initialize();

    // Get job data
    let targetUrl = jobUrl;
    let job = null;

    if (jobIndex !== undefined) {
      job = jobTracker.getJob(jobIndex);
      if (!job) {
        return NextResponse.json(
          { success: false, error: `Job not found at index ${jobIndex}` },
          { status: 404 }
        );
      }
      targetUrl = job.jobUrl;

      // Check if already applied
      if (job.status === JobStatus.APPLIED) {
        return NextResponse.json(
          { success: false, error: "Already applied to this job" },
          { status: 400 }
        );
      }
    }

    if (!targetUrl) {
      return NextResponse.json(
        { success: false, error: "Job URL is required" },
        { status: 400 }
      );
    }

    log.process(`Starting application for: ${targetUrl}`);

    // Load personal info
    const personalInfo = await loadPersonalInfo();

    const applicationData: ApplicationData = {
      name: `${personalInfo.first_name || ""} ${personalInfo.last_name || ""}`.trim(),
      email: (personalInfo.email as string) || "",
      phone: (personalInfo.phone as string) || "",
      linkedin: personalInfo.linkedin as string | undefined,
      github: personalInfo.github as string | undefined,
    };

    if (!applicationData.email) {
      return NextResponse.json(
        { success: false, error: "Email is required in personal_info.json" },
        { status: 400 }
      );
    }

    log.data("Application data prepared", {
      name: applicationData.name,
      email: applicationData.email,
    });

    // Create browser agent and apply
    const client = getHyperbrowserClient();
    const agent = new BrowserAgent(client, process.env.ANTHROPIC_API_KEY);

    const applicationResult = await agent.applyToJob(
      targetUrl,
      applicationData,
      undefined,
      config.APPLICATION_MAX_STEPS,
      additionalInstructions
    );

    // Cleanup
    agent.closeSession();

    if (applicationResult.success) {
      log.success("Application submitted successfully");

      // Update job status if we have a job index
      if (jobIndex !== undefined) {
        const hasScreenshot = applicationResult.result?.toLowerCase().includes("screenshot");

        // Update job with application proof
        const jobData = jobTracker.getJob(jobIndex);
        if (jobData) {
          jobData.additionalInfo = {
            ...jobData.additionalInfo,
            applicationProof: {
              applicationTimestamp: new Date().toISOString(),
              applicationResult: applicationResult.result,
              browserUrl: applicationResult.browserUrl,
              recordingUrl: applicationResult.recordingUrl,
              sessionId: applicationResult.sessionId,
              stepsTaken: applicationResult.stepsTaken,
              screenshotTaken: hasScreenshot,
              proofType: applicationResult.recordingUrl
                ? "full_recording_with_screenshots"
                : "browser_session_only",
            },
          };
        }

        await jobTracker.updateJobStatus(
          jobIndex,
          JobStatus.APPLIED,
          `Application submitted - Session: ${applicationResult.sessionId || "N/A"}`
        );
      }

      return NextResponse.json({
        success: true,
        result: applicationResult.result,
        browserUrl: applicationResult.browserUrl,
        recordingUrl: applicationResult.recordingUrl,
        sessionId: applicationResult.sessionId,
      });
    } else {
      log.error(`Application failed: ${applicationResult.error}`);

      return NextResponse.json(
        {
          success: false,
          error: applicationResult.error,
          browserUrl: applicationResult.browserUrl,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    log.error(`Application error: ${error}`);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

