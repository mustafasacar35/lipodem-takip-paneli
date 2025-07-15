
function login() {
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;
  if (u === 'admin' && p === 'lipodem123') {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    loadHastaListesi();
  } else {
    alert('Geçersiz giriş!');
  }
}
