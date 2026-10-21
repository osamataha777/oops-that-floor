/**
 * Offline level audit: `npm run validate:levels`
 * Checks every level's map shape, markers, trap refs, spawn/goal sanity.
 */
import { LEVELS } from '../src/game/levels/index';
import { validateAll, jumpSanity } from '../src/game/levels/validate';
import { solvabilityIssues } from '../src/game/levels/solve';

const issues = [...validateAll(LEVELS), ...LEVELS.flatMap(jumpSanity)];

// Trap-aware reachability: coarse BFS over standing cells.
for (const { def, solvable, visited } of solvabilityIssues(LEVELS)) {
  if (!solvable)
    issues.push({ level: def.id, message: `no path spawn→goal found (explored ${visited} states)`, fatal: false });
}

const fatal = issues.filter((i) => i.fatal);
const warns = issues.filter((i) => !i.fatal);

for (const w of warns) console.warn(`  warn  [${w.level}] ${w.message}`);
if (fatal.length) {
  for (const f of fatal) console.error(`  FAIL  [${f.level}] ${f.message}`);
  console.error(`\n${fatal.length} fatal issue(s) across ${LEVELS.length} levels`);
  process.exit(1);
}
console.log(`✓ ${LEVELS.length} levels valid (${warns.length} warning(s))`);
