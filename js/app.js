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

  // Simbol per status: pembeda selain warna (untuk buta warna dan cetak hitam-putih).
  var IKON = { K1: "✓", K2: "!", K4: "↻", K3: "✕", "-": "?" };

  function labelStatus(s) {
    return '<span class="label ' + s.warna + '"><span aria-hidden="true">' + IKON[s.kode] + "</span> " +
      (s.kode === "-" ? "–" : s.kode) + "</span>";
  }

  function kurangiGerak() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
  function gulirKe(el, blok) { el.scrollIntoView({ behavior: kurangiGerak() ? "auto" : "smooth", block: blok || "start" }); }

  function waktuTampil(d) {
    return d.toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  function dua(n) { return (n < 10 ? "0" : "") + n; }
  function waktuCsv(d) {
    return d.getFullYear() + "-" + dua(d.getMonth() + 1) + "-" + dua(d.getDate()) + " " + dua(d.getHours()) + ":" + dua(d.getMinutes());
  }

  // Tabel generik. Sel berisi HTML yang sudah di-escape; data-label dipakai untuk tampilan kartu di layar kecil.
  function tabel(kolom, baris, tanpaResponsif) {
    return '<div class="gulung"><table' + (tanpaResponsif ? "" : ' class="responsif"') + "><thead><tr>" +
      kolom.map(function (k) { return '<th scope="col">' + esc(k) + "</th>"; }).join("") +
      "</tr></thead><tbody>" +
      baris.map(function (b) {
        return "<tr>" + b.map(function (c, i) { return '<td data-label="' + esc(kolom[i]) + '"><span>' + c + "</span></td>"; }).join("") + "</tr>";
      }).join("") + "</tbody></table></div>";
  }

  // Nilai yang muncul pada aturan K3 diberi warna merah pada tombol pilihan.
  var nilaiParah = {};
  KB.aturan.filter(function (r) { return r.maka === "K3"; }).forEach(function (r) {
    (function kumpul(k) {
      if (k.semua || k.salahSatu) (k.semua || k.salahSatu).forEach(kumpul);
      else nilaiParah[k.fakta + ":" + k.nilai] = true;
    })(r.kondisi);
  });

  // ---------- Tinggi header (dipakai CSS untuk posisi panel hasil yang menempel) ----------
  var kepala = $(".kepala");
  function ukurKepala() { document.documentElement.style.setProperty("--kepala-h", kepala.offsetHeight + "px"); }
  ukurKepala();
  window.addEventListener("resize", ukurKepala);
  if (window.ResizeObserver) new ResizeObserver(ukurKepala).observe(kepala);

  // ---------- Tab (pola WAI-ARIA: panah kiri/kanan, Home, End) ----------
  var tombolTab = [].slice.call(document.querySelectorAll(".tab button"));
  function aktifkanTab(b, fokus) {
    tombolTab.forEach(function (x) {
      var on = x === b;
      x.classList.toggle("aktif", on);
      x.setAttribute("aria-selected", on ? "true" : "false");
      x.tabIndex = on ? 0 : -1;
    });
    document.querySelectorAll(".panel-tab").forEach(function (p) {
      p.classList.toggle("aktif", p.id === "tab-" + b.dataset.tab);
    });
    document.title = b.textContent.trim() + " · KOMPAK";
    if (fokus) b.focus();
    if (b.dataset.tab === "pengujian") tampilkanPengujian();
  }
  tombolTab.forEach(function (b, i) {
    b.addEventListener("click", function () { aktifkanTab(b); });
    b.addEventListener("keydown", function (e) {
      var j = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tombolTab.length - 1 }[e.key];
      if (j === undefined) return;
      e.preventDefault();
      aktifkanTab(tombolTab[(j + tombolTab.length) % tombolTab.length], true);
    });
  });

  // ---------- Formulir indikator ----------
  var wadah = $("#daftar-indikator");
  KB.indikator.forEach(function (ind) {
    var el = document.createElement("div");
    el.className = "indikator";
    el.id = "kartu-" + ind.kode;
    el.setAttribute("role", "radiogroup");
    el.setAttribute("aria-labelledby", "judul-" + ind.kode);
    el.setAttribute("aria-describedby", "petunjuk-" + ind.kode);
    var pil = ind.pilihan.map(function (p, i) {
      var kelas = i === 0 ? "" : (nilaiParah[ind.kode + ":" + p.nilai] ? "parah" : "tidak-normal");
      return '<label><input type="radio" name="' + ind.kode + '" value="' + p.nilai + '">' +
             '<span class="' + kelas + '">' + esc(p.label) + "</span></label>";
    }).join("");
    el.innerHTML =
      '<div class="atas"><span class="kode">' + ind.kode + '</span><h3 id="judul-' + ind.kode + '">' + esc(ind.nama) + "</h3></div>" +
      '<p class="petunjuk" id="petunjuk-' + ind.kode + '">' + esc(ind.petunjuk) + "</p>" +
      '<div class="pilihan">' + pil + "</div>" +
      '<p class="pesan-salah" id="salah-' + ind.kode + '" hidden><span aria-hidden="true">⚠</span> Belum diisi. Pilih salah satu.</p>';
    wadah.appendChild(el);
  });

  function tandaiGalat(kode, ada) {
    var k = document.getElementById("kartu-" + kode);
    if (!k) return;
    k.classList.toggle("salah", ada);
    document.getElementById("salah-" + kode).hidden = !ada;
    k.setAttribute("aria-describedby", "petunjuk-" + kode + (ada ? " salah-" + kode : ""));
    [].forEach.call(k.querySelectorAll("input"), function (r) {
      if (ada) r.setAttribute("aria-invalid", "true"); else r.removeAttribute("aria-invalid");
    });
  }
  function bersihkanGalat() { KB.indikator.forEach(function (i) { tandaiGalat(i.kode, false); }); }

  function ambilFakta() {
    var fakta = {};
    KB.indikator.forEach(function (ind) {
      var t = document.querySelector('input[name="' + ind.kode + '"]:checked');
      fakta[ind.kode] = t ? t.value : "";
    });
    return fakta;
  }

  // Progres pengisian
  function perbaruiProgres() {
    var n = 0;
    KB.indikator.forEach(function (ind) { if (document.querySelector('input[name="' + ind.kode + '"]:checked')) n++; });
    $("#teks-progres").textContent = n + " dari " + KB.indikator.length + " indikator terisi";
    $("#isi-progres").style.width = (n / KB.indikator.length * 100) + "%";
    $(".progres").classList.toggle("penuh", n === KB.indikator.length);
  }

  // Hasil basi: isian berubah setelah pemeriksaan terakhir.
  var terakhir = null;   // cuplikan isian saat pemeriksaan terakhir (JSON), null jika belum ada hasil valid
  function perbaruiBasi() {
    var basi = terakhir !== null && JSON.stringify(ambilFakta()) !== terakhir;
    $("#peringatan-basi").hidden = !basi;
    $("#isi-hasil").classList.toggle("basi", basi);
  }

  function isiFakta(fakta) {
    document.querySelectorAll('#daftar-indikator input[type="radio"]').forEach(function (r) {
      r.checked = fakta[r.name] === r.value;
    });
    bersihkanGalat();
    perbaruiProgres();
    perbaruiBasi();
  }

  wadah.addEventListener("change", function (e) {
    var kartu = e.target.closest(".indikator");
    if (kartu) tandaiGalat(kartu.id.replace("kartu-", ""), false);
    perbaruiProgres();
    perbaruiBasi();
  });

  // ---------- Mode demo ----------
  var bannerOtomatis = $("#banner-otomatis");
  var pilihContoh = $("#pilih-contoh");
  UJI.skenario.forEach(function (s) {
    if (s.id === "S10") return;   // S10 tidak bisa dibuat lewat tombol pilihan
    var o = document.createElement("option");
    o.value = s.id;
    o.textContent = s.id + " · " + s.jenis + " — " + s.uraian;
    pilihContoh.appendChild(o);
  });
  pilihContoh.addEventListener("change", function () {
    var s = UJI.skenario.filter(function (x) { return x.id === pilihContoh.value; })[0];
    if (s) { isiFakta(s.fakta); bannerOtomatis.hidden = false; }
  });
  $("#tombol-normal").addEventListener("click", function () {
    isiFakta(UJI.NORMAL);
    pilihContoh.value = "";
    bannerOtomatis.hidden = false;
  });

  // ---------- Hasil: keadaan kosong ----------
  function kosongkanHasil() {
    terakhir = null;
    $("#hasil").classList.add("belum");
    $("#peringatan-basi").hidden = true;
    $("#isi-hasil").classList.remove("basi");
    $("#isi-hasil").innerHTML = '<div class="kosong"><p class="mono">BELUM ADA HASIL</p>' +
      "<p>Isi indikator di samping lalu tekan <b>Periksa kelayakan</b>. Status, alasan, dan tindakan akan tampil di sini.</p></div>";
  }
  kosongkanHasil();
  perbaruiProgres();

  $("#formulir").addEventListener("reset", function () {
    setTimeout(function () {
      isiFakta({});
      bannerOtomatis.hidden = true;
      kosongkanHasil();
      $("#pengumuman").textContent = "Formulir dikosongkan.";
    }, 0);
  });

  $("#formulir").addEventListener("submit", function (e) {
    e.preventDefault();
    var fakta = ambilFakta();
    var hasil = MESIN.inferensi(fakta, KB);
    var nomor = $("#nomor-pc").value.trim();
    tampilkanHasil(hasil, nomor, fakta);
    if (hasil.valid && window.innerWidth <= 980) gulirKe($("#hasil"));
  });

  // ---------- Tampilan hasil ----------
  function kartuAturan(r, kalah) {
    return '<div class="aturan-kartu' + (kalah ? " kalah" : "") + '">' +
      '<p class="alasan"><span class="id">' + r.id + "</span>" + esc(r.alasan) + (kalah ? ' <span class="meta">(kalah prioritas)</span>' : "") + "</p>" +
      "<code>" + esc(MESIN.teksAturan(r, KB)) + "</code></div>";
  }

  function tampilkanHasil(h, nomor, fakta) {
    var el = $("#isi-hasil");
    $("#hasil").classList.remove("belum");
    $("#peringatan-basi").hidden = true;
    el.classList.remove("basi");

    if (!h.valid) {
      terakhir = null;
      h.galat.forEach(function (g) { tandaiGalat(g.kode, true); });
      el.innerHTML = '<div class="galat"><p class="mono" style="color:var(--merah)">MASUKAN TIDAK VALID</p>' +
        "<h2>Pemeriksaan belum bisa diproses</h2>" +
        '<p class="arahan">Lengkapi atau perbaiki indikator berikut:</p><ul>' +
        h.galat.map(function (g) {
          return '<li><button type="button" class="tautan" data-fokus="' + g.kode + '">' + esc(g.pesan) + "</button></li>";
        }).join("") + "</ul></div>";
      $("#pengumuman").textContent = "Pemeriksaan belum bisa diproses. " + h.galat.length + " indikator perlu dilengkapi.";
      fokusKartu(h.galat[0].kode);
      return;
    }

    var sekarang = new Date();
    var s = h.status;
    terakhir = JSON.stringify(fakta);
    catatRiwayat(h, nomor, sekarang);

    var html = '<div class="status ' + s.warna + '"><div class="status-ikon" aria-hidden="true">' + IKON[s.kode] + "</div><div>" +
      '<p class="mono">' + (nomor ? esc(nomor) + " · " : "") + (s.kode === "-" ? "TIDAK ADA ATURAN COCOK" : "STATUS " + s.kode) + "</p>" +
      "<h2>" + esc(s.nama) + "</h2><p>" + esc(s.deskripsi) + "</p>" +
      '<p class="waktu">Diperiksa ' + esc(waktuTampil(sekarang)) + "</p></div></div>";

    // 1. Jawaban dulu: apa yang harus dilakukan
    html += '<div class="bagian"><h3>TINDAKAN YANG DISARANKAN</h3><ol class="tindakan">' +
      h.tindakan.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ol></div>";

    html += '<div class="bagian aksi-hasil">' +
      '<button type="button" class="tombol utama" data-aksi="berikutnya">Periksa PC berikutnya</button>' +
      '<button type="button" class="tombol sekunder" data-aksi="cetak">Cetak hasil</button></div>';

    // 2. Baru alasan
    html += '<div class="bagian"><h3>MENGAPA STATUS INI?</h3>';
    if (h.pemenang.length) {
      html += h.pemenang.map(function (r) { return kartuAturan(r, false); }).join("");
    } else {
      html += '<p class="arahan">Tidak ada satu pun dari ' + KB.aturan.length + " aturan yang kondisinya terpenuhi oleh isian ini, sehingga sistem tidak menebak.</p>";
    }
    html += "</div>";

    if (h.konflik) {
      html += '<div class="bagian"><h3>RESOLUSI KONFLIK</h3>' +
        '<p class="arahan" style="margin-bottom:10px">Aturan berikut juga terpicu, tetapi status <b>' + s.kode +
        "</b> lebih berat (K3 › K4 › K2 › K1):</p>" +
        h.kalah.map(function (r) { return kartuAturan(r, true); }).join("") + "</div>";
    }

    // 3. Jejak forward chaining (dilipat)
    var adaYangCocok = {};
    h.terpicu.forEach(function (r) { adaYangCocok[r.id] = true; });
    html += '<div class="bagian"><details class="jejak"><summary>Lihat langkah forward chaining (' +
      h.terpicu.length + " dari " + KB.aturan.length + " aturan terpicu, " + h.siklus + " siklus)</summary>" +
      tabel(["Aturan", "Kondisi", "Cocok?"], KB.aturan.map(function (r) {
        return ["<b>" + r.id + "</b>", "<code>" + esc(MESIN.teksAturan(r, KB)) + "</code>",
          adaYangCocok[r.id] ? '<span class="ya">✓ Ya</span>' : '<span class="tidak">Tidak</span>'];
      }), true) +
      '<p class="meta">Siklus berhenti ketika tidak ada aturan baru yang terpicu. Hasil ini tercatat di riwayat sesi.</p></details></div>';

    el.innerHTML = html;
    $("#hasil").scrollTop = 0;
    $("#pengumuman").textContent = "Hasil" + (nomor ? " untuk " + nomor : "") + ": " + s.nama + ". " +
      (h.pemenang.length ? "Aturan " + h.pemenang.map(function (r) { return r.id; }).join(", ") + "." : "");
  }

  function fokusKartu(kode) {
    var kartu = document.getElementById("kartu-" + kode);
    if (!kartu) return;
    gulirKe(kartu, "center");
    var r = kartu.querySelector("input");
    if (r) r.focus({ preventScroll: true });
  }

  // Aksi di dalam panel hasil (elemen dibuat ulang tiap pemeriksaan, jadi pakai delegasi)
  $("#hasil").addEventListener("click", function (e) {
    var fokus = e.target.closest("[data-fokus]");
    if (fokus) { fokusKartu(fokus.dataset.fokus); return; }
    var aksi = e.target.closest("[data-aksi]");
    if (!aksi) return;
    if (aksi.dataset.aksi === "cetak") window.print();
    if (aksi.dataset.aksi === "berikutnya") periksaBerikutnya();
  });

  // Buka semua bagian yang dilipat saat dicetak, lalu kembalikan.
  var terbukaSebelumCetak = [];
  window.addEventListener("beforeprint", function () {
    terbukaSebelumCetak = [];
    [].forEach.call(document.querySelectorAll("#hasil details"), function (d) {
      terbukaSebelumCetak.push(d.open); d.open = true;
    });
  });
  window.addEventListener("afterprint", function () {
    [].forEach.call(document.querySelectorAll("#hasil details"), function (d, i) { d.open = !!terbukaSebelumCetak[i]; });
  });

  // ---------- Alur beruntun: PC berikutnya ----------
  // Menaikkan angka pertama pada nama PC dengan mempertahankan nol di depan: "PC-07 Lab" -> "PC-08 Lab".
  function nomorBerikutnya(t) {
    return t.replace(/\d+/, function (m) {
      var n = String(parseInt(m, 10) + 1);
      while (n.length < m.length) n = "0" + n;
      return n;
    });
  }
  function periksaBerikutnya() {
    var input = $("#nomor-pc");
    input.value = nomorBerikutnya(input.value.trim());
    isiFakta({});
    bannerOtomatis.hidden = true;
    pilihContoh.value = "";
    kosongkanHasil();
    $("#pengumuman").textContent = "Formulir siap untuk PC berikutnya.";
    window.scrollTo({ top: 0, behavior: kurangiGerak() ? "auto" : "smooth" });
    input.focus({ preventScroll: true });
    input.select();
  }

  // ---------- Riwayat sesi ----------
  var riwayat = [];
  var noRiwayat = 0;

  function catatRiwayat(h, nomor, waktu) {
    var entri = {
      nomor: nomor || "(tanpa nama)", status: h.status,
      aturan: h.pemenang.map(function (r) { return r.id; }).join(", "), waktu: waktu
    };
    var akhir = riwayat[riwayat.length - 1];
    if (nomor && akhir && akhir.nomor === entri.nomor) { entri.no = akhir.no; riwayat[riwayat.length - 1] = entri; }   // periksa ulang PC yang sama
    else { entri.no = ++noRiwayat; riwayat.push(entri); }
    tampilkanRiwayat();
  }

  function tampilkanRiwayat() {
    $("#riwayat").hidden = riwayat.length === 0;
    var urut = riwayat.slice().reverse();   // terbaru di atas
    $("#tabel-riwayat").innerHTML = tabel(["No", "PC", "Status", "Aturan", "Waktu"], urut.map(function (r) {
      return [r.no, esc(r.nomor), labelStatus(r.status) + " " + esc(r.status.nama), esc(r.aturan || "—"), esc(waktuTampil(r.waktu))];
    }));
  }

  // Sel CSV: kutip, dan netralkan awalan rumus (=, +, -, @) agar tidak dieksekusi spreadsheet.
  function selCsv(v) {
    v = String(v);
    if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
    return '"' + v.replace(/"/g, '""') + '"';
  }
  $("#ekspor-csv").addEventListener("click", function () {
    var baris = [["No", "Nomor PC", "Kode", "Status", "Aturan", "Waktu"]].concat(riwayat.map(function (r) {
      return [r.no, r.nomor, r.status.kode, r.status.nama, r.aturan, waktuCsv(r.waktu)];
    }));
    var csv = "﻿" + baris.map(function (b) { return b.map(selCsv).join(";"); }).join("\r\n");
    var url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    var a = document.createElement("a");
    a.href = url;
    a.download = "riwayat-kompak-" + waktuCsv(new Date()).replace(/[-: ]/g, "").replace(/^(\d{8})(\d{4})$/, "$1-$2") + ".csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });
  $("#hapus-riwayat").addEventListener("click", function () {
    if (!window.confirm("Hapus semua riwayat pemeriksaan sesi ini?")) return;
    riwayat = [];
    tampilkanRiwayat();
  });

  // ---------- Tab basis pengetahuan ----------
  (function tampilkanBasis() {
    var urut = ["K1", "K2", "K4", "K3"];
    $("#tabel-kesimpulan").innerHTML = tabel(["Kode", "Kesimpulan", "Arti", "Prioritas"],
      urut.map(function (k) {
        var s = KB.kesimpulan[k];
        return [labelStatus(s), esc(s.nama), esc(s.deskripsi), s.prioritas];
      }).concat([[labelStatus(KB.belumDisimpulkan), esc(KB.belumDisimpulkan.nama), esc(KB.belumDisimpulkan.deskripsi), "—"]]));

    $("#tabel-indikator").innerHTML = tabel(["Kode", "Indikator", "Pilihan nilai (pertama = normal)"],
      KB.indikator.map(function (i) {
        return ["<b>" + i.kode + "</b>", esc(i.nama), i.pilihan.map(function (p) { return esc(p.label); }).join(" / ")];
      }));

    $("#tabel-aturan").innerHTML = tabel(["Aturan", "IF", "THEN", "Alasan"],
      KB.aturan.map(function (r) {
        var jika = r.id === "R12" ? "Semua indikator normal" : MESIN.teksKondisi(r.kondisi, KB);
        return ["<b>" + r.id + "</b>", "<code>" + esc(jika) + "</code>", labelStatus(KB.kesimpulan[r.maka]), esc(r.alasan)];
      }));

    $("#daftar-sumber").innerHTML = KB.sumber.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("");
  })();

  // ---------- Tab pengujian ----------
  function tampilkanPengujian() {
    var hasil = UJI.jalankan(KB, MESIN);
    var lulus = hasil.filter(function (h) { return h.lulus; }).length;
    $("#ringkasan-uji").innerHTML = "<b>" + Math.round(lulus / hasil.length * 100) + "%</b><span>" +
      lulus + " dari " + hasil.length + " skenario sesuai</span>";
    $("#tabel-uji").innerHTML = tabel(["No", "Jenis", "Masukan (lainnya normal)", "Diharapkan", "Hasil sistem", "Status"],
      hasil.map(function (h) {
        return ["<b>" + h.id + "</b>", esc(h.jenis), esc(h.uraian), esc(h.diharapkan), esc(h.aktual),
          h.lulus ? '<span class="lulus">✓ SESUAI</span>' : '<span class="gagal">✕ TIDAK</span>'];
      }));
  }
  $("#tombol-uji").addEventListener("click", tampilkanPengujian);
})();
