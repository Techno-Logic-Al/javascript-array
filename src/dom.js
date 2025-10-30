const dom = {
  activeImage: document.getElementById('activeImage'),
  previewPanel: document.querySelector('.preview-panel'),
  assignmentPanel: document.querySelector('.assignment-panel'),
  imageOverlay: document.getElementById('imageOverlay'),
  overlayMessage: document.getElementById('overlayMessage'),
  retryButton: document.getElementById('retryButton'),
  refreshButton: document.getElementById('refreshButton'),
  imageAuthor: document.getElementById('imageAuthor'),
  imageDimensions: document.getElementById('imageDimensions'),
  viewSourceLink: document.getElementById('viewSourceLink'),
  assignmentForm: document.getElementById('assignmentForm'),
  emailInput: document.getElementById('emailInput'),
  formMessage: document.getElementById('formMessage'),
  assignmentList: document.getElementById('assignmentList'),
  createGalleryButton: document.getElementById('createGalleryButton'),
  emailClearButton: document.getElementById('emailClearButton'),
  emailDropdownToggle: document.getElementById('emailDropdownToggle'),
  emailDropdown: document.getElementById('emailDropdown'),
  primaryButton: document.querySelector('#assignmentForm .primary-button')
};

export default dom;
