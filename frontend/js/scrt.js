// Function to show the App and remove Auth from DOM
function mountApp() {
  const authScreen = document.getElementById('auth-screen');
  if (authScreen) authScreen.remove(); // Remove login from DOM

  // Assuming you have an app-shell template in your HTML or you create it
  const appShell = document.getElementById('app-shell');
  appShell.hidden = false;
  loadTasks();
}

// Function to handle Logout: Remove App, Re-add Auth
function logout() {
  localStorage.removeItem('keepr_token');
  
  // 1. Remove App Shell from DOM
  const appShell = document.getElementById('app-shell');
  appShell.remove();
  
  // 2. Re-inject the Auth screen
  const authContainer = document.createElement('div');
  authContainer.id = 'auth-screen';
  authContainer.className = 'auth-container';
  authContainer.innerHTML = `
    <div class="auth-card">
      <!-- Re-insert your login/register HTML structure here -->
    </div>
  `;
  document.body.prepend(authContainer);
}