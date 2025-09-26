import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const config: PoolConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'restaurant_db',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  // Connection pool settings
  max: 20, // Maximum number of clients in pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
  connectionTimeoutMillis: 2000, // How long to wait when connecting
};

export const pool = new Pool(config);

// Handle pool errors
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

export const testConnection = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    console.log(`📅 Server time: ${result.rows[0].now}`);
    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Closing database pool...');
  await pool.end();
  console.log('✅ Database pool closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Closing database pool...');
  await pool.end();
  console.log('✅ Database pool closed');
  process.exit(0);
});