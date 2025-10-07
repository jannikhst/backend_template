import { Google, Slack, GitHub } from 'arctic';
import { createClient } from 'redis';
import crypto from 'crypto';
import { getOAuthProviderConfig } from '../config/auth';
import { logger } from '../logging';

// Redis client for state management
const redis = createClient({
  url: process.env.REDIS_URL
});

redis.on('error', (err) => logger.error('OAuth Redis Client Error', { error: err }));

// Initialize Redis connection
let redisConnected = false;
async function ensureRedisConnection() {
  if (!redisConnected) {
    await redis.connect();
    redisConnected = true;
    logger.info('OAuth Redis client connected');
  }
}

// OAuth client instances (lazy initialization)
let googleClient: Google | null = null;
let slackClient: Slack | null = null;
let githubClient: GitHub | null = null;

/**
 * Get Google OAuth client
 */
export function getGoogleClient(): Google {
  if (!googleClient) {
    const config = getOAuthProviderConfig('google');
    googleClient = new Google(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }
  return googleClient;
}

/**
 * Get Slack OAuth client
 */
export function getSlackClient(): Slack {
  if (!slackClient) {
    const config = getOAuthProviderConfig('slack');
    slackClient = new Slack(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }
  return slackClient;
}

/**
 * Get GitHub OAuth client
 */
export function getGitHubClient(): GitHub {
  if (!githubClient) {
    const config = getOAuthProviderConfig('github');
    githubClient = new GitHub(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }
  return githubClient;
}

/**
 * Generate and store OAuth state (with optional code verifier for PKCE)
 */
export async function generateOAuthState(
  provider: 'google' | 'slack' | 'github',
  codeVerifier?: string
): Promise<string> {
  await ensureRedisConnection();
  
  const state = crypto.randomBytes(32).toString('hex');
  const key = `oauth:state:${state}`;
  const value = JSON.stringify({
    provider,
    codeVerifier,
    createdAt: Date.now()
  });
  
  // Store with 10 minute expiration
  await redis.setEx(key, 600, value);
  
  logger.info('OAuth state generated', { provider, state: state.substring(0, 8) + '...' });
  
  return state;
}

/**
 * Validate and consume OAuth state
 */
export async function validateOAuthState(state: string): Promise<{ 
  provider: 'google' | 'slack' | 'github';
  codeVerifier?: string;
} | null> {
  await ensureRedisConnection();
  
  const key = `oauth:state:${state}`;
  const value = await redis.get(key);
  
  if (!value) {
    logger.warn('OAuth state validation failed: not found', { state: state.substring(0, 8) + '...' });
    return null;
  }
  
  // Delete state (one-time use)
  await redis.del(key);
  
  try {
    const data = JSON.parse(value);
    logger.info('OAuth state validated', { provider: data.provider });
    return data;
  } catch (error) {
    logger.error('OAuth state validation failed: invalid JSON', { error });
    return null;
  }
}

/**
 * OAuth user profile interfaces
 */
export interface GoogleUserProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

export interface SlackUserProfile {
  user: {
    id: string;
    email: string;
    name: string;
    image_192?: string;
  };
}

export interface GitHubUserProfile {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
  avatar_url?: string;
}

export interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: string | null;
}

/**
 * Fetch Google user profile
 */
export async function fetchGoogleUserProfile(accessToken: string): Promise<GoogleUserProfile> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch Google user profile: ${response.statusText}`);
  }
  
  return response.json() as Promise<GoogleUserProfile>;
}

/**
 * Fetch Slack user profile
 */
export async function fetchSlackUserProfile(accessToken: string): Promise<SlackUserProfile> {
  const response = await fetch('https://slack.com/api/users.identity', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch Slack user profile: ${response.statusText}`);
  }
  
  const data = await response.json() as any;
  
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }
  
  return data as SlackUserProfile;
}

/**
 * Fetch GitHub user profile
 */
export async function fetchGitHubUserProfile(accessToken: string): Promise<GitHubUserProfile> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'OAuth-App'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub user profile: ${response.statusText}`);
  }
  
  return response.json() as Promise<GitHubUserProfile>;
}

/**
 * Fetch GitHub user emails (needed if email is not public)
 */
export async function fetchGitHubUserEmails(accessToken: string): Promise<GitHubEmail[]> {
  const response = await fetch('https://api.github.com/user/emails', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'OAuth-App'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub user emails: ${response.statusText}`);
  }
  
  return response.json() as Promise<GitHubEmail[]>;
}

/**
 * Normalize OAuth user data to common format
 */
export interface NormalizedOAuthUser {
  providerId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

export function normalizeGoogleUser(profile: GoogleUserProfile): NormalizedOAuthUser {
  return {
    providerId: profile.sub,
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.picture
  };
}

export function normalizeSlackUser(profile: SlackUserProfile): NormalizedOAuthUser {
  return {
    providerId: profile.user.id,
    email: profile.user.email,
    name: profile.user.name,
    avatarUrl: profile.user.image_192
  };
}

export function normalizeGitHubUser(profile: GitHubUserProfile, email: string): NormalizedOAuthUser {
  return {
    providerId: profile.id.toString(),
    email,
    name: profile.name || profile.login,
    avatarUrl: profile.avatar_url
  };
}
