import { Hyperbrowser } from "@hyperbrowser/sdk";
import { log } from "@/lib/logger";
import { config } from "@/lib/config";
import type { TaskResult, ApplicationData, AntiDetectionParams } from "@/types";

// Valid Claude Computer Use models (from Hyperbrowser SDK)
type ClaudeComputerUseLlm = "claude-3-7-sonnet-20250219" | "claude-sonnet-4-20250514";

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

    // Build params with proper typing
    const params = {
      task,
      maxSteps,
      keepBrowserOpen,
      llm: "claude-sonnet-4-20250514" as ClaudeComputerUseLlm,
      sessionId: undefined as string | undefined,
      useCustomApiKeys: undefined as boolean | undefined,
      apiKeys: undefined as { anthropic: string } | undefined,
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

      // DEBUG: Log the actual response to see field names
      log.info(`DEBUG Response: ${JSON.stringify(response, null, 2)}`);

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
    applicationData: ApplicationData & { 
      resumeUrl?: string; 
      resumeText?: string;
      resumeBase64?: string;  // Base64 encoded PDF
      resumeFileName?: string;
      coverLetter?: string;
    },
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
      hasResumeUrl: Boolean(applicationData.resumeUrl),
      hasResumeFile: Boolean(applicationData.resumeBase64),
    });

    // Build file upload instructions
    let fileUploadInstructions = "";
    
    if (applicationData.resumeBase64) {
      // We have a base64 file - instruct Claude to inject it via JavaScript
      fileUploadInstructions = `
      FOR RESUME/CV FILE UPLOAD:
      When you find a file input element for resume/CV upload:
      1. Click on the file input to focus it
      2. Open browser DevTools (F12 or Cmd+Option+I)
      3. In the Console, run this JavaScript to inject the PDF file:
      
      (function() {
        const b64 = "${applicationData.resumeBase64}";
        const byteChars = atob(b64);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {type: 'application/pdf'});
        const file = new File([blob], '${applicationData.resumeFileName || "Resume.pdf"}', {type: 'application/pdf'});
        const dt = new DataTransfer();
        dt.items.add(file);
        const input = document.querySelector('input[type="file"]');
        if (input) {
          input.files = dt.files;
          input.dispatchEvent(new Event('change', {bubbles: true}));
          console.log('Resume uploaded successfully!');
        }
      })();
      
      4. Close DevTools and verify the file appears as uploaded
      `;
    } else if (applicationData.resumeUrl) {
      fileUploadInstructions = `
      FOR RESUME/CV UPLOAD:
      - If there's a URL/link option, use: ${applicationData.resumeUrl}
      - If there's "Import from LinkedIn" option, use the LinkedIn URL
      - If only file upload is required with no URL option, note this limitation
      `;
    } else {
      fileUploadInstructions = `
      FOR RESUME/CV UPLOAD:
      - Use "Import from LinkedIn" if available
      - Or note that resume file is needed but not provided
      `;
    }

    const task = `
      Apply to the job at this URL: ${jobUrl}
      
      APPLICANT INFORMATION:
      - Name: ${applicationData.name}
      - Email: ${applicationData.email}
      - Phone: ${applicationData.phone}
      - LinkedIn: ${applicationData.linkedin || "Not provided"}
      - GitHub: ${applicationData.github || "Not provided"}
      
      INSTRUCTIONS:
      1. Navigate to the job application page
      2. Fill out ALL required fields with the information above
      
      ${fileUploadInstructions}
      
      FOR COVER LETTER OR TEXT QUESTIONS:
      ${applicationData.coverLetter 
        ? `Use this cover letter: ${applicationData.coverLetter}`
        : `Write a brief, professional response highlighting relevant experience and enthusiasm for the role.`}
      
      FINAL STEPS:
      1. Review all fields before submitting
      2. Submit the application if everything is complete
      3. Take note of any confirmation message or number
      
      ${additionalInstructions || ""}
      
      IMPORTANT: This is a real job application. Be thorough and accurate.
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

