import 'dotenv/config';
import cron from 'node-cron';
import { spawn } from 'node:child_process';

const cronExpr = process.env.INGEST_CRON || '*/30 * * * *';
const tz = process.env.TIMEZONE || 'Europe/Paris';

console.log(`⏰ Ingest cron "${cronExpr}" (${tz})`);

cron.schedule(cronExpr, () => {
    const p = spawn('node', ['scripts/ingest_upcoming.js'], { stdio: 'inherit' });
    p.on('close', (code) => console.log(`[ingest_upcoming] exit ${code}`));
}, { timezone: tz });

const p = spawn('node', ['scripts/ingest_upcoming.js'], { stdio: 'inherit' });
p.on('close', (code) => console.log(`[ingest_upcoming] first run exit ${code}`));
