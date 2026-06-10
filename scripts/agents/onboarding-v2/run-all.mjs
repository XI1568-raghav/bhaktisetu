// scripts/agents/onboarding-v2/run-all.mjs
import { execFileSync } from 'node:child_process';

const ROLES = ['pundit', 'temple', 'astrologer', 'gaushala', 'gurukul', 'wellness', 'store'];
const errors = [];

for (const role of ROLES) {
  try {
    execFileSync('node', [`scripts/agents/onboarding-v2/${role}.mjs`], { stdio: 'inherit' });
  } catch (e) {
    errors.push(role);
  }
}

console.log(`[onboard:run-all] ${ROLES.length - errors.length}/${ROLES.length} succeeded`);
if (errors.length) process.exit(1);
