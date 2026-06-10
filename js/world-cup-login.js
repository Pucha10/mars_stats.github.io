
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const pinInput = document.getElementById('pin');
const alertBox = document.getElementById('alert');
const btnRegister = document.getElementById('btn-register');

function showAlert(message, type) {
  alertBox.textContent = message;
  alertBox.classList.remove('hidden');
  
  if (type === 'success') {
    alertBox.className = 'p-3 mb-4 text-xs rounded-lg font-medium text-center bg-emerald-900/50 text-emerald-300 border border-emerald-800';
  } else {
    alertBox.className = 'p-3 mb-4 text-xs rounded-lg font-medium text-center bg-rose-900/50 text-rose-300 border border-rose-800';
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim().toLowerCase();
  const pin = pinInput.value.trim();
  if (!username || !pin) {
    showAlert('Wypełnij wszystkie pola', 'error');
    return;
  }
  loginUser(username, pin);
});

btnRegister.addEventListener('click', async () => {
  const username = usernameInput.value.trim().toLowerCase();
  const pin = pinInput.value.trim();
  if (!username || !pin) {
    showAlert('Wpisz login i PIN w pola formularza, a następnie kliknij "Stwórz nowe konto"', 'error');
    return;
  }
  registerUser(username, pin);
});

function checkExistingSession() {
  const loggedUser = localStorage.getItem('wc_user_id');
  if (loggedUser) {
    window.location.href = './world-cup.html';
  }
}

checkExistingSession();