import { logger } from '../logging';
import { config } from '../config/env';

interface CloudflareIpRanges {
  ipv4: string[];
  ipv6: string[];
  lastUpdated: number;
}

class CloudflareIpService {
  private static instance: CloudflareIpService | null = null;
  private ipRanges: CloudflareIpRanges | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
  private readonly IPV4_URL = 'https://www.cloudflare.com/ips-v4/';
  private readonly IPV6_URL = 'https://www.cloudflare.com/ips-v6/';
  private initialized = false;

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  /**
   * Get singleton instance and initialize if needed
   */
  public static getInstance(): CloudflareIpService {
    if (!CloudflareIpService.instance) {
      CloudflareIpService.instance = new CloudflareIpService();
      CloudflareIpService.instance.initialize();
    }
    return CloudflareIpService.instance;
  }

  /**
   * Initialize the service (only runs once)
   */
  private initialize(): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    // Only initialize IP ranges if behind Cloudflare
    if (config.BEHIND_CLOUDFLARE) {
      this.updateIpRanges().catch(error => {
        logger.error('Failed to initialize Cloudflare IP ranges', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      });
      
      // Set up periodic updates every hour
      this.updateInterval = setInterval(() => {
        this.updateIpRanges().catch(error => {
          logger.error('Failed to update Cloudflare IP ranges', {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        });
      }, this.CACHE_DURATION);
    }
  }

  /**
   * Fetch and cache Cloudflare IP ranges
   */
  private async updateIpRanges(): Promise<void> {
    try {
      logger.info('Updating Cloudflare IP ranges');

      const [ipv4Response, ipv6Response] = await Promise.all([
        fetch(this.IPV4_URL),
        fetch(this.IPV6_URL)
      ]);

      if (!ipv4Response.ok || !ipv6Response.ok) {
        throw new Error(`HTTP error: IPv4 ${ipv4Response.status}, IPv6 ${ipv6Response.status}`);
      }

      const [ipv4Text, ipv6Text] = await Promise.all([
        ipv4Response.text(),
        ipv6Response.text()
      ]);

      const ipv4Ranges = ipv4Text.trim().split('\n').filter(ip => ip.trim());
      const ipv6Ranges = ipv6Text.trim().split('\n').filter(ip => ip.trim());

      this.ipRanges = {
        ipv4: ipv4Ranges,
        ipv6: ipv6Ranges,
        lastUpdated: Date.now()
      };

      logger.info('Cloudflare IP ranges updated successfully', {
        ipv4Count: ipv4Ranges.length,
        ipv6Count: ipv6Ranges.length
      });
    } catch (error) {
      logger.error('Failed to fetch Cloudflare IP ranges', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // If we don't have cached ranges and this is the first fetch, use fallback
      if (!this.ipRanges) {
        this.ipRanges = this.getFallbackIpRanges();
        logger.warn('Using fallback Cloudflare IP ranges');
      }
    }
  }

  /**
   * Get fallback IP ranges (hardcoded from the provided lists)
   */
  private getFallbackIpRanges(): CloudflareIpRanges {
    return {
      ipv4: [
        '173.245.48.0/20',
        '103.21.244.0/22',
        '103.22.200.0/22',
        '103.31.4.0/22',
        '141.101.64.0/18',
        '108.162.192.0/18',
        '190.93.240.0/20',
        '188.114.96.0/20',
        '197.234.240.0/22',
        '198.41.128.0/17',
        '162.158.0.0/15',
        '104.16.0.0/13',
        '104.24.0.0/14',
        '172.64.0.0/13',
        '131.0.72.0/22'
      ],
      ipv6: [
        '2400:cb00::/32',
        '2606:4700::/32',
        '2803:f800::/32',
        '2405:b500::/32',
        '2405:8100::/32',
        '2a06:98c0::/29',
        '2c0f:f248::/32'
      ],
      lastUpdated: Date.now()
    };
  }

  /**
   * Check if an IP address is in Cloudflare's IP ranges
   */
  public isCloudflareIp(ip: string): boolean {
    if (!this.ipRanges) {
      logger.warn('Cloudflare IP ranges not loaded, allowing request');
      return true; // Allow if ranges not loaded to prevent blocking legitimate traffic
    }

    try {
      // Determine if IP is IPv4 or IPv6
      const isIPv6 = ip.includes(':');
      const ranges = isIPv6 ? this.ipRanges.ipv6 : this.ipRanges.ipv4;

      for (const range of ranges) {
        if (this.ipInRange(ip, range)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Error checking Cloudflare IP', {
        ip,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return true; // Allow on error to prevent blocking legitimate traffic
    }
  }

  /**
   * Check if an IP is within a CIDR range
   */
  private ipInRange(ip: string, cidr: string): boolean {
    try {
      const [rangeIp, prefixLength] = cidr.split('/');
      const prefix = parseInt(prefixLength, 10);

      if (ip.includes(':')) {
        // IPv6
        return this.ipv6InRange(ip, rangeIp, prefix);
      } else {
        // IPv4
        return this.ipv4InRange(ip, rangeIp, prefix);
      }
    } catch (error) {
      logger.error('Error parsing CIDR range', { ip, cidr, error });
      return false;
    }
  }

  /**
   * Check if IPv4 address is in range
   */
  private ipv4InRange(ip: string, rangeIp: string, prefix: number): boolean {
    const ipNum = this.ipv4ToNumber(ip);
    const rangeNum = this.ipv4ToNumber(rangeIp);
    const mask = (0xffffffff << (32 - prefix)) >>> 0;
    
    return (ipNum & mask) === (rangeNum & mask);
  }

  /**
   * Convert IPv4 address to number
   */
  private ipv4ToNumber(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  }

  /**
   * Check if IPv6 address is in range (simplified implementation)
   */
  private ipv6InRange(ip: string, rangeIp: string, prefix: number): boolean {
    // Normalize IPv6 addresses
    const normalizeIpv6 = (addr: string): string => {
      // Expand :: notation
      if (addr.includes('::')) {
        const parts = addr.split('::');
        const left = parts[0] ? parts[0].split(':') : [];
        const right = parts[1] ? parts[1].split(':') : [];
        const missing = 8 - left.length - right.length;
        const middle = Array(missing).fill('0000');
        return [...left, ...middle, ...right].join(':');
      }
      return addr;
    };

    const normalizedIp = normalizeIpv6(ip);
    const normalizedRange = normalizeIpv6(rangeIp);

    // Convert to hex strings for comparison
    const ipHex = normalizedIp.split(':').map(part => part.padStart(4, '0')).join('');
    const rangeHex = normalizedRange.split(':').map(part => part.padStart(4, '0')).join('');

    // Compare prefix bits
    const prefixHexLength = Math.floor(prefix / 4);
    const remainingBits = prefix % 4;

    // Compare full hex groups
    if (ipHex.substring(0, prefixHexLength) !== rangeHex.substring(0, prefixHexLength)) {
      return false;
    }

    // Compare remaining bits if any
    if (remainingBits > 0) {
      const ipBits = parseInt(ipHex[prefixHexLength] || '0', 16);
      const rangeBits = parseInt(rangeHex[prefixHexLength] || '0', 16);
      const mask = (0xf << (4 - remainingBits)) & 0xf;
      
      return (ipBits & mask) === (rangeBits & mask);
    }

    return true;
  }

  /**
   * Get current IP ranges info
   */
  public getIpRangesInfo(): { ipv4Count: number; ipv6Count: number; lastUpdated: Date } | null {
    if (!this.ipRanges) {
      return null;
    }

    return {
      ipv4Count: this.ipRanges.ipv4.length,
      ipv6Count: this.ipRanges.ipv6.length,
      lastUpdated: new Date(this.ipRanges.lastUpdated)
    };
  }

  /**
   * Force update IP ranges
   */
  public async forceUpdate(): Promise<void> {
    await this.updateIpRanges();
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

// Export getter function to get singleton instance (lazy initialization)
export function getCloudflareIpService(): CloudflareIpService {
  return CloudflareIpService.getInstance();
}

// For backward compatibility, export as object with getter
export const cloudflareIpService = {
  get instance() {
    return CloudflareIpService.getInstance();
  },
  isCloudflareIp(ip: string): boolean {
    return this.instance.isCloudflareIp(ip);
  },
  getIpRangesInfo() {
    return this.instance.getIpRangesInfo();
  },
  forceUpdate(): Promise<void> {
    return this.instance.forceUpdate();
  },
  destroy(): void {
    return this.instance.destroy();
  }
};
