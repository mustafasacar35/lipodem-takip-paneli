
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

const hastaId = getQueryParam('id');

fetch('hastalar.json')
  .then(res => res.json())
  .then(hastalar => {
    const hasta = hastalar.find(h => h.id === hastaId);
    if (!hasta) {
      document.getElementById('hasta-detay').innerHTML = "Hasta bulunamadı.";
      return;
    }
    document.getElementById('hasta-isim').innerText = `${hasta.isim} (${hasta.hafta}. hafta)`;
    const haftalarDiv = document.getElementById('haftalar');
    for (let i = 1; i <= hasta.hafta; i++) {
      const el = document.createElement('div');
      el.className = 'hafta-kutu';
      el.innerText = `Hafta ${i}`;
      haftalarDiv.appendChild(el);
    }
  });
