
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
      el.innerHTML = `
        <h3>Hafta ${i}</h3>
        <p><a href="data/${hasta.id}/hafta_${i}/liste.pdf" target="_blank">📄 PDF Listesini Görüntüle</a></p>
        <p>🖼 Tarif Kartları:</p>
        <div class="kartlar">
          <img src="data/${hasta.id}/hafta_${i}/kartlar/enginar.jpg" alt="Enginar" width="100" />
          <img src="data/${hasta.id}/hafta_${i}/kartlar/yumurta.jpg" alt="Yumurta" width="100" />
        </div>
        <p>📝 Haftalık Mesaj:</p>
        <textarea rows="4" style="width:100%;">Bu hafta başlangıç yapıldı...</textarea>
        <br><button onclick="alert('ZIP oluşturma ileride eklenecek')">📦 ZIP OLUŞTUR</button>
      `;
      haftalarDiv.appendChild(el);
    }
  });
