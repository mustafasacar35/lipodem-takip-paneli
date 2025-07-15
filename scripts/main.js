
document.addEventListener("DOMContentLoaded", async () => {
  const hastaListesiEl = document.getElementById("hasta-listesi");

  try {
    const response = await fetch("data/hastalar.json");
    const hastalar = await response.json();

    const aktifHastalar = Object.entries(hastalar).filter(([_, h]) => !h.arşivde);
    const arsivHastalar = Object.entries(hastalar).filter(([_, h]) => h.arşivde);

    const createLink = (id, h) => {
      const latestWeek = Math.max(...Object.keys(h.haftalar).map(Number));
      const link = document.createElement("a");
      link.href = `hasta.html?id=${id}`;
      link.textContent = `${h.ad} (${latestWeek}. hafta)`;
      return link;
    };

    const createSection = (title, entries) => {
      const section = document.createElement("div");
      const heading = document.createElement("h3");
      heading.textContent = title;
      section.appendChild(heading);
      entries.forEach(([id, h]) => {
        const p = document.createElement("p");
        p.appendChild(createLink(id, h));
        section.appendChild(p);
      });
      return section;
    };

    if (aktifHastalar.length) {
      hastaListesiEl.appendChild(createSection("Aktif Hastalar", aktifHastalar));
    }
    if (arsivHastalar.length) {
      hastaListesiEl.appendChild(createSection("Arşivlenmiş Hastalar", arsivHastalar));
    }
  } catch (err) {
    hastaListesiEl.textContent = "Hasta verisi yüklenemedi.";
    console.error(err);
  }
});
