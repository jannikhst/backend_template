import { config } from './env';
import { logger } from '../logging';

export type AuthMethod = 'emailPassword' | 'google' | 'slack' | 'github';

export interface OAuthProviderConfig {
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

export interface AuthProviderConfig {
  emailPassword: {
    enabled: boolean;
  };
  google: OAuthProviderConfig;
  slack: OAuthProviderConfig;
  github: OAuthProviderConfig;
}

export const authConfig: AuthProviderConfig = {
  emailPassword: {
    enabled: config.AUTH_EMAIL_PASSWORD_ENABLED,
  },
  google: {
    enabled: config.AUTH_GOOGLE_ENABLED,
    clientId: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    redirectUri: config.GOOGLE_REDIRECT_URI,
  },
  slack: {
    enabled: config.AUTH_SLACK_ENABLED,
    clientId: config.SLACK_CLIENT_ID,
    clientSecret: config.SLACK_CLIENT_SECRET,
    redirectUri: config.SLACK_REDIRECT_URI,
  },
  github: {
    enabled: config.AUTH_GITHUB_ENABLED,
    clientId: config.GITHUB_CLIENT_ID,
    clientSecret: config.GITHUB_CLIENT_SECRET,
    redirectUri: config.GITHUB_REDIRECT_URI,
  },
};

/**
 * Check if a specific authentication method is enabled
 */
export function isAuthMethodEnabled(method: AuthMethod): boolean {
  return authConfig[method].enabled;
}

/**
 * Get list of all enabled authentication methods
 */
export function getEnabledAuthMethods(): AuthMethod[] {
  return (Object.keys(authConfig) as AuthMethod[]).filter(
    (method) => authConfig[method].enabled
  );
}

/**
 * Check if at least one authentication method is enabled
 */
export function hasAnyAuthMethodEnabled(): boolean {
  return getEnabledAuthMethods().length > 0;
}

/**
 * Get OAuth provider configuration (throws if not enabled or incomplete)
 */
export function getOAuthProviderConfig(
  provider: 'google' | 'slack' | 'github'
): Required<OAuthProviderConfig> {
  const config = authConfig[provider];
  
  if (!config.enabled) {
    throw new Error(`OAuth provider "${provider}" is not enabled`);
  }
  
  if (!config.clientId || !config.clientSecret || !config.redirectUri) {
    throw new Error(`OAuth provider "${provider}" configuration is incomplete`);
  }
  
  return {
    enabled: true,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri,
  };
}

/**
 * Validate authentication configuration at startup
 * Throws error if configuration is invalid
 */
export function validateAuthConfiguration(): void {
  const enabledMethods = getEnabledAuthMethods();
  
  // CRITICAL: At least one auth method must be enabled
  if (enabledMethods.length === 0) {
    throw new Error(
      '❌ No authentication methods enabled! ' +
      'At least one of AUTH_EMAIL_PASSWORD_ENABLED, AUTH_GOOGLE_ENABLED, ' +
      'AUTH_SLACK_ENABLED, or AUTH_GITHUB_ENABLED must be set to true.'
    );
  }
  
  logger.info(`✅ Enabled authentication methods: ${enabledMethods.join(', ')}`);
  
  // Validate OAuth provider configurations
  const oauthProviders: Array<'google' | 'slack' | 'github'> = ['google', 'slack', 'github'];
  
  for (const provider of oauthProviders) {
    if (authConfig[provider].enabled) {
      const providerConfig = authConfig[provider];
      
      if (!providerConfig.clientId || !providerConfig.clientSecret || !providerConfig.redirectUri) {
        const missingFields: string[] = [];
        if (!providerConfig.clientId) missingFields.push(`${provider.toUpperCase()}_CLIENT_ID`);
        if (!providerConfig.clientSecret) missingFields.push(`${provider.toUpperCase()}_CLIENT_SECRET`);
        if (!providerConfig.redirectUri) missingFields.push(`${provider.toUpperCase()}_REDIRECT_URI`);
        
        throw new Error(
          `❌ ${provider.toUpperCase()} OAuth is enabled but configuration is incomplete.\n` +
          `   Missing environment variables: ${missingFields.join(', ')}\n` +
          `   Please set these variables or disable ${provider.toUpperCase()} OAuth by setting AUTH_${provider.toUpperCase()}_ENABLED=false`
        );
      }
      
      logger.info(`✅ ${provider.toUpperCase()} OAuth configured`);
    }
  }
}

/**
 * Get authentication methods info for API response
 */
export function getAuthMethodsInfo() {
  return {
    methods: getEnabledAuthMethods(),
    emailPassword: isAuthMethodEnabled('emailPassword'),
    google: isAuthMethodEnabled('google'),
    slack: isAuthMethodEnabled('slack'),
    github: isAuthMethodEnabled('github'),
  };
}
