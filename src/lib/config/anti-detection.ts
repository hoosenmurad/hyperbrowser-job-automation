import fs from "fs/promises";
import path from "path";
import { log } from "@/lib/logger";
import type { PlatformConfig, PlatformConfigs, AntiDetectionParams } from "@/types";

const CONFIG_FILE = path.join(process.cwd(), "user/platform_configs.json");

export class AntiDetectionConfig {
  private config: PlatformConfigs | null = null;

  private getDefaultConfig(): PlatformConfigs {
    return {
      platforms: {},
      globalSettings: {
        retryFailedSessions: 2,
        sessionCleanupTimeout: 300,
        respectRobotsTxt: true,
        sharedJobStorage: true,
        noLoginMode: true,
        skipCredentialValidation: true,
        optimizeForPublicSites: true,
      },
      searchParameters: {
        defaultLocation: "Remote",
        backupLocations: ["San Francisco", "Seattle", "New York"],
        jobTypes: ["Full-time"],
        experienceLevels: ["Mid-level", "Senior"],
        salaryMin: 150000,
        datePosted: "Past week",
      },
    };
  }

  async loadConfig(): Promise<PlatformConfigs> {
    if (this.config) return this.config;

    try {
      const data = await fs.readFile(CONFIG_FILE, "utf-8");
      this.config = JSON.parse(data);
      return this.config!;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        log.warn(`Config file not found: ${CONFIG_FILE}, using defaults`);
      } else {
        log.error(`Error loading config: ${error}`);
      }
      this.config = this.getDefaultConfig();
      return this.config;
    }
  }

  async getPlatformConfig(platform: string): Promise<PlatformConfig | null> {
    const config = await this.loadConfig();
    return config.platforms[platform] || null;
  }

  async getAntiDetectionParams(platform: string): Promise<AntiDetectionParams> {
    const platformConfig = await this.getPlatformConfig(platform);
    const antiDetection = platformConfig?.antiDetection;

    // Base parameters
    const params: AntiDetectionParams = {
      stealthMode: antiDetection?.stealthMode ?? true,
      useProxy: antiDetection?.useProxy ?? false,
      device: antiDetection?.device ?? "desktop",
      operatingSystem: antiDetection?.operatingSystem ?? "macos",
      locale: antiDetection?.locale ?? "en-US",
      screen: {
        width: antiDetection?.screen?.width ?? 1920,
        height: antiDetection?.screen?.height ?? 1080,
      },
    };

    // Proxy configuration
    if (antiDetection?.useProxy) {
      params.proxyCountry = antiDetection.proxyCountry ?? "US";
      if (antiDetection.proxyCity) {
        params.proxyCity = antiDetection.proxyCity;
      }
    }

    log.debug(`Generated anti-detection params for ${platform}`);
    return params;
  }

  async getRandomizedParams(platform: string): Promise<AntiDetectionParams> {
    const baseParams = await this.getAntiDetectionParams(platform);

    // Randomize screen resolution slightly (±50 pixels)
    const widthVariation = Math.floor(Math.random() * 100) - 50;
    const heightVariation = Math.floor(Math.random() * 100) - 50;

    baseParams.screen.width = Math.max(1024, baseParams.screen.width + widthVariation);
    baseParams.screen.height = Math.max(768, baseParams.screen.height + heightVariation);

    // Randomly vary locale
    const locales = ["en-US", "en-CA", "en-GB"];
    baseParams.locale = locales[Math.floor(Math.random() * locales.length)];

    // 20% chance to use different OS
    if (Math.random() < 0.2) {
      const osOptions = ["macos", "windows", "linux"];
      baseParams.operatingSystem = osOptions[Math.floor(Math.random() * osOptions.length)];
    }

    return baseParams;
  }

  async getDelayRange(platform: string): Promise<[number, number]> {
    const platformConfig = await this.getPlatformConfig(platform);
    const delayStr = platformConfig?.delayBetweenActions ?? "2-8";

    try {
      const [min, max] = delayStr.split("-").map(Number);
      return [min, max];
    } catch {
      log.warn(`Invalid delay format for ${platform}: ${delayStr}`);
      return [2, 8];
    }
  }

  async getRandomDelay(platform: string): Promise<number> {
    const [min, max] = await this.getDelayRange(platform);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async isPlatformEnabled(platform: string): Promise<boolean> {
    const platformConfig = await this.getPlatformConfig(platform);
    return platformConfig?.enabled ?? false;
  }

  async requiresLogin(platform: string): Promise<boolean> {
    const platformConfig = await this.getPlatformConfig(platform);
    return platformConfig?.requiresLogin ?? false;
  }

  async getMaxApplications(platform: string): Promise<number> {
    const platformConfig = await this.getPlatformConfig(platform);
    return platformConfig?.maxApplicationsPerSession ?? 3;
  }

  async getSessionTimeout(platform: string): Promise<number> {
    const platformConfig = await this.getPlatformConfig(platform);
    return platformConfig?.sessionTimeout ?? 1200;
  }

  async getEnabledPlatforms(): Promise<string[]> {
    const config = await this.loadConfig();
    const enabled: [number, string][] = [];

    for (const [platformKey, platformConfig] of Object.entries(config.platforms)) {
      if (platformConfig.enabled) {
        const priority = platformConfig.priority ?? 999;
        enabled.push([priority, platformKey]);
      }
    }

    // Sort by priority and return platform names
    enabled.sort((a, b) => a[0] - b[0]);
    return enabled.map(([, platform]) => platform);
  }

  async getGlobalSetting<K extends keyof PlatformConfigs["globalSettings"]>(
    key: K
  ): Promise<PlatformConfigs["globalSettings"][K]> {
    const config = await this.loadConfig();
    return config.globalSettings[key];
  }

  async getSearchUrl(platform: string): Promise<string> {
    const platformConfig = await this.getPlatformConfig(platform);
    return platformConfig?.searchUrl ?? "";
  }

  async getPlatformName(platform: string): Promise<string> {
    const platformConfig = await this.getPlatformConfig(platform);
    return platformConfig?.name ?? platform.charAt(0).toUpperCase() + platform.slice(1);
  }
}

// Singleton instance
let antiDetectionInstance: AntiDetectionConfig | null = null;

export function getAntiDetectionConfig(): AntiDetectionConfig {
  if (!antiDetectionInstance) {
    antiDetectionInstance = new AntiDetectionConfig();
  }
  return antiDetectionInstance;
}

