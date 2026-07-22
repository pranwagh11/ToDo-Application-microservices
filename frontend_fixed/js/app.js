/* global Api */

const COLORS = [
  { id: 'default', label: 'Default' },
  { id: 'sage', label: 'Sage' },
  { id: 'sky', label: 'Sky' },
  { id: 'blush', label: 'Blush' },
  { id: 'lavender', label: 'Lavender' },
  { id: 'sand', label: 'Sand' },
  { id: 'coral', label: 'Coral' },
  { id: 'mint', label: 'Mint' },
];

const state = {
  token: null,
  user: null,
  tasks: [],
  filter: 'active', // 'active' | 'completed'
  search: '',
  composerColor: 'default',
};

// Note color is a presentation-only concern the backend doesn't store, so
// we keep a local id -> color map in localStorage, keyed per user.
const ColorStore = {
  key() {
    return `keepr_colors_${state.user ? state.user.id : 'anon'}`;
  },
  load() {
    try {
      return JSON.parse(localStorage.getItem(this.key())) || {};
    } catch {
      return {};
    }
  },
  get(taskId) {
    return this.load()[taskId] || 'default';
  },
  set(taskId, colorId) {
    const map = this.load();
    map[taskId] = colorId;
    localStorage.setItem(this.key(), JSON.stringify(map));
  },
  remove(taskId) {
    const map = this.load();
    delete map[taskId];
    localStorage.setItem(this.key(), JSON.stringify(map));
  },
};

// ---------------------------------------------------------------------
// Elements
// ---------------------------------------------------------------------
const el = {
  authScreen: document.getElementById('authScreen'),
  appShell: document.getElementById('appShell'),

  authTabs: document.querySelectorAll('.auth-tab'),
  loginForm: document.getElementById('loginForm'),
  registerForm: document.getElementById('registerForm'),
  loginError: document.getElementById('loginError'),
  registerError: document.getElementById('registerError'),

  forgotPasswordLink: document.getElementById('forgotPasswordLink'),
  backToLoginLink: document.getElementById('backToLoginLink'),
  forgotForm: document.getElementById('forgotForm'),
  forgotError: document.getElementById('forgotError'),
  resetForm: document.getElementById('resetForm'),
  resetError: document.getElementById('resetError'),
  resetEmailDisplay: document.getElementById('resetEmailDisplay'),
  resendOtpLink: document.getElementById('resendOtpLink'),

  userName: document.getElementById('userName'),
  logoutBtn: document.getElementById('logoutBtn'),
  searchInput: document.getElementById('searchInput'),

  sideLinks: document.querySelectorAll('.side-link'),

  composer: document.getElementById('composer'),
  composerCollapsed: document.getElementById('composerCollapsed'),
  composerExpanded: document.getElementById('composerExpanded'),
  composerTitle: document.getElementById('composerTitle'),
  composerBody: document.getElementById('composerBody'),
  composerSwatches: document.getElementById('composerSwatches'),
  composerCancel: document.getElementById('composerCancel'),
  quickAddBtn: document.getElementById('quickAddBtn'),

  notesGrid: document.getElementById('notesGrid'),
  emptyState: document.getElementById('emptyState'),
  noteCardTemplate: document.getElementById('noteCardTemplate'),

  toast: document.getElementById('toast'),
};

// ---------------------------------------------------------------------
// Auth screen <-> App shell: real DOM insertion/removal
// ---------------------------------------------------------------------
// Comment nodes mark exactly where each section belongs in the document,
// so we can fully detach one and reattach the other in the right spot
// (instead of just toggling a `hidden` attribute).
const authScreenAnchor = document.createComment('authScreen-anchor');
const appShellAnchor = document.createComment('appShell-anchor');
el.authScreen.parentNode.insertBefore(authScreenAnchor, el.authScreen);
el.appShell.parentNode.insertBefore(appShellAnchor, el.appShell);

// Default state on page load: login section present, app shell absent.
el.authScreen.removeAttribute('hidden');
el.appShell.remove();

function showAuthScreen() {
  if (el.appShell.isConnected) el.appShell.remove();
  if (!el.authScreen.isConnected) {
    authScreenAnchor.parentNode.insertBefore(el.authScreen, authScreenAnchor.nextSibling);
  }
}

function showAppShell() {
  if (el.authScreen.isConnected) el.authScreen.remove();
  if (!el.appShell.isConnected) {
    appShellAnchor.parentNode.insertBefore(el.appShell, appShellAnchor.nextSibling);
  }
}

// ---------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------
let toastTimer;
function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('is-visible'), 2600);
}

// ---------------------------------------------------------------------
// Auth screen behavior
// ---------------------------------------------------------------------
function showAuthForm(name) {
  // name: 'login' | 'register' | 'forgot' | 'reset'
  const isTabbed = name === 'login' || name === 'register';
  el.authTabs.forEach((t) => t.parentNode.hidden = !isTabbed);
  if (isTabbed) {
    el.authTabs.forEach((t) => t.classList.toggle('is-active', t.dataset.tab === name));
  }
  el.loginForm.hidden = name !== 'login';
  el.registerForm.hidden = name !== 'register';
  el.forgotForm.hidden = name !== 'forgot';
  el.resetForm.hidden = name !== 'reset';
}

