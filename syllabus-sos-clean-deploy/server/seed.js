import crypto from 'node:crypto';
import { config, result } from './config.js';
import { get, run } from './db.js';
import { hashPassword } from './security.js';
import { createAdmin } from './routes/auth.js';

if (result.problems.length) {
  for (const p of result.problems) console.error(`Config problem: ${p}`);
  process.exit(1);
}

/* Sample campuses are fictional and flagged is_demo. Their sample people have
   unusable random passwords, so nobody can sign in as them. */

const CAMPUSES = [
  {
    slug: 'meridian-institute', name: 'Meridian Institute of Technology', city: 'Bengaluru', domain: 'meridian.example', demo: 1,
    courses: [
      ['CS201', 'Data Structures', 'Computer Science'],
      ['CS301', 'Theory of Computation', 'Computer Science'],
      ['CS412', 'Natural Language Processing', 'Computer Science'],
      ['CS415', 'Computer Vision', 'Computer Science'],
      ['MA201', 'Engineering Mathematics III', 'Mathematics'],
      ['EC305', 'Digital Signal Processing', 'Electronics'],
    ],
    people: [
      ['Ananya Rao', 'student', 'Computer Science', 4],
      ['Rohan Iyer', 'student', 'Computer Science', 3],
      ['Dr. Meera Nair', 'teacher', 'Computer Science', null],
      ['Karthik Menon', 'student', 'Electronics', 4],
      ['Divya Shetty', 'student', 'Computer Science', 3],
      ['Farhan Qureshi', 'student', 'Computer Science', 3],
      ['Lakshmi Pillai', 'student', 'Computer Science', 3],
      ['Sanjay Kulkarni', 'student', 'Computer Science', 3],
      ['Tanvi Joshi', 'student', 'Computer Science', 3],
    ],
    offers: [
      [0, 'CS301', 'NFA to DFA, pumping lemma and Turing machines, taught by solving past papers', 'Weekly problem sets, exam question patterns, and a short check at the end of each session.', 150, 'online', 'complete', 'Weekday evenings after 6 pm'],
      [0, 'CS412', 'NLP from tokenisation to transformers, explained for the exam and the project', 'We cover your syllabus units in order and build one small working example together.', 200, 'online', 'strong', 'Weekends'],
      [1, 'CS201', 'Trees, graphs and complexity with worked examples', 'Bring any practice sheet. We solve it together on a shared screen.', 100, 'online', 'complete', 'Tuesday and Thursday evenings'],
      [2, 'CS301', 'One on one doubt sessions for Theory of Computation', 'Small group or single learner. Bring the unit you find hardest.', 350, 'in_person', 'complete', 'Office hours, by appointment'],
      [3, 'EC305', 'Signals, Z transforms and filters without the panic', 'Step by step derivations and solved numericals from the last five years of papers.', 120, 'chat', 'strong', 'Any evening, replies within a day'],
      [1, 'MA201', 'Laplace and Fourier transforms, solved in the exam format', 'Practice first, theory only when you need it.', 0, 'online', 'strong', 'Sunday mornings, free for juniors'],
    ],
    posts: [
      ['hackathon', 'Inter-department hackathon planning meeting (sample post)', 'Sample content. Teams of up to four, 24 hours, problem statements from campus clubs.', 12],
      ['discussion', 'Best way to revise Theory of Computation in one week? (sample post)', 'Sample content. Share what worked for you.', null],
      ['event', 'Seniors to juniors handover talk for the Computer Science department (sample post)', 'Sample content. Seniors share notes and lessons from their final year.', 20],
    ],
  },
  {
    slug: 'cauvery-state-university', name: 'Cauvery State University', city: 'Mysuru', domain: 'cauvery.example', demo: 1,
    courses: [
      ['PHY101', 'Engineering Physics', 'Physics'],
      ['ECO101', 'Principles of Microeconomics', 'Economics'],
      ['ME210', 'Thermodynamics', 'Mechanical'],
    ],
    people: [
      ['Sneha Gowda', 'student', 'Mechanical', 3],
      ['Imran Pasha', 'student', 'Economics', 4],
    ],
    offers: [
      [0, 'ME210', 'Thermodynamics cycles and entropy, with numerical practice', 'Rankine, Otto and Diesel cycles solved step by step.', 130, 'online', 'complete', 'Weekday evenings'],
      [1, 'ECO101', 'Microeconomics: demand, cost curves and market structures', 'Graph drawing practice and case questions.', 80, 'in_person', 'strong', 'Library discussion room, afternoons'],
    ],
    posts: [
      ['opportunity', 'Peer mentor applications open this semester (sample post)', 'Sample content. Apply through your department office.', null],
    ],
  },
  { slug: 'rv-university', name: 'RV University', city: 'Bengaluru', domain: null, demo: 0, courses: [], people: [], offers: [], posts: [] },
];

