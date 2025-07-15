
let hastalar = [];

fetch("hastalar.json")
  .then(res => res.json())
  .then(data => {
    hastalar = data;
    guncelleListe();
  });

function guncelleListe() {
  const liste = document.getElementById("hasta-listesi");
  const template = document.getElementById("hasta-karti");
  liste.innerHTML = "";
  const arama = document.getElementById("arama").value.toLowerCase();

  hastalar
    .filter(h => !h.arsiv && h.isim.toLowerCase().includes(arama))
    .forEach(hasta => {
      const kart = template.content.cloneNode(true);
      kart.querySelector(".isim").innerText = hasta.isim;
      kart.querySelector(".hafta").innerText = `(${hasta.hafta}. hafta)`;
      kart.querySelector(".detay").onclick = () => window.location.href = `hasta.html?id=${hasta.id}`;
      kart.querySelector(".duzenle").onclick = () => alert("Düzenle (yakında)");
      kart.querySelector(".arsivle").onclick = () => alert("Arşivle (yakında)");
      liste.appendChild(kart);
    });
}

function filtrele() {
  guncelleListe();
}

function yeniHasta() {
  alert("Yeni hasta ekleme (yakında)");
}