el.authTabs.forEach((tab) => {
  tab.addEventListener('click', () => showAuthForm(tab.dataset.tab));
});

// Carries the email between step 1 (request code) and step 2 (verify code),
// since the reset-password call needs it and there's no link/token to
// encode it in anymore.
let pendingResetEmail = '';

el.forgotPasswordLink.addEventListener('click', () => {
  el.forgotError.textContent = '';
  el.forgotForm.reset();
  showAuthForm('forgot');
});

el.backToLoginLink.addEventListener('click', () => showAuthForm('login'));

async function sendResetCode(email) {
  await Api.forgotPassword({ email });
  pendingResetEmail = email;
  el.resetEmailDisplay.textContent = email;
  el.resetError.textContent = '';
  el.resetForm.reset();
  showAuthForm('reset');
}

el.forgotForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  el.forgotError.textContent = '';
  const email = document.getElementById('forgotEmail').value.trim();

  try {
    await sendResetCode(email);
    showToast('If that email exists, a code is on its way.');
  } catch (err) {
    el.forgotError.textContent = err.message;
  }
});

el.resendOtpLink.addEventListener('click', async () => {
  if (!pendingResetEmail) {
    showAuthForm('forgot');
    return;
  }
  try {
    await sendResetCode(pendingResetEmail);
    showToast('Sent a new code.');
  } catch (err) {
    el.resetError.textContent = err.message;
  }
});

el.resetForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  el.resetError.textContent = '';
  const otp = document.getElementById('resetOtp').value.trim();
  const password = document.getElementById('resetPassword').value;
  const confirm = document.getElementById('resetPasswordConfirm').value;

  if (password !== confirm) {
    el.resetError.textContent = "Passwords don't match.";
    return;
  }

  try {
    await Api.resetPassword({ email: pendingResetEmail, otp, newPassword: password });
    showToast('Password reset — you can log in now.');
    pendingResetEmail = '';
    el.resetForm.reset();
    showAuthForm('login');
  } catch (err) {
    el.resetError.textContent = err.message;
  }
});

el.loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  el.loginError.textContent = '';
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await Api.login({ email, password });
    onAuthenticated(res.data.token, res.data.user);
  } catch (err) {
    el.loginError.textContent = err.message;
  }
});

el.registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  el.registerError.textContent = '';
  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;

  try {
    const res = await Api.register({ name, email, password });
    //onAuthenticated(res.data.token, res.data.user);
    showToast('Registration sucessfully done');
    redirect_to_login();

  } catch (err) {
    el.registerError.textContent = err.message;
  }

});

function redirect_to_login(){
  
  el.loginForm.reset();
  el.registerForm.reset();
  document.querySelector('button[data-tab="login"]').click();
}

el.logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('keepr_token');
  localStorage.removeItem('keepr_user');
  state.token = null;
  state.user = null;
  state.tasks = [];
  showAuthScreen(); // removes appShell from the DOM, re-inserts authScreen
  el.loginForm.reset();
  el.registerForm.reset();
});

function onAuthenticated(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('keepr_token', token);
  localStorage.setItem('keepr_user', JSON.stringify(user));
  enterApp();

}

async function enterApp() {
  showAppShell(); // removes authScreen from the DOM, re-inserts appShell
  el.userName.textContent = state.user ? state.user.name : '';
  await loadTasks();
}

// ---------------------------------------------------------------------
// Sidebar + search
// ---------------------------------------------------------------------
el.sideLinks.forEach((link) => {
  link.addEventListener('click', () => {
    el.sideLinks.forEach((l) => l.classList.remove('is-active'));
    link.classList.add('is-active');
    state.filter = link.dataset.filter;
    renderTasks();
  });
});

el.searchInput.addEventListener('input', (e) => {
  state.search = e.target.value.trim().toLowerCase();
  renderTasks();
});

// ---------------------------------------------------------------------
// Composer
// ---------------------------------------------------------------------
COLORS.forEach((color) => {
  const dot = document.createElement('button');
  dot.type = 'button';
  dot.className = `swatch swatch-${color.id}`;
  dot.title = color.label;
  dot.setAttribute('aria-label', color.label);
  if (color.id === 'default') dot.classList.add('is-selected');
  dot.addEventListener('click', () => {
    state.composerColor = color.id;
    el.composerSwatches.querySelectorAll('.swatch').forEach((s) => s.classList.remove('is-selected'));
    dot.classList.add('is-selected');
  });
  el.composerSwatches.appendChild(dot);
});

el.composerCollapsed.addEventListener('click', openComposer);
el.quickAddBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  openComposer();
});

function openComposer() {
  el.composerCollapsed.hidden = true;
  el.composerExpanded.hidden = false;
  el.composerTitle.focus();
}