const TOPICS = {
  'meridian-institute': {
    CS301: [
      [1, 'Finite automata', 'Deterministic finite automata (DFA)', 'Define a DFA and trace its behaviour on an input string.'],
      [1, 'Finite automata', 'Nondeterministic finite automata (NFA)', 'Explain how an NFA differs from a DFA and trace its possible paths.'],
      [1, 'Finite automata', 'NFA to DFA conversion', 'Convert an NFA to an equivalent DFA using the subset construction.'],
      [2, 'Regular languages', 'Pumping lemma for regular languages', 'Use the pumping lemma to show a language is not regular.'],
      [3, 'Computability', 'Turing machines', 'Describe a Turing machine and design one for a simple language.'],
    ],
  },
  'cauvery-state-university': {
    ME210: [
      [1, 'Cycles', 'Rankine cycle', 'Compute the efficiency of an ideal Rankine cycle.'],
    ],
  },
};

const QUIZ = {
  'NFA to DFA conversion': [
    ['Subset construction', 'In the subset construction, what does each state of the resulting DFA represent?', ['One state of the NFA', 'A set of NFA states', 'An input symbol', 'A transition label'], 1, 'Each DFA state stands for the set of NFA states the NFA could be in at that point.'],
    ['Subset construction', 'An NFA has n states. What is the largest number of states the equivalent DFA can need?', ['n', '2n', '2 to the power n', 'n squared'], 2, 'There are 2 to the power n subsets of n states, so the DFA may need that many.'],
    ['Epsilon closure', 'What does the epsilon closure of an NFA state contain?', ['Only the state itself', 'Every state reachable using only epsilon moves, including itself', 'All accepting states', 'Every state in the NFA'], 1, 'The closure is the state plus everything reachable by epsilon transitions alone.'],
    ['Epsilon closure', 'When is a DFA state accepting after the subset construction?', ['When it contains the NFA start state', 'When it contains at least one NFA accepting state', 'When it contains every NFA state', 'When it has no outgoing transitions'], 1, 'A DFA state accepts if its set contains any accepting NFA state.'],
  ],
  'Nondeterministic finite automata (NFA)': [
    ['NFA behaviour', 'How does an NFA differ from a DFA?', ['It has no start state', 'It may have several transitions on the same symbol from one state', 'It cannot accept any strings', 'It always has fewer states'], 1, 'An NFA can branch: several moves, or none, on the same symbol.'],
    ['NFA behaviour', 'When does an NFA accept a string?', ['If every path ends in an accepting state', 'If at least one path ends in an accepting state', 'If it uses epsilon moves', 'If it ends in the start state'], 1, 'One accepting path is enough.'],
  ],
};

const unusable = await hashPassword(crypto.randomBytes(32).toString('hex'));
let created = 0;

