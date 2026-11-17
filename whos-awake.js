#!/usr/bin/env node

// whos-awake - A simple CLI to see which team members are likely working right now
// Zero dependencies, just Node.js
//
// Usage:
//   node whos-awake.js           Show all team members
//   node whos-awake.js awake     Show only people likely working
//   node whos-awake.js asleep    Show only people who are off/sleeping
//
// Customize the TEAM array below with your own team members.
// Find timezone identifiers at: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
//
// Features:
//   - Public holiday awareness per country (set the "country" field)
//   - Members on a public holiday are shown with reduced likelihood, just like weekends
//   - Add your own country's holidays in the getHolidays() function below

const TEAM = [
  // ┌─────────────────────────────────────────────────────────────────────┐
  // │  Add your team members here. Each entry needs:                     │
  // │    name    - Display name (or alias/handle)                        │
  // │    role    - Their role or team                                    │
  // │    city    - Location label (shown in output)                      │
  // │    tz      - IANA timezone string (e.g. "America/New_York")        │
  // │    country - ISO 3166-1 alpha-2 code (e.g. "US", "GB", "DE")      │
  // │              Used for public holiday detection. Optional.           │
  // └─────────────────────────────────────────────────────────────────────┘

  // Examples - replace with your own team:
  { name: "Alice",    role: "Frontend Lead",      city: "New York, NY",         tz: "America/New_York",    country: "US" },
  { name: "Bob",      role: "Backend Engineer",   city: "London, UK",           tz: "Europe/London",       country: "GB" },
  { name: "Charlie",  role: "DevOps",             city: "Berlin, Germany",      tz: "Europe/Berlin",       country: "DE" },
  { name: "Diana",    role: "Designer",           city: "Tokyo, Japan",         tz: "Asia/Tokyo",          country: "JP" },
  { name: "Eve",      role: "Mobile Engineer",    city: "São Paulo, Brazil",    tz: "America/Sao_Paulo",   country: "BR" },
  { name: "Frank",    role: "PM",                 city: "Sydney, Australia",    tz: "Australia/Sydney",     country: "AU" },
  { name: "Grace",    role: "QA Engineer",        city: "Mumbai, India",        tz: "Asia/Kolkata",        country: "IN" },
  { name: "Hank",     role: "SRE",                city: "San Francisco, CA",    tz: "America/Los_Angeles", country: "US" },
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

// ── Easter computation (Anonymous Gregorian algorithm) ──

function computeEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function dateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// ── Floating holiday helpers ──

// nth weekday of a month (weekday: 0=Sun, 1=Mon, ..., 6=Sat; n: 1-based)
function nthWeekday(year, month, weekday, n) {
  const first = new Date(year, month - 1, 1);
  let dayOfWeek = first.getDay();
  let diff = (weekday - dayOfWeek + 7) % 7;
  let day = 1 + diff + (n - 1) * 7;
  return dateStr(new Date(year, month - 1, day));
}

// Last weekday of a month
function lastWeekday(year, month, weekday) {
  const last = new Date(year, month, 0); // last day of month
  let dayOfWeek = last.getDay();
  let diff = (dayOfWeek - weekday + 7) % 7;
  return dateStr(new Date(year, month - 1, last.getDate() - diff));
}

// Victoria Day (Canada) - last Monday on or before May 24
function victoriaDay(year) {
  const may24 = new Date(year, 4, 24);
  const dayOfWeek = may24.getDay();
  const diff = (dayOfWeek - 1 + 7) % 7;
  return dateStr(new Date(year, 4, 24 - diff));
}

// ── Public Holidays ──
// Add your own country's holidays here! Use ISO 3166-1 alpha-2 country codes.
// Each country maps date strings ("YYYY-MM-DD") to holiday names.
// The getHolidays(year) function generates these for a given year, including
// Easter-derived movable feasts and floating holidays (nth weekday of month).

function getHolidays(year) {
  const easter = computeEaster(year);
  const goodFriday = dateStr(addDays(easter, -2));
  const easterMonday = dateStr(addDays(easter, 1));
  const easterSunday = dateStr(easter);
  const ascension = dateStr(addDays(easter, 39));   // Ascension Thursday
  const whitMonday = dateStr(addDays(easter, 50));   // Whit Monday / Pentecost Monday
  const corpusChristi = dateStr(addDays(easter, 60));

  const y = year;
  const pad = (m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return {
    // ── United States ──
    US: {
      [pad(1, 1)]:                       "New Year's Day",
      [nthWeekday(y, 1, 1, 3)]:          "MLK Day",
      [nthWeekday(y, 2, 1, 3)]:          "Presidents' Day",
      [lastWeekday(y, 5, 1)]:            "Memorial Day",
      [pad(6, 19)]:                      "Juneteenth",
      [pad(7, 4)]:                       "Independence Day",
      [nthWeekday(y, 9, 1, 1)]:          "Labor Day",
      [nthWeekday(y, 10, 1, 2)]:         "Columbus Day",
      [pad(11, 11)]:                     "Veterans Day",
      [nthWeekday(y, 11, 4, 4)]:         "Thanksgiving",
      [pad(12, 25)]:                     "Christmas Day",
    },
    // ── United Kingdom ──
    GB: {
      [pad(1, 1)]:                       "New Year's Day",
      [goodFriday]:                      "Good Friday",
      [easterMonday]:                    "Easter Monday",
      [nthWeekday(y, 5, 1, 1)]:          "Early May Bank Holiday",
      [lastWeekday(y, 5, 1)]:            "Spring Bank Holiday",
      [lastWeekday(y, 8, 1)]:            "Summer Bank Holiday",
      [pad(12, 25)]:                     "Christmas Day",
      [pad(12, 26)]:                     "Boxing Day",
    },
    // ── Germany ──
    DE: {
      [pad(1, 1)]:                       "New Year's Day",
      [goodFriday]:                      "Good Friday",
      [easterMonday]:                    "Easter Monday",
      [pad(5, 1)]:                       "Labour Day",
      [ascension]:                       "Ascension Day",
      [whitMonday]:                      "Whit Monday",
      [pad(10, 3)]:                      "German Unity Day",
      [pad(12, 25)]:                     "Christmas Day",
      [pad(12, 26)]:                     "Second Christmas Day",
    },
    // ── Japan ──
    JP: {
      [pad(1, 1)]:                       "New Year's Day",
      [nthWeekday(y, 1, 1, 2)]:          "Coming of Age Day",
      [pad(2, 11)]:                      "National Foundation Day",
      [pad(2, 23)]:                      "Emperor's Birthday",
      [pad(3, 20)]:                      "Vernal Equinox Day",
      [pad(4, 29)]:                      "Showa Day",
      [pad(5, 3)]:                       "Constitution Memorial Day",
      [pad(5, 4)]:                       "Greenery Day",
      [pad(5, 5)]:                       "Children's Day",
      [nthWeekday(y, 7, 1, 3)]:          "Marine Day",
      [pad(8, 11)]:                      "Mountain Day",
      [nthWeekday(y, 9, 1, 3)]:          "Respect for the Aged Day",
      [pad(9, 23)]:                      "Autumnal Equinox Day",
      [nthWeekday(y, 10, 1, 2)]:         "Sports Day",
      [pad(11, 3)]:                      "Culture Day",
      [pad(11, 23)]:                     "Labour Thanksgiving Day",
    },
    // ── Brazil ──
    BR: {
      [pad(1, 1)]:                       "New Year's Day",
      [dateStr(addDays(easter, -47))]:   "Carnival",
      [dateStr(addDays(easter, -46))]:   "Carnival",
      [goodFriday]:                      "Good Friday",
      [pad(4, 21)]:                      "Tiradentes Day",
      [pad(5, 1)]:                       "Labour Day",
      [corpusChristi]:                   "Corpus Christi",
      [pad(9, 7)]:                       "Independence Day",
      [pad(10, 12)]:                     "Our Lady of Aparecida",
      [pad(11, 2)]:                      "All Souls' Day",
      [pad(11, 15)]:                     "Republic Proclamation Day",
      [pad(12, 25)]:                     "Christmas Day",
    },
    // ── Australia ──
    AU: {
      [pad(1, 1)]:                       "New Year's Day",
      [pad(1, 26)]:                      "Australia Day",
      [goodFriday]:                      "Good Friday",
      [easterSunday]:                    "Easter Sunday",
      [easterMonday]:                    "Easter Monday",
      [pad(4, 25)]:                      "ANZAC Day",
      [pad(12, 25)]:                     "Christmas Day",
      [pad(12, 26)]:                     "Boxing Day",
    },
    // ── India ──
    IN: {
      [pad(1, 1)]:                       "New Year's Day",
      [pad(1, 26)]:                      "Republic Day",
      [pad(8, 15)]:                      "Independence Day",
      [pad(10, 2)]:                      "Gandhi Jayanti",
      [pad(12, 25)]:                     "Christmas Day",
    },
    // ── France ──
    FR: {
      [pad(1, 1)]:                       "New Year's Day",
      [easterMonday]:                    "Easter Monday",
      [pad(5, 1)]:                       "Labour Day",
      [pad(5, 8)]:                       "Victory in Europe Day",
      [ascension]:                       "Ascension Day",
      [whitMonday]:                      "Whit Monday",
      [pad(7, 14)]:                      "Bastille Day",
      [pad(8, 15)]:                      "Assumption of Mary",
      [pad(11, 1)]:                      "All Saints' Day",
      [pad(11, 11)]:                     "Armistice Day",
      [pad(12, 25)]:                     "Christmas Day",
    },
    // ── Canada ──
    CA: {
      [pad(1, 1)]:                       "New Year's Day",
      [goodFriday]:                      "Good Friday",
      [victoriaDay(y)]:                  "Victoria Day",
      [pad(7, 1)]:                       "Canada Day",
      [nthWeekday(y, 9, 1, 1)]:          "Labour Day",
      [nthWeekday(y, 10, 1, 2)]:         "Thanksgiving",
      [pad(12, 25)]:                     "Christmas Day",
      [pad(12, 26)]:                     "Boxing Day",
    },
    // ── Netherlands ──
    NL: {
      [pad(1, 1)]:                       "New Year's Day",
      [goodFriday]:                      "Good Friday",
      [easterMonday]:                    "Easter Monday",
      [pad(4, 27)]:                      "King's Day",
      [pad(5, 5)]:                       "Liberation Day",
      [ascension]:                       "Ascension Day",
      [whitMonday]:                      "Whit Monday",
      [pad(12, 25)]:                     "Christmas Day",
      [pad(12, 26)]:                     "Second Christmas Day",
    },
    // ── Belgium ──
    BE: {
      [pad(1, 1)]:                       "New Year's Day",
      [easterMonday]:                    "Easter Monday",
      [pad(5, 1)]:                       "Labour Day",
      [ascension]:                       "Ascension Day",
      [whitMonday]:                      "Whit Monday",
      [pad(7, 21)]:                      "Belgian National Day",
      [pad(8, 15)]:                      "Assumption of Mary",
      [pad(11, 1)]:                      "All Saints' Day",
      [pad(11, 11)]:                     "Armistice Day",
      [pad(12, 25)]:                     "Christmas Day",
    },
    // ── Denmark ──
    DK: {
      [pad(1, 1)]:                       "New Year's Day",
      [goodFriday]:                      "Good Friday",
      [easterMonday]:                    "Easter Monday",
      [ascension]:                       "Ascension Day",
      [whitMonday]:                      "Whit Monday",
      [pad(6, 5)]:                       "Constitution Day",
      [pad(12, 25)]:                     "Christmas Day",
      [pad(12, 26)]:                     "Second Christmas Day",
    },
    // ── Austria ──
    AT: {
      [pad(1, 1)]:                       "New Year's Day",
      [pad(1, 6)]:                       "Epiphany",
      [easterMonday]:                    "Easter Monday",
      [pad(5, 1)]:                       "Labour Day",
      [ascension]:                       "Ascension Day",
      [whitMonday]:                      "Whit Monday",
      [corpusChristi]:                   "Corpus Christi",
      [pad(8, 15)]:                      "Assumption of Mary",
      [pad(10, 26)]:                     "National Day",
      [pad(11, 1)]:                      "All Saints' Day",
      [pad(12, 8)]:                      "Immaculate Conception",
      [pad(12, 25)]:                     "Christmas Day",
      [pad(12, 26)]:                     "St. Stephen's Day",
    },
    // ── Portugal ──
    PT: {
      [pad(1, 1)]:                       "New Year's Day",
      [goodFriday]:                      "Good Friday",
      [easterSunday]:                    "Easter Sunday",
      [pad(4, 25)]:                      "Freedom Day",
      [pad(5, 1)]:                       "Labour Day",
      [corpusChristi]:                   "Corpus Christi",
      [pad(6, 10)]:                      "Portugal Day",
      [pad(8, 15)]:                      "Assumption of Mary",
      [pad(10, 5)]:                      "Republic Day",
      [pad(11, 1)]:                      "All Saints' Day",
      [pad(12, 1)]:                      "Restoration of Independence",
      [pad(12, 8)]:                      "Immaculate Conception",
      [pad(12, 25)]:                     "Christmas Day",
    },
    // ── Egypt ──
    EG: {
      [pad(1, 1)]:                       "New Year's Day",
      [pad(1, 7)]:                       "Coptic Christmas",
      [pad(1, 25)]:                      "Revolution Day (Jan 25)",
      [pad(4, 25)]:                      "Sinai Liberation Day",
      [pad(5, 1)]:                       "Labour Day",
      [pad(6, 30)]:                      "June 30 Revolution Day",
      [pad(7, 23)]:                      "Revolution Day (Jul 23)",
      [pad(10, 6)]:                      "Armed Forces Day",
    },
    // ── Malaysia ──
    MY: {
      [pad(1, 1)]:                       "New Year's Day",
      [pad(2, 1)]:                       "Federal Territory Day",
      [pad(5, 1)]:                       "Labour Day",
      [pad(6, 3)]:                       "Yang di-Pertuan Agong Birthday",
      [pad(8, 31)]:                      "Merdeka Day",
      [pad(9, 16)]:                      "Malaysia Day",
      [pad(12, 25)]:                     "Christmas Day",
    },
    // ── New Zealand ──
    NZ: {
      [pad(1, 1)]:                       "New Year's Day",
      [pad(1, 2)]:                       "Day after New Year's",
      [pad(2, 6)]:                       "Waitangi Day",
      [goodFriday]:                      "Good Friday",
      [easterMonday]:                    "Easter Monday",
      [pad(4, 25)]:                      "ANZAC Day",
      [nthWeekday(y, 6, 1, 1)]:          "Queen's Birthday",
      [nthWeekday(y, 10, 1, 4)]:         "Labour Day",
      [pad(12, 25)]:                     "Christmas Day",
      [pad(12, 26)]:                     "Boxing Day",
    },
    // ── Sweden ──
    SE: {
      [pad(1, 1)]:                       "New Year's Day",
      [pad(1, 6)]:                       "Epiphany",
      [goodFriday]:                      "Good Friday",
      [easterMonday]:                    "Easter Monday",
      [pad(5, 1)]:                       "May Day",
      [ascension]:                       "Ascension Day",
      [pad(6, 6)]:                       "National Day of Sweden",
      [pad(12, 25)]:                     "Christmas Day",
      [pad(12, 26)]:                     "Second Christmas Day",
    },
    // ── Norway ──
    NO: {
      [pad(1, 1)]:                       "New Year's Day",
      [goodFriday]:                      "Good Friday",
      [easterMonday]:                    "Easter Monday",
      [pad(5, 1)]:                       "Labour Day",
      [pad(5, 17)]:                      "Constitution Day",
      [ascension]:                       "Ascension Day",
      [whitMonday]:                      "Whit Monday",
      [pad(12, 25)]:                     "Christmas Day",
      [pad(12, 26)]:                     "Second Christmas Day",
    },
    // ── Finland ──
    FI: {
      [pad(1, 1)]:                       "New Year's Day",
      [pad(1, 6)]:                       "Epiphany",
      [goodFriday]:                      "Good Friday",
      [easterMonday]:                    "Easter Monday",
      [pad(5, 1)]:                       "May Day",
      [ascension]:                       "Ascension Day",
      [pad(12, 6)]:                      "Independence Day",
      [pad(12, 25)]:                     "Christmas Day",
      [pad(12, 26)]:                     "Second Christmas Day",
    },
    // ── Spain ──
    ES: {
      [pad(1, 1)]:                       "New Year's Day",
      [pad(1, 6)]:                       "Epiphany",
      [goodFriday]:                      "Good Friday",
      [pad(5, 1)]:                       "Labour Day",
      [pad(8, 15)]:                      "Assumption of Mary",
      [pad(10, 12)]:                     "National Day of Spain",
      [pad(11, 1)]:                      "All Saints' Day",
      [pad(12, 6)]:                      "Constitution Day",
      [pad(12, 8)]:                      "Immaculate Conception",
      [pad(12, 25)]:                     "Christmas Day",
    },
    // ── Italy ──
    IT: {
      [pad(1, 1)]:                       "New Year's Day",
      [pad(1, 6)]:                       "Epiphany",
      [easterMonday]:                    "Easter Monday",
      [pad(4, 25)]:                      "Liberation Day",
      [pad(5, 1)]:                       "Labour Day",
      [pad(6, 2)]:                       "Republic Day",
      [pad(8, 15)]:                      "Assumption of Mary",
      [pad(11, 1)]:                      "All Saints' Day",
      [pad(12, 8)]:                      "Immaculate Conception",
      [pad(12, 25)]:                     "Christmas Day",
      [pad(12, 26)]:                     "St. Stephen's Day",
    },
    // ── Ireland ──
    IE: {
      [pad(1, 1)]:                       "New Year's Day",
      [nthWeekday(y, 2, 1, 1)]:          "St. Brigid's Day",
      [pad(3, 17)]:                      "St. Patrick's Day",
      [easterMonday]:                    "Easter Monday",
      [nthWeekday(y, 5, 1, 1)]:          "May Bank Holiday",
      [nthWeekday(y, 6, 1, 1)]:          "June Bank Holiday",
      [nthWeekday(y, 8, 1, 1)]:          "August Bank Holiday",
      [lastWeekday(y, 10, 1)]:           "October Bank Holiday",
      [pad(12, 25)]:                     "Christmas Day",
      [pad(12, 26)]:                     "St. Stephen's Day",
    },
    // ── Singapore ──
    SG: {
      [pad(1, 1)]:                       "New Year's Day",
      [goodFriday]:                      "Good Friday",
      [pad(5, 1)]:                       "Labour Day",
      [pad(8, 9)]:                       "National Day",
      [pad(12, 25)]:                     "Christmas Day",
    },
    // ── South Korea ──
    KR: {
      [pad(1, 1)]:                       "New Year's Day",
      [pad(3, 1)]:                       "Independence Movement Day",
      [pad(5, 5)]:                       "Children's Day",
      [pad(6, 6)]:                       "Memorial Day",
      [pad(8, 15)]:                      "Liberation Day",
      [pad(10, 3)]:                      "National Foundation Day",
      [pad(10, 9)]:                      "Hangul Day",
      [pad(12, 25)]:                     "Christmas Day",
    },
    // ── Philippines ──
    PH: {
      [pad(1, 1)]:                       "New Year's Day",
      [goodFriday]:                      "Good Friday",
      [pad(4, 9)]:                       "Araw ng Kagitingan",
      [pad(5, 1)]:                       "Labour Day",
      [pad(6, 12)]:                      "Independence Day",
      [lastWeekday(y, 8, 1)]:            "National Heroes Day",
      [pad(11, 30)]:                     "Bonifacio Day",
      [pad(12, 25)]:                     "Christmas Day",
      [pad(12, 30)]:                     "Rizal Day",
    },
    // ── South Africa ──
    ZA: {
      [pad(1, 1)]:                       "New Year's Day",
      [pad(3, 21)]:                      "Human Rights Day",
      [goodFriday]:                      "Good Friday",
      [easterMonday]:                    "Family Day",
      [pad(4, 27)]:                      "Freedom Day",
      [pad(5, 1)]:                       "Workers' Day",
      [pad(6, 16)]:                      "Youth Day",
      [pad(8, 9)]:                       "National Women's Day",
      [pad(9, 24)]:                      "Heritage Day",
      [pad(12, 16)]:                     "Day of Reconciliation",
      [pad(12, 25)]:                     "Christmas Day",
      [pad(12, 26)]:                     "Day of Goodwill",
    },
  };
}

// ── Holiday detection ──

// Check if today is a public holiday for a given tz/country
function isPublicHoliday(tz, country) {
  if (!country) return null;

  const now = new Date();
  const localDate = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  const year = localDate.getFullYear();
  const m = String(localDate.getMonth() + 1).padStart(2, "0");
  const d = String(localDate.getDate()).padStart(2, "0");
  const today = `${year}-${m}-${d}`;

  const holidays = getHolidays(year);
  const countryHolidays = holidays[country];
  if (!countryHolidays) return null;

  return countryHolidays[today] || null;
}

// ── Likelihood ──

function likelihood(member) {
  const tz = member.tz;
  const country = member.country;
  const hour = getHour(tz);
  const dow = getDow(tz);
  const weekend = dow === "Sat" || dow === "Sun";
  const holiday = isPublicHoliday(tz, country);

  if (weekend) {
    if (hour >= 10 && hour <= 16) return { pct: 20, label: "Weekend - maybe online", holiday: null };
    return { pct: 5, label: "Weekend - very unlikely", holiday: null };
  }

  if (holiday) {
    if (hour >= 10 && hour <= 16) return { pct: 20, label: `Holiday (${holiday}) - maybe online`, holiday };
    return { pct: 5, label: `Holiday (${holiday}) - very unlikely`, holiday };
  }

  if (hour >= 9 && hour <= 11)  return { pct: 95, label: "Core hours - almost certainly working", holiday: null };
  if (hour >= 12 && hour <= 13) return { pct: 70, label: "Lunch time - probably around", holiday: null };
  if (hour >= 14 && hour <= 17) return { pct: 90, label: "Core hours - very likely working", holiday: null };
  if (hour >= 8 && hour < 9)    return { pct: 60, label: "Early start - might be on", holiday: null };
  if (hour > 17 && hour <= 18)  return { pct: 50, label: "End of day - winding down", holiday: null };
  if (hour > 18 && hour <= 20)  return { pct: 25, label: "Evening - unlikely", holiday: null };
  if (hour > 20 && hour <= 23)  return { pct: 10, label: "Late night - very unlikely", holiday: null };
  if (hour >= 0 && hour < 6)    return { pct: 2,  label: "Sleeping", holiday: null };
  if (hour >= 6 && hour < 8)    return { pct: 15, label: "Very early - probably not yet", holiday: null };

  return { pct: 0, label: "Unknown", holiday: null };
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
  const magenta = "\x1b[35m";

  console.log();
  console.log(`${bold}${cyan}  WHO'S AWAKE?${reset}`);
  console.log(`${dim}  Your time: ${myTime} (${myTz})${reset}`);

  // Collect active holidays across all team members
  const activeHolidays = {};
  for (const m of TEAM) {
    const h = isPublicHoliday(m.tz, m.country);
    if (h) {
      if (!activeHolidays[h]) activeHolidays[h] = new Set();
      activeHolidays[h].add(m.country);
    }
  }
  if (Object.keys(activeHolidays).length > 0) {
    const parts = Object.entries(activeHolidays).map(
      ([name, countries]) => `${name} (${[...countries].sort().join(", ")})`
    );
    console.log(`${magenta}  Public holidays today: ${parts.join("; ")}${reset}`);
  }

  console.log();

  const arg = process.argv[2]?.toLowerCase();
  let filtered = TEAM;
  if (arg === "awake" || arg === "online") {
    filtered = TEAM.filter(m => likelihood(m).pct >= 50);
  } else if (arg === "asleep" || arg === "offline") {
    filtered = TEAM.filter(m => likelihood(m).pct < 20);
  }

  const sorted = [...filtered].sort((a, b) => likelihood(b).pct - likelihood(a).pct);

  const nameW = 16;
  const roleW = 22;
  const cityW = 22;
  const timeW = 12;

  console.log(
    `  ${dim}${"Name".padEnd(nameW)}${"Role".padEnd(roleW)}${"Location".padEnd(cityW)}${"Their Time".padEnd(timeW)}  ${"Likelihood".padEnd(12)}  Status${reset}`
  );
  console.log(`  ${dim}${"─".repeat(nameW + roleW + cityW + timeW + 28)}${reset}`);

  for (const m of sorted) {
    const { pct, label, holiday } = likelihood(m);
    const localTime = getLocalTime(m.tz);
    const dot = statusDot(pct);
    const holidayTag = holiday ? ` ${magenta}[${holiday}]${reset}` : "";

    const name = m.name.length > nameW - 1 ? m.name.slice(0, nameW - 2) + "…" : m.name;
    const role = m.role.length > roleW - 1 ? m.role.slice(0, roleW - 2) + "…" : m.role;
    const city = m.city.length > cityW - 1 ? m.city.slice(0, cityW - 2) + "…" : m.city;

    console.log(
      `  ${dot} ${white}${name.padEnd(nameW)}${reset}${dim}${role.padEnd(roleW)}${city.padEnd(cityW)}${reset}${cyan}${localTime.padEnd(timeW)}${reset}  ${bar(pct)} ${dim}${String(pct).padStart(3)}%  ${label}${reset}${holidayTag}`
    );
  }

  console.log();
  console.log(`${dim}  Legend: ${"\x1b[32m●\x1b[0m"} Likely working  ${"\x1b[33m●\x1b[0m"} Maybe  ${"\x1b[91m●\x1b[0m"} Unlikely  ${"\x1b[90m○\x1b[0m"} Sleeping/Off  ${magenta}[Holiday]${reset} Public holiday${reset}`);
  console.log(`${dim}  Usage:  whos-awake [awake|asleep] - filter by status${reset}`);
  console.log();
}

run();
