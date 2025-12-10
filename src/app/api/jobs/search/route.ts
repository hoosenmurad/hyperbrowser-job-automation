import { NextRequest, NextResponse } from "next/server";
import { getHyperbrowserClient } from "@/lib/hyperbrowser/client";
import { BrowserAgent } from "@/lib/hyperbrowser/browser-agent";
import { getJobTracker } from "@/lib/job-tracker";
import { getAntiDetectionConfig } from "@/lib/config/anti-detection";
import { buildAIContext } from "@/lib/resume/parser";
import { config } from "@/lib/config";
import { log } from "@/lib/logger";
// Helper to parse job data from Claude's response
function parseJobsFromResult(resultText: string): Array<{
  company: string;
  jobTitle: string;
  location: string;
  jobUrl: string;
  salaryRange: string;
  requirements: string[];
  matchReason: string;
}> {
  const jobs: Array<{
    company: string;
    jobTitle: string;
    location: string;
    jobUrl: string;
    salaryRange: string;
    requirements: string[];
    matchReason: string;
  }> = [];

  // Parse JOB_START/JOB_END blocks
  const jobBlocks = resultText.match(/JOB_START([\s\S]*?)JOB_END/gi) || [];

  for (const block of jobBlocks) {
    const companyMatch = block.match(/Company:\s*([^\n]+)/i);
    const titleMatch = block.match(/Title:\s*([^\n]+)/i);
    const locationMatch = block.match(/Location:\s*([^\n]+)/i);
    const urlMatch = block.match(/URL:\s*(https?:\/\/[^\s\n]+)/i);
    const salaryMatch = block.match(/Salary:\s*([^\n]+)/i);
    const requirementsMatch = block.match(/Requirements:\s*([^\n]+)/i);
    const matchMatch = block.match(/Match:\s*([^\n]+)/i);

    if (companyMatch && titleMatch) {
      jobs.push({
        company: companyMatch[1].trim(),
        jobTitle: titleMatch[1].trim(),
        location: locationMatch?.[1]?.trim() || "Not specified",
        jobUrl: urlMatch?.[1]?.trim() || "",
        salaryRange: salaryMatch?.[1]?.trim() || "Not specified",
        requirements: requirementsMatch?.[1]?.split(",").map((r) => r.trim()) || [],
        matchReason: matchMatch?.[1]?.trim() || "",
      });
    }
  }

  // If no structured jobs found, create placeholder
  if (jobs.length === 0 && resultText.toLowerCase().includes("found")) {
    log.warn("No structured job data found, search may have found results");
  }

  return jobs;
}

// POST /api/jobs/search - Start a job search
export async function POST(request: NextRequest) {
  try {
    const { queries, platforms } = await request.json();
    
    const searchQueries = queries || ["Software Engineer"];
    const searchPlatforms = platforms || ["remoteok"];

    log.process(`Starting job search with ${searchQueries.length} queries on ${searchPlatforms.length} platforms`);

    const client = getHyperbrowserClient();
    const agent = new BrowserAgent(client, process.env.ANTHROPIC_API_KEY);
    const jobTracker = getJobTracker();
    const antiDetection = getAntiDetectionConfig();

    // Build AI context
    const aiContext = await buildAIContext();

    const results = [];
    let totalJobsFound = 0;

    for (const platform of searchPlatforms) {
      // Check if platform is enabled
      const isEnabled = await antiDetection.isPlatformEnabled(platform);
      if (!isEnabled) {
        log.warn(`Platform ${platform} is not enabled, skipping`);
        continue;
      }

      // Get random delay
      const delay = await antiDetection.getRandomDelay(platform);

      for (const query of searchQueries) {
        // Add delay between searches
        if (totalJobsFound > 0) {
          log.debug(`Waiting ${delay}s before next search`);
          await new Promise((resolve) => setTimeout(resolve, delay * 1000));
        }

        log.info(`🔍 Searching ${platform} for: ${query}`);

        const searchResult = await agent.searchAndAnalyzeJobs(
          query,
          aiContext,
          config.SEARCH_MAX_STEPS,
          platform
        );

        if (searchResult.success && searchResult.result) {
          // Parse jobs from result
          const parsedJobs = parseJobsFromResult(searchResult.result);
          const jobIndices: number[] = [];

          // Add jobs to tracker
          for (const jobData of parsedJobs) {
            const index = await jobTracker.addJob({
              company: jobData.company,
              jobTitle: jobData.jobTitle,
              location: jobData.location,
              jobUrl: jobData.jobUrl,
              salaryRange: jobData.salaryRange,
              jobBoard: platform,
              additionalInfo: {
                requirements: jobData.requirements,
                matchReason: jobData.matchReason,
                searchQuery: query,
              },
            });
            jobIndices.push(index);
            totalJobsFound++;
          }

          results.push({
            query,
            platform,
            success: true,
            jobsFound: parsedJobs.length,
            jobIndices,
            browserUrl: searchResult.browserUrl,
            recordingUrl: searchResult.recordingUrl,
          });

          log.success(`Found ${parsedJobs.length} jobs for "${query}" on ${platform}`);
        } else {
          results.push({
            query,
            platform,
            success: false,
            error: searchResult.error,
            jobsFound: 0,
            jobIndices: [],
          });
          log.error(`Search failed for "${query}" on ${platform}: ${searchResult.error}`);
        }
      }
    }

    // Cleanup
    agent.closeSession();

    return NextResponse.json({
      success: totalJobsFound > 0,
      totalJobsFound,
      results,
      statistics: jobTracker.getStatistics(),
    });
  } catch (error) {
    log.error(`Job search failed: ${error}`);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

