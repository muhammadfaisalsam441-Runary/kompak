/*
 * =============================================================================
 * KOMPAK — Antarmuka Pengguna & Logika Tampilan (UI/UX Controller)
 * Menghubungkan formulir observasi laboratorium dengan mesin inferensi
 * forward chaining dan menyajikan hasil diagnosis secara transparan.
 * =============================================================================
 */
(function () {
  "use strict";

  var KB = window.KOMPAK_KB;
  var MESIN = window.KOMPAK_MESIN;
  var UJI = window.KOMPAK_UJI;

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return [].slice.call(document.querySelectorAll(s)); };

  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Toast Notification System
  function showToast(pesan) {
    var t = $("#toast-notice");
    if (!t) return;
    var teksEl = t.querySelector(".toast-text");
    if (teksEl) teksEl.textContent = pesan;
    t.classList.add("show");
    clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(function () {
      t.classList.remove("show");
    }, 2800);
  }

  function salinTeks(teks, pesanSukses) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(teks).then(function () {
        showToast(pesanSukses || "Berhasil disalin ke clipboard!");
      });
    } else {
      var ta = document.createElement("textarea");
      ta.value = teks;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      showToast(pesanSukses || "Berhasil disalin ke clipboard!");
    }
  }

  // Simbol per status untuk aksesibilitas dan cetak
  var IKON = { K1: "✓", K2: "!", K4: "↻", K3: "✕", "-": "?" };

  var IKON_INDIKATOR = {
    I1: "ri-flashlight-line",
    I2: "ri-temp-hot-line",
    I3: "ri-tv-2-line",
    I4: "ri-keyboard-box-line",
    I5: "ri-cpu-line",
    I6: "ri-hard-drive-2-line",
    I7: "ri-code-box-line",
    I8: "ri-terminal-box-line",
    I9: "ri-server-line",
    I10: "ri-file-shield-2-line"
  };

  function labelStatus(s) {
    return '<span class="label ' + s.warna + '"><span aria-hidden="true">' + (IKON[s.kode] || "") + "</span> " +
      (s.kode === "-" ? "–" : s.kode) + "</span>";
  }

  function kurangiGerak() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
  function gulirKe(el, blok) {
    if (!el) return;
    el.scrollIntoView({ behavior: kurangiGerak() ? "auto" : "smooth", block: blok || "start" });
  }

  function waktuTampil(d) {
    return d.toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  function dua(n) { return (n < 10 ? "0" : "") + n; }
  function waktuCsv(d) {
    return d.getFullYear() + "-" + dua(d.getMonth() + 1) + "-" + dua(d.getDate()) + " " + dua(d.getHours()) + ":" + dua(d.getMinutes());
  }

  // Tabel generik
  function tabel(kolom, baris, tanpaResponsif) {
    return '<div class="gulung"><table' + (tanpaResponsif ? "" : ' class="responsif"') + "><thead><tr>" +
      kolom.map(function (k) { return '<th scope="col">' + esc(k) + "</th>"; }).join("") +
      "</tr></thead><tbody>" +
      baris.map(function (b) {
        return "<tr>" + b.map(function (c, i) { return '<td data-label="' + esc(kolom[i]) + '"><span>' + c + "</span></td>"; }).join("") + "</tr>";
      }).join("") + "</tbody></table></div>";
  }

  // Nilai yang muncul pada aturan K3 diberi penanda kritis
  var nilaiParah = {};
  KB.aturan.filter(function (r) { return r.maka === "K3"; }).forEach(function (r) {
    (function kumpul(k) {
      if (k.semua || k.salahSatu) (k.semua || k.salahSatu).forEach(kumpul);
      else nilaiParah[k.fakta + ":" + k.nilai] = true;
    })(r.kondisi);
  });

  // ---------- Tema Terang / Gelap ----------
  var btnTema = $("#btn-tema");
  function terapkanTema(tema) {
    document.documentElement.setAttribute("data-theme", tema);
    if (btnTema) {
      var ic = btnTema.querySelector("i");
      if (ic) ic.className = tema === "dark" ? "ri-sun-line" : "ri-moon-line";
      btnTema.title = tema === "dark" ? "Ganti ke tema Terang" : "Ganti ke tema Gelap";
    }
    try { localStorage.setItem("kompak_tema", tema); } catch (e) {}
  }
  try {
    var savedTema = localStorage.getItem("kompak_tema");
    if (savedTema === "dark" || savedTema === "light") terapkanTema(savedTema);
  } catch (e) {}
  if (btnTema) {
    btnTema.addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      terapkanTema(cur === "dark" ? "light" : "dark");
    });
  }

  // ---------- Panduan Strip & Collapsible Demo & Modal Cara Pakai ----------
  var togglePanduanStrip = $("#toggle-panduan-strip");
  var panduanStepsBody = $("#panduan-steps-body");
  if (togglePanduanStrip && panduanStepsBody) {
    togglePanduanStrip.addEventListener("click", function () {
      var hidden = !panduanStepsBody.hidden;
      panduanStepsBody.hidden = hidden;
      togglePanduanStrip.setAttribute("aria-expanded", String(!hidden));
      togglePanduanStrip.innerHTML = hidden
        ? '<i class="ri-eye-line"></i> <span>Tampilkan Alur</span>'
        : '<i class="ri-eye-off-line"></i> <span>Sembunyikan</span>';
    });
  }

  var toggleDemo = $("#toggle-demo");
  var demoBody = $("#demo-body");
  if (toggleDemo && demoBody) {
    toggleDemo.addEventListener("click", function () {
      var hidden = !demoBody.hidden;
      demoBody.hidden = hidden;
      toggleDemo.setAttribute("aria-expanded", String(!hidden));
      toggleDemo.innerHTML = hidden
        ? '<i class="ri-arrow-down-s-line"></i> <span>Buka Simulasi</span>'
        : '<i class="ri-arrow-up-s-line"></i> <span>Lipat</span>';
    });
  }

  var modalPanduan = $("#modal-panduan");
  var btnPanduan = $("#btn-panduan");
  var tutupPanduan = $("#tutup-panduan");
  var btnMulaiPanduan = $("#btn-mulai-panduan");

  function bukaModalPanduan() {
    if (!modalPanduan) return;
    modalPanduan.hidden = false;
    document.body.style.overflow = "hidden";
    if (tutupPanduan) tutupPanduan.focus();
  }
  function tutupModalPanduan() {
    if (!modalPanduan) return;
    modalPanduan.hidden = true;
    document.body.style.overflow = "";
    if (btnPanduan) btnPanduan.focus();
  }

  if (btnPanduan) btnPanduan.addEventListener("click", bukaModalPanduan);
  if (tutupPanduan) tutupPanduan.addEventListener("click", tutupModalPanduan);
  if (btnMulaiPanduan) btnMulaiPanduan.addEventListener("click", tutupModalPanduan);
  if (modalPanduan) {
    modalPanduan.addEventListener("click", function (e) {
      if (e.target === modalPanduan) tutupModalPanduan();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modalPanduan.hidden) tutupModalPanduan();
    });
  }

  // ---------- Navigasi Tab & Menu Mobile ----------
  var tautanTab = $$("[data-tab]");
  var menuTab = tautanTab.filter(function (x) { return x.closest(".menu-tab"); });
  var mobileMenuBtn = $("#mobile-menu-btn");
  var navTabWrapper = $("#nav-tab-wrapper");

  if (mobileMenuBtn && navTabWrapper) {
    mobileMenuBtn.addEventListener("click", function () {
      var open = navTabWrapper.classList.toggle("mobile-open");
      mobileMenuBtn.setAttribute("aria-expanded", String(open));
      var ic = mobileMenuBtn.querySelector("i");
      if (ic) ic.className = open ? "ri-close-line" : "ri-menu-line";
    });
  }

  function aktifkanTab(nama) {
    var targetLink = menuTab.filter(function (x) { return x.dataset.tab === nama; })[0];
    if (!targetLink) return;

    menuTab.forEach(function (x) {
      var on = x === targetLink;
      x.classList.toggle("aktif", on);
      if (x.closest("li")) x.closest("li").classList.toggle("menuitem-active", on);
      if (on) x.setAttribute("aria-current", "page"); else x.removeAttribute("aria-current");
    });

    $$(".panel-tab").forEach(function (p) {
      p.classList.toggle("aktif", p.id === "tab-" + nama);
    });

    var judul = targetLink.textContent.trim();
    if ($("#judul-halaman")) $("#judul-halaman").textContent = judul;
    if ($("#remah-halaman")) $("#remah-halaman").textContent = judul;
    document.title = judul + " · KOMPAK";

    if (navTabWrapper && navTabWrapper.classList.contains("mobile-open")) {
      navTabWrapper.classList.remove("mobile-open");
      if (mobileMenuBtn) {
        mobileMenuBtn.setAttribute("aria-expanded", "false");
        var ic = mobileMenuBtn.querySelector("i");
        if (ic) ic.className = "ri-menu-line";
      }
    }

    if (nama === "pengujian") tampilkanPengujian();
  }

  tautanTab.forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.preventDefault();
      aktifkanTab(b.dataset.tab);
      window.scrollTo({ top: 0, behavior: kurangiGerak() ? "auto" : "smooth" });
      var utama = $("#utama");
      if (utama) utama.focus({ preventScroll: true });
    });
  });

  window.KOMPAK_APP_RETEST = function () {
    tampilkanPengujian();
    showToast("Pengujian selesai dijalankan.");
  };

  // ---------- Pengelompokan Indikator (Cognitive Chunking) ----------
  var kategoriList = [
    {
      id: "fase1",
      nama: "Fase 1: Perangkat Keras & Booting",
      ikon: "ri-computer-line",
      deskripsi: "Pemeriksaan fisik saat PC dinyalakan, suhu casing, kipas, layar, serta keyboard & mouse.",
      kodes: ["I1", "I2", "I3", "I4"]
    },
    {
      id: "fase2",
      nama: "Fase 2: Performa & Penyimpanan",
      ikon: "ri-hard-drive-2-line",
      deskripsi: "Kecukupan kapasitas RAM (≥ 8 GB) dan kesehatan S.M.A.R.T drive di CrystalDiskInfo.",
      kodes: ["I5", "I6"]
    },
    {
      id: "fase3",
      nama: "Fase 3: Software Pemrograman & Keamanan",
      ikon: "ri-code-s-slash-line",
      deskripsi: "VS Code & ekstensi, compiler/runtime (Python, C++, Java, JS), XAMPP, serta pemindaian antivirus.",
      kodes: ["I7", "I8", "I9", "I10"]
    }
  ];

  var wadah = $("#daftar-indikator");
  if (wadah) {
    wadah.innerHTML = "";

    kategoriList.forEach(function (kat) {
      var katSection = document.createElement("section");
      katSection.className = "category-section";
      katSection.id = "section-" + kat.id;
      katSection.setAttribute("aria-label", kat.nama);

      var katHeader = document.createElement("div");
      katHeader.className = "category-header";
      katHeader.innerHTML =
        '<div class="category-title-wrap">' +
          '<div class="category-icon-box"><i class="' + kat.ikon + '"></i></div>' +
          '<div><h3 class="category-name">' + esc(kat.nama) + '</h3>' +
          '<p class="category-desc">' + esc(kat.deskripsi) + '</p></div>' +
        '</div>' +
        '<span class="category-count-badge" id="badge-' + kat.id + '">0/' + kat.kodes.length + ' terisi</span>';

      var katGrid = document.createElement("div");
      katGrid.className = "category-grid";

      kat.kodes.forEach(function (kode) {
        var ind = KB.indikator.filter(function (i) { return i.kode === kode; })[0];
        if (!ind) return;

        var el = document.createElement("div");
        el.className = "indikator";
        el.id = "kartu-" + ind.kode;
        el.setAttribute("role", "radiogroup");
        el.setAttribute("aria-labelledby", "judul-" + ind.kode);
        el.setAttribute("aria-describedby", "petunjuk-" + ind.kode);

        var pil = ind.pilihan.map(function (p, i) {
          var kelas = (i === 0 || p.normal) ? "" : (nilaiParah[ind.kode + ":" + p.nilai] ? "parah" : "tidak-normal");
          return '<label><input type="radio" name="' + ind.kode + '" value="' + p.nilai + '">' +
                 '<span class="' + kelas + '">' + esc(p.label) + "</span></label>";
        }).join("");

        var extraCli = "";
        if (ind.kode === "I8") {
          extraCli =
            '<div class="cli-helper" aria-label="Klik perintah untuk menyalin">' +
              '<span class="cli-helper-label">Cek cepat terminal (klik untuk salin):</span>' +
              '<div class="cli-helper-chips">' +
                '<button type="button" class="cli-chip" data-cli="python --version">python --version</button>' +
                '<button type="button" class="cli-chip" data-cli="g++ --version">g++ --version</button>' +
                '<button type="button" class="cli-chip" data-cli="java -version">java -version</button>' +
                '<button type="button" class="cli-chip" data-cli="node -v">node -v</button>' +
              '</div>' +
            '</div>';
        }

        var ikonInd = IKON_INDIKATOR[ind.kode] || "ri-checkbox-blank-circle-line";
        el.innerHTML =
          '<div class="atas">' +
            '<span class="kode"><i class="' + ikonInd + '" aria-hidden="true"></i> ' + ind.kode + '</span>' +
            '<div class="atas-teks">' +
              '<div class="atas-judul-row">' +
                '<h3 id="judul-' + ind.kode + '">' + esc(ind.nama) + '</h3>' +
                '<span class="ind-state-pill belum" id="state-' + ind.kode + '">Belum dipilih</span>' +
              '</div>' +
              '<p class="petunjuk" id="petunjuk-' + ind.kode + '">' + esc(ind.petunjuk) + '</p>' +
            '</div>' +
          '</div>' +
          extraCli +
          '<div class="pilihan">' + pil + '</div>' +
          '<p class="pesan-salah" id="salah-' + ind.kode + '" hidden><i class="ri-error-warning-line"></i> Belum diisi. Silakan pilih salah satu opsi di atas.</p>';

        katGrid.appendChild(el);
      });

      katSection.appendChild(katHeader);
      katSection.appendChild(katGrid);
      wadah.appendChild(katSection);
    });

    // Click-to-copy CLI helper chips on I8
    wadah.addEventListener("click", function (e) {
      var chip = e.target.closest("[data-cli]");
      if (!chip) return;
      var cmd = chip.dataset.cli;
      salinTeks(cmd, 'Perintah "' + cmd + '" disalin ke clipboard!');
    });
  }

  var faktaIlegal = {};

  function tandaiGalat(kode, ada, pesanKhusus) {
    var k = document.getElementById("kartu-" + kode);
    if (!k) return;
    k.classList.toggle("salah", ada);
    var pesanEl = document.getElementById("salah-" + kode);
    if (pesanEl) {
      pesanEl.hidden = !ada;
      pesanEl.innerHTML = '<i class="ri-error-warning-line"></i> ' +
        esc(pesanKhusus || "Belum diisi. Silakan pilih salah satu opsi di atas.");
    }
    k.setAttribute("aria-describedby", "petunjuk-" + kode + (ada ? " salah-" + kode : ""));
    [].forEach.call(k.querySelectorAll("input"), function (r) {
      if (ada) r.setAttribute("aria-invalid", "true"); else r.removeAttribute("aria-invalid");
    });
  }

  function bersihkanGalat() {
    KB.indikator.forEach(function (i) { tandaiGalat(i.kode, false); });
  }

  function ambilFakta() {
    var fakta = {};
    KB.indikator.forEach(function (ind) {
      var t = document.querySelector('input[name="' + ind.kode + '"]:checked');
      if (t) fakta[ind.kode] = t.value;
      else if (faktaIlegal[ind.kode] !== undefined) fakta[ind.kode] = faktaIlegal[ind.kode];
      else fakta[ind.kode] = "";
    });
    return fakta;
  }

  // Update visual state of each card & phase progress
  function perbaruiStatusKartu() {
    KB.indikator.forEach(function (ind) {
      var k = document.getElementById("kartu-" + ind.kode);
      var st = document.getElementById("state-" + ind.kode);
      if (!k || !st) return;

      k.classList.remove("terisi-normal", "terisi-peringatan", "terisi-parah");
      var checked = document.querySelector('input[name="' + ind.kode + '"]:checked');

      if (!checked) {
        if (faktaIlegal[ind.kode] !== undefined) {
          k.classList.add("terisi-parah");
          st.className = "ind-state-pill parah";
          st.textContent = "Nilai ilegal: " + faktaIlegal[ind.kode];
        } else {
          st.className = "ind-state-pill belum";
          st.textContent = "Belum dipilih";
        }
        return;
      }

      var optSpan = checked.nextElementSibling;
      if (optSpan && optSpan.classList.contains("parah")) {
        k.classList.add("terisi-parah");
        st.className = "ind-state-pill parah";
        st.textContent = "Kritis";
      } else if (optSpan && optSpan.classList.contains("tidak-normal")) {
        k.classList.add("terisi-peringatan");
        st.className = "ind-state-pill peringatan";
        st.textContent = "Perhatian";
      } else {
        k.classList.add("terisi-normal");
        st.className = "ind-state-pill normal";
        st.textContent = "Normal";
      }
    });

    kategoriList.forEach(function (kat) {
      var badge = document.getElementById("badge-" + kat.id);
      if (!badge) return;
      var terisi = kat.kodes.filter(function (kode) {
        return !!document.querySelector('input[name="' + kode + '"]:checked') || faktaIlegal[kode] !== undefined;
      }).length;
      var penuh = terisi === kat.kodes.length;
      badge.classList.toggle("lengkap", penuh);
      badge.textContent = penuh ? (terisi + "/" + kat.kodes.length + " Lengkap ✓") : (terisi + "/" + kat.kodes.length + " terisi");
    });
  }

  // Progres Pengisian Real-Time
  function perbaruiProgres() {
    var n = 0;
    KB.indikator.forEach(function (ind) {
      if (document.querySelector('input[name="' + ind.kode + '"]:checked') || faktaIlegal[ind.kode] !== undefined) n++;
    });

    var pct = Math.round((n / KB.indikator.length) * 100);
    var teksProg = $("#teks-progres");
    var isiProg = $("#isi-progres");
    var pctProg = $("#progres-persen");
    var btnPeriksa = $("#btn-periksa");

    if (teksProg) {
      teksProg.textContent = n === KB.indikator.length
        ? "Semua 10 indikator siap dianalisis!"
        : (n + " dari " + KB.indikator.length + " indikator terisi");
    }
    if (isiProg) isiProg.style.width = pct + "%";
    if (pctProg) pctProg.textContent = pct + "%";

    var progWrap = $(".progres");
    if (progWrap) progWrap.classList.toggle("penuh", n === KB.indikator.length);
    if (btnPeriksa) btnPeriksa.classList.toggle("siap", n === KB.indikator.length);

    perbaruiStatusKartu();
  }

  // Deteksi Perubahan Masukan (Stale Result)
  var terakhir = null;
  function perbaruiBasi() {
    var basi = terakhir !== null && JSON.stringify(ambilFakta()) !== terakhir;
    var warnBasi = $("#peringatan-basi");
    var isiHasil = $("#isi-hasil");
    if (warnBasi) warnBasi.hidden = !basi;
    if (isiHasil) isiHasil.classList.toggle("basi", basi);
  }

  function isiFakta(fakta) {
    faktaIlegal = {};
    KB.indikator.forEach(function (ind) {
      var val = fakta[ind.kode];
      if (val !== undefined && val !== null && val !== "") {
        var cocok = ind.pilihan.some(function (p) { return p.nilai === val; });
        if (!cocok) faktaIlegal[ind.kode] = val;
      }
    });
    document.querySelectorAll('#daftar-indikator input[type="radio"]').forEach(function (r) {
      r.checked = fakta[r.name] === r.value;
    });
    bersihkanGalat();
    perbaruiProgres();
    perbaruiBasi();
  }

  if (wadah) {
    wadah.addEventListener("change", function (e) {
      var kartu = e.target.closest(".indikator");
      if (kartu) {
        var kd = kartu.id.replace("kartu-", "");
        delete faktaIlegal[kd];
        tandaiGalat(kd, false);
      }
      perbaruiProgres();
      perbaruiBasi();
    });
  }

  // Lompat ke indikator pertama yang belum diisi
  var btnLompatKosong = $("#btn-lompat-kosong");
  if (btnLompatKosong) {
    btnLompatKosong.addEventListener("click", function () {
      var kosong = KB.indikator.filter(function (ind) {
        return !document.querySelector('input[name="' + ind.kode + '"]:checked');
      })[0];
      if (!kosong) {
        showToast("Semua 10 indikator sudah terisi! Klik Periksa Kelayakan.");
        var btnP = $("#btn-periksa");
        if (btnP) btnP.focus();
        return;
      }
      fokusKartu(kosong.kode);
      showToast("Menuju indikator " + kosong.kode + " (" + kosong.nama + ")");
    });
  }

  // ---------- Mode Demo & Preset Cepat ----------
  var bannerOtomatis = $("#banner-otomatis");
  var bannerOtomatisTeks = $("#banner-otomatis-teks");
  var pilihContoh = $("#pilih-contoh");

  function tampilkanBannerInfo(htmlPesan) {
    if (!bannerOtomatis) return;
    if (bannerOtomatisTeks && htmlPesan) bannerOtomatisTeks.innerHTML = htmlPesan;
    bannerOtomatis.hidden = false;
  }

  if (pilihContoh) {
    UJI.skenario.forEach(function (s) {
      var o = document.createElement("option");
      o.value = s.id;
      o.textContent = s.id + " · " + s.jenis + " — " + s.uraian;
      pilihContoh.appendChild(o);
    });

    pilihContoh.addEventListener("change", function () {
      var s = UJI.skenario.filter(function (x) { return x.id === pilihContoh.value; })[0];
      if (s) {
        isiFakta(s.fakta);
        tampilkanBannerInfo('<b>Skenario ' + esc(s.id) + ' (' + esc(s.uraian) + ') dimuat.</b> Tekan <b>Periksa Kelayakan</b> untuk melihat kesimpulan mesin inferensi.');
        showToast("Skenario " + s.id + " dimuat. Klik Periksa Kelayakan.");
      }
    });
  }

  $$("[data-skenario]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var sid = btn.dataset.skenario;
      var s = UJI.skenario.filter(function (x) { return x.id === sid; })[0];
      if (s) {
        isiFakta(s.fakta);
        if (pilihContoh) pilihContoh.value = sid;
        tampilkanBannerInfo('<b>Simulasi ' + esc(s.id) + ' (' + esc(s.uraian) + ') dimuat.</b> Tekan tombol <b>Periksa Kelayakan</b> untuk melihat hasilnya.');
        showToast("Simulasi " + sid + " dimuat. Klik Periksa Kelayakan.");
      }
    });
  });

  var btnNormal = $("#tombol-normal");
  if (btnNormal) {
    btnNormal.addEventListener("click", function () {
      isiFakta(UJI.NORMAL);
      if (pilihContoh) pilihContoh.value = "S1";
      tampilkanBannerInfo('<b>Semua indikator diset kondisi normal.</b> Ubah bagian yang bermasalah bila ada, lalu tekan <b>Periksa Kelayakan</b>.');
      showToast("Semua 10 indikator diset normal.");
    });
  }

  // ---------- Hasil: Keadaan Kosong (Empty State Edukatif) ----------
  function kosongkanHasil() {
    terakhir = null;
    var panelHasil = $("#hasil");
    var warnBasi = $("#peringatan-basi");
    var isiHasil = $("#isi-hasil");

    if (panelHasil) panelHasil.classList.add("belum");
    if (warnBasi) warnBasi.hidden = true;
    if (isiHasil) {
      isiHasil.classList.remove("basi");
      isiHasil.innerHTML =
        '<div class="kosong-card">' +
          '<div class="kosong-radar">' +
            '<div class="radar-circle circle-1"></div>' +
            '<div class="radar-circle circle-2"></div>' +
            '<i class="ri-radar-line"></i>' +
          '</div>' +
          '<h3 class="kosong-title">Siap Menganalisis PC</h3>' +
          '<p class="kosong-sub">Lengkapi 10 indikator di sebelah kiri lalu tekan <b>Periksa Kelayakan</b>. Hasil status, aturan pendukung, dan checklist tindakan akan muncul di sini.</p>' +
          '<div class="kosong-legend">' +
            '<div class="kl-title">Arti 4 Status Kelayakan:</div>' +
            '<div class="kl-row"><span class="label hijau">✓ K1</span><span>Layak pakai langsung</span></div>' +
            '<div class="kl-row"><span class="label kuning">! K2</span><span>Layak dgn perbaikan ringan</span></div>' +
            '<div class="kl-row"><span class="label merah">✕ K3</span><span>Tidak layak sementara (perbaiki)</span></div>' +
            '<div class="kl-row"><span class="label ungu">↻ K4</span><span>Tidak layak, usul peremajaan</span></div>' +
          '</div>' +
          '<div class="kosong-features">' +
            '<div class="kf-item"><i class="ri-check-line"></i> Evaluasi ' + KB.aturan.length + ' Aturan IF–THEN Pakar</div>' +
            '<div class="kf-item"><i class="ri-shield-keyhole-line"></i> Prioritas Konflik: K3 › K4 › K2 › K1</div>' +
            '<div class="kf-item"><i class="ri-file-list-3-line"></i> Checklist Tindakan Praktis Laboran</div>' +
          '</div>' +
        '</div>';
    }
  }

  kosongkanHasil();
  perbaruiProgres();

  var formulir = $("#formulir");
  if (formulir) {
    formulir.addEventListener("reset", function () {
      setTimeout(function () {
        isiFakta({});
        if (bannerOtomatis) bannerOtomatis.hidden = true;
        if (pilihContoh) pilihContoh.value = "";
        kosongkanHasil();
        showToast("Formulir telah dikosongkan.");
      }, 0);
    });

    formulir.addEventListener("submit", function (e) {
      e.preventDefault();
      var fakta = ambilFakta();
      var hasil = MESIN.inferensi(fakta, KB);
      var nomorInput = $("#nomor-pc");
      var nomor = nomorInput ? nomorInput.value.trim() : "";
      tampilkanHasil(hasil, nomor, fakta);
      if (hasil.valid && window.innerWidth <= 1080) {
        var elHasil = $("#hasil");
        if (elHasil) gulirKe(elHasil);
      }
    });
  }

  // ---------- Tampilan Hasil Diagnosis (Explainable AI) ----------
  function kartuAturan(r, kalah) {
    return '<div class="aturan-kartu' + (kalah ? " kalah" : "") + '">' +
      '<p class="alasan"><span class="id">' + r.id + "</span>" + esc(r.alasan) +
      (kalah ? ' <span class="meta">(Kalah Prioritas)</span>' : "") + "</p>" +
      "<code>" + esc(MESIN.teksAturan(r, KB)) + "</code></div>";
  }

  function ringkasanTemuan(fakta) {
    var temuan = [];
    KB.indikator.forEach(function (ind) {
      var val = fakta[ind.kode];
      var pil = ind.pilihan.filter(function (p) { return p.nilai === val; })[0];
      var idx = ind.pilihan.indexOf(pil);
      if (pil && idx !== 0 && !pil.normal) {
        temuan.push({
          kode: ind.kode,
          nama: ind.nama,
          label: pil.label,
          parah: !!nilaiParah[ind.kode + ":" + pil.nilai]
        });
      }
    });
    return temuan;
  }

  function tampilkanHasil(h, nomor, fakta) {
    var el = $("#isi-hasil");
    var panelHasil = $("#hasil");
    var warnBasi = $("#peringatan-basi");

    if (panelHasil) panelHasil.classList.remove("belum");
    if (warnBasi) warnBasi.hidden = true;
    if (el) el.classList.remove("basi");

    // Jika masukan belum valid
    if (!h.valid) {
      terakhir = null;
      h.galat.forEach(function (g) { tandaiGalat(g.kode, true, g.pesan); });

      var adaIlegal = Object.keys(faktaIlegal).length > 0;
      var judulGalat = adaIlegal ? "Masukan Ditolak (Nilai Tidak Valid)" : (h.galat.length + " Indikator Belum Diisi");
      var subGalat = adaIlegal
        ? "Sistem menolak nilai di luar pilihan indikator yang ditetapkan. Perbaiki indikator berikut:"
        : "Klik item di bawah untuk langsung menuju indikator yang masih kosong:";

      if (el) {
        el.innerHTML =
          '<div class="galat-card">' +
            '<div class="galat-header">' +
              '<div class="galat-icon"><i class="ri-alert-fill"></i></div>' +
              '<div><h2>' + esc(judulGalat) + '</h2>' +
              '<p>' + esc(subGalat) + '</p></div>' +
            '</div>' +
            '<ul class="galat-list">' +
              h.galat.map(function (g) {
                return '<li><button type="button" data-fokus="' + g.kode + '"><span><i class="ri-arrow-right-s-line"></i> ' + esc(g.pesan) + "</span></button></li>";
              }).join("") +
            '</ul>' +
          '</div>';
      }
      fokusKartu(h.galat[0].kode);
      showToast(adaIlegal ? "Masukan ditolak: nilai di luar pilihan." : (h.galat.length + " indikator perlu dilengkapi."));
      return;
    }

    var sekarang = new Date();
    var s = h.status;
    terakhir = JSON.stringify(fakta);
    catatRiwayat(h, nomor, sekarang);

    var html = '<div class="result-content">';

    // 1. Status Hero Banner
    html += '<div class="status ' + s.warna + '">' +
      '<div class="status-ikon" aria-hidden="true">' + (IKON[s.kode] || "✓") + '</div>' +
      '<div class="status-info">' +
        '<p class="mono">' + (nomor ? esc(nomor) + " · " : "") + (s.kode === "-" ? "TIDAK ADA ATURAN COCOK" : "STATUS " + s.kode) + '</p>' +
        '<h2>' + esc(s.nama) + '</h2>' +
        '<p>' + esc(s.deskripsi) + '</p>' +
        '<p class="waktu"><i class="ri-time-line"></i> Diperiksa pada ' + esc(waktuTampil(sekarang)) + '</p>' +
      '</div></div>';

    // 2. Snapshot Temuan Tidak Normal (Memudahkan Laboran)
    var temuan = ringkasanTemuan(fakta);
    html += '<div class="bagian">' +
      '<h3><i class="ri-eye-line"></i> RINGKASAN TEMUAN PENGAMATAN</h3>';
    if (temuan.length) {
      html += '<div class="temuan-chips">' +
        temuan.map(function (t) {
          return '<span class="temuan-chip ' + (t.parah ? "parah" : "peringatan") + '">' +
            '<b>' + t.kode + '</b> ' + esc(t.nama) + ': ' + esc(t.label) + '</span>';
        }).join("") +
      '</div>';
    } else {
      html += '<div class="temuan-normal-box"><i class="ri-checkbox-circle-line"></i> Seluruh 10 indikator berada pada kondisi normal.</div>';
    }
    html += '</div>';

    // 3. Tindakan yang Disarankan (Checklist Interaktif)
    html += '<div class="bagian">' +
      '<div class="bagian-head-row">' +
        '<h3><i class="ri-checkbox-line"></i> TINDAKAN YANG DISARANKAN</h3>' +
        '<span class="tindakan-progress" id="tindakan-progress">0/' + h.tindakan.length + ' selesai</span>' +
      '</div>' +
      '<ul class="tindakan">' +
        h.tindakan.map(function (t, idx) {
          return '<li><label class="tindakan-check-label">' +
            '<input type="checkbox" class="tindakan-cb" data-idx="' + idx + '">' +
            '<span class="tindakan-box" aria-hidden="true"><i class="ri-check-line"></i></span>' +
            '<span class="tindakan-text">' + esc(t) + '</span>' +
          '</label></li>';
        }).join("") +
      '</ul></div>';

    // 4. Tombol Aksi Cepat
    html += '<div class="bagian aksi-hasil">' +
      '<button type="button" class="tombol utama" data-aksi="berikutnya" title="Simpan hasil dan siapkan formulir untuk nomor PC selanjutnya">' +
        '<i class="ri-add-line"></i><span>Periksa PC Berikutnya</span>' +
      '</button>' +
      '<button type="button" class="tombol sekunder" data-aksi="cetak" title="Cetak formulir diagnosis resmi laboratorium">' +
        '<i class="ri-printer-line"></i><span>Cetak</span>' +
      '</button>' +
      '<button type="button" class="tombol sekunder" data-aksi="salin" title="Salin ringkasan teks diagnosis ke clipboard">' +
        '<i class="ri-file-copy-line"></i><span>Salin</span>' +
      '</button>' +
    '</div>';

    // 5. Mengapa Status Ini? (Explainable AI)
    html += '<div class="bagian">' +
      '<h3><i class="ri-questionnaire-line"></i> MENGAPA STATUS INI? (ATURAN PENDUKUNG)</h3>';
    if (h.pemenang.length) {
      html += h.pemenang.map(function (r) { return kartuAturan(r, false); }).join("");
    } else {
      html += '<p class="arahan">Kombinasi observasi ini belum terdefinisi pada basis pengetahuan sehingga forward chaining tidak menarik asumsi sembarangan.</p>';
    }
    if (h.antara && h.antara.length) {
      html += '<p class="category-desc">Fakta antara yang diturunkan lebih dulu dan dipakai aturan lain:</p>' +
        h.antara.map(function (r) { return kartuAturan(r, false); }).join("");
    }
    html += '</div>';

    // 6. Resolusi Konflik
    if (h.konflik) {
      html += '<div class="bagian">' +
        '<h3><i class="ri-shield-keyhole-line"></i> RESOLUSI KONFLIK PRIORITAS</h3>' +
        '<p class="category-desc">Aturan berikut juga terpicu, namun status <b>' + s.kode +
        '</b> diutamakan karena memiliki prioritas lebih berat (K3 › K4 › K2 › K1):</p>' +
        h.kalah.map(function (r) { return kartuAturan(r, true); }).join("") +
      '</div>';
    }

    // 7. Jejak Forward Chaining
    var siklusTerpicu = {};
    (h.jejak || []).forEach(function (j) { siklusTerpicu[j.aturan] = j.siklus; });

    html += '<div class="bagian">' +
      '<details class="jejak">' +
        '<summary><i class="ri-git-branch-line"></i> Lihat Jejak Penalaran Forward Chaining (' +
          h.terpicu.length + " dari " + KB.aturan.length + " aturan terpicu dalam " + h.siklus + " siklus)</summary>" +
        tabel(["Aturan", "Kondisi", "Terpicu?"], KB.aturan.map(function (r) {
          return ["<b>" + r.id + "</b>", "<code>" + esc(MESIN.teksAturan(r, KB)) + "</code>",
            siklusTerpicu[r.id] ? '<span class="ya">✓ Siklus ' + siklusTerpicu[r.id] + '</span>' : '<span class="tidak">Tidak</span>'];
        }), true) +
        '<p class="meta">Aturan yang terpicu menambah fakta ke memori kerja. Siklus terakhir tidak memicu aturan baru, sehingga penalaran berhenti.</p>' +
      '</details></div>';

    html += '</div>';

    if (el) el.innerHTML = html;
    if (panelHasil) panelHasil.scrollTop = 0;

    var pengumuman = $("#pengumuman");
    if (pengumuman) {
      pengumuman.textContent = "Hasil untuk " + (nomor || "komputer") + ": " + s.nama;
    }
    showToast("Hasil: " + s.nama + " (" + s.kode + ")");
  }

  function fokusKartu(kode) {
    var kartu = document.getElementById("kartu-" + kode);
    if (!kartu) return;
    gulirKe(kartu, "center");
    kartu.classList.add("sorot");
    setTimeout(function () { kartu.classList.remove("sorot"); }, 1200);
    var r = kartu.querySelector("input");
    if (r) r.focus({ preventScroll: true });
  }

  // Delegasi Klik & Checklist pada Panel Hasil
  var panelHasil = $("#hasil");
  if (panelHasil) {
    panelHasil.addEventListener("change", function (e) {
      if (!e.target.classList.contains("tindakan-cb")) return;
      var li = e.target.closest("li");
      if (li) li.classList.toggle("selesai", e.target.checked);
      var all = $$("#isi-hasil .tindakan-cb");
      var done = all.filter(function (c) { return c.checked; }).length;
      var progEl = $("#tindakan-progress");
      if (progEl) progEl.textContent = done + "/" + all.length + " selesai";
    });

    panelHasil.addEventListener("click", function (e) {
      var fokus = e.target.closest("[data-fokus]");
      if (fokus) { fokusKartu(fokus.dataset.fokus); return; }

      var aksi = e.target.closest("[data-aksi]");
      if (!aksi) return;

      var jenisAksi = aksi.dataset.aksi;
      if (jenisAksi === "cetak") window.print();
      if (jenisAksi === "berikutnya") periksaBerikutnya();
      if (jenisAksi === "salin") salinRingkasanClipboard();
    });
  }

  // Fitur Salin Ringkasan ke Clipboard
  function salinRingkasanClipboard() {
    var nomor = ($("#nomor-pc") ? $("#nomor-pc").value.trim() : "") || "PC Laboratorium";
    var hasilEl = $("#isi-hasil");
    if (!hasilEl) return;

    var statusJudul = hasilEl.querySelector(".status h2");
    var statusNama = statusJudul ? statusJudul.textContent : "";
    var tindakanItems = $$("#isi-hasil .tindakan .tindakan-text").map(function (el, idx) {
      return (idx + 1) + ". " + el.textContent;
    }).join("\n");

    var teks = "LAPORAN KELAYAKAN KOMPUTER (KOMPAK)\n" +
      "-------------------------------------------\n" +
      "Nomor PC : " + nomor + "\n" +
      "Status   : " + statusNama + "\n" +
      "Waktu    : " + waktuTampil(new Date()) + "\n\n" +
      "Tindakan Direkomendasikan:\n" +
      (tindakanItems || "-") + "\n" +
      "-------------------------------------------\n" +
      "Teknik Komputer UNM · Sistem Pakar Forward Chaining";

    salinTeks(teks, "Ringkasan berhasil disalin ke clipboard!");
  }

  // Print Handling
  var terbukaSebelumCetak = [];
  window.addEventListener("beforeprint", function () {
    terbukaSebelumCetak = [];
    $$("#hasil details").forEach(function (d) {
      terbukaSebelumCetak.push(d.open);
      d.open = true;
    });
  });
  window.addEventListener("afterprint", function () {
    $$("#hasil details").forEach(function (d, i) {
      d.open = !!terbukaSebelumCetak[i];
    });
  });

  // Alur Beruntun: PC Berikutnya (Auto Increment: PC-01 -> PC-02)
  function nomorBerikutnya(t) {
    if (!t) return "PC-02";
    return t.replace(/\d+/, function (m) {
      var n = String(parseInt(m, 10) + 1);
      while (n.length < m.length) n = "0" + n;
      return n;
    });
  }

  function periksaBerikutnya() {
    var input = $("#nomor-pc");
    if (input) {
      input.value = nomorBerikutnya(input.value.trim());
    }
    isiFakta({});
    if (bannerOtomatis) bannerOtomatis.hidden = true;
    if (pilihContoh) pilihContoh.value = "";
    kosongkanHasil();
    window.scrollTo({ top: 0, behavior: kurangiGerak() ? "auto" : "smooth" });
    if (input) {
      input.focus({ preventScroll: true });
      input.select();
    }
    showToast("Siap memeriksa " + (input ? input.value : "PC berikutnya"));
  }

  // ---------- Riwayat Pemeriksaan & Statistik Sesi ----------
  var riwayat = [];
  var noRiwayat = 0;

  function perbaruiStatistikRiwayat() {
    var elTotal = $("#stat-total-pc");
    var elK1 = $("#stat-k1");
    var elK2 = $("#stat-k2");
    var elK3 = $("#stat-k3");

    if (!elTotal) return;

    var nK1 = riwayat.filter(function (r) { return r.status.kode === "K1"; }).length;
    var nK2 = riwayat.filter(function (r) { return r.status.kode === "K2"; }).length;
    var nK3 = riwayat.filter(function (r) { return r.status.kode === "K3" || r.status.kode === "K4"; }).length;

    elTotal.textContent = riwayat.length;
    if (elK1) elK1.textContent = nK1;
    if (elK2) elK2.textContent = nK2;
    if (elK3) elK3.textContent = nK3;
  }

  function catatRiwayat(h, nomor, waktu) {
    var entri = {
      nomor: nomor || "(tanpa nomor)",
      status: h.status,
      aturan: h.pemenang.map(function (r) { return r.id; }).join(", "),
      waktu: waktu
    };
    var akhir = riwayat[riwayat.length - 1];
    if (nomor && akhir && akhir.nomor === entri.nomor) {
      entri.no = akhir.no;
      riwayat[riwayat.length - 1] = entri;
    } else {
      entri.no = ++noRiwayat;
      riwayat.push(entri);
    }
    tampilkanRiwayat();
    perbaruiStatistikRiwayat();
  }

  function tampilkanRiwayat() {
    var riwayatSec = $("#riwayat");
    if (riwayatSec) riwayatSec.hidden = riwayat.length === 0;

    var urut = riwayat.slice().reverse();
    var wadahTabel = $("#tabel-riwayat");
    if (wadahTabel) {
      wadahTabel.innerHTML = tabel(["No", "Label PC", "Status Kelayakan", "Aturan Dasar", "Waktu Diperiksa"], urut.map(function (r) {
        return [
          r.no,
          "<b>" + esc(r.nomor) + "</b>",
          labelStatus(r.status) + " " + esc(r.status.nama),
          esc(r.aturan || "—"),
          esc(waktuTampil(r.waktu))
        ];
      }));
    }
  }

  function selCsv(v) {
    v = String(v);
    if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
    return '"' + v.replace(/"/g, '""') + '"';
  }

  var btnEkspor = $("#ekspor-csv");
  if (btnEkspor) {
    btnEkspor.addEventListener("click", function () {
      if (riwayat.length === 0) {
        showToast("Belum ada riwayat pemeriksaan untuk diekspor.");
        return;
      }
      var baris = [["No", "Nomor PC", "Kode Status", "Nama Status", "Aturan Terpicu", "Waktu"]].concat(riwayat.map(function (r) {
        return [r.no, r.nomor, r.status.kode, r.status.nama, r.aturan, waktuCsv(r.waktu)];
      }));
      var csv = "\ufeff" + baris.map(function (b) { return b.map(selCsv).join(";"); }).join("\r\n");
      var url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      var a = document.createElement("a");
      a.href = url;
      a.download = "riwayat-kompak-" + waktuCsv(new Date()).replace(/[-: ]/g, "").replace(/^(\d{8})(\d{4})$/, "$1-$2") + ".csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      showToast("Berkas CSV berhasil diunduh.");
    });
  }

  var btnHapus = $("#hapus-riwayat");
  if (btnHapus) {
    btnHapus.addEventListener("click", function () {
      if (!window.confirm("Hapus seluruh riwayat pemeriksaan sesi ini?")) return;
      riwayat = [];
      tampilkanRiwayat();
      perbaruiStatistikRiwayat();
      showToast("Riwayat telah dibersihkan.");
    });
  }

  // ---------- Tab Basis Pengetahuan ----------
  (function tampilkanBasis() {
    var urut = ["K1", "K2", "K4", "K3"];
    var tabelKesimpulan = $("#tabel-kesimpulan");
    if (tabelKesimpulan) {
      tabelKesimpulan.innerHTML = tabel(["Kode", "Kesimpulan", "Uraian Praktis", "Tingkat Prioritas"],
        urut.map(function (k) {
          var s = KB.kesimpulan[k];
          return [labelStatus(s), "<b>" + esc(s.nama) + "</b>", esc(s.deskripsi), "Prioritas " + s.prioritas];
        }).concat([[labelStatus(KB.belumDisimpulkan), "<b>" + esc(KB.belumDisimpulkan.nama) + "</b>", esc(KB.belumDisimpulkan.deskripsi), "—"]]));
    }

    var tabelIndikator = $("#tabel-indikator");
    if (tabelIndikator) {
      tabelIndikator.innerHTML = tabel(["Kode", "Parameter Observasi", "Pilihan Jawaban (Opsi Awal = Normal)"],
        KB.indikator.map(function (i) {
          return ["<b>" + i.kode + "</b>", "<b>" + esc(i.nama) + "</b>", i.pilihan.map(function (p) { return esc(p.label); }).join(" / ")];
        }));
    }

    var tabelAturan = $("#tabel-aturan");
    if (tabelAturan) {
      tabelAturan.innerHTML = tabel(["Aturan", "IF (Kondisi Fakta)", "THEN", "Dasar Alasan Teknis"],
        KB.aturan.map(function (r) {
          var jika = r.id === "R12" ? "Semua indikator bernilai normal" : MESIN.teksKondisi(r.kondisi, KB);
          var maka = r.hasilkan ? "<code>" + esc(r.hasilkan.fakta + " = " + r.hasilkan.nilai) + "</code>" : labelStatus(KB.kesimpulan[r.maka]);
          return ["<b>" + r.id + "</b>", "<code>" + esc(jika) + "</code>", maka, esc(r.alasan)];
        }));
    }

    var daftarSumber = $("#daftar-sumber");
    if (daftarSumber) {
      daftarSumber.innerHTML = KB.sumber.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("");
    }
  })();

  // ---------- Tab Pengujian (Akurasi & Skenario Uji) ----------
  function tampilkanPengujian() {
    var hasil = UJI.jalankan(KB, MESIN);
    var lulus = hasil.filter(function (h) { return h.lulus; }).length;
    var pct = Math.round((lulus / hasil.length) * 100);

    var ringkasanEl = $("#ringkasan-uji");
    if (ringkasanEl) {
      ringkasanEl.innerHTML = "<b>" + pct + "%</b><span>" + lulus + " dari " + hasil.length + " skenario sesuai harapan</span>";
    }

    var tabelUji = $("#tabel-uji");
    if (tabelUji) {
      tabelUji.innerHTML = tabel(["No", "Klasifikasi", "Kondisi Uji (Lainnya Normal)", "Target Pakar", "Hasil Inferensi", "Verifikasi"],
        hasil.map(function (h) {
          return [
            "<b>" + h.id + "</b>",
            esc(h.jenis),
            esc(h.uraian),
            "<code>" + esc(h.diharapkan) + "</code>",
            "<code>" + esc(h.aktual) + "</code>",
            h.lulus ? '<span class="lulus">✓ SESUAI</span>' : '<span class="gagal">✕ TIDAK</span>'
          ];
        }));
    }
  }

})();
