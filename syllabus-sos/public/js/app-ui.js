import { h, clear, post, toast, fail, field, showFieldErrors, modeLabel, choice } from './common.js';

export const link = (href, text, attrs = {}) => h('a', { href, ...attrs }, text);

export const personLink = (u) => h('a', { href: `#/user/${u.id}` }, u.name);

export function personTags(u) {
  return [
    u.role === 'teacher' ? h('span', { class: 'tag' }, 'Teacher') : null,
    u.verified ? h('span', { class: 'tag solid' }, 'Verified') : null,
  ];
}

export function empty(title, text, ...actions) {
  return h('div', { class: 'empty' }, h('h3', {}, title), text ? h('p', {}, text) : null, actions.length ? h('div', { class: 'row' }, actions) : null);
}

export function errorNotice(err) {
  return h('div', { class: 'notice bad', role: 'alert' }, h('strong', {}, 'Could not load this page.'), err.message || 'Try again.');
}

export function statusTag(status) {
  const labels = {
    requested: 'Waiting for tutor', accepted: 'Accepted', declined: 'Declined', cancelled: 'Cancelled', completed: 'Completed',
    disputed: 'Problem raised', resolved_refund: 'Refunded after review', resolved_release: 'Paid after review',
  };
  const warn = ['disputed', 'declined', 'cancelled'].includes(status);
  return h('span', { class: `tag${warn ? ' warn' : ''}` }, labels[status] || status);
}

/** A small "Report" control that expands into a form. */
export function reportControl(type, id) {
  const wrap = h('span', {});
  const open = h('button', { class: 'linklike small', type: 'button' }, 'Report');
  open.addEventListener('click', () => {
    const form = h('form', { class: 'panel stack', novalidate: true },
      h('h3', {}, 'Report this'),
      field('What is wrong?', h('textarea', { id: `rep-${type}-${id}`, name: 'reason', maxlength: 500, required: true }), 'At least 10 characters.'),
      h('div', { class: 'row' },
        h('button', { class: 'btn btn-primary btn-sm', type: 'submit' }, 'Send report'),
        h('button', { class: 'btn btn-sm', type: 'button', onclick: () => form.replaceWith(wrap) }, 'Cancel')));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await post('/api/reports', { target_type: type, target_id: id, reason: form.reason.value });
        toast('Report sent. An administrator will review it.');
        form.replaceWith(wrap);
      } catch (err) {
        showFieldErrors(form, err.fields);
        fail(err);
      }
    });
    wrap.replaceWith(form);
    form.reason.focus();
  });
  wrap.append(open);
  return wrap;
}

export const priceText = (n) => (n === 0 ? 'Free' : `${n} credits per hour`);

export function offerItem(o, { showTutor = true } = {}) {
  return h('article', { class: 'item' },
    h('h3', {}, h('a', { href: `#/offer/${o.id}` }, o.headline)),
    h('div', { class: 'meta' },
      h('span', { class: 'code' }, h('strong', {}, o.course.code), ` ${o.course.name}`),
      h('span', { class: 'tag' }, modeLabel(o.mode)),
      o.mastery === 'complete' ? h('span', { class: 'tag solid' }, 'Knows the whole course') : null,
      o.status === 'paused' ? h('span', { class: 'tag warn' }, 'Paused') : null),
    showTutor
      ? h('div', { class: 'meta small' }, personLink(o.tutor), personTags(o.tutor),
          h('span', { class: 'muted' }, o.tutor.rating_count ? `${o.tutor.rating} out of 5 from ${o.tutor.rating_count} review${o.tutor.rating_count === 1 ? '' : 's'}` : 'No reviews yet'),
          h('span', { class: 'muted' }, `${o.tutor.sessions_done} session${o.tutor.sessions_done === 1 ? '' : 's'} taught`))
      : null,
    h('div', { class: 'price-line' }, priceText(o.price_per_hour)),
    o.availability ? h('div', { class: 'small muted' }, `Available: ${o.availability}`) : null);
}

