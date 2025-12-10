import pino from "pino";

// In Next.js server environment, we can't use pino-pretty transport
// Use simple pino logging that works in all environments
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
  // Simple timestamp format
  timestamp: () => `,"time":"${new Date().toLocaleTimeString()}"`,
});

export const log = {
  debug: (msg: string) => logger.debug(msg),
  info: (msg: string) => logger.info(msg),
  warn: (msg: string) => logger.warn(msg),
  error: (msg: string) => logger.error(msg),
  success: (msg: string) => logger.info(`✅ ${msg}`),
  process: (msg: string) => logger.info(`🔄 ${msg}`),
  step: (n: number, total: number, msg: string) => logger.info(`[${n}/${total}] ${msg}`),
  jobFound: (title: string, company: string) => logger.info(`🎯 Found: ${title} at ${company}`),
  jobApplied: (title: string, company: string) => logger.info(`📨 Applied: ${title} at ${company}`),
  separator: (char = "=", len = 60) => logger.info(char.repeat(len)),
  data: (msg: string, data?: Record<string, unknown>) => {
    if (data) {
      logger.info({ msg, ...data });
    } else {
      logger.info(msg);
    }
  },
};

export { logger };
