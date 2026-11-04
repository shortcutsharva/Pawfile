import { loadConfig } from './env';
import { openDatabase } from './db';
import { assertSchema } from './schemaAssert';
import { createApp } from './app';
import { runBackupIfDue } from './services/backup';

const config = loadConfig();
const db = openDatabase(config.databasePath);
assertSchema(db);

const app = createApp({ db, config });
const server = app.listen(config.port, config.host, () => {
  console.log(`Pawfile server listening on http://${config.host}:${config.port}`);
  console.log(`Database: ${config.databasePath}`);
  console.log(`Uploads: ${config.uploadsDir}`);
});

try {
  const backup = runBackupIfDue(db, config.databasePath);
  if (backup) console.log(`Backup written: ${backup}`);
} catch (error) {
  console.error('Backup failed:', error);
}

const backupTimer = setInterval(() => {
  try {
    runBackupIfDue(db, config.databasePath);
  } catch (error) {
    console.error('Backup failed:', error);
  }
}, 6 * 60 * 60 * 1000);
backupTimer.unref();

let shuttingDown = false;

function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}; shutting down.`);
  clearInterval(backupTimer);
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
