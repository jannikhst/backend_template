#!/usr/bin/env node

const { execSync } = require('child_process');
const { Client } = require('pg');

// Database connection configuration
const dbConfig = {
  host: process.env.POSTGRES_HOST || 'postgres',
  port: process.env.POSTGRES_PORT || 5432,
  user: process.env.POSTGRES_USER || 'devuser',
  password: process.env.POSTGRES_PASSWORD || 'devpassword',
  database: process.env.POSTGRES_DB || 'contentdb',
};

console.log('🚀 Starting database migration...');
console.log(`📍 Database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

async function waitForDatabase(maxRetries = 30, retryInterval = 2000) {
  console.log('⏳ Waiting for database to be ready...');
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = new Client({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
        connectionTimeoutMillis: 5000,
      });
      
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      
      console.log('✅ Database is ready!');
      return true;
    } catch (error) {
      console.log(`⏳ Attempt ${i + 1}/${maxRetries}: Database not ready yet (${error.message})`);
      
      if (i === maxRetries - 1) {
        console.error('❌ Database connection failed after maximum retries');
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
  }
}

async function runMigrations() {
  try {
    console.log('🔧 Running Prisma migrations...');
    
    // Use the container database URL for Prisma
    const containerDatabaseUrl = `postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}?schema=public`;
    
    console.log(`🔗 Using database URL: postgresql://${dbConfig.user}:***@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    
    // Run Prisma migrations
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      cwd: '/app/prisma',
      env: { ...process.env, DATABASE_URL: containerDatabaseUrl }
    });
    
    console.log('✅ Migrations completed successfully!');    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

async function main() {
  try {
    await waitForDatabase();
    await runMigrations();
    console.log('🎉 Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration process failed:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('📡 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📡 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

main();
