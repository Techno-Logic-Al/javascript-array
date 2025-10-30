import { ASSIGNMENTS_KEY, EMAILS_KEY } from './constants.js';
import dom from './dom.js';
import { state } from './state.js';
import { validateEmail } from './utils.js';

export function loadAssignments() {
  try {
    const stored = localStorage.getItem(ASSIGNMENTS_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    state.assignments = typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (error) {
    console.warn('Unable to load assignments:', error);
    state.assignments = {};
  }
}

export function loadKnownEmails() {
  try {
    const stored = localStorage.getItem(EMAILS_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    state.knownEmails = Array.isArray(parsed) ? parsed.filter(validateEmail) : [];
  } catch (error) {
    console.warn('Unable to load known emails:', error);
    state.knownEmails = [];
  }
}

export function persistKnownEmails() {
  try {
    const domEmail = dom.emailInput ? dom.emailInput.value.trim().toLowerCase() : '';
    const candidateEmails = [
      domEmail,
      ...state.knownEmails,
      ...Object.keys(state.assignments)
    ];
    const unique = Array.from(new Set(candidateEmails.map((email) => email.trim().toLowerCase())))
      .filter(validateEmail)
      .sort();

    state.knownEmails = unique;
    localStorage.setItem(EMAILS_KEY, JSON.stringify(unique));
  } catch (error) {
    console.warn('Unable to save email history:', error);
  }
}

export function saveAssignments() {
  persistKnownEmails();
  try {
    localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(state.assignments));
  } catch (error) {
    console.warn('Unable to persist assignments:', error);
  }
}

export function registerKnownEmail(email) {
  if (!validateEmail(email)) {
    return;
  }
  if (!state.knownEmails.includes(email)) {
    state.knownEmails.push(email);
    persistKnownEmails();
  }
}
