// Runs the SQL files in ./migrations with node-pg-migrate's API (the engine behind its CLI).
// Started with `node --env-file-if-exists=../../.env`, so DATABASE_URL can come from .env.
const path = require('node:path');
const { runner } = require('node-pg-migrate');

const direction = process.argv[2];
if (direction !== 'up' && direction !== 'down') {
  console.error('Usage: migrate.js up|down');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env or export it.');
  process.exit(1);
}

runner({
  databaseUrl: process.env.DATABASE_URL,
  dir: path.join(__dirname, '..', 'migrations'),
  direction,
  // "down" undoes one migration at a time, so a slip never drops the whole schema.
  count: direction === 'up' ? Infinity : 1,
  migrationsTable: 'pgmigrations',
})
  .then(() => console.log(`Migrations ${direction}: done`))
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
