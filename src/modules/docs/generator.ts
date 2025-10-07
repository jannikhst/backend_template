import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import * as fs from 'fs';
import * as path from 'path';
import NodeCache from 'node-cache';
import { SecurityDefinitions } from '../../core/openapi/definitions';
import { config } from '../../core/config/env';
import { VersionService } from '../../core/services/versionService';
import { loadApiOverview, discoverTags } from './markdown';

// Cache for 15 minutes
const cache = new NodeCache({
  stdTTL: 15 * 60,
  checkperiod: 60,
  useClones: false
});

const CACHE_KEY = 'openapi_document';

/**
 * Auto-discover module registries from src/modules directory
 * Docker-safe: Works with both src/ (dev) and dist/ (production/docker)
 */
function discoverModuleRegistries(): OpenAPIRegistry[] {
  const registries: OpenAPIRegistry[] = [];
  
  try {
    // Start from current directory and navigate to modules directory
    // In dev: /path/to/src/modules/docs -> /path/to/src/modules
    // In docker: /app/dist/modules/docs -> /app/dist/modules
    const currentDir = __dirname;
    const modulesDir = path.resolve(currentDir, '..');
    
    if (!fs.existsSync(modulesDir)) {
      console.warn('⚠️  Modules directory not found:', modulesDir);
      return [];
    }

    const modules = fs.readdirSync(modulesDir)
      .filter(name => {
        try {
          const modulePath = path.join(modulesDir, name);
          const stat = fs.statSync(modulePath);
          return stat.isDirectory() && name !== 'docs';
        } catch {
          return false;
        }
      });

    console.log(`🔍 Discovered ${modules.length} modules:`, modules.join(', '));

    for (const moduleName of modules) {
      try {
        // Try to load registry from module
        // Works with both .ts (ts-node) and .js (compiled)
        const registryPath = path.join(modulesDir, moduleName, 'registry');
        const mod = require(registryPath);
        
        // Find registry in module exports
        const registry = mod.default || 
                        Object.values(mod).find((v: any) => v?.definitions);
        
        if (registry && Array.isArray((registry as any).definitions)) {
          registries.push(registry as OpenAPIRegistry);
          console.log(`  ✓ Loaded registry from ${moduleName}`);
        }
      } catch (error) {
        // Module doesn't have a registry or it failed to load - skip silently
        // This is expected for modules without OpenAPI documentation
      }
    }

    if (registries.length === 0) {
      console.warn('⚠️  No module registries found - OpenAPI spec will be empty');
    }

  } catch (error) {
    console.error('❌ Error during module discovery:', error);
  }

  return registries;
}

/**
 * Generate OpenAPI document with auto-discovered modules and tags
 * Cached for 15 minutes
 */
export function generateOpenApiDocument(): any {
  // Try cache first
  let document = cache.get<any>(CACHE_KEY);

  if (!document) {
    console.log('📝 Generating OpenAPI document...');

    // Auto-discover all module registries
    const moduleRegistries = discoverModuleRegistries();
    
    // Combine all definitions
    const combinedDefinitions = moduleRegistries.flatMap(registry => registry.definitions);
    
    // Generate document
    const generator = new OpenApiGeneratorV31(combinedDefinitions);

    document = generator.generateDocument({
      openapi: '3.1.0',
      info: {
        title: 'Backend API',
        version: VersionService.getVersion().version,
        description: loadApiOverview(),
      },
      servers: [
        {
          url: `http://localhost:${config.PORT || 3000}/v1`,
          description: 'Development server',
        },
        {
          url: `https://${config.DOMAIN}/v1`,
          description: 'Production server',
        },
      ],
      // Auto-discover tags from docs/*.md files
      tags: discoverTags(),
    });

    // Add security schemes from centralized definitions
    document.components = {
      ...document.components,
      securitySchemes: SecurityDefinitions,
    };

    // Add global security requirement (either cookie or bearer)
    document.security = [
      { cookieAuth: [] },
      { bearerAuth: [] },
    ];

    // Cache the document
    cache.set(CACHE_KEY, document);
    console.log('✓ OpenAPI document generated and cached');
  }

  return document;
}

/**
 * Clear the OpenAPI document cache
 * Useful for development when registries or docs change
 */
export function clearCache(): void {
  cache.del(CACHE_KEY);
  console.log('🗑️  OpenAPI document cache cleared');
}