/** Form used both for creating and editing a listing. The course is typed, not picked from a list. */
export function offerForm({ courses, initial = {}, submitLabel, onSubmit, onCancel, lockCourse = false }) {
  const picker = lockCourse ? null : pickInput({ id: 'of-course', name: 'course_name', placeholder: 'Type the course name, for example Machine Learning', items: courseItems(courses) });
  const courseInput = lockCourse
    ? h('input', { id: 'of-course', value: `${initial.course?.code || ''} ${initial.course?.name || ''}`.trim(), disabled: true })
    : picker.el;
  if (picker) courseInput.id = 'of-course-box';
  const form = h('form', { class: 'stack', novalidate: true },
    lockCourse ? field('Course', courseInput) : h('div', { class: 'field' }, h('label', { for: 'of-course' }, 'Course', h('span', { class: 'hint' }, ' Type any course. Courses already at your university show up as you type. A new course is added for you.')), courseInput),
    lockCourse ? null : field('Course code', h('input', { id: 'of-code', name: 'course_code', maxlength: 20, placeholder: 'For example CS401' }), '(optional, only used if the course is new)'),
    field('Headline', h('input', { id: 'of-head', name: 'headline', maxlength: 120, value: initial.headline || '' }), 'What will you teach, in one line?'),
    field('Details', h('textarea', { id: 'of-desc', name: 'description', maxlength: 1000 }, initial.description || ''), '(optional)'),
    h('div', { class: 'grid2' },
      field('Price per hour in credits', h('input', { id: 'of-price', name: 'price_per_hour', type: 'number', min: 0, max: 5000, step: 10, value: initial.price_per_hour ?? 100 }), '0 means free.'),
      field('Format', choice('mode', ['online', 'in_person', 'chat'].map((m) => [m, modeLabel(m)]), initial.mode || 'online', { id: 'of-mode' }))),
    h('div', { class: 'grid2' },
      field('How well do you know it?', choice('mastery', [['complete', 'I know the whole course'], ['strong', 'I know most of it well']], initial.mastery === 'complete' ? 'complete' : 'strong', { id: 'of-mastery' })),
      field('When are you free?', h('input', { id: 'of-avail', name: 'availability', maxlength: 200, value: initial.availability || '' }), '(optional)')),
    h('div', { class: 'row' },
      h('button', { class: 'btn btn-primary', type: 'submit' }, submitLabel),
      onCancel ? h('button', { class: 'btn', type: 'button', onclick: onCancel }, 'Cancel') : null));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    const body = {
      headline: form.headline.value,
      price_per_hour: Number(form.price_per_hour.value),
      mode: form.mode.value,
      mastery: form.mastery.value,
    };
    if (!lockCourse) {
      body.course_name = picker.input.value.trim();
      if (form.course_code.value.trim()) body.course_code = form.course_code.value;
    }
    if (form.description.value.trim()) body.description = form.description.value;
    if (form.availability.value.trim()) body.availability = form.availability.value;
    try {
      await onSubmit(body);
    } catch (err) {
      showFieldErrors(form, err.fields);
      fail(err);
      btn.disabled = false;
    }
  });
  return { form };
}

/** Text box with live matches underneath. You type; matching items appear as plain buttons, not a dropdown.
 *  items: [{ id, label, alt: [other names that also match exactly] }] */
export function pickInput({ id, name, placeholder, items = [], onChange, type = 'search' }) {
  let pool = items;
  const input = h('input', { id, name, type, maxlength: 120, autocomplete: 'off', placeholder });
  const list = h('ul', { class: 'suggest', 'aria-label': 'Matches' });
  const norm = (x) => String(x).trim().toLowerCase();
  const selected = () => {
    const t = norm(input.value);
    if (!t) return null;
    return pool.find((i) => norm(i.label) === t || (i.alt || []).some((a) => norm(a) === t)) || null;
  };
  const draw = () => {
    clear(list);
    const t = norm(input.value);
    if (!t || selected()) return;
    for (const i of pool.filter((x) => [x.label, ...(x.alt || [])].some((a) => norm(a).includes(t))).slice(0, 6)) {
      list.append(h('li', {}, h('button', { type: 'button', class: 'linklike', onclick: () => { input.value = i.label; clear(list); onChange?.(i); } }, i.label)));
    }
  };
  input.addEventListener('input', () => { draw(); onChange?.(selected()); });
  return { el: h('div', {}, input, list), input, selected, setItems: (next) => { pool = next; draw(); } };
}

export const courseItems = (courses) => courses.map((c) => ({ id: c.id, label: `${c.code} ${c.name}`, alt: [c.code, c.name], course: c }));

export { clear };
