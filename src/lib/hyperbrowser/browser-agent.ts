import { Hyperbrowser } from "@hyperbrowser/sdk";
import { log } from "@/lib/logger";
import { config } from "@/lib/config";
import type { TaskResult, ApplicationData, AntiDetectionParams } from "@/types";

export class BrowserAgent {
  private client: Hyperbrowser;
  private anthropicApiKey?: string;
  private currentSessionId?: string;
  public antiDetectionParams?: AntiDetectionParams;

  constructor(client: Hyperbrowser, anthropicApiKey?: string) {
    if (!client) {
      throw new Error("Hyperbrowser client is required");
    }
    this.client = client;
    this.anthropicApiKey = anthropicApiKey;
    log.info("Browser Agent initialized");
    if (anthropicApiKey) {
      log.debug("Using custom Anthropic API key");
    } else {
      log.debug("Using Hyperbrowser's built-in Claude access");
    }
  }

  async executeComputerUseTask(
    task: string,
    maxSteps = 50,
    sessionId?: string,
    keepBrowserOpen = true
  ): Promise<TaskResult> {
    log.process(`Executing Computer Use task (max steps: ${maxSteps})`);
    log.debug(`Task preview: ${task.slice(0, 100)}...`);

    const params: {
      task: string;
      maxSteps: number;
      keepBrowserOpen: boolean;
      sessionId?: string;
      useCustomApiKeys?: boolean;
      apiKeys?: {
        anthropic: string;
      };
    } = {
      task,
      maxSteps,
      keepBrowserOpen,
    };

    if (sessionId) {
      params.sessionId = sessionId;
      log.debug(`Reusing session: ${sessionId}`);
    }

    if (this.anthropicApiKey) {
      params.useCustomApiKeys = true;
      params.apiKeys = {
        anthropic: this.anthropicApiKey,
      };
      log.debug("Using custom API keys");
    }

    try {
      log.info("Starting Claude Computer Use task...");
      const response = await this.client.agents.claudeComputerUse.startAndWait(params);

      const data = response.data as {
        finalResult?: string;
        sessionId?: string;
        stepsTaken?: number;
        browserUrl?: string;
        recordingUrl?: string;
      };

      const resultSessionId = data?.sessionId;
      if (resultSessionId) {
        this.currentSessionId = resultSessionId;
      }

      const result: TaskResult = {
        success: true,
        result: data?.finalResult,
        sessionId: resultSessionId,
        stepsTaken: data?.stepsTaken,
        browserUrl: data?.browserUrl,
        recordingUrl: data?.recordingUrl,
      };

      log.success("Computer Use task completed successfully");
      if (result.stepsTaken) {
        log.data(`Steps taken: ${result.stepsTaken}`);
      }

      if (result.browserUrl) {
        log.success(`🌐 Live Browser View: ${result.browserUrl}`);
      }
      if (result.recordingUrl) {
        log.success(`📹 Recording Playback: ${result.recordingUrl}`);
      }

      return result;
    } catch (error) {
      log.error(`Computer Use task failed: ${String(error)}`);
      return {
        success: false,
        error: String(error),
        sessionId: sessionId || this.currentSessionId,
      };
    }
  }

