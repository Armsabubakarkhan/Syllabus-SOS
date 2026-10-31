# SyllabusSOS++

**Learn your own course from someone on your own campus.**

SyllabusSOS++ is a university-scoped peer tutoring and knowledge exchange platform. Students and teachers teach one on one, credits are held until a session is confirmed, shared resources are reviewed by teachers, and teachers see which topics a class finds hard. Built for Agentathon 2026.

## Bio

SyllabusSOS++ connects students who need help with a course to classmates, seniors and teachers at the same university who know it well. Each university gets its own private space. Sessions run online, in person or by message, payment is held safely until the session is done, and a learning loop of practice checks and study missions helps students see progress. It is a working prototype with no third-party packages and a security-first build.

## Problem

Students who struggle in a course rarely have a trusted way to find help inside their own university. Learners cannot judge who is good or pay a classmate safely. Students who know a course have no way to list it or be protected if a session is not confirmed. Teachers cannot see which topics the whole class finds hard, and shared notes carry no sign that anyone has checked them.

## Features

- **Student and teacher doors.** Sign in as a Student or a Teacher. Each lands in its own space (`/student`, `/teacher`) with its own menu and dashboard. Administrators use `/admin`.
- **One space per university.** Courses, tutors, messages, friends and events never cross between universities.
- **Typed search, no dropdowns.** Subjects and courses are typed and matched live. A course that does not exist yet is added when someone offers it.
- **Peer tutoring.** Offer a course, set a price and format, request a session, accept or decline, get a meeting link (Jitsi made on the site, or a pasted Zoom, Meet or Teams link), leave a review.
- **Credits held until done.** Credits are held when you request, paid after you confirm, auto-released 72 hours after the session if nobody objects, refunded when declined, and decided by an administrator when disputed. An append-only ledger always sums to zero.
- **Syllabus and resources.** Units and topics per course. Notes, worked examples and links with labels: official teacher resource, teacher verified, community contribution, pending review.
- **Practice checks and missions.** Server-graded multiple choice with concept-by-concept feedback, and a rule-based study plan you preview and accept.
- **Difficulty radar.** Teachers see combined counts per topic. Topics with fewer than 5 responses stay hidden.
- **Community.** Private messages, friends, and a campus feed where students and teachers post events, hackathons, discussions and opportunities.
- **Senior handover.** Seniors share study advice for a course after teacher approval.
- **Administration.** Universities, users, teacher verification, disputes, withdrawals, reports and an audit log.

## Topics covered

- Peer-to-peer learning and tutoring marketplaces
- Escrow payments and double-entry ledgers
- Role-based access control and multi-tenant (per university) data isolation
- Authentication, session management and password hashing
- Web security: CSP, CSRF, CORS, XSS, rate limiting, input validation
- Learning analytics with privacy thresholds
- Rule-based recommendation (no machine learning)
- Booking state machines and race-safe updates
- Server-graded assessments
- Content moderation and review workflows
- Dependency-free Node.js development with built-in SQLite
- End-to-end testing and static security auditing
- Accessible, responsive UI with skeleton loaders

## Tech stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js 22.13 or newer, built-in modules only |
| Server | `node:http` |
| Database | `node:sqlite` (WAL, foreign keys, triggers) |
| Passwords | `crypto.scrypt` with random salt |
| Front end | Vanilla JavaScript ES modules, hand-written CSS |
| Tests | `node:test`, 33 end-to-end tests |

There are no third-party packages, so there is nothing to update and no supply chain exposure.

## Architecture

```
Browser (HTML + ES modules, DOM nodes only, strict CSP)
   |  HTTPS, JSON, HttpOnly session cookie
   v
Request gate: host check, rate limits, security headers, origin and CSRF check, schema validation
   |
Route modules: auth, campus, tutoring, wallet, social, academic, admin
   |  bound SQL parameters only
   v
SQLite (one private file, append-only credits ledger)
```

## Getting started

Requires Node.js 22.13 or newer. Nothing to install.

```bash
cp .env.example .env
# put a random value in APP_SECRET:
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
# for the demo set PAYMENTS_MODE=test and DEMO_MODE=true, and ADMIN_EMAIL / ADMIN_PASSWORD
npm run seed     # sample campuses (fictional) and the administrator
npm start        # http://localhost:3000
```

Remove `ADMIN_PASSWORD` from `.env` after the first run. To reset the demo, stop the server, delete `data/`, and run `npm run seed` again.

## Demo (about 3 minutes)

The seeded campus is Meridian Institute of Technology (fictional). Sample people have no usable passwords, so create your own accounts.

1. Home page: type a course code in the live tutor search.
2. Choose Student, create an account at Meridian. Syllabus: type "theory", open a topic, mark "I need help".
3. Take the practice check, read the result, preview a mission and accept it.
4. Find a tutor by typing a course, add test credits in Wallet, request a session.
5. Sign out, create a Teacher account. An administrator at `/admin` verifies the teacher and assigns a course.
6. As the teacher: review queue, difficulty radar, post an event.
7. Try opening the other role's page or `/admin`. Both are refused.

## Tests and checks

```bash
npm test             # 33 end-to-end tests on a throwaway database
npm run audit        # static security audit
npm run scan-secrets # working files and git history
npm run check-env    # validates configuration
```

## Security summary

- scrypt password hashing, account lockout, identical errors for known and unknown accounts
- Random 256-bit session token in an HttpOnly, SameSite=Strict cookie, only its HMAC stored
- Access control checked on the server for every route
- Schema validation, markup stripped, bound SQL parameters, no `innerHTML`
- Strict Content Security Policy, no framing, `nosniff`
- Writes need a custom header and a trusted origin, CORS never uses a wildcard
- Rate limits on every route, tighter on sign-in, registration and messages
- Secrets from the environment, `.env` and `data/` git-ignored

## Project layout

```
server/        http.js, auth.js, security.js, money.js, db.js, seed.js, routes/
public/        pages, css/, js/ (student, teacher and public views)
views/         student.html, teacher.html, admin.html
scripts/       audit.js, scan-secrets.js, check-env.js
test/          e2e.test.js
```

## Known limitations

- No AI or machine learning model is used. Missions are rule based and say so on screen.
- Credits are for demonstration. No payment provider is connected and nothing moves real money.
- No file uploads. Resources are text and https links.
- No built-in video. Sessions use a meeting link.
- Same university only. No cross-college matching.
- Tutors are matched by course, not by individual topic.
- No email verification or password reset.
- The rate limiter is in memory and resets on restart.
- The terms and privacy policy are pilot drafts and need legal review.

## Roadmap

1. Payment provider and private file store
2. Email verification and password reset
3. Optional AI assistant behind a provider adapter
4. Pilot with one university and three courses (Theory of Computation, NLP, Computer Vision), then measure resource search time, session completion and practice-check change

## Team

Add your team name and members here.

## License

Add your license here.
