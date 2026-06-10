// Konfiguracja połączenia z Supabase
const SUPABASE_URL = 'TWÓJ_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'TWÓJ_SUPABASE_ANON_KEY';

// Inicjalizacja klienta Supabase
const supabase = supabaseJS.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elementy DOM
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const pinInput = document.getElementById('pin');
const alertBox = document.getElementById('alert');
const btnRegister = document.getElementById('btn-register');

// Funkcja pomocnicza do wyświetlania alertów
function showAlert(message, type) {
  alertBox.textContent = message;
  alertBox.classList.remove('hidden');
  
  if (type === 'success') {
    alertBox.className = 'p-3 mb-4 text-xs rounded-lg font-medium text-center bg-emerald-900/50 text-emerald-300 border border-emerald-800';
  } else {
    alertBox.className = 'p-3 mb-4 text-xs rounded-lg font-medium text-center bg-rose-900/50 text-rose-300 border border-rose-800';
  }
}

// Obsługa logowania
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = usernameInput.value.trim().toLowerCase();
  const pin = pinInput.value.trim();

  if (!username || !pin) {
    showAlert('Wypełnij wszystkie pola', 'error');
    return;
  }

  try {
    // Sprawdzamy czy w tabeli 'users' istnieje użytkownik z takim loginem i PIN-em
    const { data, error } = await supabase
      .from('users')
      .select('id, username')
      .eq('username', username)
      .eq('pin', pin)
      .maybeSingle(); // Zwraca obiekt lub null, jeśli nie znajdzie nic

    if (error) throw error;

    if (data) {
      showAlert('Zalogowano pomyślnie! Przekierowanie...', 'success');
      
      // Zapisujemy prostą "sesję" użytkownika w localStorage
      localStorage.setItem('wc_user_id', data.id);
      localStorage.setItem('wc_username', data.username);
      
      // Przekierowanie na przyszłą stronę główną z typowaniem grup
      setTimeout(() => {
        window.location.href = './index.html';
      }, 1200);
    } else {
      showAlert('Błędny login lub PIN. Spróbuj ponownie.', 'error');
    }
  } catch (err) {
    console.error(err);
    showAlert('Wystąpił błąd podczas logowania: ' + err.message, 'error');
  }
});

// Obsługa rejestracji (dodania nowego loginu i PIN-u)
btnRegister.addEventListener('click', async () => {
  const username = usernameInput.value.trim().toLowerCase();
  const pin = pinInput.value.trim();

  if (!username || !pin) {
    showAlert('Wpisz login i PIN w pola formularza, a następnie kliknij "Stwórz nowe konto"', 'error');
    return;
  }

  try {
    // Dodanie użytkownika do tabeli 'users'
    const { data, error } = await supabase
      .from('users')
      .insert([{ username: username, pin: pin }])
      .select();

    if (error) {
      if (error.code === '23505') { // Kod błędu dla zdublowanego klucza unikalnego (username)
        showAlert('Ta nazwa użytkownika jest już zajęta.', 'error');
      } else {
        throw error;
      }
    } else {
      showAlert('Konto zostało utworzone! Możesz się teraz zalogować.', 'success');
    }
  } catch (err) {
    console.error(err);
    showAlert('Wystąpił błąd podczas rejestracji: ' + err.message, 'error');
  }
});

// Automatyczne sprawdzenie, czy użytkownik jest już zalogowany w tej przeglądarce
function checkExistingSession() {
  const loggedUser = localStorage.getItem('wc_user_id');
  if (loggedUser) {
    // Jeśli sesja istnieje, od razu przechodzimy do kolejnego etapu
    window.location.href = './index.html';
  }
}

checkExistingSession();