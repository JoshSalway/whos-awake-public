# whos-awake

A zero-dependency Node.js CLI that tells you which of your team members are likely working right now, based on their timezone.

Built for distributed/remote teams who need a quick glance at who's around.

## Example

```
  WHO'S AWAKE?
  Your time: Monday, 23 March 2026 at 14:25 (Australia/Brisbane)

  Name            Role                  Location              Their Time    Likelihood    Status
  ──────────────────────────────────────────────────────────────────────────────────────────────────
  ● Grace          QA Engineer           Mumbai, India         Mon 09:55     ██████████  95%  Core hours
  ● Frank          PM                    Sydney, Australia     Mon 15:25     █████████░  90%  Core hours
  ○ Alice          Frontend Lead         New York, NY          Mon 00:25     ░░░░░░░░░░   2%  Sleeping
```

## Install

```bash
# Clone and link globally
git clone https://github.com/JoshSalway/whos-awake-public.git
cd whos-awake-public
npm link

# Or just run directly
node whos-awake.js
```

## Setup

Edit the `TEAM` array in `whos-awake.js` with your own team members:

```js
const TEAM = [
  { name: "Alice",  role: "Frontend Lead",  city: "New York, NY",  tz: "America/New_York" },
  { name: "Bob",    role: "Backend",         city: "London, UK",    tz: "Europe/London" },
];
```

Find timezone identifiers at: [List of tz database time zones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

## Usage

```bash
whos-awake           # Show all team members sorted by likelihood
whos-awake awake     # Only show people likely working (50%+)
whos-awake asleep    # Only show people who are off/sleeping
```

## How it works

- Assumes standard 9-5 weekday working hours
- Adjusts likelihood for lunch breaks, early/late hours, and weekends
- Uses your system's IANA timezone database (via `Intl`) — no API calls, fully offline
- Color-coded output: 🟢 likely working, 🟡 maybe, 🔴 unlikely, ⚫ sleeping/off

## License

MIT
