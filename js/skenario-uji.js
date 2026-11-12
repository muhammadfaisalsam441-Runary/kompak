/*
 * KOMPAK — Skenario Uji (Laboratorium Pemrograman)
 * ---------------------------------------------------------------
 * Setiap skenario: indikator yang tidak disebut bernilai NORMAL.
 * harapan.status   : kode kesimpulan yang diharapkan ("-" = belum dapat disimpulkan)
 * harapan.aturan   : aturan yang diharapkan menjadi dasar kesimpulan
 * Hasil yang diharapkan diturunkan dari basis aturan (bukan penilaian pakar per skenario).
 * harapan.valid    : false jika masukan seharusnya ditolak
 */
(function (root) {
  "use strict";

  var NORMAL = {
    I1: "normal", I2: "normal", I3: "normal", I4: "berfungsi", I5: "memenuhi",
    I6: "baik", I7: "normal", I8: "berjalan", I9: "tidak_dipakai", I10: "bersih"
  };

  function dengan(ubah) {
    var hasil = {};
    Object.keys(NORMAL).forEach(function (k) { hasil[k] = NORMAL[k]; });
    Object.keys(ubah || {}).forEach(function (k) {
      if (ubah[k] === undefined) delete hasil[k]; else hasil[k] = ubah[k];
    });
    return hasil;
  }

  var skenario = [
    { id: "S1", jenis: "Umum", uraian: "Semua normal, XAMPP berjalan",
      fakta: dengan({ I9: "berjalan" }), harapan: { valid: true, status: "K1", aturan: ["R12"] } },
    { id: "S2", jenis: "Umum", uraian: "I8 = Tidak dikenali di terminal (PATH)",
      fakta: dengan({ I8: "path" }), harapan: { valid: true, status: "K2", aturan: ["R10"] } },
    { id: "S3", jenis: "Umum", uraian: "I1 = Gagal booting",
      fakta: dengan({ I1: "gagal" }), harapan: { valid: true, status: "K3", aturan: ["R1"] } },
    { id: "S4", jenis: "Umum", uraian: "I8 = Compiler/runtime tidak terpasang",
      fakta: dengan({ I8: "tidak_terpasang" }), harapan: { valid: true, status: "K3", aturan: ["R5"] } },
    { id: "S5", jenis: "Umum", uraian: "I5 = RAM < 8 GB, I1 = Lambat",
      fakta: dengan({ I5: "kurang", I1: "lambat" }), harapan: { valid: true, status: "K4", aturan: ["R8"] } },
    { id: "S6", jenis: "Batas", uraian: "I5 = RAM < 8 GB, I6 = Peringatan, I1 = Normal",
      fakta: dengan({ I5: "kurang", I6: "peringatan" }), harapan: { valid: true, status: "K2", aturan: ["R9"] } },
    { id: "S7", jenis: "Konflik", uraian: "I5 = RAM < 8 GB, I1 = Lambat, I10 = Terdeteksi",
      fakta: dengan({ I5: "kurang", I1: "lambat", I10: "terdeteksi" }), harapan: { valid: true, status: "K3", aturan: ["R7"] } },
    { id: "S8", jenis: "Tanpa aturan", uraian: "I1 = Lambat saja",
      fakta: dengan({ I1: "lambat" }), harapan: { valid: true, status: "-", aturan: [] } },
    { id: "S9", jenis: "Tidak valid", uraian: "I8 tidak diisi (kosong)",
      fakta: dengan({ I8: undefined }), harapan: { valid: false } },
    { id: "S10", jenis: "Tidak valid", uraian: "I1 = \"rusak_parah\" (di luar pilihan)",
      fakta: dengan({ I1: "rusak_parah" }), harapan: { valid: false } },
    { id: "S11", jenis: "Umum", uraian: "I2 = Mati mendadak",
      fakta: dengan({ I2: "mati" }), harapan: { valid: true, status: "K3", aturan: ["R2"] } },
    { id: "S12", jenis: "Umum", uraian: "I4 = Keyboard/mouse tidak berfungsi",
      fakta: dengan({ I4: "tidak_berfungsi" }), harapan: { valid: true, status: "K3", aturan: ["R3"] } },
    { id: "S13", jenis: "Umum", uraian: "I6 = Penyimpanan buruk",
      fakta: dengan({ I6: "buruk" }), harapan: { valid: true, status: "K3", aturan: ["R4"] } },
    { id: "S14", jenis: "Umum", uraian: "I9 = XAMPP gagal dijalankan",
      fakta: dengan({ I9: "gagal" }), harapan: { valid: true, status: "K3", aturan: ["R6"] } },
    { id: "S15", jenis: "Umum", uraian: "I3 = Monitor bergaris",
      fakta: dengan({ I3: "bergaris" }), harapan: { valid: true, status: "K2", aturan: ["R11"] } },
    { id: "S16", jenis: "Batas", uraian: "I6 = Peringatan saja, I1 = Normal",
      fakta: dengan({ I6: "peringatan" }), harapan: { valid: true, status: "K2", aturan: ["R9"] } },
    { id: "S17", jenis: "Konflik", uraian: "I5 = RAM < 8 GB, I1 = Lambat, I8 = PATH",
      fakta: dengan({ I5: "kurang", I1: "lambat", I8: "path" }), harapan: { valid: true, status: "K4", aturan: ["R8"] } }
  ];

  // Jalankan semua skenario dan bandingkan dengan harapan.
  function jalankan(kb, mesin) {
    return skenario.map(function (s) {
      var h = mesin.inferensi(s.fakta, kb);
      var lulus, aktual;
      if (!s.harapan.valid) {
        lulus = h.valid === false;
        aktual = h.valid ? "Diterima (" + h.status.kode + ")" : "Ditolak: " + h.galat.map(function (g) { return g.pesan; }).join(" ");
      } else if (!h.valid) {
        lulus = false;
        aktual = "Ditolak: " + h.galat[0].pesan;
      } else {
        var idPemenang = h.pemenang.map(function (r) { return r.id; });
        var aturanSama = s.harapan.aturan.every(function (a) { return idPemenang.indexOf(a) >= 0; });
        lulus = h.status.kode === s.harapan.status && aturanSama;
        aktual = (h.status.kode === "-" ? "Belum dapat disimpulkan" : h.status.kode + " " + h.status.nama) +
          (h.terpicu.length ? " (" + h.terpicu.map(function (r) { return r.id; }).join(", ") + ")" : "");
      }
      var diharapkan = !s.harapan.valid ? "Masukan ditolak / pesan validasi"
        : (s.harapan.status === "-" ? "Belum dapat disimpulkan" : s.harapan.status + " (" + s.harapan.aturan.join(", ") + ")");
      return { id: s.id, jenis: s.jenis, uraian: s.uraian, diharapkan: diharapkan, aktual: aktual, lulus: lulus };
    });
  }

  var Uji = { NORMAL: NORMAL, skenario: skenario, jalankan: jalankan };

  if (typeof module !== "undefined" && module.exports) { module.exports = Uji; }
  else { root.KOMPAK_UJI = Uji; }
})(this);
