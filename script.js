
function loadHastaListesi() {
  fetch('hastalar.json')
    .then(res => res.json())
    .then(data => {
      const div = document.getElementById('hasta-listesi');
      div.innerHTML = '';
      data.forEach(hasta => {
        const el = document.createElement('div');
        el.className = 'hasta-karti';
        el.innerHTML = `<strong>${hasta.isim}</strong> (${hasta.hafta}. hafta)`;
        el.onclick = () => window.location.href = 'hasta.html?id=' + hasta.id;
        div.appendChild(el);
      });
    });
}
