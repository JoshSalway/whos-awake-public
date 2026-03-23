#!/usr/bin/env node

// whos-awake - A simple CLI to see which team members are likely working right now
// Zero dependencies, just Node.js
//
// Usage:
//   node whos-awake-public.js           Show all team members
//   node whos-awake-public.js awake     Show only people likely working
//   node whos-awake-public.js asleep    Show only people who are off/sleeping
//
// Customize the TEAM array below with your own team members.
// Find timezone identifiers at: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones

const TEAM = [
  // ┌─────────────────────────────────────────────────────────────────────┐
  // │  Add your team members here. Each entry needs:                     │
  // │    name   - Display name (or alias/handle)                         │
  // │    role   - Their role or team                                     │
  // │    city   - Location label (shown in output)                       │
  // │    tz     - IANA timezone string (e.g. "America/New_York")         │
  // └─────────────────────────────────────────────────────────────────────┘

  // Examples - replace with your own team:
  { name: "Alice",    role: "Frontend Lead",      city: "New York, NY",         tz: "America/New_York" },
  { name: "Bob",      role: "Backend Engineer",   city: "London, UK",           tz: "Europe/London" },
  { name: "Charlie",  role: "DevOps",             city: "Berlin, Germany",      tz: "Europe/Berlin" },
  { name: "Diana",    role: "Designer",           city: "Tokyo, Japan",         tz: "Asia/Tokyo" },
  { name: "Eve",      role: "Mobile Engineer",    city: "São Paulo, Brazil",    tz: "America/Sao_Paulo" },
  { name: "Frank",    role: "PM",                 city: "Sydney, Australia",    tz: "Australia/Sydney" },
  { name: "Grace",    role: "QA Engineer",        city: "Mumbai, India",        tz: "Asia/Kolkata" },
  { name: "Hank",     role: "SRE",                city: "San Francisco, CA",    tz: "America/Los_Angeles" },
];

// ── Helpers (no need to edit below) ──

function getLocalTime(tz) {
  return new Date().toLocaleString("en-GB", {
    timeZone: tz,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getHour(tz) {
  return parseInt(
    new Date().toLocaleString("en-US", { timeZone: tz, hour: "numeric", hour12: false }),
    10
  );
}

function getDow(tz) {
  return new Date().toLocaleString("en-US", { timeZone: tz, weekday: "short" });
}

function likelihood(tz) {
  const hour = getHour(tz);
  const dow = getDow(tz);
  const weekend = dow === "Sat" || dow === "Sun";

  if (weekend) {
    if (hour >= 10 && hour <= 16) return { pct: 20, label: "Weekend - maybe online" };
    return { pct: 5, label: "Weekend - very unlikely" };
  }

  if (hour >= 9 && hour <= 11)  return { pct: 95, label: "Core hours - almost certainly working" };
  if (hour >= 12 && hour <= 13) return { pct: 70, label: "Lunch time - probably around" };
  if (hour >= 14 && hour <= 17) return { pct: 90, label: "Core hours - very likely working" };
  if (hour >= 8 && hour < 9)    return { pct: 60, label: "Early start - might be on" };
  if (hour > 17 && hour <= 18)  return { pct: 50, label: "End of day - winding down" };
  if (hour > 18 && hour <= 20)  return { pct: 25, label: "Evening - unlikely" };
  if (hour > 20 && hour <= 23)  return { pct: 10, label: "Late night - very unlikely" };
  if (hour >= 0 && hour < 6)    return { pct: 2,  label: "Sleeping" };
  if (hour >= 6 && hour < 8)    return { pct: 15, label: "Very early - probably not yet" };

  return { pct: 0, label: "Unknown" };
}

function statusDot(pct) {
  if (pct >= 80) return "\x1b[32m●\x1b[0m";
  if (pct >= 50) return "\x1b[33m●\x1b[0m";
  if (pct >= 20) return "\x1b[91m●\x1b[0m";
  return "\x1b[90m○\x1b[0m";
}

function bar(pct) {
  const filled = Math.round(pct / 10);
  const empty = 10 - filled;
  const green = "\x1b[32m";
  const yellow = "\x1b[33m";
  const red = "\x1b[91m";
  const grey = "\x1b[90m";
  const reset = "\x1b[0m";
  let color = pct >= 70 ? green : pct >= 40 ? yellow : red;
  if (pct < 10) color = grey;
  return color + "█".repeat(filled) + grey + "░".repeat(empty) + reset;
}

// ── Main ──

function run() {
  const myTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const myTime = new Date().toLocaleString("en-GB", {
    timeZone: myTz,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const bold = "\x1b[1m";
  const dim = "\x1b[2m";
  const reset = "\x1b[0m";
  const cyan = "\x1b[36m";
  const white = "\x1b[37m";

  console.log();
  console.log(`${bold}${cyan}  WHO'S AWAKE?${reset}`);
  console.log(`${dim}  Your time: ${myTime} (${myTz})${reset}`);
  console.log();

  const arg = process.argv[2]?.toLowerCase();
  let filtered = TEAM;
  if (arg === "awake" || arg === "online") {
    filtered = TEAM.filter(m => likelihood(m.tz).pct >= 50);
  } else if (arg === "asleep" || arg === "offline") {
    filtered = TEAM.filter(m => likelihood(m.tz).pct < 20);
  }

  const sorted = [...filtered].sort((a, b) => likelihood(b.tz).pct - likelihood(a.tz).pct);

  const nameW = 16;
  const roleW = 22;
  const cityW = 22;
  const timeW = 12;

  console.log(
    `  ${dim}${"Name".padEnd(nameW)}${"Role".padEnd(roleW)}${"Location".padEnd(cityW)}${"Their Time".padEnd(timeW)}  ${"Likelihood".padEnd(12)}  Status${reset}`
  );
  console.log(`  ${dim}${"─".repeat(nameW + roleW + cityW + timeW + 28)}${reset}`);

  for (const m of sorted) {
    const { pct, label } = likelihood(m.tz);
    const localTime = getLocalTime(m.tz);
    const dot = statusDot(pct);

    const name = m.name.length > nameW - 1 ? m.name.slice(0, nameW - 2) + "…" : m.name;
    const role = m.role.length > roleW - 1 ? m.role.slice(0, roleW - 2) + "…" : m.role;
    const city = m.city.length > cityW - 1 ? m.city.slice(0, cityW - 2) + "…" : m.city;

    console.log(
      `  ${dot} ${white}${name.padEnd(nameW)}${reset}${dim}${role.padEnd(roleW)}${city.padEnd(cityW)}${reset}${cyan}${localTime.padEnd(timeW)}${reset}  ${bar(pct)} ${dim}${String(pct).padStart(3)}%  ${label}${reset}`
    );
  }

  console.log();
  console.log(`${dim}  Legend: ${"\x1b[32m●\x1b[0m"} Likely working  ${"\x1b[33m●\x1b[0m"} Maybe  ${"\x1b[91m●\x1b[0m"} Unlikely  ${"\x1b[90m○\x1b[0m"} Sleeping/Off${reset}`);
  console.log(`${dim}  Usage:  whos-awake [awake|asleep]  — filter by status${reset}`);
  console.log();
}

run();
