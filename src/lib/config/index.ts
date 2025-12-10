function getEnvInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function getEnvBool(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return ["true", "1", "yes", "on"].includes(value.toLowerCase());
}

export const config = {
  // Job Search Limits
  MAX_JOBS_TO_FIND: getEnvInt("MAX_JOBS_TO_FIND", 50),
  MAX_JOBS_PER_PLATFORM: getEnvInt("MAX_JOBS_PER_PLATFORM", 10),
  MAX_CONCURRENT_BROWSERS: getEnvInt("MAX_CONCURRENT_BROWSERS", 5),
  MAX_APPLICATIONS_PER_RUN: getEnvInt("MAX_APPLICATIONS_PER_RUN", 10),
  MAX_APPLICATIONS_PER_PLATFORM: getEnvInt("MAX_APPLICATIONS_PER_PLATFORM", 3),

  // Browser Automation Settings
  SEARCH_MAX_STEPS: getEnvInt("SEARCH_MAX_STEPS", 30),
  APPLICATION_MAX_STEPS: getEnvInt("APPLICATION_MAX_STEPS", 40),
  TEST_MAX_STEPS: getEnvInt("TEST_MAX_STEPS", 10),

  // Timing Controls
  APPLICATION_DELAY_SECONDS: getEnvInt("APPLICATION_DELAY_SECONDS", 30),
  RATE_LIMIT_DELAY_MIN: getEnvInt("RATE_LIMIT_DELAY_MIN", 1),
  RATE_LIMIT_DELAY_MAX: getEnvInt("RATE_LIMIT_DELAY_MAX", 3),
  SESSION_TIMEOUT_SECONDS: getEnvInt("SESSION_TIMEOUT_SECONDS", 1200),

  // Quality Controls
  DUPLICATE_DETECTION_ENABLED: getEnvBool("DUPLICATE_DETECTION_ENABLED", true),
  ENABLE_SCREENSHOTS: getEnvBool("ENABLE_SCREENSHOTS", true),
  ENABLE_SESSION_RECORDINGS: getEnvBool("ENABLE_SESSION_RECORDINGS", true),

  // Job Generation
  JOBS_PER_SEARCH_MIN: getEnvInt("JOBS_PER_SEARCH_MIN", 1),
  JOBS_PER_SEARCH_MAX: getEnvInt("JOBS_PER_SEARCH_MAX", 3),

  getRateLimitDelayRange: () =>
    `${getEnvInt("RATE_LIMIT_DELAY_MIN", 1)}-${getEnvInt("RATE_LIMIT_DELAY_MAX", 3)}`,
} as const;

export type Config = typeof config;

