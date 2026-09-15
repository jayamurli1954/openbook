import { execFileSync } from "node:child_process";

const baseSha = process.env.DCO_BASE_SHA;
const headSha = process.env.DCO_HEAD_SHA || "HEAD";

if (!baseSha) {
  console.error("DCO verification requires DCO_BASE_SHA.");
  process.exit(2);
}

const commits = execFileSync("git", ["rev-list", `${baseSha}..${headSha}`], { encoding: "utf8" })
  .trim().split(/\r?\n/).filter(Boolean);

if (commits.length === 0) {
  console.log("DCO: no commits to verify.");
  process.exit(0);
}

const signoffPattern = /^Signed-off-by:\s+.+\s+<[^<>\s]+@[^<>\s]+>\s*$/m;
const failures = [];

for (const sha of commits) {
  const message = execFileSync("git", ["show", "-s", "--format=%B", sha], { encoding: "utf8" });
  if (!signoffPattern.test(message)) {
    const subject = execFileSync("git", ["show", "-s", "--format=%s", sha], { encoding: "utf8" }).trim();
    failures.push({ sha, subject });
  }
}

if (failures.length > 0) {
  console.error("DCO verification failed: every covered commit must contain a valid Signed-off-by trailer.");
  for (const failure of failures) console.error(`- ${failure.sha.slice(0, 12)} ${failure.subject}`);
  console.error("Add your sign-off with: git commit -s -m \"Your commit message\"");
  console.error("Do not sign another person's work or add a sign-off on someone else's behalf.");
  process.exit(1);
}

console.log(`DCO verification passed: ${commits.length} commit(s) contain a valid Signed-off-by trailer.`);
