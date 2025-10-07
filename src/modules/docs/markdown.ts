import * as fs from 'fs';
import * as path from 'path';
import NodeCache from 'node-cache';
import { config } from '../../core/config/env';
import { ROLE_DESCRIPTIONS } from '../../core/http/middleware/rbac';

// Cache for 15 minutes
const cache = new NodeCache({
  stdTTL: 15 * 60,
  checkperiod: 60,
  useClones: false
});

const CACHE_KEYS = {
  API_OVERVIEW: 'api_overview',
  TAG_PREFIX: 'tag_'
} as const;

/**
 * Helper function to format seconds into human-readable duration
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Process template variables in markdown content
 * Replaces {{VARIABLE}} placeholders with actual config values
 */
export function processTemplateVariables(markdown: string): string {
  // Generate role descriptions as markdown list
  const roleDescriptions = Object.entries(ROLE_DESCRIPTIONS)
    .map(([role, description]) => `- **${role}**: ${description}`)
    .join('\n');

  const replacements: Record<string, string> = {
    '{{NODE_ENV}}': config.NODE_ENV,
    '{{PORT}}': config.PORT.toString(),
    '{{CORS_ORIGIN}}': config.CORS_ORIGIN,
    '{{SESSION_COOKIE_NAME}}': config.SESSION_COOKIE_NAME,
    '{{SESSION_TTL_FORMATTED}}': formatDuration(config.SESSION_TTL_SECONDS),
    '{{SESSION_TTL_SECONDS}}': config.SESSION_TTL_SECONDS.toString(),
    '{{SESSION_SLIDING_EXTENSION_FORMATTED}}': formatDuration(config.SESSION_SLIDING_EXTENSION_SECONDS),
    '{{SESSION_SLIDING_EXTENSION_SECONDS}}': config.SESSION_SLIDING_EXTENSION_SECONDS.toString(),
    '{{COOKIE_SECURE}}': config.COOKIE_SECURE.toString(),
    '{{COOKIE_SAMESITE}}': config.COOKIE_SAMESITE,
    '{{ROLE_DESCRIPTIONS}}': roleDescriptions,
    '{{DOMAIN}}': config.DOMAIN,
  };

  let processedMarkdown = markdown;
  for (const [placeholder, value] of Object.entries(replacements)) {
    processedMarkdown = processedMarkdown.replace(new RegExp(placeholder, 'g'), value);
  }

  return processedMarkdown;
}

/**
 * Load API overview from markdown file with caching
 * Docker-safe: Uses process.cwd() which points to container/project root
 */
export function loadApiOverview(): string {
  // Try cache first
  let markdown = cache.get<string>(CACHE_KEYS.API_OVERVIEW);

  if (!markdown) {
    try {
      // In Docker: /app/docs/api-overview.md
      // In Dev: /path/to/project/docs/api-overview.md
      const overviewPath = path.join(process.cwd(), 'docs/api-overview.md');
      
      if (fs.existsSync(overviewPath)) {
        const rawMarkdown = fs.readFileSync(overviewPath, 'utf-8');
        markdown = processTemplateVariables(rawMarkdown);
        cache.set(CACHE_KEYS.API_OVERVIEW, markdown);
        console.log('✓ Loaded api-overview.md');
      } else {
        console.warn('⚠️  api-overview.md not found, using default description');
        markdown = 'Backend API with authentication and session management';
        cache.set(CACHE_KEYS.API_OVERVIEW, markdown);
      }
    } catch (error) {
      console.warn('⚠️  Could not load api-overview.md:', error);
      markdown = 'Backend API';
      cache.set(CACHE_KEYS.API_OVERVIEW, markdown);
    }
  }

  return markdown;
}

/**
 * Auto-discover and load tags from docs/*.md files
 * Docker-safe: Uses process.cwd() which points to container/project root
 * 
 * Each .md file in docs/ (except api-overview.md) becomes a tag
 * Filename becomes tag name, content becomes description
 */
export function discoverTags(): Array<{ name: string; description: string }> {
  const tags: Array<{ name: string; description: string }> = [];
  
  try {
    // In Docker: /app/docs/
    // In Dev: /path/to/project/docs/
    const docsDir = path.join(process.cwd(), 'docs');
    
    if (!fs.existsSync(docsDir)) {
      console.warn('⚠️  docs/ directory not found - no tags generated');
      return [];
    }

    const files = fs.readdirSync(docsDir)
      .filter(f => f.endsWith('.md') && f !== 'api-overview.md')
      .sort(); // Alphabetical order

    console.log(`🔍 Discovered ${files.length} tag documentation files`);

    for (const file of files) {
      const cacheKey = `${CACHE_KEYS.TAG_PREFIX}${file}`;
      
      // Try cache first
      let tag = cache.get<{ name: string; description: string }>(cacheKey);
      
      if (!tag) {
        try {
          const tagName = file.replace('.md', '');
          const filePath = path.join(docsDir, file);
          const rawContent = fs.readFileSync(filePath, 'utf-8');
          const processedContent = processTemplateVariables(rawContent);
          
          tag = {
            name: tagName,
            description: processedContent
          };
          
          cache.set(cacheKey, tag);
          console.log(`  ✓ Loaded tag documentation: ${tagName}`);
        } catch (error) {
          console.warn(`  ⚠️  Could not load tag documentation from ${file}:`, error);
          continue;
        }
      }
      
      if (tag) {
        tags.push(tag);
      }
    }

  } catch (error) {
    console.error('❌ Error discovering tags:', error);
  }

  return tags;
}

/**
 * Clear all markdown caches
 * Useful for development when markdown files change
 */
export function clearCache(): void {
  cache.flushAll();
  console.log('🗑️  Markdown cache cleared');
}
