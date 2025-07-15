const hastaListesi = document.getElementById("hastaListesi");
if (hastaListesi) {
  hastaListesi.innerHTML = '<a href="hasta.html?id=hatice_hanim">Hatice Hanım (5. hafta)</a>';
}

function yeniHaftaEkle() {
  const haftalar = document.getElementById("haftalar");
  const yeniHafta = document.createElement("div");
  yeniHafta.innerHTML = "<h3>Yeni Hafta Eklendi</h3>";
  haftalar.appendChild(yeniHafta);
}