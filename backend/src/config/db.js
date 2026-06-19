const { Pool } = require('pg');
require('dotenv').config();

// Ensure the critical DATABASE_URL is present before booting the engine
if (!process.env.DATABASE_URL) {
  console.error('❌ CRITICAL ERROR: DATABASE_URL environment variable is missing.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  
  // Serverless-tuned connection pooling settings:
  max: 15,                     // Maximum number of active clients in the pool
  idleTimeoutMillis: 15000,    // Close idle clients after 15 seconds to free up DB slots
  connectionTimeoutMillis: 2000 // Return an error if a connection takes longer than 2 seconds
});

// Graceful monitoring event hooks
pool.on('connect', () => {
  // Useful log for verifying active pooling during your local hackathon testing
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔄 New DB client connected to pool');
  }
});

pool.on('error', (err) => {
  console.error('⚠️ Unexpected error on idle PostgreSQL client pool:', err);
});

module.exports = {
  /**
   * Executes a standard isolated query. Best for standard SELECT/INSERT reads and writes.
   */
  query: (text, params) => pool.query(text, params),

  /**
   * Spawns a dedicated client transaction wrapper. 
   * CRITICAL for executing secure atomic block operations (like our Booking checkout).
   */
  getTransaction: async () => {
    const client = await pool.connect();
    const query = client.query.bind(client);
    const release = client.release.bind(client);
    return { client, query, release };
  }
};