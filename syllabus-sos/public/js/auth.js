import { h, clear, get, post, field, showFieldErrors, footer, ApiError } from './common.js';
import { pickInput } from './app-ui.js';

document.getElementById('foot').replaceWith(footer());

const params = new URLSearchParams(location.search);
const panel = document.getElementById('panel');
const tabs = { login: document.getElementById('tab-login'), register: document.getElementById('tab-register') };

let portal = params.get('as') === 'teacher' ? 'teacher' : 'student';
const picks = { student: document.getElementById('pick-student'), teacher: document.getElementById('pick-teacher') };
let tab = 'login';

/* Each role lands on its own pages. */
const homeFor = (role) => (role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : '/student');

function setPortal(name) {
  portal = name;
  for (const [k, el] of Object.entries(picks)) el.setAttribute('aria-pressed', String(k === name));
  document.title = `${name === 'teacher' ? 'Teacher' : 'Student'} ${tab === 'login' ? 'sign in' : 'sign up'}, SyllabusSOS++`;
  (tab === 'login' ? loginForm : registerForm)();
}
picks.student.addEventListener('click', () => setPortal('student'));
picks.teacher.addEventListener('click', () => setPortal('teacher'));

function setTab(name) {
  tab = name;
  for (const [k, el] of Object.entries(tabs)) el.setAttribute('aria-selected', String(k === name));
  panel.setAttribute('aria-labelledby', `tab-${name}`);
  setPortal(portal);
}
tabs.login.addEventListener('click', () => setTab('login'));
tabs.register.addEventListener('click', () => setTab('register'));

/* A password box with a "Show password" switch, so a typing slip is easy to spot. */
function passwordField(id, autocomplete, hint) {
  const input = h('input', { id, name: 'password', type: 'password', autocomplete, required: true, maxlength: 128 });
  const show = h('input', { id: `${id}-show`, type: 'checkbox' });
  show.addEventListener('change', () => { input.type = show.checked ? 'text' : 'password'; });
  return h('div', { class: 'field' }, h('label', { for: id }, 'Password', hint ? h('span', { class: 'hint' }, ` ${hint}`) : null), input,
    h('label', { class: 'check small', for: `${id}-show` }, show, h('span', {}, 'Show password')));
}

function errorBox(msg) {
  return h('div', { class: 'notice bad', role: 'alert', id: 'form-error' }, h('strong', {}, 'Could not continue.'), msg);
}

function loginForm() {
  const form = h('form', { novalidate: true, autocomplete: 'on' },
    h('h2', {}, portal === 'teacher' ? 'Teacher sign in' : 'Student sign in'),
    h('div', { id: 'err' }),
    field('Email', h('input', { id: 'email', name: 'email', type: 'email', autocomplete: 'username', required: true, maxlength: 254 })),
    passwordField('password', 'current-password'),
    h('button', { class: 'btn btn-primary', type: 'submit' }, 'Sign in'));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.disabled = true;
    clear(form.querySelector('#err'));
    try {
      const { user } = await post('/api/auth/login', { email: form.email.value, password: form.password.value, portal });
      location.href = homeFor(user.role);
    } catch (err) {
      form.querySelector('#err').append(errorBox(err.message));
      showFieldErrors(form, err.fields);
      btn.disabled = false;
    }
  });
  clear(panel).append(form);
  form.email.focus();
}

