import dom from './dom.js';
import { state } from './state.js';
import { validateEmail } from './utils.js';
import {
  loadAssignments,
  loadKnownEmails,
  saveAssignments,
  registerKnownEmail
} from './storage.js';
import { renderAssignments, populateEmailDropdown } from './assignmentRenderer.js';
import { loadNextImage, queuePrefetch, getCurrentImage } from './imageService.js';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  loadAssignments();
  loadKnownEmails();
  bindEvents();
  renderAssignments();
  queuePrefetch();
  loadNextImage();
}

function bindEvents() {
  if (dom.assignmentForm) {
    dom.assignmentForm.addEventListener('submit', handleAssignment);
  }

  if (dom.assignmentList) {
    dom.assignmentList.addEventListener('click', handleAssignmentListClick);
  }

  if (dom.refreshButton) {
    dom.refreshButton.addEventListener('click', () => {
      clearFormMessage();
      loadNextImage();
    });
  }

  if (dom.retryButton) {
    dom.retryButton.addEventListener('click', () => {
      clearFormMessage();
      loadNextImage();
    });
  }

  if (dom.createGalleryButton) {
    dom.createGalleryButton.addEventListener('click', handleCreateGallery);
  }

  if (dom.emailDropdownToggle) {
    dom.emailDropdownToggle.addEventListener('click', toggleEmailDropdown);
  }

  if (dom.emailClearButton) {
    dom.emailClearButton.addEventListener('click', handleEmailClear);
  }

  if (dom.emailDropdown) {
    dom.emailDropdown.addEventListener('click', handleEmailDropdownClick);
  }

  document.addEventListener('click', handleDocumentClick, true);
  document.addEventListener('keydown', handleDropdownKeydown);
}

function handleAssignment(event) {
  event.preventDefault();
  clearFormMessage();

  if (!dom.emailInput) {
    return;
  }

  const email = (dom.emailInput.value || '').trim().toLowerCase();
  if (!validateEmail(email)) {
    setFormMessage('Switch gallery or enter a valid email address to create a new gallery.', 'error');
    dom.emailInput.focus();
    return;
  }

  const currentImage = getCurrentImage();
  if (!currentImage) {
    setFormMessage('No pic available to assign. Please fetch a new pic.', 'error');
    return;
  }

  registerKnownEmail(email);

  const existingAssignments = Array.isArray(state.assignments[email]) ? state.assignments[email] : [];
  const isDuplicate = existingAssignments.some(
    (assignment) => assignment && assignment.id === currentImage.id
  );

  if (isDuplicate) {
    setFormMessage("The same pic can't be assigned to this email more than once. Fetch a new pic to add another.", "error");
    return;
  }

  const record = {
    id: currentImage.id,
    author: currentImage.author,
    fullUrl: currentImage.fullUrl,
    sourcePage: currentImage.sourcePage,
    thumbUrl: currentImage.thumbUrl,
    previewUrl: currentImage.previewUrl,
    originalWidth: currentImage.originalWidth,
    originalHeight: currentImage.originalHeight,
    assignedAt: new Date().toISOString(),
    isFallback: currentImage.isFallback
  };

  if (!Array.isArray(state.assignments[email])) {
    state.assignments[email] = [];
  }

  state.assignments[email].unshift(record);
  saveAssignments();
  renderAssignments();

  setFormMessage(`Pic added to ${email}'s gallery.`, 'success');
}

function handleCreateGallery(event) {
  event.preventDefault();
  clearFormMessage();

  if (!dom.emailInput) {
    return;
  }

  const email = (dom.emailInput.value || '').trim().toLowerCase();
  if (!validateEmail(email)) {
    setFormMessage('Switch gallery or enter a valid email address to create a new gallery.', 'error');
    dom.emailInput.focus();
    return;
  }

  if (state.assignments[email]) {
    setFormMessage(`${email}'s gallery already exists. Clear and add a new email if you want to add a new gallery.`, 'error');
    return;
  }

  registerKnownEmail(email);

  state.assignments[email] = [];
  saveAssignments();
  renderAssignments();
  setFormMessage(`Created a new gallery for ${email}. Add pics when you're ready.`, 'success');
  dom.emailInput.focus();
}

function handleAssignmentListClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button || !dom.assignmentList || !dom.assignmentList.contains(button)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const action = button.getAttribute('data-action');
  const email = button.getAttribute('data-email');

  if (!action || !email || !state.assignments[email]) {
    return;
  }

  if (action === 'send-gallery') {
    const images = state.assignments[email] || [];
    if (!images.length) {
      setFormMessage(`${email}'s gallery is currently empty. Add some pics before sending.`, 'error');
      return;
    }

    const subject = 'Your Pick-a-Pic gallery';
    const lines = images.map((image, index) => `${index + 1}. ${image.fullUrl || image.previewUrl}`);
    const bodyText = [
      `Hi ${email || 'there'},`,
      '',
      "Here's a personally-curated gallery of pics chosen for you to view and enjoy, made using Pick-a-Pic:",
      '',
      ...lines,
      '',
      '\u2014 Sent via Pick-a-Pic'
    ].join('\n');

    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    window.location.href = mailtoLink;
    setFormMessage(`Opened an email draft for ${email}.`, 'success');
    return;
  }

  if (action === 'remove-gallery') {
    delete state.assignments[email];
    saveAssignments();
    renderAssignments();
    setFormMessage(`Removed ${email}'s gallery.`, 'success');
    return;
  }

  if (action === 'remove-image') {
    const index = parseInt(button.getAttribute('data-index'), 10);
    if (Number.isNaN(index) || index < 0) {
      return;
    }

    state.assignments[email].splice(index, 1);
    if (!state.assignments[email].length) {
      delete state.assignments[email];
    }
    saveAssignments();
    renderAssignments();
    setFormMessage(`Pic removed from ${email}.`, 'success');
  }
}

