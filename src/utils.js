export function validateEmail(email) {
  if (!email) {
    return false;
  }
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

export function formatTimestamp(isoString) {
  if (!isoString) {
    return '';
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

export function addCacheBuster(url, stamp) {
  const seed = typeof stamp === 'number' ? stamp : Date.now();
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${seed}`;
}

export function generateSeed() {
  const randomPart = Math.random().toString(36).slice(2, 10);
  const timePart = Date.now().toString(36);
  return `${randomPart}-${timePart}`;
}

export function createProceduralImage(width, height, seed) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    return '';
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

  return canvas.toDataURL('image/png');
}

export function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Pic failed to load.'));
    img.crossOrigin = 'anonymous';
    img.src = url;
  });
}

function createSeededRandom(seed) {
  let value = seed || 1;
  return function () {
    value += 0x6d2b79f5;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
