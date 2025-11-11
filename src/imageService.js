import dom from './dom.js';
import { state } from './state.js';
import {
  LOCAL_IMAGE_LIBRARY,
  API_MAX_PAGES,
  API_RETRY_COUNT,
  SEED_WIDTH,
  SEED_HEIGHT
} from './constants.js';
import { addCacheBuster, generateSeed, createProceduralImage, preloadImage } from './utils.js';

export async function loadNextImage() {
  showOverlay('Fetching pic...', false);

  try {
    const imageData = await consumePrefetchedImage();
    if (!imageData) {
      throw new Error('No pic available.');
    }

    state.currentImage = imageData;
    await displayImage(imageData, { skipPreload: Boolean(imageData.isPreloaded) });
    queuePrefetch();
  } catch (error) {
    console.error(error);
    state.currentImage = null;
    showOverlay('We could not fetch a new pic. Check your connection and try again.', true);
  }
}

export function queuePrefetch() {
  if (state.pendingPrefetch) {
    return;
  }

  state.pendingPrefetch = fetchAndPrepareImage()
    .then((image) => {
      state.prefetchedImage = image;
      return image;
    })
    .catch((error) => {
      console.warn('Prefetch failed:', error);
      state.prefetchedImage = null;
      return null;
    });
}

export function getCurrentImage() {
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
  if (typeof window.fetch !== 'function') {
    const fallbackOnly = getFallbackImage();
    if (!fallbackOnly) {
      throw new Error('No fallback pics available.');
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
      console.warn('Pic source failed, trying another.', error);
    }
  }

  const fallback = getFallbackImage();
  if (!fallback) {
    throw new Error('Unable to load any pics at this time.');
  }
  return fallback;
}

async function fetchRandomImage() {
  let lastError = null;

  for (let attempt = 0; attempt < API_RETRY_COUNT; attempt += 1) {
    const randomPage = Math.floor(Math.random() * API_MAX_PAGES) + 1;
    try {
      const response = await fetch(`https://picsum.photos/v2/list?page=${randomPage}&limit=1`, {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Picsum request failed (${response.status})`);
      }

      const payload = await response.json();
      if (!Array.isArray(payload) || !payload.length) {
        throw new Error('Picsum returned an unexpected response.');
      }

      return buildImageFromApi(payload[0]);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to reach Picsum.');
}

function buildImageFromApi(item) {
  const stamp = Date.now();
  const previewBase = `https://picsum.photos/id/${item.id}/900/600`;
  const thumbBase = `https://picsum.photos/id/${item.id}/320/220`;

  return {
    id: item.id,
    author: item.author || 'Unknown artist',
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
    author: 'Picsum Photos',
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
    sourcePage: '#',
    isFallback: true
  };
}

async function displayImage(image, options) {
  const skipPreload = Boolean(options && options.skipPreload);
  if (!skipPreload) {
    await preloadImage(image.previewUrl);
  }

  if (dom.activeImage) {
    dom.activeImage.onerror = () => {
      showOverlay('We could not render the preview. Please try another pic.', true);
    };
    dom.activeImage.src = image.previewUrl;
    dom.activeImage.alt = `Pic by ${image.author}`;
  }

  if (dom.imageAuthor) {
    dom.imageAuthor.textContent = `Pic by ${image.author}`;
  }

  if (dom.imageDimensions) {
    dom.imageDimensions.textContent = `${image.originalWidth} x ${image.originalHeight}px`;
  }

  if (dom.viewSourceLink) {
    dom.viewSourceLink.href = image.sourcePage || '#';
  }

  showOverlay('', false, true);
}

function showOverlay(message, isError, hide) {
  if (!dom.imageOverlay || !dom.overlayMessage) {
    return;
  }

  if (hide) {
    dom.overlayMessage.classList.remove('error');
    dom.imageOverlay.classList.remove('has-error');
    if (dom.retryButton) {
      dom.retryButton.setAttribute('hidden', 'hidden');
    }
    dom.imageOverlay.hidden = true;
    return;
  }

  dom.imageOverlay.hidden = false;

  if (typeof message === 'string') {
    dom.overlayMessage.textContent = message;
  }

  if (isError) {
    dom.overlayMessage.classList.add('error');
    dom.imageOverlay.classList.add('has-error');
    if (dom.retryButton) {
      dom.retryButton.removeAttribute('hidden');
    }
  } else {
    dom.overlayMessage.classList.remove('error');
    dom.imageOverlay.classList.remove('has-error');
    if (dom.retryButton) {
      dom.retryButton.setAttribute('hidden', 'hidden');
    }
  }
}
