import { readFileSync } from 'fs';
import { join } from 'path';

export interface VersionInfo {
  version: string;
  source: 'build-env' | 'package-json' | 'fallback';
  buildCommit?: string;
  buildTime?: string;
}

/**
 * Service to determine the current application version from build-time sources
 * Works in Docker containers without Git access
 */
export class VersionService {
  private static cachedVersion: VersionInfo | null = null;

  /**
   * Get the current version information
   * Priority: Build Environment Variables > package.json > fallback
   */
  static getVersion(): VersionInfo {
    if (this.cachedVersion) {
      return this.cachedVersion;
    }

    let version: VersionInfo;

    // Try to get version from build environment variables first (set during Docker build)
    if (process.env.BUILD_VERSION && process.env.BUILD_VERSION !== 'dev') {
      version = {
        version: process.env.BUILD_VERSION,
        source: 'build-env',
        buildCommit: process.env.BUILD_COMMIT,
        buildTime: process.env.BUILD_TIME
      };
    } else {
      // Fallback to package.json
      try {
        version = this.getVersionFromPackageJson();
      } catch (packageError) {
        console.warn('Could not determine version from package.json:', packageError instanceof Error ? packageError.message : 'Unknown error');
        
        // Final fallback
        version = {
          version: '1.0.0',
          source: 'fallback'
        };
      }
    }

    // Add current timestamp if no build time is available
    if (!version.buildTime) {
      version.buildTime = new Date().toISOString();
    }

    this.cachedVersion = version;
    return version;
  }

  /**
   * Get version from package.json
   */
  private static getVersionFromPackageJson(): VersionInfo {
    try {
      const packageJsonPath = join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      
      if (!packageJson.version) {
        throw new Error('No version field in package.json');
      }

      return {
        version: packageJson.version,
        source: 'package-json'
      };
    } catch (error) {
      throw new Error(`Failed to get version from package.json: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear cached version (useful for testing or if version changes during runtime)
   */
  static clearCache(): void {
    this.cachedVersion = null;
  }

  /**
   * Get a formatted version string with additional info
   */
  static getFormattedVersion(): string {
    const versionInfo = this.getVersion();
    let formatted = versionInfo.version;

    if (versionInfo.buildCommit) {
      formatted += `+${versionInfo.buildCommit}`;
    }

    return formatted;
  }

  /**
   * Get detailed version information for debugging
   */
  static getDetailedVersion(): string {
    const versionInfo = this.getVersion();
    const parts = [
      `v${versionInfo.version}`,
      `source: ${versionInfo.source}`
    ];

    if (versionInfo.buildCommit) {
      parts.push(`commit: ${versionInfo.buildCommit}`);
    }

    if (versionInfo.buildTime) {
      parts.push(`built: ${versionInfo.buildTime}`);
    }

    return parts.join(', ');
  }

  /**
   * Check if this is a development build
   */
  static isDevelopmentBuild(): boolean {
    const versionInfo = this.getVersion();
    return versionInfo.source === 'fallback' || 
           versionInfo.version === 'dev' || 
           versionInfo.version.includes('dev');
  }

  /**
   * Get version info for health checks and monitoring
   */
  static getHealthInfo(): {
    version: string;
    source: string;
    commit?: string;
    buildTime?: string;
    isDev: boolean;
  } {
    const versionInfo = this.getVersion();
    return {
      version: versionInfo.version,
      source: versionInfo.source,
      commit: versionInfo.buildCommit,
      buildTime: versionInfo.buildTime,
      isDev: this.isDevelopmentBuild()
    };
  }
}
