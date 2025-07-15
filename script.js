const hastalar = JSON.parse(localStorage.getItem("hastalar") || "[]");
const hastaListesi = document.getElementById("hastaListesi");

if (hastaListesi) {
  renderHastaListesi();
}

function renderHastaListesi() {
  hastaListesi.innerHTML = "";
  hastalar.forEach((hasta, index) => {
    const li = document.createElement("li");
    li.innerHTML = `<a href="hasta.html?id=${hasta.id}">${hasta.isim} (${hasta.hafta}. hafta)</a>`;
    hastaListesi.appendChild(li);
  });
}

function yeniHastaEkle() {
  const isim = prompt("Hastanın ismi nedir?");
  if (!isim) return;
  const id = isim.toLowerCase().replace(/ /g, "_");
  const yeni = { id, isim, hafta: 1 };
  hastalar.push(yeni);
  localStorage.setItem("hastalar", JSON.stringify(hastalar));
  renderHastaListesi();
}

function yeniHaftaEkle() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const hasta = hastalar.find(h => h.id === id);
  if (!hasta) return;
  hasta.hafta += 1;
  localStorage.setItem("hastalar", JSON.stringify(hastalar));
  location.reload();
}

const baslik = document.getElementById("hastaBaslik");
const haftalarListesi = document.getElementById("haftalarListesi");
if (baslik && haftalarListesi) {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const hasta = hastalar.find(h => h.id === id);
  if (hasta) {
    baslik.textContent = hasta.isim + " (" + hasta.hafta + ". hafta)";
    for (let i = 1; i <= hasta.hafta; i++) {
      const li = document.createElement("li");
      li.textContent = "Hafta " + i;
      haftalarListesi.appendChild(li);
    }
  }
}