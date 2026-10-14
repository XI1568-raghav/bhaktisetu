// Retry of failed receipt / booking emails. The logic lives in lib/email-outbox.ts and
// runs as a step of runDailyOps (jobs/master-cron.ts); this entry re-exports it so it
// is also callable on its own: `node --import tsx -e "import('./src/jobs/email-outbox.ts').then(m=>m.runEmailOutbox()).then(console.log)"`.
export { processEmailOutbox as runEmailOutbox } from '../lib/email-outbox.js';
