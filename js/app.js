/*
 * KOMPAK — Antarmuka pengguna
 * Menghubungkan formulir dengan mesin inferensi dan menampilkan hasil.
 * Logika AI ada di mesin-inferensi.js; file ini hanya urusan tampilan.
 */
(function () {
  "use strict";

  var KB = window.KOMPAK_KB;
  var MESIN = window.KOMPAK_MESIN;
  var UJI = window.KOMPAK_UJI;

  var $ = function (s) { return document.querySelector(s); };
  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Nilai yang muncul pada aturan K3 diberi warna merah pada tombol pilihan.
  var nilaiParah = {};
  KB.aturan.filter(function (r) { return r.maka === "K3"; }).forEach(function (r) {
    (function kumpul(k) {
      if (k.semua || k.salahSatu) (k.semua || k.salahSatu).forEach(kumpul);
      else nilaiParah[k.fakta + ":" + k.nilai] = true;
    })(r.kondisi);
  });

  // ---------- Tab ----------
  document.querySelectorAll(".tab button").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".tab button").forEach(function (x) { x.classList.toggle("aktif", x === b); });
      document.querySelectorAll(".panel-tab").forEach(function (p) {
        p.classList.toggle("aktif", p.id === "tab-" + b.dataset.tab);
      });
      if (b.dataset.tab === "pengujian") tampilkanPengujian();
    });
  });

  // ---------- Formulir indikator ----------
  var wadah = $("#daftar-indikator");
  KB.indikator.forEach(function (ind) {
    var fs = document.createElement("fieldset");
    fs.className = "indikator";
    fs.id = "kartu-" + ind.kode;
    var pil = ind.pilihan.map(function (p, i) {
      var kelas = i === 0 ? "" : (nilaiParah[ind.kode + ":" + p.nilai] ? "parah" : "tidak-normal");
      return '<label><input type="radio" name="' + ind.kode + '" value="' + p.nilai + '">' +
             '<span class="' + kelas + '">' + esc(p.label) + "</span></label>";
    }).join("");
    fs.innerHTML =
      '<legend><div class="atas"><span class="kode">' + ind.kode + "</span><h3>" + esc(ind.nama) + "</h3></div></legend>" +
      '<p class="petunjuk">' + esc(ind.petunjuk) + "</p>" +
      '<div class="pilihan">' + pil + "</div>";
    wadah.appendChild(fs);
  });

  wadah.addEventListener("change", function (e) {
    var kartu = e.target.closest(".indikator");
    if (kartu) kartu.classList.remove("salah");
  });

  function ambilFakta() {
    var fakta = {};
    KB.indikator.forEach(function (ind) {
      var t = document.querySelector('input[name="' + ind.kode + '"]:checked');
      fakta[ind.kode] = t ? t.value : "";
    });
    return fakta;
  }

  function isiFakta(fakta) {
    document.querySelectorAll('#daftar-indikator input[type="radio"]').forEach(function (r) {
      r.checked = fakta[r.name] === r.value;
    });
    document.querySelectorAll(".indikator.salah").forEach(function (k) { k.classList.remove("salah"); });
  }

  // Isi cepat dari skenario (S1–S9; S10 tidak bisa dibuat lewat tombol pilihan).
  var pilihContoh = $("#pilih-contoh");
  UJI.skenario.forEach(function (s) {
    if (s.id === "S10") return;
    var o = document.createElement("option");
    o.value = s.id;
    o.textContent = s.id + " · " + s.jenis + " — " + s.uraian;
    pilihContoh.appendChild(o);
  });
  pilihContoh.addEventListener("change", function () {
    var s = UJI.skenario.filter(function (x) { return x.id === pilihContoh.value; })[0];
    if (s) isiFakta(s.fakta);
  });

  $("#tombol-normal").addEventListener("click", function () { isiFakta(UJI.NORMAL); pilihContoh.value = ""; });

  $("#formulir").addEventListener("reset", function () {
    setTimeout(function () {
      isiFakta({});
      $("#hasil").innerHTML = '<div class="kosong"><p class="mono">MENUNGGU FAKTA</p><p>Hasil pemeriksaan, aturan yang mendukung, dan tindakan akan tampil di sini.</p></div>';
    }, 0);
  });

  $("#formulir").addEventListener("submit", function (e) {
    e.preventDefault();
    var hasil = MESIN.inferensi(ambilFakta(), KB);
    tampilkanHasil(hasil, $("#nomor-pc").value.trim());
    if (window.innerWidth <= 980) $("#hasil").scrollIntoView({ behavior: "smooth" });
  });

  // ---------- Tampilan hasil ----------
  function kartuAturan(r, kalah) {
    return '<div class="aturan-kartu' + (kalah ? " kalah" : "") + '">' +
      '<span class="id">' + r.id + "</span>" + (kalah ? '<span class="meta">kalah prioritas</span>' : "") +
      "<code>" + esc(MESIN.teksAturan(r, KB)) + "</code>" +
      "<p>" + esc(r.alasan) + "</p></div>";
  }

  function tampilkanHasil(h, nomor) {
    var el = $("#hasil");

    if (!h.valid) {
      h.galat.forEach(function (g) {
        var k = document.getElementById("kartu-" + g.kode);
        if (k) k.classList.add("salah");
      });
      el.innerHTML = '<div class="galat"><p class="mono" style="color:var(--merah)">MASUKAN TIDAK VALID</p>' +
        "<h2>Pemeriksaan belum bisa diproses</h2>" +
        '<p class="arahan">Lengkapi atau perbaiki indikator berikut:</p><ul>' +
        h.galat.map(function (g) { return "<li>" + esc(g.pesan) + "</li>"; }).join("") + "</ul></div>";
      var pertama = document.getElementById("kartu-" + h.galat[0].kode);
      if (pertama) pertama.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    var s = h.status;
    var html = '<div class="status ' + s.warna + '">' +
      '<p class="mono">' + (nomor ? esc(nomor) + " · " : "") + (s.kode === "-" ? "TIDAK ADA ATURAN COCOK" : "STATUS " + s.kode) + "</p>" +
      "<h2>" + esc(s.nama) + "</h2><p>" + esc(s.deskripsi) + "</p></div>";

    // Penjelasan: aturan pendukung
    html += '<div class="bagian"><h3>MENGAPA? ATURAN PENDUKUNG</h3>';
    if (h.pemenang.length) {
      html += h.pemenang.map(function (r) { return kartuAturan(r, false); }).join("");
    } else {
      html += '<p class="arahan">Tidak ada satu pun dari ' + KB.aturan.length + " aturan yang kondisinya terpenuhi oleh fakta yang dimasukkan, sehingga sistem tidak menebak.</p>";
    }
    html += "</div>";

    if (h.konflik) {
      html += '<div class="bagian"><h3>RESOLUSI KONFLIK</h3>' +
        '<p class="arahan" style="margin-bottom:10px">Aturan berikut juga terpicu, tetapi status <b>' + s.kode +
        "</b> lebih berat (K3 › K4 › K2 › K1):</p>" +
        h.kalah.map(function (r) { return kartuAturan(r, true); }).join("") + "</div>";
    }

    html += '<div class="bagian"><h3>TINDAKAN YANG DISARANKAN</h3><ol>' +
      h.tindakan.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ol></div>";

    // Jejak forward chaining
    var adaYangCocok = {};
    h.terpicu.forEach(function (r) { adaYangCocok[r.id] = true; });
    html += '<div class="bagian"><details class="jejak"><summary>Lihat langkah forward chaining (' +
      h.terpicu.length + " dari " + KB.aturan.length + " aturan terpicu, " + h.siklus + " siklus)</summary>" +
      '<table><thead><tr><th>Aturan</th><th>Kondisi</th><th>Cocok?</th></tr></thead><tbody>' +
      KB.aturan.map(function (r) {
        return "<tr><td><b>" + r.id + "</b></td><td><code>" + esc(MESIN.teksAturan(r, KB)) + "</code></td><td>" +
          (adaYangCocok[r.id] ? '<span class="ya">Ya</span>' : '<span class="tidak">Tidak</span>') + "</td></tr>";
      }).join("") +
      '</tbody></table><p class="meta">Siklus berhenti ketika tidak ada aturan baru yang terpicu.</p></details></div>';

    el.innerHTML = html;
    el.scrollTop = 0;
  }

  // ---------- Tab basis pengetahuan ----------
  (function tampilkanBasis() {
    var urut = ["K1", "K2", "K4", "K3"];
    $("#tabel-kesimpulan").innerHTML = '<div class="gulung"><table><thead><tr><th>Kode</th><th>Kesimpulan</th><th>Arti</th><th>Prioritas</th></tr></thead><tbody>' +
      urut.map(function (k) {
        var s = KB.kesimpulan[k];
        return '<tr><td><span class="label ' + s.warna + '">' + s.kode + "</span></td><td>" + esc(s.nama) +
          "</td><td>" + esc(s.deskripsi) + "</td><td>" + s.prioritas + "</td></tr>";
      }).join("") +
      '<tr><td><span class="label abu">–</span></td><td>' + esc(KB.belumDisimpulkan.nama) + "</td><td>" +
      esc(KB.belumDisimpulkan.deskripsi) + "</td><td>—</td></tr></tbody></table></div>";

    $("#tabel-indikator").innerHTML = '<div class="gulung"><table><thead><tr><th>Kode</th><th>Indikator</th><th>Pilihan nilai (pertama = normal)</th></tr></thead><tbody>' +
      KB.indikator.map(function (i) {
        return "<tr><td><b>" + i.kode + "</b></td><td>" + esc(i.nama) + "</td><td>" +
          i.pilihan.map(function (p) { return esc(p.label); }).join(" / ") + "</td></tr>";
      }).join("") + "</tbody></table></div>";

    $("#tabel-aturan").innerHTML = '<div class="gulung"><table><thead><tr><th>Aturan</th><th>IF</th><th>THEN</th><th>Alasan</th></tr></thead><tbody>' +
      KB.aturan.map(function (r) {
        var s = KB.kesimpulan[r.maka];
        var jika = r.id === "R12" ? "Semua indikator normal" : MESIN.teksKondisi(r.kondisi, KB);
        return "<tr><td><b>" + r.id + "</b></td><td><code>" + esc(jika) + '</code></td><td><span class="label ' + s.warna + '">' +
          s.kode + "</span></td><td>" + esc(r.alasan) + "</td></tr>";
      }).join("") + "</tbody></table></div>";

    $("#daftar-sumber").innerHTML = KB.sumber.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("");
  })();

  // ---------- Tab pengujian ----------
  function tampilkanPengujian() {
    var hasil = UJI.jalankan(KB, MESIN);
    var lulus = hasil.filter(function (h) { return h.lulus; }).length;
    $("#ringkasan-uji").innerHTML = "<b>" + Math.round(lulus / hasil.length * 100) + "%</b><span>" +
      lulus + " dari " + hasil.length + " skenario sesuai</span>";
    $("#tabel-uji").innerHTML = '<div class="gulung"><table><thead><tr><th>No</th><th>Jenis</th><th>Masukan (lainnya normal)</th><th>Diharapkan</th><th>Hasil sistem</th><th>Status</th></tr></thead><tbody>' +
      hasil.map(function (h) {
        return "<tr><td><b>" + h.id + "</b></td><td>" + esc(h.jenis) + "</td><td>" + esc(h.uraian) + "</td><td>" +
          esc(h.diharapkan) + "</td><td>" + esc(h.aktual) + "</td><td>" +
          (h.lulus ? '<span class="lulus">SESUAI</span>' : '<span class="gagal">TIDAK</span>') + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  $("#tombol-uji").addEventListener("click", tampilkanPengujian);
})();
