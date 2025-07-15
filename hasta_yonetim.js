
let hastalar = [];
let arsivGorunumu = false;

function kaydetJSON() {
  localStorage.setItem("hastalar", JSON.stringify(hastalar));
}

function yukleJSON() {
  const kayitli = localStorage.getItem("hastalar");
  if (kayitli) {
    hastalar = JSON.parse(kayitli);
    guncelleListe();
  } else {
    fetch("hastalar.json")
      .then(res => res.json())
      .then(data => {
        hastalar = data;
        kaydetJSON();
        guncelleListe();
      });
  }
}

function arsivModu(aktifMi) {
  arsivGorunumu = aktifMi;
  guncelleListe();
}

function guncelleListe() {
  const liste = document.getElementById("hasta-listesi");
  const template = document.getElementById("hasta-karti");
  liste.innerHTML = "";
  const arama = document.getElementById("arama").value.toLowerCase();

  hastalar
    .filter(h => h.arsiv === arsivGorunumu && h.isim.toLowerCase().includes(arama))
    .forEach((hasta, index) => {
      const kart = template.content.cloneNode(true);
      kart.querySelector(".isim").innerText = hasta.isim;
      kart.querySelector(".hafta").innerText = `(${hasta.hafta}. hafta)`;
      kart.querySelector(".detay").onclick = () => window.location.href = `hasta.html?id=${hasta.id}`;
      kart.querySelector(".duzenle").onclick = () => duzenleHasta(index);
      kart.querySelector(".arsivle").onclick = () => arsivleHasta(index);
      liste.appendChild(kart);
    });
}

function yeniHasta() {
  const isim = prompt("Hasta adı:");
  if (!isim) return;
  const id = isim.toLowerCase().replace(/ /g, "_");
  hastalar.push({ id, isim, hafta: 1, aktif: true, arsiv: false, notlar: "", program_baslangici: new Date().toISOString().slice(0,10) });
  kaydetJSON();
  guncelleListe();
}

function duzenleHasta(index) {
  const yeniIsim = prompt("Yeni ad:", hastalar[index].isim);
  if (yeniIsim) {
    hastalar[index].isim = yeniIsim;
    kaydetJSON();
    guncelleListe();
  }
}

function arsivleHasta(index) {
  if (arsivGorunumu) {
    if (confirm("Bu hasta arşivden çıkarılsın mı?")) {
      hastalar[index].arsiv = false;
    }
  } else {
    if (confirm("Bu hasta arşive alınsın mı?")) {
      hastalar[index].arsiv = true;
    }
  }
  kaydetJSON();
  guncelleListe();
}

window.onload = yukleJSON;
