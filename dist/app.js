(() => {
  // src/dom.js
  var dom = {
    activeImage: document.getElementById("activeImage"),
    previewPanel: document.querySelector(".preview-panel"),
    assignmentPanel: document.querySelector(".assignment-panel"),
    imageOverlay: document.getElementById("imageOverlay"),
    overlayMessage: document.getElementById("overlayMessage"),
    retryButton: document.getElementById("retryButton"),
    refreshButton: document.getElementById("refreshButton"),
    imageAuthor: document.getElementById("imageAuthor"),
    imageDimensions: document.getElementById("imageDimensions"),
    viewSourceLink: document.getElementById("viewSourceLink"),
    assignmentForm: document.getElementById("assignmentForm"),
    emailInput: document.getElementById("emailInput"),
    formMessage: document.getElementById("formMessage"),
    assignmentList: document.getElementById("assignmentList"),
    createGalleryButton: document.getElementById("createGalleryButton"),
    emailClearButton: document.getElementById("emailClearButton"),
    emailDropdownToggle: document.getElementById("emailDropdownToggle"),
    emailDropdown: document.getElementById("emailDropdown"),
    primaryButton: document.querySelector("#assignmentForm .primary-button")
  };
  var dom_default = dom;

  // src/state.js
  var state = {
    assignments: {},
    knownEmails: [],
    currentImage: null,
    pendingPrefetch: null,
    prefetchedImage: null,
    formMessageTimer: null,
    formMessageFadeTimer: null
  };

  // src/utils.js
  function validateEmail(email) {
    if (!email) {
      return false;
    }
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
  }
  function formatTimestamp(isoString) {
    if (!isoString) {
      return "";
    }
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return date.toLocaleString(void 0, {
      dateStyle: "medium",
      timeStyle: "short"
    });
  }
  function addCacheBuster(url, stamp) {
    const seed = typeof stamp === "number" ? stamp : Date.now();
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}t=${seed}`;
  }
  function generateSeed() {
    const randomPart = Math.random().toString(36).slice(2, 10);
    const timePart = Date.now().toString(36);
    return `${randomPart}-${timePart}`;
  }
  function createProceduralImage(width, height, seed) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      return "";
    }
    const random = createSeededRandom(seed);
    const baseHue = Math.floor(random() * 360);
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, `hsl(${baseHue}, 85%, 55%)`);
    gradient.addColorStop(1, `hsl(${(baseHue + 60) % 360}, 70%, 45%)`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    const circleCount = 5;
    for (let i = 0; i < circleCount; i += 1) {
      const radius = width * 0.1 + random() * width * 0.25;
      const x = random() * width;
      const y = random() * height;
      const hue = (baseHue + random() * 180) % 360;
      context.beginPath();
      context.fillStyle = `hsla(${hue}, 95%, 65%, 0.35)`;
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
    context.lineWidth = 2;
    context.strokeStyle = `hsla(${(baseHue + 180) % 360}, 65%, 70%, 0.18)`;
    const lineCount = 4;
    for (let j = 0; j < lineCount; j += 1) {
      const startX = random() * width;
      const startY = random() * height;
      const endX = random() * width;
      const endY = random() * height;
      context.beginPath();
      context.moveTo(startX, startY);
      context.lineTo(endX, endY);
      context.stroke();
    }
    return canvas.toDataURL("image/png");
  }
  function preloadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Pic failed to load."));
      img.crossOrigin = "anonymous";
      img.src = url;
    });
  }
  function createSeededRandom(seed) {
    let value = seed || 1;
    return function() {
      value += 1831565813;
      let t = Math.imul(value ^ value >>> 15, 1 | value);
      t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // src/constants.js
  var ASSIGNMENTS_KEY = "Pick-a-Pic-assignments";
  var EMAILS_KEY = `${ASSIGNMENTS_KEY}-emails`;
  var API_MAX_PAGES = 30;
  var API_RETRY_COUNT = 4;
  var SEED_WIDTH = 1600;
  var SEED_HEIGHT = 1060;
  var LOCAL_IMAGE_LIBRARY = [
    { id: "aurora", author: "Pick-a-Pic Studio", seed: 4171 },
    { id: "sunset", author: "Pick-a-Pic Studio", seed: 6215 },
    { id: "nebula", author: "Pick-a-Pic Studio", seed: 9821 },
    { id: "dusk", author: "Pick-a-Pic Studio", seed: 1532 },
    { id: "lagoon", author: "Pick-a-Pic Studio", seed: 7742 },
    { id: "coast", author: "Pick-a-Pic Studio", seed: 4458 }
  ];

  // src/storage.js
  function loadAssignments() {
    try {
      const stored = localStorage.getItem(ASSIGNMENTS_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      state.assignments = typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch (error) {
      console.warn("Unable to load assignments:", error);
      state.assignments = {};
    }
  }
  function loadKnownEmails() {
    try {
      const stored = localStorage.getItem(EMAILS_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      state.knownEmails = Array.isArray(parsed) ? parsed.filter(validateEmail) : [];
    } catch (error) {
      console.warn("Unable to load known emails:", error);
      state.knownEmails = [];
    }
  }
  function persistKnownEmails() {
    try {
      const domEmail = dom_default.emailInput ? dom_default.emailInput.value.trim().toLowerCase() : "";
      const candidateEmails = [
        domEmail,
        ...state.knownEmails,
        ...Object.keys(state.assignments)
      ];
      const unique = Array.from(new Set(candidateEmails.map((email) => email.trim().toLowerCase()))).filter(validateEmail).sort();
      state.knownEmails = unique;
      localStorage.setItem(EMAILS_KEY, JSON.stringify(unique));
    } catch (error) {
      console.warn("Unable to save email history:", error);
    }
  }
  function saveAssignments() {
    persistKnownEmails();
    try {
      localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(state.assignments));
    } catch (error) {
      console.warn("Unable to persist assignments:", error);
    }
  }
  function registerKnownEmail(email) {
    if (!validateEmail(email)) {
      return;
    }
    if (!state.knownEmails.includes(email)) {
      state.knownEmails.push(email);
      persistKnownEmails();
    }
  }

  // src/assignmentRenderer.js
  function renderAssignments() {
    populateEmailDropdown(Object.keys(state.assignments));
    if (!dom_default.assignmentList) {
      return;
    }
    const entries = Object.entries(state.assignments);
    if (!entries.length) {
      dom_default.assignmentList.classList.add("empty-state");
      dom_default.assignmentList.innerHTML = '<p class="empty-copy">No galleries yet. Add an email, create a gallery and save your favourite pics.</p>';
      return;
    }
    dom_default.assignmentList.classList.remove("empty-state");
    dom_default.assignmentList.innerHTML = "";
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    entries.forEach(([email, images]) => {
      const card = document.createElement("article");
      card.className = "assignment-card";
      const header = document.createElement("div");
      header.className = "assignment-card__header";
      const emailLabel = document.createElement("span");
      emailLabel.className = "email";
      emailLabel.textContent = email;
      header.appendChild(emailLabel);
      const sendButton = document.createElement("button");
      sendButton.type = "button";
      sendButton.className = "ghost-button send-gallery-button";
      sendButton.innerHTML = '<span class="button-icon" aria-hidden="true">&#9993;</span><span class="button-label">Send gallery</span>';
      sendButton.setAttribute("data-action", "send-gallery");
      sendButton.setAttribute("data-email", email);
      sendButton.setAttribute("aria-label", `Send gallery to ${email}`);
      header.appendChild(sendButton);
      const removeGalleryButton = document.createElement("button");
      removeGalleryButton.type = "button";
      removeGalleryButton.className = "ghost-button gallery-remove-button";
      removeGalleryButton.textContent = "Remove gallery";
      removeGalleryButton.setAttribute("data-action", "remove-gallery");
      removeGalleryButton.setAttribute("data-email", email);
      removeGalleryButton.setAttribute("aria-label", `Remove gallery for ${email}`);
      header.appendChild(removeGalleryButton);
      card.appendChild(header);
      const grid = document.createElement("div");
      grid.className = "thumb-grid";
      images.forEach((image, index) => {
        const figure = document.createElement("figure");
        figure.className = "thumb";
        const link = document.createElement("a");
        link.href = image.fullUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.setAttribute("aria-label", `Open full image by ${image.author}`);
        const img = document.createElement("img");
        img.src = image.thumbUrl || addCacheBuster(`https://picsum.photos/id/${image.id}/320/220`);
        img.alt = `Photo by ${image.author}`;
        link.appendChild(img);
        figure.appendChild(link);
        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "thumb-remove";
        removeButton.textContent = "Remove";
        removeButton.setAttribute("data-action", "remove-image");
        removeButton.setAttribute("data-email", email);
        removeButton.setAttribute("data-index", String(index));
        removeButton.setAttribute("aria-label", `Remove this image from ${email}`);
        figure.appendChild(removeButton);
        const caption = document.createElement("figcaption");
        const stamp = formatTimestamp(image.assignedAt);
        caption.textContent = `by ${image.author}${stamp ? ` - ${stamp}` : ""}`;
        figure.appendChild(caption);
        grid.appendChild(figure);
      });
      card.appendChild(grid);
      dom_default.assignmentList.appendChild(card);
    });
  }
  function populateEmailDropdown(emailList) {
    if (!dom_default.emailDropdown || !dom_default.emailDropdownToggle) {
      return;
    }
    const merged = Array.from(
      /* @__PURE__ */ new Set([
        ...dom_default.emailInput ? [dom_default.emailInput.value.trim().toLowerCase()] : [],
        ...emailList,
        ...state.knownEmails
      ])
    ).filter((email) => validateEmail(email)).sort();
    dom_default.emailDropdown.innerHTML = "";
    if (!merged.length) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "email-dropdown__empty";
      emptyItem.textContent = "No saved galleries yet.";
      dom_default.emailDropdown.appendChild(emptyItem);
      dom_default.emailDropdownToggle.disabled = true;
      dom_default.emailDropdown.hidden = true;
      dom_default.emailDropdownToggle.setAttribute("aria-expanded", "false");
      return;
    }
    dom_default.emailDropdownToggle.disabled = false;
    merged.forEach((email) => {
      const item = document.createElement("li");
      item.className = "email-option";
      item.setAttribute("role", "option");
      item.dataset.email = email;
      item.textContent = email;
      if (dom_default.emailInput && dom_default.emailInput.value.trim().toLowerCase() === email) {
        item.setAttribute("aria-selected", "true");
      }
      dom_default.emailDropdown.appendChild(item);
    });
  }

  // src/imageService.js
  async function loadNextImage() {
    showOverlay("Fetching pic...", false);
    try {
      const imageData = await consumePrefetchedImage();
      if (!imageData) {
        throw new Error("No pic available.");
      }
      state.currentImage = imageData;
      await displayImage(imageData, { skipPreload: Boolean(imageData.isPreloaded) });
      queuePrefetch();
    } catch (error) {
      console.error(error);
      state.currentImage = null;
      showOverlay("We could not fetch a new pic. Check your connection and try again.", true);
    }
  }
  function queuePrefetch() {
    if (state.pendingPrefetch) {
      return;
    }
    state.pendingPrefetch = fetchAndPrepareImage().then((image) => {
      state.prefetchedImage = image;
      return image;
    }).catch((error) => {
      console.warn("Prefetch failed:", error);
      state.prefetchedImage = null;
      return null;
    });
  }
  function getCurrentImage() {
    return state.currentImage;
  }
  async function consumePrefetchedImage() {
    if (state.prefetchedImage) {
      const image = state.prefetchedImage;
      state.prefetchedImage = null;
      state.pendingPrefetch = null;
      return image;
    }
    if (state.pendingPrefetch) {
      try {
        const image = await state.pendingPrefetch;
        state.prefetchedImage = null;
        state.pendingPrefetch = null;
        return image;
      } catch (error) {
        state.prefetchedImage = null;
        state.pendingPrefetch = null;
        throw error;
      }
    }
    return fetchAndPrepareImage();
  }
  async function fetchAndPrepareImage() {
    const imageData = await getNextImage();
    await preloadImage(imageData.previewUrl);
    imageData.isPreloaded = true;
    return imageData;
  }
  async function getNextImage() {
    if (typeof window.fetch !== "function") {
      const fallbackOnly = getFallbackImage();
      if (!fallbackOnly) {
        throw new Error("No fallback pics available.");
      }
      return fallbackOnly;
    }
    const strategies = [fetchRandomImage, fetchRandomSeedImage];
    const start = Math.floor(Math.random() * strategies.length);
    for (let i = 0; i < strategies.length; i += 1) {
      const strategy = strategies[(start + i) % strategies.length];
      try {
        return await strategy();
      } catch (error) {
        console.warn("Pic source failed, trying another.", error);
      }
    }
    const fallback = getFallbackImage();
    if (!fallback) {
      throw new Error("Unable to load any pics at this time.");
    }
    return fallback;
  }
  async function fetchRandomImage() {
    let lastError = null;
    for (let attempt = 0; attempt < API_RETRY_COUNT; attempt += 1) {
      const randomPage = Math.floor(Math.random() * API_MAX_PAGES) + 1;
      try {
        const response = await fetch(`https://picsum.photos/v2/list?page=${randomPage}&limit=1`, {
          cache: "no-store"
        });
        if (!response.ok) {
          throw new Error(`Picsum request failed (${response.status})`);
        }
        const payload = await response.json();
        if (!Array.isArray(payload) || !payload.length) {
          throw new Error("Picsum returned an unexpected response.");
        }
        return buildImageFromApi(payload[0]);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("Unable to reach Picsum.");
  }
  function buildImageFromApi(item) {
    const stamp = Date.now();
    const previewBase = `https://picsum.photos/id/${item.id}/900/600`;
    const thumbBase = `https://picsum.photos/id/${item.id}/320/220`;
    return {
      id: item.id,
      author: item.author || "Unknown artist",
      originalWidth: item.width,
      originalHeight: item.height,
      fullUrl: item.download_url,
      previewUrl: addCacheBuster(previewBase, stamp),
      thumbUrl: addCacheBuster(thumbBase, stamp),
      sourcePage: item.url,
      isFallback: false
    };
  }
  async function fetchRandomSeedImage() {
    const seed = generateSeed();
    const stamp = Date.now();
    const previewUrl = addCacheBuster(`https://picsum.photos/seed/${seed}/900/600`, stamp);
    const thumbUrl = addCacheBuster(`https://picsum.photos/seed/${seed}/320/220`, stamp);
    const fullUrl = `https://picsum.photos/seed/${seed}/${SEED_WIDTH}/${SEED_HEIGHT}`;
    return {
      id: `seed-${seed}`,
      author: "Picsum Photos",
      originalWidth: SEED_WIDTH,
      originalHeight: SEED_HEIGHT,
      fullUrl,
      previewUrl,
      thumbUrl,
      sourcePage: fullUrl,
      isFallback: false,
      viaSeed: true
    };
  }
  function getFallbackImage() {
    if (!LOCAL_IMAGE_LIBRARY.length) {
      return null;
    }
    const choice = LOCAL_IMAGE_LIBRARY[Math.floor(Math.random() * LOCAL_IMAGE_LIBRARY.length)];
    const previewUrl = createProceduralImage(900, 600, choice.seed);
    const thumbUrl = createProceduralImage(320, 220, choice.seed + 1);
    return {
      id: choice.id,
      author: choice.author,
      originalWidth: 900,
      originalHeight: 600,
      fullUrl: previewUrl,
      previewUrl,
      thumbUrl,
      sourcePage: "#",
      isFallback: true
    };
  }
  async function displayImage(image, options) {
    const skipPreload = Boolean(options && options.skipPreload);
    if (!skipPreload) {
      await preloadImage(image.previewUrl);
    }
    if (dom_default.activeImage) {
      dom_default.activeImage.onerror = () => {
        showOverlay("We could not render the preview. Please try another pic.", true);
      };
      dom_default.activeImage.src = image.previewUrl;
      dom_default.activeImage.alt = `Pic by ${image.author}`;
    }
    if (dom_default.imageAuthor) {
      dom_default.imageAuthor.textContent = `Pic by ${image.author}`;
    }
    if (dom_default.imageDimensions) {
      dom_default.imageDimensions.textContent = `${image.originalWidth} x ${image.originalHeight}px`;
    }
    if (dom_default.viewSourceLink) {
      dom_default.viewSourceLink.href = image.sourcePage || "#";
    }
    showOverlay("", false, true);
  }
  function showOverlay(message, isError, hide) {
    if (!dom_default.imageOverlay || !dom_default.overlayMessage) {
      return;
    }
    if (hide) {
      dom_default.overlayMessage.classList.remove("error");
      dom_default.imageOverlay.classList.remove("has-error");
      if (dom_default.retryButton) {
        dom_default.retryButton.setAttribute("hidden", "hidden");
      }
      dom_default.imageOverlay.hidden = true;
      return;
    }
    dom_default.imageOverlay.hidden = false;
    if (typeof message === "string") {
      dom_default.overlayMessage.textContent = message;
    }
    if (isError) {
      dom_default.overlayMessage.classList.add("error");
      dom_default.imageOverlay.classList.add("has-error");
      if (dom_default.retryButton) {
        dom_default.retryButton.removeAttribute("hidden");
      }
    } else {
      dom_default.overlayMessage.classList.remove("error");
      dom_default.imageOverlay.classList.remove("has-error");
      if (dom_default.retryButton) {
        dom_default.retryButton.setAttribute("hidden", "hidden");
      }
    }
  }

  // src/app.js
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
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
    if (dom_default.assignmentForm) {
      dom_default.assignmentForm.addEventListener("submit", handleAssignment);
    }
    if (dom_default.assignmentList) {
      dom_default.assignmentList.addEventListener("click", handleAssignmentListClick);
    }
    if (dom_default.refreshButton) {
      dom_default.refreshButton.addEventListener("click", () => {
        clearFormMessage();
        loadNextImage();
      });
    }
    if (dom_default.retryButton) {
      dom_default.retryButton.addEventListener("click", () => {
        clearFormMessage();
        loadNextImage();
      });
    }
    if (dom_default.createGalleryButton) {
      dom_default.createGalleryButton.addEventListener("click", handleCreateGallery);
    }
    if (dom_default.emailDropdownToggle) {
      dom_default.emailDropdownToggle.addEventListener("click", toggleEmailDropdown);
    }
    if (dom_default.emailClearButton) {
      dom_default.emailClearButton.addEventListener("click", handleEmailClear);
    }
    if (dom_default.emailDropdown) {
      dom_default.emailDropdown.addEventListener("click", handleEmailDropdownClick);
    }
    document.addEventListener("click", handleDocumentClick, true);
    document.addEventListener("keydown", handleDropdownKeydown);
  }
  function handleAssignment(event) {
    event.preventDefault();
    clearFormMessage();
    if (!dom_default.emailInput) {
      return;
    }
    const email = (dom_default.emailInput.value || "").trim().toLowerCase();
    if (!validateEmail(email)) {
      setFormMessage("Switch gallery or enter a valid email address to create a new gallery.", "error");
      dom_default.emailInput.focus();
      return;
    }
    const currentImage = getCurrentImage();
    if (!currentImage) {
      setFormMessage("No pic available to assign. Please fetch a new pic.", "error");
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
      assignedAt: (/* @__PURE__ */ new Date()).toISOString(),
      isFallback: currentImage.isFallback
    };
    if (!Array.isArray(state.assignments[email])) {
      state.assignments[email] = [];
    }
    state.assignments[email].unshift(record);
    saveAssignments();
    renderAssignments();
    setFormMessage(`Pic added to ${email}'s gallery.`, "success");
  }
  function handleCreateGallery(event) {
    event.preventDefault();
    clearFormMessage();
    if (!dom_default.emailInput) {
      return;
    }
    const email = (dom_default.emailInput.value || "").trim().toLowerCase();
    if (!validateEmail(email)) {
      setFormMessage("Switch gallery or enter a valid email address to create a new gallery.", "error");
      dom_default.emailInput.focus();
      return;
    }
    if (state.assignments[email]) {
      setFormMessage(`${email}'s gallery already exists. Clear and add a new email if you want to add a new gallery.`, "error");
      return;
    }
    registerKnownEmail(email);
    state.assignments[email] = [];
    saveAssignments();
    renderAssignments();
    setFormMessage(`Created a new gallery for ${email}. Add pics when you're ready.`, "success");
    dom_default.emailInput.focus();
  }
  function handleAssignmentListClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button || !dom_default.assignmentList || !dom_default.assignmentList.contains(button)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const action = button.getAttribute("data-action");
    const email = button.getAttribute("data-email");
    if (!action || !email || !state.assignments[email]) {
      return;
    }
    if (action === "send-gallery") {
      const images = state.assignments[email] || [];
      if (!images.length) {
        setFormMessage(`${email}'s gallery is currently empty. Add some pics before sending.`, "error");
        return;
      }
      const subject = "Your Pick-a-Pic gallery";
      const lines = images.map((image, index) => `${index + 1}. ${image.fullUrl || image.previewUrl}`);
      const bodyText = [
        `Hi ${email || "there"},`,
        "",
        "Here's a personally-curated gallery of pics chosen for you to view and enjoy, made using Pick-a-Pic:",
        "",
        ...lines,
        "",
        "\u2014 Sent via Pick-a-Pic"
      ].join("\n");
      const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
      window.location.href = mailtoLink;
      setFormMessage(`Opened an email draft for ${email}.`, "success");
      return;
    }
    if (action === "remove-gallery") {
      delete state.assignments[email];
      saveAssignments();
      renderAssignments();
      setFormMessage(`Removed ${email}'s gallery.`, "success");
      return;
    }
    if (action === "remove-image") {
      const index = parseInt(button.getAttribute("data-index"), 10);
      if (Number.isNaN(index) || index < 0) {
        return;
      }
      state.assignments[email].splice(index, 1);
      if (!state.assignments[email].length) {
        delete state.assignments[email];
      }
      saveAssignments();
      renderAssignments();
      setFormMessage(`Pic removed from ${email}.`, "success");
    }
  }
  function toggleEmailDropdown(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!dom_default.emailDropdown || !dom_default.emailDropdownToggle) {
      return;
    }
    const expanded = dom_default.emailDropdownToggle.getAttribute("aria-expanded") === "true";
    if (expanded) {
      closeEmailDropdown();
    } else {
      openEmailDropdown();
    }
  }
  function openEmailDropdown() {
    if (!dom_default.emailDropdown || !dom_default.emailDropdownToggle) {
      return;
    }
    populateEmailDropdown(Object.keys(state.assignments));
    dom_default.emailDropdown.hidden = false;
    dom_default.emailDropdownToggle.setAttribute("aria-expanded", "true");
    dom_default.emailDropdown.focus();
  }
  function closeEmailDropdown() {
    if (!dom_default.emailDropdown || !dom_default.emailDropdownToggle) {
      return;
    }
    dom_default.emailDropdown.hidden = true;
    dom_default.emailDropdownToggle.setAttribute("aria-expanded", "false");
  }
  function handleEmailDropdownClick(event) {
    let target = event.target;
    if (!(target instanceof Element) && target && target.parentElement) {
      target = target.parentElement;
    }
    if (!(target instanceof Element)) {
      return;
    }
    const option = target.closest(".email-option");
    if (!option) {
      return;
    }
    event.preventDefault();
    closeEmailDropdown();
    const email = option.dataset.email;
    if (email && dom_default.emailInput) {
      dom_default.emailInput.value = email;
      dom_default.emailInput.focus();
      if (typeof dom_default.emailInput.setSelectionRange === "function") {
        try {
          dom_default.emailInput.setSelectionRange(email.length, email.length);
        } catch (selectionError) {
          console.warn("Unable to set selection range for email input:", selectionError);
        }
      }
      setFormMessage(`Gallery switched to ${email}.`, "success");
    }
  }
  function handleEmailClear(event) {
    event.preventDefault();
    if (!dom_default.emailInput) {
      return;
    }
    dom_default.emailInput.value = "";
    dom_default.emailInput.focus();
    clearFormMessage();
    populateEmailDropdown(Object.keys(state.assignments));
    closeEmailDropdown();
  }
  function handleDocumentClick(event) {
    if (!dom_default.emailDropdown || dom_default.emailDropdown.hidden) {
      return;
    }
    if (event.target === dom_default.emailDropdown || dom_default.emailDropdown.contains(event.target) || event.target === dom_default.emailDropdownToggle) {
      return;
    }
    closeEmailDropdown();
  }
  function handleDropdownKeydown(event) {
    if (!dom_default.emailDropdown || dom_default.emailDropdown.hidden) {
      return;
    }
    const options = Array.from(dom_default.emailDropdown.querySelectorAll(".email-option"));
    if (!options.length) {
      return;
    }
    const currentIndex = options.findIndex((option) => option.getAttribute("aria-selected") === "true");
    if (event.key === "Escape") {
      closeEmailDropdown();
      dom_default.emailDropdownToggle.focus();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      let nextIndex = currentIndex;
      if (event.key === "ArrowDown") {
        nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
      }
      options.forEach((option, index) => {
        if (index === nextIndex) {
          option.setAttribute("aria-selected", "true");
          option.scrollIntoView({ block: "nearest" });
        } else {
          option.removeAttribute("aria-selected");
        }
      });
    }
    if (event.key === "Enter" || event.key === " ") {
      const selected = dom_default.emailDropdown.querySelector('.email-option[aria-selected="true"]');
      if (selected) {
        selected.click();
        event.preventDefault();
      }
    }
  }
  function clearFormMessage() {
    if (!dom_default.formMessage) {
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
    dom_default.formMessage.classList.remove("is-visible", "is-fading", "error", "success");
    dom_default.formMessage.textContent = "";
  }
  function setFormMessage(message, type) {
    if (!dom_default.formMessage) {
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
    dom_default.formMessage.classList.remove("is-fading", "error", "success");
    if (type) {
      dom_default.formMessage.classList.add(type);
    }
    dom_default.formMessage.textContent = message;
    dom_default.formMessage.classList.add("is-visible");
    state.formMessageTimer = window.setTimeout(() => {
      state.formMessageTimer = null;
      initiateFormMessageFade();
    }, 3e3);
  }
  function initiateFormMessageFade() {
    if (!dom_default.formMessage) {
      return;
    }
    if (!dom_default.formMessage.textContent) {
      clearFormMessage();
      return;
    }
    dom_default.formMessage.classList.remove("is-visible");
    dom_default.formMessage.classList.add("is-fading");
    state.formMessageFadeTimer = window.setTimeout(() => {
      state.formMessageFadeTimer = null;
      clearFormMessage();
    }, 260);
  }
})();