for (const c of CAMPUSES) {
  let uni = get('SELECT id FROM universities WHERE slug = ?', c.slug);
  if (!uni) {
    run("INSERT INTO universities (slug, name, city, email_domain, status, is_demo) VALUES (?, ?, ?, ?, 'approved', ?)", c.slug, c.name, c.city, c.domain, c.demo);
    uni = get('SELECT id FROM universities WHERE slug = ?', c.slug);
    created++;
  } else {
    continue;
  }
  const courseIds = {};
  for (const [code, name, dept] of c.courses) {
    run('INSERT INTO courses (university_id, code, name, department) VALUES (?, ?, ?, ?)', uni.id, code, name, dept);
    courseIds[code] = get('SELECT id FROM courses WHERE university_id = ? AND code = ?', uni.id, code).id;
  }
  const userIds = [];
  c.people.forEach(([name, role, dept, year], i) => {
    const email = `sample${i + 1}@${c.domain}`;
    run(
      'INSERT INTO users (email, name, pw_hash, role, university_id, department, year_of_study, verified, domain_match) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)',
      email, name, unusable, role, uni.id, dept, year
    );
    userIds.push(get('SELECT id FROM users WHERE email = ?', email).id);
  });
  for (const [who, code, headline, description, price, mode, mastery, availability] of c.offers) {
    run(
      `INSERT INTO offers (user_id, university_id, course_id, headline, description, price_per_hour, mode, availability, mastery)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      userIds[who], uni.id, courseIds[code], headline, description, price, mode, availability, mastery
    );
  }
  const topicIds = {};
  for (const [code, list] of Object.entries(TOPICS[c.slug] || {})) {
    for (const [unitNo, unitName, name, objective] of list) {
      run('INSERT INTO topics (course_id, unit_no, unit_name, name, objective) VALUES (?, ?, ?, ?, ?)', courseIds[code], unitNo, unitName, name, objective);
      topicIds[name] = { id: get('SELECT id FROM topics WHERE course_id = ? AND name = ?', courseIds[code], name).id, course: courseIds[code] };
    }
  }
  for (const [topicName, qs] of Object.entries(QUIZ)) {
    if (!topicIds[topicName]) continue;
    for (const [concept, prompt, options, correct, explanation] of qs) {
      run('INSERT INTO quiz_questions (topic_id, concept, prompt, options, correct_index, explanation) VALUES (?, ?, ?, ?, ?, ?)', topicIds[topicName].id, concept, prompt, JSON.stringify(options), correct, explanation);
    }
  }
  if (c.slug === 'meridian-institute') {
    const teacherId = userIds[2];
    run('INSERT INTO course_teachers (course_id, user_id) VALUES (?, ?)', courseIds.CS301, teacherId);
    const res = [
      ['NFA to DFA conversion', 'Subset construction explained step by step', 'explanation', 'Start with the NFA start state and take its epsilon closure. That set is the start state of the DFA.\n\nFor each new set and each input symbol, collect every NFA state reachable on that symbol, then take the epsilon closure of the result. If the set is new, add it as a DFA state.\n\nRepeat until no new sets appear. Any set that contains an accepting NFA state is an accepting DFA state.', 'official', teacherId],
      ['NFA to DFA conversion', 'Worked example: NFA over {a, b} ending in ab', 'worked_example', 'NFA states q0, q1, q2. q0 loops on a and b, q0 goes to q1 on a, q1 goes to q2 on b, q2 accepts.\n\nStart {q0}. On a: {q0, q1}. On b: {q0}. From {q0, q1}: on a gives {q0, q1}; on b gives {q0, q2}. From {q0, q2}: on a gives {q0, q1}; on b gives {q0}.\n\nAccepting DFA state: {q0, q2}. Four DFA states in total are not needed here, three are enough.', 'faculty_verified', userIds[1]],
      ['NFA to DFA conversion', 'My revision checklist for NFA to DFA', 'revision', 'Draw the NFA. Write the epsilon closure of each state. Build the transition table row by row. Mark accepting sets. Redraw the DFA neatly. Check three strings by hand.', 'community', userIds[0]],
      ['NFA to DFA conversion', 'Quick tips from my notebook', 'notes', 'Most mistakes come from forgetting the epsilon closure after a move. Always close, then move, then close again.', 'pending', userIds[3]],
      ['Deterministic finite automata (DFA)', 'DFA definition and tracing practice', 'practice', 'Define the five parts of a DFA. Trace the strings 0110, 1011 and 0000 on the machine in your lecture notes and say whether each is accepted.', 'official', teacherId],
    ];
    for (const [topicName, title, kind, body, status, uploader] of res) {
      const rr = run(
        `INSERT INTO resources (university_id, course_id, topic_id, uploader_id, title, kind, body, source, status, reviewed_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Sample content for the demo', ?, ?)`,
        uni.id, topicIds[topicName].course, topicIds[topicName].id, uploader, title, kind, body, status, status === 'pending' || status === 'community' ? null : teacherId
      );
      run('INSERT INTO resource_versions (resource_id, version, title, body) VALUES (?, 1, ?, ?)', Number(rr.lastInsertRowid), title, body);
    }
    const mix = ['needs_help', 'needs_help', 'needs_practice', 'needs_help', 'understood', 'needs_practice', 'needs_help', 'understood', 'needs_practice'];
    userIds.forEach((uid, i) => {
      if (i === 2) return;
      run('INSERT INTO difficulty_reports (user_id, topic_id, status) VALUES (?, ?, ?)', uid, topicIds['NFA to DFA conversion'].id, mix[i % mix.length]);
      run('INSERT INTO difficulty_reports (user_id, topic_id, status) VALUES (?, ?, ?)', uid, topicIds['Nondeterministic finite automata (NFA)'].id, i % 3 === 0 ? 'needs_practice' : 'understood');
    });
    run(
      "INSERT INTO handovers (university_id, course_id, author_id, title, body, show_author, status, reviewed_by) VALUES (?, ?, ?, ?, ?, 1, 'approved', ?)",
      uni.id, courseIds.CS301, userIds[0], 'Theory of Computation: how I revised in the last two weeks',
      'Week one: finite automata and regular languages, solving two past papers questions per day without notes. Week two: the pumping lemma, then Turing machines. Do the pumping lemma proofs aloud as if teaching a friend; if you get stuck, that is the part to revisit. Sample content for the demo.', teacherId
    );
  }
  for (const [kind, title, body, days] of c.posts) {
    const eventAt = days ? new Date(Date.now() + days * 86400000).toISOString() : null;
    run('INSERT INTO posts (university_id, user_id, kind, title, body, event_at) VALUES (?, ?, ?, ?, ?, ?)', uni.id, userIds[0], kind, title, body, eventAt);
  }
}

console.log(created ? `Seeded ${created} campus(es).` : 'Sample campuses already exist. Nothing to do.');

if (config.adminEmail && config.adminPassword) {
  const r = await createAdmin(config.adminEmail, config.adminPassword);
  console.log(r.created ? 'Administrator account created. Remove ADMIN_PASSWORD from your environment now.' : 'Administrator account already exists.');
} else {
  console.log('No ADMIN_EMAIL and ADMIN_PASSWORD set, so no administrator was created.');
}
