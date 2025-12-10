import fs from "fs/promises";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { log } from "@/lib/logger";

const RESUME_PATH = path.join(process.cwd(), "user/Resume.pdf");
const JOB_PREFERENCES_PATH = path.join(process.cwd(), "user/job_preferences.json");
const PERSONAL_INFO_PATH = path.join(process.cwd(), "user/personal_info.json");

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

export async function parseResume(): Promise<string> {
  try {
    // Check if resume exists
    try {
      await fs.access(RESUME_PATH);
    } catch {
      log.warn("Resume.pdf not found, using placeholder");
      return "[No resume provided - please add Resume.pdf to user/ folder]";
    }

    // Read PDF as base64
    const pdfBuffer = await fs.readFile(RESUME_PATH);
    const pdfBase64 = pdfBuffer.toString("base64");

    log.process("Extracting resume text using Claude...");

    const client = getAnthropicClient();

    // Use Claude's document understanding capabilities
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            },
            {
              type: "text",
              text: `Extract all text content from this resume PDF. 
                     Preserve the structure and formatting as much as possible.
                     Include all sections like: contact info, summary, experience, 
                     education, skills, projects, certifications, etc.
                     Return the complete text content without any commentary.`,
            },
          ],
        },
      ],
    });

    const extractedText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    log.success(`Resume extracted: ${extractedText.length} characters`);
    return extractedText;
  } catch (error) {
    log.error(`Error extracting resume with Claude: ${error}`);
    throw error;
  }
}

export async function loadJobPreferences(): Promise<Record<string, unknown>> {
  try {
    const data = await fs.readFile(JOB_PREFERENCES_PATH, "utf-8");
    log.success("Job preferences loaded successfully");
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      log.warn("job_preferences.json not found, using defaults");
      return {
        target_roles: ["Software Engineer", "Full Stack Developer"],
        remote_preference: "remote",
        min_salary: 100000,
      };
    }
    log.error(`Error loading job preferences: ${error}`);
    throw error;
  }
}

export async function loadPersonalInfo(): Promise<Record<string, unknown>> {
  try {
    const data = await fs.readFile(PERSONAL_INFO_PATH, "utf-8");
    log.success("Personal information loaded successfully");
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      log.warn("personal_info.json not found");
      return {};
    }
    log.error(`Error loading personal info: ${error}`);
    throw error;
  }
}

export async function buildAIContext(): Promise<string> {
  log.process("Loading resume and preferences...");

  const [resumeContent, jobPreferences, personalInfo] = await Promise.all([
    parseResume(),
    loadJobPreferences(),
    loadPersonalInfo(),
  ]);

  const context = `
    RESUME: ${resumeContent}

    JOB PREFERENCES: ${JSON.stringify(jobPreferences, null, 2)}
    PERSONAL INFO: ${JSON.stringify(personalInfo, null, 2)}
  `;

  log.data("AI context prepared", {
    resumeLength: resumeContent.length,
    preferencesLoaded: Boolean(jobPreferences),
    personalInfoLoaded: Boolean(personalInfo),
  });

  return context;
}

