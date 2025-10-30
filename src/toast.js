import dom from './dom.js';
import { state } from './state.js';

export function setupToast() {
  if (state.toastElement) {
    return;
  }
  if (!dom.primaryButton && dom.assignmentForm) {
    dom.primaryButton = dom.assignmentForm.querySelector('.primary-button');
  }
  const element = document.createElement('div');
  element.id = 'formToast';
  element.setAttribute('aria-live', 'polite');
  document.body.appendChild(element);
  state.toastElement = element;
}

export function showToast(message, type) {
  setupToast();
  const toast = state.toastElement;
  if (!toast) {
    return;
  }

  if (state.toastHideTimer) {
    window.clearTimeout(state.toastHideTimer);
    state.toastHideTimer = null;
  }

  toast.classList.remove('is-hiding', 'error', 'success');
  toast.textContent = message;

  if (type) {
    toast.classList.add(type);
  }

  toast.classList.add('is-visible');
  updateToastPosition();
}

export function hideToast() {
  const toast = state.toastElement;
  if (!toast) {
    return;
  }

  if (state.toastHideTimer) {
    window.clearTimeout(state.toastHideTimer);
    state.toastHideTimer = null;
  }

  if (!toast.classList.contains('is-visible') && !toast.classList.contains('is-hiding')) {
    toast.textContent = '';
    toast.classList.remove('error', 'success');
    toast.style.left = '';
    toast.style.top = '';
    toast.style.width = '';
    return;
  }

  toast.classList.remove('is-visible');
  toast.classList.add('is-hiding');

  state.toastHideTimer = window.setTimeout(() => {
    state.toastHideTimer = null;
    toast.classList.remove('is-hiding', 'error', 'success');
    toast.textContent = '';
    toast.style.left = '';
    toast.style.top = '';
    toast.style.width = '';
  }, 220);
}

export function updateToastPosition() {
  const toast = state.toastElement;
  if (!toast || (!toast.classList.contains('is-visible') && !toast.classList.contains('is-hiding'))) {
    return;
  }
  if (!dom.assignmentForm) {
    return;
  }
  const formRect = dom.assignmentForm.getBoundingClientRect();
  const button = dom.primaryButton || (dom.assignmentForm ? dom.assignmentForm.querySelector('.primary-button') : null);
  const target = button || dom.assignmentForm;
  const targetRect = target.getBoundingClientRect();
  const width = Math.min(formRect.width, window.innerWidth - 32);
  const centeredLeft = formRect.left + (formRect.width - width) / 2;
  const clampedLeft = Math.min(Math.max(16, centeredLeft), window.innerWidth - width - 16);
  toast.style.width = `${width}px`;
  toast.style.left = `${clampedLeft}px`;
  const preferredTop = targetRect.bottom + 12;
  const clampedTop = Math.min(preferredTop, window.innerHeight - 64);
  toast.style.top = `${Math.max(16, clampedTop)}px`;
}
