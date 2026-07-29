import { readdirSync, readFileSync } from "node:fs";
import { kill } from "node:process";

const killed = [];
for (const pid of readdirSync("/proc")) {
  if (!/^\d+$/.test(pid)) continue;
  let cmd = "";
  try {
    cmd = readFileSync(`/proc/${pid}/cmdline`, "utf8");
  } catch {
    continue;
  }
  const flat = cmd.replace(/\0/g, " ");
  if (
    flat.includes("/node_modules/vite/") ||
    flat.includes("vite.js") ||
    flat.includes("node_modules/.bin/vite")
  ) {
    try {
      kill(Number(pid), "SIGKILL");
      killed.push({ pid, flat: flat.slice(0, 120) });
    } catch {
      /* ignore */
    }
  }
}
console.log(JSON.stringify({ killed }, null, 2));
