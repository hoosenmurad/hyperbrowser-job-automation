import fs from "fs/promises";
import path from "path";
import { log } from "@/lib/logger";
import { Job, JobStatus, JobStatistics } from "@/types";

const DATA_FILE = path.join(process.cwd(), "data/jobs.json");

export class JobTracker {
  private jobs: Job[] = [];
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.jobs = await this.loadData();
    this.initialized = true;
    log.info(`Job tracker initialized with ${this.jobs.length} existing jobs`);
  }

  private async loadData(): Promise<Job[]> {
    try {
      const data = await fs.readFile(DATA_FILE, "utf-8");
      const parsed = JSON.parse(data);

      if (Array.isArray(parsed)) {
        return parsed;
      } else if (typeof parsed === "object" && parsed !== null) {
        // Migrate from dict format
        log.info("Migrating from dict to list format...");
        const jobList = Object.values(parsed) as Job[];
        await this.saveDataInternal(jobList);
        return jobList;
      }
      return [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      log.error(`Error loading job data: ${error}`);
      return [];
    }
  }

  private async saveData(): Promise<void> {
    await this.saveDataInternal(this.jobs);
  }

  private async saveDataInternal(jobList: Job[]): Promise<void> {
    try {
      await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
      await fs.writeFile(DATA_FILE, JSON.stringify(jobList, null, 2), "utf-8");
      log.debug(`Saved ${jobList.length} jobs to ${DATA_FILE}`);
    } catch (error) {
      log.error(`Error saving data: ${error}`);
      throw error;
    }
  }

  async addJob(
    jobData: Omit<Job, "status" | "lastUpdated">
  ): Promise<number> {
    await this.initialize();

    // Check for duplicates
    const duplicateIdx = this.checkDuplicate(
      jobData.company,
      jobData.jobTitle,
      jobData.jobUrl
    );

    if (duplicateIdx !== null) {
      log.info(`Job already exists at index ${duplicateIdx}: ${jobData.jobTitle} at ${jobData.company}`);
      return duplicateIdx;
    }

    const newJob: Job = {
      ...jobData,
      status: JobStatus.FOUND,
      lastUpdated: new Date().toISOString(),
    };

    this.jobs.push(newJob);
    await this.saveData();

    log.jobFound(newJob.jobTitle, newJob.company);
    log.data(`Job added at index: ${this.jobs.length - 1}`, { status: JobStatus.FOUND });

    return this.jobs.length - 1;
  }

  async updateJobStatus(
    jobIndex: number,
    status: JobStatus,
    note?: string
  ): Promise<boolean> {
    await this.initialize();

    if (jobIndex < 0 || jobIndex >= this.jobs.length) {
      log.error(`Job index out of range: ${jobIndex}`);
      return false;
    }

    const oldStatus = this.jobs[jobIndex].status;
    this.jobs[jobIndex].status = status;
    this.jobs[jobIndex].lastUpdated = new Date().toISOString();

    if (status === JobStatus.APPLIED) {
      log.jobApplied(
        this.jobs[jobIndex].jobTitle,
        this.jobs[jobIndex].company
      );
    }

    await this.saveData();
    log.process(`Updated job at index ${jobIndex}: ${oldStatus} → ${status}`);

    if (note) {
      log.info(`Note for job ${jobIndex}: ${note}`);
    }

    return true;
  }

  async addNote(jobIndex: number, note: string): Promise<boolean> {
    await this.initialize();

    if (jobIndex < 0 || jobIndex >= this.jobs.length) {
      log.error(`Job index out of range: ${jobIndex}`);
      return false;
    }

    const noteEntry = {
      timestamp: new Date().toISOString(),
      note,
    };

    if (!this.jobs[jobIndex].notes) {
      this.jobs[jobIndex].notes = [];
    }

    this.jobs[jobIndex].notes!.push(noteEntry);
    this.jobs[jobIndex].lastUpdated = new Date().toISOString();
    await this.saveData();

    log.debug(`Added note to job ${jobIndex}`);
    return true;
  }

  checkDuplicate(
    company: string,
    jobTitle: string,
    jobUrl?: string
  ): number | null {
    // Check by URL first (most reliable)
    if (jobUrl) {
      const urlIndex = this.jobs.findIndex(
        (job) => job.jobUrl?.toLowerCase().trim() === jobUrl.toLowerCase().trim()
      );
      if (urlIndex !== -1) return urlIndex;
    }

    // Fallback to company + title matching
    const titleIndex = this.jobs.findIndex(
      (job) =>
        job.company.toLowerCase() === company.toLowerCase() &&
        job.jobTitle.toLowerCase() === jobTitle.toLowerCase()
    );

    return titleIndex !== -1 ? titleIndex : null;
  }

  getJob(index: number): Job | null {
    return this.jobs[index] ?? null;
  }

  getJobsByStatus(status: JobStatus): Job[] {
    return this.jobs.filter((job) => job.status === status);
  }

  getJobsByCompany(company: string): Job[] {
    return this.jobs.filter((job) =>
      job.company.toLowerCase().includes(company.toLowerCase())
    );
  }

  searchJobs(query: string): Job[] {
    const queryLower = query.toLowerCase();
    return this.jobs.filter(
      (job) =>
        job.jobTitle.toLowerCase().includes(queryLower) ||
        job.company.toLowerCase().includes(queryLower) ||
        job.location?.toLowerCase().includes(queryLower)
    );
  }

  getStatistics(): JobStatistics {
    const stats: JobStatistics = {
      totalJobs: this.jobs.length,
      byStatus: {},
      byCompany: {},
      byJobBoard: {},
      appliedCount: 0,
    };

    for (const job of this.jobs) {
      // By status
      const status = job.status || "unknown";
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      // By company
      stats.byCompany[job.company] = (stats.byCompany[job.company] || 0) + 1;

      // By job board
      const board = job.jobBoard || "unknown";
      stats.byJobBoard[board] = (stats.byJobBoard[board] || 0) + 1;

      if (job.status === JobStatus.APPLIED) {
        stats.appliedCount++;
      }
    }

    return stats;
  }

  getAllJobs(): Job[] {
    return [...this.jobs];
  }

  printSummary(): void {
    const stats = this.getStatistics();

    log.separator();
    log.info("📊 JOB TRACKER SUMMARY");
    log.separator();

    log.data(`Total Jobs Tracked: ${stats.totalJobs}`);

    if (Object.keys(stats.byStatus).length > 0) {
      log.info("📈 Jobs by Status:");
      for (const [status, count] of Object.entries(stats.byStatus).sort()) {
        log.info(`  • ${status.charAt(0).toUpperCase() + status.slice(1)}: ${count}`);
      }
    }

    if (stats.appliedCount > 0) {
      log.success(`✅ Applications Submitted: ${stats.appliedCount}`);
    }

    log.separator();
  }
}

// Singleton instance
let jobTrackerInstance: JobTracker | null = null;

export function getJobTracker(): JobTracker {
  if (!jobTrackerInstance) {
    jobTrackerInstance = new JobTracker();
  }
  return jobTrackerInstance;
}

export { JobStatus } from "@/types";

