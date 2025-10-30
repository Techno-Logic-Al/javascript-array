import dom from './dom.js';
import { state } from './state.js';
import { updateToastPosition } from './toast.js';

export function scheduleAssignmentHeightSync() {
  if (state.heightSyncFrame) {
    return;
  }
  state.heightSyncFrame = window.requestAnimationFrame(() => {
    state.heightSyncFrame = null;
    syncAssignmentHeight();
  });
}

export function syncAssignmentHeight() {
  if (!dom.assignmentPanel) {
    return;
  }

  if (window.innerWidth < 992) {
    dom.assignmentPanel.style.minHeight = '';
    return;
  }

  if (!dom.previewPanel) {
    return;
  }

  const previewRect = dom.previewPanel.getBoundingClientRect();
  const previewHeight = Math.max(0, Math.ceil(previewRect.height));

  if (!previewHeight) {
    dom.assignmentPanel.style.minHeight = '';
    return;
  }

  dom.assignmentPanel.style.minHeight = `${previewHeight}px`;
}

export function handleViewportChange() {
  updateToastPosition();
  scheduleAssignmentHeightSync();
}
