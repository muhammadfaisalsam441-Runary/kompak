/*
 * KOMPAK — Basis Pengetahuan (Laboratorium Pemrograman)
 * ---------------------------------------------------------------
 * File ini HANYA berisi pengetahuan pakar (data), tidak berisi logika.
 * Jika aturan berubah (misalnya setelah wawancara laboran), cukup ubah
 * file ini; mesin inferensi tidak perlu disentuh.
 *
 * Isi:
 *   1. indikator  : 10 fakta masukan beserta pilihan nilainya
 *   2. kesimpulan : 4 status kelayakan + prioritas resolusi konflik
 *   3. aturan     : 12 aturan IF–THEN
 *   4. sumber     : sumber pengetahuan
 *
 * Format kondisi aturan (bisa bersarang):
 *   { fakta: "I1", nilai: "gagal" }        -> I1 = gagal
 *   { semua: [kondisi, kondisi, ...] }     -> AND
 *   { salahSatu: [kondisi, kondisi, ...] } -> OR
 *
 * Pilihan pertama setiap indikator adalah kondisi NORMAL. Pilihan lain
 * yang juga normal diberi tanda `normal: true` (contoh: XAMPP berjalan).
 */
(function (root) {
  "use strict";

  // 1. INDIKATOR ------------------------------------------------------
  var indikator = [
    { kode: "I1", nama: "Proses booting", petunjuk: "Nyalakan PC dan hitung waktu sampai desktop siap.",
      pilihan: [
        { nilai: "normal", label: "Normal" },
        { nilai: "lambat", label: "Lambat (> 3 menit)" },
        { nilai: "gagal", label: "Gagal booting" } ] },
    { kode: "I2", nama: "Suhu dan kipas", petunjuk: "Raba casing dan dengarkan suara kipas.",
      pilihan: [
        { nilai: "normal", label: "Normal" },
        { nilai: "panas", label: "Panas atau berisik" },
        { nilai: "mati", label: "Mati mendadak" } ] },
    { kode: "I3", nama: "Monitor", petunjuk: "Perhatikan tampilan layar.",
      pilihan: [
        { nilai: "normal", label: "Normal" },
        { nilai: "bergaris", label: "Bergaris atau berkedip" },
        { nilai: "tidak_tampil", label: "Tidak tampil" } ] },
    { kode: "I4", nama: "Keyboard dan mouse", petunjuk: "Coba ketik dan gerakkan kursor.",
      pilihan: [
        { nilai: "berfungsi", label: "Berfungsi" },
        { nilai: "sebagian", label: "Sebagian bermasalah" },
        { nilai: "tidak_berfungsi", label: "Tidak berfungsi" } ] },
    { kode: "I5", nama: "Kapasitas RAM", petunjuk: "Lihat RAM terpasang di Settings › System › About.",
      pilihan: [
        { nilai: "memenuhi", label: "Memenuhi (≥ 8 GB)" },
        { nilai: "kurang", label: "Kurang dari 8 GB" } ] },
    { kode: "I6", nama: "Kesehatan penyimpanan", petunjuk: "Lihat status di CrystalDiskInfo.",
      pilihan: [
        { nilai: "baik", label: "Baik" },
        { nilai: "peringatan", label: "Peringatan" },
        { nilai: "buruk", label: "Buruk" } ] },
    { kode: "I7", nama: "VS Code dan ekstensi", petunjuk: "Buka VS Code dan cek ekstensi bahasa yang dipakai hari ini.",
      pilihan: [
        { nilai: "normal", label: "Normal" },
        { nilai: "ekstensi_kurang", label: "Ekstensi kurang" },
        { nilai: "error", label: "Tidak terpasang / error" } ] },
    { kode: "I8", nama: "Compiler/runtime bahasa", petunjuk: "Di terminal: python --version, g++ --version, java -version, atau node -v.",
      pilihan: [
        { nilai: "berjalan", label: "Berjalan" },
        { nilai: "path", label: "Tidak dikenali di terminal (PATH)" },
        { nilai: "tidak_terpasang", label: "Tidak terpasang" } ] },
    { kode: "I9", nama: "XAMPP (Apache dan MySQL)", petunjuk: "Hanya untuk praktikum PHP/MySQL: jalankan dari XAMPP Control Panel.",
      pilihan: [
        { nilai: "tidak_dipakai", label: "Tidak dipakai hari ini" },
        { nilai: "berjalan", label: "Berjalan normal", normal: true },
        { nilai: "port_bentrok", label: "Port bentrok" },
        { nilai: "gagal", label: "Gagal dijalankan" } ] },
    { kode: "I10", nama: "Antivirus", petunjuk: "Jalankan pemindaian cepat.",
      pilihan: [
        { nilai: "bersih", label: "Bersih" },
        { nilai: "terdeteksi", label: "Terdeteksi ancaman" } ] }
  ];

  // 2. KESIMPULAN -----------------------------------------------------
  // prioritas: makin besar makin berat (K3 > K4 > K2 > K1).
  var kesimpulan = {
    K1: { kode: "K1", nama: "Layak pakai", prioritas: 1, warna: "hijau",
          deskripsi: "Komputer siap dipakai untuk praktikum pemrograman.",
          tindakanUmum: ["Komputer boleh langsung dipakai praktikan."] },
    K2: { kode: "K2", nama: "Layak dengan catatan", prioritas: 2, warna: "kuning",
          deskripsi: "Komputer masih boleh dipakai, tetapi perlu perbaikan ringan.",
          tindakanUmum: ["Boleh dipakai setelah perbaikan ringan; catat di buku log lab."] },
    K4: { kode: "K4", nama: "Tidak layak, usulkan peremajaan", prioritas: 3, warna: "ungu",
          deskripsi: "Spesifikasi tidak lagi memadai untuk praktikum pemrograman.",
          tindakanUmum: ["Jangan dipakai untuk praktikum yang berat (IDE dan compiler sekaligus).", "Ajukan usulan peremajaan ke kepala lab (tambah RAM, ganti ke SSD, atau unit baru)."] },
    K3: { kode: "K3", nama: "Tidak layak sementara", prioritas: 4, warna: "merah",
          deskripsi: "Ada kerusakan atau alat pemrograman yang tidak tersedia; tangani sebelum dipakai.",
          tindakanUmum: ["Jangan dipakai praktikum; pindahkan praktikan ke PC lain.", "Pasang label \"Rusak\" dan laporkan ke teknisi."] }
  };

  var belumDisimpulkan = {
    kode: "-", nama: "Belum dapat disimpulkan", prioritas: 0, warna: "abu",
    deskripsi: "Kombinasi kondisi ini belum tercakup oleh aturan mana pun.",
    tindakanUmum: ["Lakukan pemeriksaan manual oleh teknisi.", "Catat kombinasi ini sebagai bahan penambahan aturan baru."]
  };

  // 3. ATURAN ---------------------------------------------------------
  function f(kode, nilai) { return { fakta: kode, nilai: nilai }; }

  var aturan = [
    { id: "R1", maka: "K3", kondisi: f("I1", "gagal"),
      alasan: "PC gagal booting sehingga tidak dapat dipakai sama sekali.",
      tindakan: ["Periksa kabel daya, RAM, dan drive boot."] },
    { id: "R2", maka: "K3", kondisi: f("I2", "mati"),
      alasan: "PC mati mendadak, tanda panas berlebih atau catu daya bermasalah.",
      tindakan: ["Bersihkan kipas dan heatsink, periksa catu daya (PSU)."] },
    { id: "R3", maka: "K3", kondisi: { salahSatu: [f("I3", "tidak_tampil"), f("I4", "tidak_berfungsi")] },
      alasan: "Monitor atau perangkat masukan tidak berfungsi, padahal praktikan perlu mengetik kode.",
      tindakan: ["Periksa kabel monitor/keyboard/mouse, ganti perangkat cadangan bila ada."] },
    { id: "R4", maka: "K3", kondisi: f("I6", "buruk"),
      alasan: "Kesehatan penyimpanan buruk, file kode praktikan berisiko hilang.",
      tindakan: ["Cadangkan data penting dan ganti drive penyimpanan."] },
    { id: "R5", maka: "K3", kondisi: { salahSatu: [f("I7", "error"), f("I8", "tidak_terpasang")] },
      alasan: "Alat utama pemrograman (VS Code atau compiler/runtime) tidak tersedia.",
      tindakan: ["Pasang ulang VS Code atau compiler/runtime yang dipakai (Python, MinGW g++, JDK, Node.js)."] },
    { id: "R6", maka: "K3", kondisi: f("I9", "gagal"),
      alasan: "XAMPP gagal dijalankan, praktikum PHP/MySQL tidak bisa berjalan.",
      tindakan: ["Periksa log XAMPP, lalu perbaiki atau pasang ulang Apache/MySQL."] },
    { id: "R7", maka: "K3", kondisi: f("I10", "terdeteksi"),
      alasan: "Antivirus mendeteksi ancaman.",
      tindakan: ["Putuskan dari jaringan, karantina ancaman, lalu pindai ulang."] },
    { id: "R8", maka: "K4", kondisi: { semua: [ { salahSatu: [f("I5", "kurang"), f("I6", "peringatan")] }, f("I1", "lambat") ] },
      alasan: "Spesifikasi kurang (RAM/penyimpanan) dan sudah berdampak pada booting yang lambat.",
      tindakan: ["Usulkan tambah RAM atau ganti HDD ke SSD."] },
    { id: "R9", maka: "K2", kondisi: { semua: [ { salahSatu: [f("I5", "kurang"), f("I6", "peringatan")] }, f("I1", "normal") ] },
      alasan: "Spesifikasi mulai kurang, tetapi kinerja booting masih normal.",
      tindakan: ["Tutup aplikasi berat saat praktikum; masukkan ke daftar calon peremajaan."] },
    { id: "R10", maka: "K2", kondisi: { salahSatu: [f("I7", "ekstensi_kurang"), f("I8", "path"), f("I9", "port_bentrok")] },
      alasan: "Masalah konfigurasi perangkat lunak yang bisa diperbaiki asisten dalam beberapa menit.",
      tindakan: ["Pasang ekstensi VS Code yang kurang, tambahkan folder compiler ke PATH, atau ubah port Apache/MySQL yang bentrok."] },
    { id: "R11", maka: "K2", kondisi: { salahSatu: [f("I2", "panas"), f("I3", "bergaris"), f("I4", "sebagian")] },
      alasan: "Ada gangguan ringan pada suhu, monitor, atau perangkat masukan.",
      tindakan: ["Bersihkan debu kipas, rapikan kabel monitor, dan catat perangkat masukan yang perlu diganti."] }
  ];

  // R12: semua indikator normal. Untuk XAMPP, "tidak dipakai" dan "berjalan" sama-sama normal.
  aturan.push({
    id: "R12", maka: "K1",
    kondisi: { semua: indikator.map(function (i) {
      var normal = i.pilihan.filter(function (p, k) { return k === 0 || p.normal; });
      return normal.length === 1 ? f(i.kode, normal[0].nilai)
        : { salahSatu: normal.map(function (p) { return f(i.kode, p.nilai); }) };
    }) },
    alasan: "Semua indikator berada pada kondisi normal.",
    tindakan: []
  });

  // 4. SUMBER PENGETAHUAN --------------------------------------------
  var sumber = [
    "Pengalaman pemeriksaan komputer laboratorium pemrograman dan wawancara dengan laboran/teknisi lab.",
    "Afdal, dkk. (2026). Pendas: Jurnal Ilmiah Pendidikan Dasar, 11(01), 135–148. doi:10.23969/jp.v11i01.42815",
    "Anita, dkk. (2026). JATI (Jurnal Mahasiswa Teknik Informatika), 10(2), 2281–2286. doi:10.36040/jati.v10i2.17226",
    "Firdaus & Asyiah (2026). Jurnal Ilmu Komputer, 4(2), 246–262.",
    "Prastomo, dkk. (2026). RIGGS: Journal of Artificial Intelligence and Digital Business, 5(1), 1161–1167. doi:10.31004/riggs.v5i1.6072",
    "Saputra, dkk. (2022). Jurnal JTIK, 6(2), 234–242. doi:10.35870/jtik.v6i2.416",
    "Septian Isna & Ardiansyah (2024). JUSTINDO, 9(1), 46–54. doi:10.32528/justindo.v9i1.1224"
  ];

  var KB = { indikator: indikator, kesimpulan: kesimpulan, belumDisimpulkan: belumDisimpulkan, aturan: aturan, sumber: sumber };

  if (typeof module !== "undefined" && module.exports) { module.exports = KB; }
  else { root.KOMPAK_KB = KB; }
})(this);
