import dom from './dom.js';
import { state } from './state.js';
import { formatTimestamp, addCacheBuster, validateEmail } from './utils.js';
import { updateToastPosition } from './toast.js';
import { scheduleAssignmentHeightSync } from './layout.js';

export function renderAssignments() {
  populateEmailDropdown(Object.keys(state.assignments));

  if (!dom.assignmentList) {
    updateToastPosition();
    scheduleAssignmentHeightSync();
    return;
  }

  const entries = Object.entries(state.assignments);

  if (!entries.length) {
    dom.assignmentList.classList.add('empty-state');
    dom.assignmentList.innerHTML =
      '<p class="empty-copy">No galleries yet. Add an email, create a gallery and save your favourite pics.</p>';
    updateToastPosition();
    scheduleAssignmentHeightSync();
    return;
  }

  dom.assignmentList.classList.remove('empty-state');
  dom.assignmentList.innerHTML = '';

  entries.sort((a, b) => a[0].localeCompare(b[0]));

  entries.forEach(([email, images]) => {
    const card = document.createElement('article');
    card.className = 'assignment-card';

    const header = document.createElement('div');
    header.className = 'assignment-card__header';

    const emailLabel = document.createElement('span');
    emailLabel.className = 'email';
    emailLabel.textContent = email;
    header.appendChild(emailLabel);

    const sendButton = document.createElement('button');
    sendButton.type = 'button';
    sendButton.className = 'ghost-button send-gallery-button';
    sendButton.innerHTML =
      '<span class="button-icon" aria-hidden="true">&#9993;</span><span class="button-label">Send gallery</span>';
    sendButton.setAttribute('data-action', 'send-gallery');
    sendButton.setAttribute('data-email', email);
    sendButton.setAttribute('aria-label', `Send gallery to ${email}`);
    header.appendChild(sendButton);

    const removeGalleryButton = document.createElement('button');
    removeGalleryButton.type = 'button';
    removeGalleryButton.className = 'ghost-button gallery-remove-button';
    removeGalleryButton.textContent = 'Remove gallery';
    removeGalleryButton.setAttribute('data-action', 'remove-gallery');
    removeGalleryButton.setAttribute('data-email', email);
    removeGalleryButton.setAttribute('aria-label', `Remove gallery for ${email}`);
    header.appendChild(removeGalleryButton);

    card.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'thumb-grid';

    images.forEach((image, index) => {
      const figure = document.createElement('figure');
      figure.className = 'thumb';

      const link = document.createElement('a');
      link.href = image.fullUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', `Open full image by ${image.author}`);

      const img = document.createElement('img');
      img.src = image.thumbUrl || addCacheBuster(`https://picsum.photos/id/${image.id}/320/220`);
      img.alt = `Photo by ${image.author}`;
      link.appendChild(img);

      figure.appendChild(link);

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'thumb-remove';
      removeButton.textContent = 'Remove';
      removeButton.setAttribute('data-action', 'remove-image');
      removeButton.setAttribute('data-email', email);
      removeButton.setAttribute('data-index', String(index));
      removeButton.setAttribute('aria-label', `Remove this image from ${email}`);
      figure.appendChild(removeButton);

      const caption = document.createElement('figcaption');
      const stamp = formatTimestamp(image.assignedAt);
      caption.textContent = `by ${image.author}${stamp ? ` - ${stamp}` : ''}`;
      figure.appendChild(caption);

      grid.appendChild(figure);
    });

    card.appendChild(grid);
    dom.assignmentList.appendChild(card);
  });

  updateToastPosition();
  scheduleAssignmentHeightSync();
}

export function populateEmailDropdown(emailList) {
  if (!dom.emailDropdown || !dom.emailDropdownToggle) {
    return;
  }

  const merged = Array.from(
    new Set([
      ...(dom.emailInput ? [dom.emailInput.value.trim().toLowerCase()] : []),
      ...emailList,
      ...state.knownEmails
    ])
  )
    .filter((email) => validateEmail(email))
    .sort();

  dom.emailDropdown.innerHTML = '';

  if (!merged.length) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'email-dropdown__empty';
    emptyItem.textContent = 'No saved galleries yet.';
    dom.emailDropdown.appendChild(emptyItem);
    dom.emailDropdownToggle.disabled = true;
    dom.emailDropdown.hidden = true;
    dom.emailDropdownToggle.setAttribute('aria-expanded', 'false');
    return;
  }

  dom.emailDropdownToggle.disabled = false;

  merged.forEach((email) => {
    const item = document.createElement('li');
    item.className = 'email-option';
    item.setAttribute('role', 'option');
    item.dataset.email = email;
    item.textContent = email;

    if (dom.emailInput && dom.emailInput.value.trim().toLowerCase() === email) {
      item.setAttribute('aria-selected', 'true');
    }

    dom.emailDropdown.appendChild(item);
  });
}
