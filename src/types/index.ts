// Job Types
export enum JobStatus {
  FOUND = "found",
  REVIEWED = "reviewed",
  APPLIED = "applied",
}

export interface Job {
  company: string;
  jobTitle: string;
  location: string;
  jobUrl: string;
  salaryRange: string;
  status: JobStatus;
  lastUpdated: string;
  jobBoard?: string;
  additionalInfo?: Record<string, unknown>;
  notes?: Array<{ timestamp: string; note: string }>;
}

export interface JobStatistics {
  totalJobs: number;
  byStatus: Record<string, number>;
  byCompany: Record<string, number>;
  byJobBoard: Record<string, number>;
  appliedCount: number;
}

// Browser Agent Types
export interface TaskResult {
  success: boolean;
  result?: string;
  error?: string;
  sessionId?: string;
  stepsTaken?: number;
  browserUrl?: string;
  recordingUrl?: string;
  platform?: string;
  platformUrl?: string;
}

export interface ApplicationData {
  name: string;
  email: string;
  phone: string;
  linkedin?: string;
  github?: string;
}

// Platform Config Types
export interface AntiDetectionParams {
  stealthMode: boolean;
  useProxy: boolean;
  proxyCountry?: string;
  proxyCity?: string;
  device: string;
  operatingSystem: string;
  locale: string;
  screen: {
    width: number;
    height: number;
  };
}

export interface PlatformConfig {
  name: string;
  requiresLogin: boolean;
  searchUrl: string;
  enabled: boolean;
  priority: number;
  antiDetection: AntiDetectionParams;
  searchStrategy: string;
  maxApplicationsPerSession: number;
  delayBetweenActions: string;
  sessionTimeout: number;
  note?: string;
}

export interface GlobalSettings {
  retryFailedSessions: number;
  sessionCleanupTimeout: number;
  respectRobotsTxt: boolean;
  sharedJobStorage: boolean;
  noLoginMode: boolean;
  skipCredentialValidation: boolean;
  optimizeForPublicSites: boolean;
}

export interface PlatformConfigs {
  platforms: Record<string, PlatformConfig>;
  globalSettings: GlobalSettings;
  searchParameters: {
    defaultLocation: string;
    backupLocations: string[];
    jobTypes: string[];
    experienceLevels: string[];
    salaryMin: number;
    datePosted: string;
  };
}

// Search Result Types
export interface SearchResult {
  query: string;
  platform: string;
  success: boolean;
  result?: string;
  error?: string;
  jobsFound: number;
  jobIndices: number[];
  browserUrl?: string;
  recordingUrl?: string;
}

// Session Types
export interface BrowserSession {
  platform: string;
  sessionId?: string;
  startTime: number;
  lastActivity: number;
  status: "initializing" | "active" | "idle" | "error" | "completed";
  jobsFound: number;
  applicationsMade: number;
  errorCount: number;
  browserUrl?: string;
  recordingUrl?: string;
}