function toggleEmailDropdown(event) {
  event.preventDefault();
  event.stopPropagation();

  if (!dom.emailDropdown || !dom.emailDropdownToggle) {
    return;
  }

  const expanded = dom.emailDropdownToggle.getAttribute('aria-expanded') === 'true';
  if (expanded) {
    closeEmailDropdown();
  } else {
    openEmailDropdown();
  }
}

function openEmailDropdown() {
  if (!dom.emailDropdown || !dom.emailDropdownToggle) {
    return;
  }

  populateEmailDropdown(Object.keys(state.assignments));
  dom.emailDropdown.hidden = false;
  dom.emailDropdownToggle.setAttribute('aria-expanded', 'true');
  dom.emailDropdown.focus();
}

function closeEmailDropdown() {
  if (!dom.emailDropdown || !dom.emailDropdownToggle) {
    return;
  }

  dom.emailDropdown.hidden = true;
  dom.emailDropdownToggle.setAttribute('aria-expanded', 'false');
}

function handleEmailDropdownClick(event) {
  let target = event.target;
  if (!(target instanceof Element) && target && target.parentElement) {
    target = target.parentElement;
  }

  if (!(target instanceof Element)) {
    return;
  }

  const option = target.closest('.email-option');
  if (!option) {
    return;
  }

  event.preventDefault();

  closeEmailDropdown();

  const email = option.dataset.email;
  if (email && dom.emailInput) {
    dom.emailInput.value = email;
    dom.emailInput.focus();
    if (typeof dom.emailInput.setSelectionRange === 'function') {
      try {
        dom.emailInput.setSelectionRange(email.length, email.length);
      } catch (selectionError) {
        console.warn('Unable to set selection range for email input:', selectionError);
      }
    }
    setFormMessage(`Gallery switched to ${email}.`, 'success');
  }
}

function handleEmailClear(event) {
  event.preventDefault();

  if (!dom.emailInput) {
    return;
  }

  dom.emailInput.value = '';
  dom.emailInput.focus();
  clearFormMessage();
  populateEmailDropdown(Object.keys(state.assignments));
  closeEmailDropdown();
}

function handleDocumentClick(event) {
  if (!dom.emailDropdown || dom.emailDropdown.hidden) {
    return;
  }

  if (
    event.target === dom.emailDropdown ||
    dom.emailDropdown.contains(event.target) ||
    event.target === dom.emailDropdownToggle
  ) {
    return;
  }

  closeEmailDropdown();
}

function handleDropdownKeydown(event) {
  if (!dom.emailDropdown || dom.emailDropdown.hidden) {
    return;
  }

  const options = Array.from(dom.emailDropdown.querySelectorAll('.email-option'));
  if (!options.length) {
    return;
  }

  const currentIndex = options.findIndex((option) => option.getAttribute('aria-selected') === 'true');

  if (event.key === 'Escape') {
    closeEmailDropdown();
    dom.emailDropdownToggle.focus();
    return;
  }

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();

    let nextIndex = currentIndex;
    if (event.key === 'ArrowDown') {
      nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
    } else {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
    }

    options.forEach((option, index) => {
      if (index === nextIndex) {
        option.setAttribute('aria-selected', 'true');
        option.scrollIntoView({ block: 'nearest' });
      } else {
        option.removeAttribute('aria-selected');
      }
    });
  }

  if (event.key === 'Enter' || event.key === ' ') {
    const selected = dom.emailDropdown.querySelector('.email-option[aria-selected="true"]');
    if (selected) {
      selected.click();
      event.preventDefault();
    }
  }
}

function clearFormMessage() {
  if (!dom.formMessage) {
    return;
  }
  if (state.formMessageTimer) {
    window.clearTimeout(state.formMessageTimer);
    state.formMessageTimer = null;
  }
  if (state.formMessageFadeTimer) {
    window.clearTimeout(state.formMessageFadeTimer);
    state.formMessageFadeTimer = null;
  }
  dom.formMessage.classList.remove('is-visible', 'is-fading', 'error', 'success');
  dom.formMessage.textContent = '';
}

function setFormMessage(message, type) {
  if (!dom.formMessage) {
    return;
  }

  if (state.formMessageTimer) {
    window.clearTimeout(state.formMessageTimer);
    state.formMessageTimer = null;
  }
  if (state.formMessageFadeTimer) {
    window.clearTimeout(state.formMessageFadeTimer);
    state.formMessageFadeTimer = null;
  }

  dom.formMessage.classList.remove('is-fading', 'error', 'success');
  if (type) {
    dom.formMessage.classList.add(type);
  }

  dom.formMessage.textContent = message;
  dom.formMessage.classList.add('is-visible');
  state.formMessageTimer = window.setTimeout(() => {
    state.formMessageTimer = null;
    initiateFormMessageFade();
  }, 3000);
}

function initiateFormMessageFade() {
  if (!dom.formMessage) {
    return;
  }

  if (!dom.formMessage.textContent) {
    clearFormMessage();
    return;
  }

  dom.formMessage.classList.remove('is-visible');
  dom.formMessage.classList.add('is-fading');

  state.formMessageFadeTimer = window.setTimeout(() => {
    state.formMessageFadeTimer = null;
    clearFormMessage();
  }, 260);
}
