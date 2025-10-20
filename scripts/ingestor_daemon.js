import 'dotenv/config';
import cron from 'node-cron';
import { spawn } from 'node:child_process';
import {syncAllLeagues} from "./ingest_leagues.js";
import {fetchUpcoming} from "./ingest_upcoming.js";
import {fetchModifiedSince} from "./ingest_modified.js";
import {sweepPending} from "./ingest_sweep.js";

const cronUpcomingExpr  = process.env.INGEST_UPCOMING_CRON || '*/30 * * * *';
const cronModifiedExpr  = process.env.INGEST_MODIFIED_CRON || '*/5 * * * *';
const cronSweepExpr     = process.env.INGEST_SWEEP_CRON || '*/30 * * * *';
const tz = process.env.TIMEZONE || 'Europe/Paris';
let p;


await syncAllLeagues();

console.log(`⏰ Ingest cron upcoming "${cronUpcomingExpr}" (${tz})`);
await fetchUpcoming();
cron.schedule(cronUpcomingExpr, fetchUpcoming, { timezone: tz });

console.log(`⏰ Ingest cron modified "${cronModifiedExpr}" (${tz})`);
await fetchModifiedSince();
cron.schedule(cronModifiedExpr, fetchModifiedSince, { timezone: tz });

console.log(`⏰ Ingest cron sweep "${cronSweepExpr}" (${tz})`);
await sweepPending();
cron.schedule(cronSweepExpr, () => sweepPending(), { timezone: tz });
