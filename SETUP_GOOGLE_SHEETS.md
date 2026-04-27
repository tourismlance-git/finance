# Cara Setup Google Sheets API

## Langkah 1: Buka Google Cloud Console
Buka: https://console.cloud.google.com/

## Langkah 2: Buat Project (jika belum ada)
1. Klik **Select Project** di pojok kanan atas
2. Klik **New Project**
3. Nama: `laporan-keuangan-ukm`
4. Klik **Create**

## Langkah 3: Enable Google Sheets API
1. Di menu kiri, klik **API & Services** → **Library**
2. Cari "Google Sheets API"
3. Klik lalu klik **Enable**

## Langkah 4: Buat Service Account
1. Di menu kiri, klik **API & Services** → **Credentials**
2. Klik **+ CREATE CREDENTIALS** → **Service Account**
3. Service account name: `sheets-api`
4. Description: `Untuk akses Google Sheets`
5. Klik **CREATE AND CONTINUE**
6. Role: **Project** → **Editor**
7. Klik **DONE**

## Langkah 5: Buat JSON Key
1. Klik pada service account yang baru dibuat (nama: `sheets-api`)
2. Klik tab **Keys**
3. Jika ada key yang sudah ada, klik **ADD KEY** → **Create new key**
4. Pilih **JSON** → **Create**
5. File akan otomatis didownload (simpan baik-baik!)

**Jika tidak ada tombol ADD KEY:**
- Pastikan Anda sudah klik pada nama service account (bukan di list)
- Coba klik tombol **+ Add Key** yang biasanya ada di tengah atau atas tab

## Langkah 6: Share Spreadsheet
1. Buka: https://docs.google.com/spreadsheets/d/1ip9jldvaDt1da2wNyqqrZpIlujByg_YAj_vl_SfWEUI
2. Klik **Share** (kanan atas)
3. Di "Add people and groups", masukkan email service account:
   ```
   sheets-api@crypto-moon-465120-a8.iam.gserviceaccount.com
   ```
4. Pastikan permission **Editor**
5. Klik **Done**

## Langkah 7: Setup di Vercel
1. Buka: https://vercel.com/dashboard
2. Pilih project **laporan-keuangan-wildan**
3. Klik **Settings** → **Environment Variables**
4. Tambahkan variabel:
   - Name: `GOOGLE_SHEET_ID`
     Value: `1ip9jldvaDt1da2wNyqqrZpIlujByg_YAj_vl_SfWEUI`
   
   - Name: `GOOGLE_CREDENTIALS`
     Value: (paste seluruh isi file JSON yang tadi didownload)

## PENTING: Format Credentials
Pastikan saat paste di Vercel, credentials dalam 1 baris tanpa newline.

---

## Tanya Jawab

**Q: Credentials yang saya punya tidak lengkap?**
A: Ikuti langkah di atas untuk dapat credentials lengkap. Yang Anda punya sekarang mungkin hanya `private_key_id` saja, bukan credentials lengkap.

**Q: Di mana dapat email service account?**
A: Di langkah 4, setelah buat service account, klik pada nama service account - email ada di bagian atas (format: `nama@project.iam.gserviceaccount.com`)

**Q: Spreadsheet ID yang mana?**
A: Dari URL: `https://docs.google.com/spreadsheets/d/ABCD123.../edit`
ID-nya: `ABCD123...` (bagian antara `/d/` dan `/edit`)