async function registerForm() {
  clear(panel).append(h('h2', {}, portal === 'teacher' ? 'Join as a teacher' : 'Join as a student'), h('div', { class: 'skel line' }), h('div', { class: 'skel line mid' }));
  let universities = [];
  try {
    universities = (await get('/api/universities')).universities;
  } catch (e) {
    clear(panel).append(errorBox(e.message));
    return;
  }
  /* The university is typed. Matches appear underneath as you type. Anything not in the list is added for review. */
  const items = universities.map((u) => ({ id: u.id, label: `${u.name}, ${u.city}`, alt: [u.name] }));
  const uni = pickInput({ id: 'university_name', name: 'university_name', placeholder: 'Type your university name', items, onChange: () => syncNew() });
  const preset = universities.find((u) => u.slug === params.get('university'));
  if (preset) uni.input.value = `${preset.name}, ${preset.city}`;

  const newBox = h('div', { hidden: true },
    field('City', h('input', { id: 'new_university_city', name: 'new_university_city', maxlength: 80 })),
    field('Student email domain', h('input', { id: 'new_university_domain', name: 'new_university_domain', placeholder: 'example.edu', maxlength: 100 }), '(optional)'),
    h('p', { class: 'small muted' }, 'We could not find that university, so it will be added. An administrator reviews new universities before they appear in the public list. You can use the site while you wait.'));
  function syncNew() { newBox.hidden = !(uni.input.value.trim().length >= 3 && !uni.selected()); }
  syncNew();

  const terms = h('input', { id: 'terms', name: 'terms', type: 'checkbox', required: true });
  const form = h('form', { novalidate: true, autocomplete: 'on' },
    h('h2', {}, portal === 'teacher' ? 'Join as a teacher' : 'Join as a student'),
    h('div', { id: 'err' }),
    field('Full name', h('input', { id: 'name', name: 'name', autocomplete: 'name', required: true, maxlength: 80 })),
    field('Email', h('input', { id: 'email', name: 'email', type: 'email', autocomplete: 'username', required: true, maxlength: 254 }), 'Use your university email if you have one.'),
    h('div', { class: 'field' }, h('label', { for: 'university_name' }, 'University'), uni.el),
    newBox,
    h('div', { class: 'grid2' },
      field('Department', h('input', { id: 'department', name: 'department', maxlength: 100 }), '(optional)'),
      portal === 'student'
        ? field('Year of study', h('input', { id: 'year_of_study', name: 'year_of_study', type: 'number', min: 1, max: 8 }), '(1 to 8, optional)')
        : h('p', { class: 'small muted' }, 'An administrator verifies teachers. Until then you can offer sessions and post events. Reviewing resources and announcements unlock after verification.')),
    passwordField('password', 'new-password', 'At least 10 characters, with a number or symbol.'),
    h('div', { class: 'field' }, h('label', { class: 'check', for: 'terms' }, terms, h('span', {}, 'I agree to the ', h('a', { href: '/terms' }, 'Terms of service'), ' and have read the ', h('a', { href: '/privacy' }, 'Privacy policy'), '.'))),
    h('button', { class: 'btn btn-primary', type: 'submit' }, 'Create account'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    clear(form.querySelector('#err'));
    if (!terms.checked) {
      form.querySelector('#err').append(errorBox('Please accept the terms and privacy policy to continue.'));
      terms.focus();
      return;
    }
    const body = { name: form.name.value, email: form.email.value, password: form.password.value, role: portal };
    const chosen = uni.selected();
    if (chosen) {
      body.university_id = chosen.id;
    } else if (uni.input.value.trim()) {
      body.new_university_name = uni.input.value.trim();
      body.new_university_city = form.new_university_city.value;
      if (form.new_university_domain.value.trim()) body.new_university_domain = form.new_university_domain.value;
    }
    if (form.department.value.trim()) body.department = form.department.value;
    if (form.year_of_study?.value) body.year_of_study = Number(form.year_of_study.value);
    btn.disabled = true;
    try {
      await post('/api/auth/register', body);
      location.href = homeFor(portal);
    } catch (err) {
      form.querySelector('#err').append(errorBox(err instanceof ApiError ? err.message : 'Something went wrong.'));
      showFieldErrors(form, err.fields);
      btn.disabled = false;
    }
  });
  clear(panel).append(form);
  form.name.focus();
}

try {
  const { user } = await get('/api/auth/me');
  if (user) location.replace(homeFor(user.role));
} catch { /* show the form */ }

setTab(params.get('tab') === 'register' || params.get('university') ? 'register' : 'login');
