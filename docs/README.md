# Dokumentasi Proyek — 69 AI Network Console

Proyek ini dikelola dengan model **Waterfall**. Setiap fase harus selesai dan disetujui (gate) sebelum fase berikutnya dimulai. Perubahan yang muncul setelah sebuah fase ditutup wajib lewat **Change Request (CR)** di [03-implementation/CHANGE-REQUESTS.md](03-implementation/CHANGE-REQUESTS.md).

| Info | Nilai |
| :--- | :--- |
| Produk | 69 AI Network Console (Electron desktop, macOS & Windows) |
| Versi baseline | 1.0.0 (hasil export Google AI Studio, pra-perbaikan) |
| Target rilis publik | 1.1.0 |
| Tanggal baseline | 2026-09-30 |
| Pemilik produk | _isi_ |

## Alur fase & status gate

```
[0] Baseline ─► [1] Requirements ─► [2] Design ─► [3] Implementation ─► [4] Verification ─► [5] Deployment ─► [6] Maintenance
```

| # | Fase | Dokumen | Status | Disetujui oleh / tanggal |
| :-- | :--- | :--- | :--- | :--- |
| 0 | Baseline & Audit | [00-baseline/AUDIT-2026-09-30.md](00-baseline/AUDIT-2026-09-30.md), [MANIFEST-SHA256.txt](00-baseline/MANIFEST-SHA256.txt) | ✅ Selesai | |
| 1 | Requirements | [01-requirements/SRS.md](01-requirements/SRS.md) | ✅ Disetujui | Pemilik produk, 2026-09-30 |
| 2 | Design | [02-design/SDD.md](02-design/SDD.md) | ✅ Disetujui | Pemilik produk, 2026-09-30 |
| 3 | Implementation | [03-implementation/IMPLEMENTATION-PLAN.md](03-implementation/IMPLEMENTATION-PLAN.md), [CHANGE-REQUESTS.md](03-implementation/CHANGE-REQUESTS.md) | ✅ Selesai | Pemilik produk, 2026-09-30 |
| 4 | Verification | [04-verification/TEST-PLAN.md](04-verification/TEST-PLAN.md) | 🟡 Siap dimulai (butuh perangkat asli) | |
| 5 | Deployment | [05-deployment/RELEASE-CHECKLIST.md](05-deployment/RELEASE-CHECKLIST.md) | ⚪ Belum mulai | |
| 6 | Maintenance | [06-maintenance/MAINTENANCE.md](06-maintenance/MAINTENANCE.md) | ⚪ Belum mulai | |

## Aturan gate
1. **Exit criteria** setiap fase tertulis di dokumennya masing-masing. Gate hanya boleh ditutup kalau semua kriteria terpenuhi.
2. Kode **tidak boleh diubah** sebelum Fase 1 dan 2 disetujui.
3. Setiap perubahan kode harus merujuk ke ID requirement (`SEC-xx`, `FR-xx`) atau ID CR.
4. Traceability matrix di [TEST-PLAN.md](04-verification/TEST-PLAN.md) harus 100% hijau sebelum masuk Fase 5.

## Dokumen publik (ikut dirilis)
- [../README.md](../README.md): pengenalan untuk pengguna
- [SECURITY.md](../.github/SECURITY.md): kebijakan pelaporan celah keamanan
- [PRIVACY.md](PRIVACY.md): data apa yang dikirim ke mana
- [../CHANGELOG.md](../CHANGELOG.md): riwayat versi