  async searchAndAnalyzeJobs(
    jobSearchQuery: string,
    aiContext: string,
    maxSteps = config.SEARCH_MAX_STEPS,
    platform = "remoteok"
  ): Promise<TaskResult> {
    const platformUrls: Record<string, string> = {
      remoteok: "https://remoteok.io/remote-jobs",
      weworkremotely: "https://weworkremotely.com/categories/remote-programming-jobs",
      glassdoor: "https://www.glassdoor.com/Job/jobs.htm",
      angellist: "https://angel.co/jobs",
      dice: "https://www.dice.com/jobs",
      nodesk: "https://nodesk.co/remote-jobs",
      jobspresso: "https://jobspresso.co/remote-work",
      workingnomads: "https://www.workingnomads.co",
      remoteco: "https://remote.co/remote-jobs",
      jobgether: "https://jobgether.com/remote-jobs",
      devremote: "https://devremote.io/remote-developer-jobs",
      remotetechjobs: "https://www.remotetechjobs.com",
    };

    const platformUrl = platformUrls[platform] || platformUrls.remoteok;
    log.info(`🔍 ${platform}: ${jobSearchQuery}`);

    const task = `
      Go to ${platformUrl} and search for: "${jobSearchQuery}"
      
      Context for job evaluation:
      ${aiContext}
      
      Tasks:
      1. Navigate to ${platformUrl}
      2. Search for "${jobSearchQuery}"
      3. Review first 5-10 job listings
      4. For each relevant job, extract information and format it EXACTLY like this:

      JOB_START
      Company: [Company Name]
      Title: [Job Title]  
      Location: [Location/Remote status]
      URL: [Direct application URL or job posting URL]
      Salary: [Salary range if available, otherwise "Not specified"]
      Requirements: [Top 3-5 key requirements]
      Match: [Why this job matches the candidate's profile]
      JOB_END
      
      5. Focus on roles matching the user's preferences and experience
      6. IMPORTANT: Always include the actual clickable job posting URL in the URL field
      7. Extract at least 3-5 relevant jobs if available on the page
      
      Use the exact format above with JOB_START and JOB_END markers for each job found.
    `;

    const result = await this.executeComputerUseTask(
      task,
      maxSteps,
      this.currentSessionId
    );

    if (result.success) {
      return {
        ...result,
        platform,
        platformUrl,
      };
    }

    return result;
  }

  async applyToJob(
    jobUrl: string,
    applicationData: ApplicationData,
    sessionId?: string,
    maxSteps = config.APPLICATION_MAX_STEPS,
    additionalInstructions?: string
  ): Promise<TaskResult> {
    log.process(`Applying to job at: ${jobUrl}`);

    log.data("Using application data", {
      name: applicationData.name,
      email: applicationData.email,
      hasLinkedin: Boolean(applicationData.linkedin),
      hasGithub: Boolean(applicationData.github),
    });

    const task = `
      Apply to the job at this URL: ${jobUrl}
      
      Use this information to fill out the application:
      Name: ${applicationData.name}
      Email: ${applicationData.email}
      Phone: ${applicationData.phone}
      LinkedIn: ${applicationData.linkedin || ""}
      GitHub: ${applicationData.github || ""}
      
      Please:
      1. Navigate to the job application page
      2. Fill out all required fields with the provided information
      3. If there's a resume upload option, mention that a resume upload is needed (but don't actually upload)
      4. For cover letters or additional questions:
         - Keep responses professional but personable
         - Highlight relevant experience
         - Express genuine enthusiasm
      5. Review the application before submitting
      6. Only submit if everything looks correct
      7. Take a screenshot of the confirmation page if successful
      8. If the application requires creating an account, do so with the provided email
      
      ${additionalInstructions || ""}
      
      Be careful and thorough - this is a real job application.
      If you encounter any errors or the application cannot be completed, please explain why.
    `;

    return this.executeComputerUseTask(
      task,
      maxSteps,
      sessionId || this.currentSessionId
    );
  }

  async analyzeJobPage(jobUrl: string, maxSteps = 15): Promise<TaskResult> {
    log.process(`Analyzing job page: ${jobUrl}`);

    const task = `
      Go to ${jobUrl} and extract all job details.
      
      Return the information in this format:
      - Company Name
      - Job Title
      - Location
      - Salary Range (if available)
      - Job Type (Full-time, Part-time, Contract)
      - Required Skills
      - Responsibilities
      - Qualifications
      - Benefits (if listed)
      - Application deadline (if listed)
      
      Be thorough and extract all relevant information.
    `;

    return this.executeComputerUseTask(task, maxSteps, this.currentSessionId);
  }

  closeSession(): void {
    if (this.currentSessionId) {
      log.info(`Closing browser session: ${this.currentSessionId}`);
      this.currentSessionId = undefined;
      log.debug("Session closed");
    }
  }

  getCurrentSessionId(): string | undefined {
    return this.currentSessionId;
  }
}