function closeComposer() {
  el.composerExpanded.hidden = true;
  el.composerCollapsed.hidden = false;
  el.composerTitle.value = '';
  el.composerBody.value = '';
  state.composerColor = 'default';
  el.composerSwatches.querySelectorAll('.swatch').forEach((s) => s.classList.remove('is-selected'));
  el.composerSwatches.querySelector('.swatch-default').classList.add('is-selected');
}

el.composerCancel.addEventListener('click', closeComposer);

el.composerExpanded.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = el.composerTitle.value.trim();
  const description = el.composerBody.value.trim();
  if (!title) {
    el.composerTitle.focus();
    return;
  }

  try {
    const res = await Api.createTask({ title, description });
    ColorStore.set(res.data.id, state.composerColor);
    state.tasks.unshift(res.data);
    closeComposer();
    renderTasks();
    showToast('Note saved');
  } catch (err) {
    showToast(err.message);
  }
});

// ---------------------------------------------------------------------
// Tasks: load + render
// ---------------------------------------------------------------------
async function loadTasks() {
  try {
    const res = await Api.listTasks();
    state.tasks = res.data;
    renderTasks();
  } catch (err) {
    showToast(err.message);
  }
}

function visibleTasks() {
  return state.tasks
    .filter((t) => (state.filter === 'completed' ? t.status === 'completed' : t.status !== 'completed'))
    .filter((t) => {
      if (!state.search) return true;
      const haystack = `${t.title} ${t.description || ''}`.toLowerCase();
      return haystack.includes(state.search);
    });
}

function renderTasks() {
  const tasks = visibleTasks();
  el.notesGrid.innerHTML = '';

  if (tasks.length === 0) {
    el.emptyState.hidden = false;
    el.emptyState.textContent =
      state.filter === 'completed'
        ? 'Nothing completed yet.'
        : state.search
        ? 'No notes match your search.'
        : 'No notes yet. Start typing above to add one.';
  } else {
    el.emptyState.hidden = true;
  }

  tasks.forEach((task) => el.notesGrid.appendChild(buildCard(task)));
}

function buildCard(task) {
  const node = el.noteCardTemplate.content.firstElementChild.cloneNode(true);
  const colorId = ColorStore.get(task.id);

  node.classList.add(`swatch-${colorId}`);
  if (task.status === 'completed') node.classList.add('is-completed');
  node.dataset.id = task.id;

  node.querySelector('.note-card__title').textContent = task.title;
  node.querySelector('.note-card__desc').textContent = task.description || '';
  node.querySelector('.note-card__status').textContent = task.status.replace('_', ' ');

  const checkBtn = node.querySelector('.note-card__check');
  checkBtn.addEventListener('click', () => toggleComplete(task));

  node.querySelector('.note-card__edit').addEventListener('click', () => startEdit(node, task));
  node.querySelector('.note-card__delete').addEventListener('click', () => removeTask(task));

  return node;
}

async function toggleComplete(task) {
  if (task.status === 'completed') {
    // No "uncomplete" endpoint exists, so this only flips forward.
    showToast('Notes move to Completed and stay there.');
    return;
  }
  try {
    const res = await Api.completeTask(task.id);
    const idx = state.tasks.findIndex((t) => t.id === task.id);
    state.tasks[idx] = res.data;
    renderTasks();
    showToast('Marked complete');
  } catch (err) {
    showToast(err.message);
  }
}

async function removeTask(task) {
  try {
    await Api.deleteTask(task.id);
    ColorStore.remove(task.id);
    state.tasks = state.tasks.filter((t) => t.id !== task.id);
    renderTasks();
    showToast('Note deleted');
  } catch (err) {
    showToast(err.message);
  }
}

function startEdit(node, task) {
  const body = node.querySelector('.note-card__body');
  const footer = node.querySelector('.note-card__footer');

  body.innerHTML = '';
  const titleInput = document.createElement('input');
  titleInput.className = 'composer__title';
  titleInput.value = task.title;

  const descInput = document.createElement('textarea');
  descInput.className = 'composer__body';
  descInput.rows = 3;
  descInput.value = task.description || '';

  const actions = document.createElement('div');
  actions.className = 'composer__actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn--ghost';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => renderTasks());

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'btn btn--primary';
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', async () => {
    const title = titleInput.value.trim();
    if (!title) {
      titleInput.focus();
      return;
    }
    try {
      const res = await Api.updateTask(task.id, {
        title,
        description: descInput.value.trim(),
      });
      const idx = state.tasks.findIndex((t) => t.id === task.id);
      state.tasks[idx] = res.data;
      renderTasks();
      showToast('Note updated');
    } catch (err) {
      showToast(err.message);
    }
  });

  actions.append(cancelBtn, saveBtn);
  body.append(titleInput, descInput, actions);
  footer.hidden = true;
  titleInput.focus();
}

// ---------------------------------------------------------------------
// Bootstrap: resume session if a token is already stored
// ---------------------------------------------------------------------
(function bootstrap() {
  const token = localStorage.getItem('keepr_token');
  const userRaw = localStorage.getItem('keepr_user');
  if (token && userRaw) {
    state.token = token;
    state.user = JSON.parse(userRaw);
    enterApp();
  }
})();
