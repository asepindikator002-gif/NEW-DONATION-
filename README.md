# 🎮 Sistem Notifikasi Donasi Roblox Real-Time

Sistem ini memungkinkan notifikasi donasi dari Sociabuzz/Saweria muncul secara real-time di game Roblox Anda.

## 📁 Struktur File

```
roblox-donation-webhook/
├── index.js           # Backend Express.js
├── vercel.json        # Konfigurasi Vercel
├── package.json       # Dependencies
├── README.md          # Panduan ini
└── .gitignore         # Git ignore file
```

## 🚀 Langkah 1: Upload ke GitHub

### 1.1 Buat file `.gitignore`

Buat file baru bernama `.gitignore` dengan isi:

```
node_modules/
.env
.vercel
```

### 1.2 Upload ke GitHub

1. Buka [GitHub.com](https://github.com) dan login
2. Klik tombol **"New"** atau **"+"** di pojok kanan atas
3. Pilih **"New repository"**
4. Nama repository: `roblox-donation-webhook` (atau nama lain)
5. Pilih **Public** atau **Private**
6. **JANGAN** centang "Add a README file"
7. Klik **"Create repository"**

### 1.3 Upload File

Ada 2 cara:

#### Cara A: Upload via Web (Termudah)

1. Di halaman repository baru, klik **"uploading an existing file"**
2. Drag & drop semua file:
   - `index.js`
   - `vercel.json`
   - `package.json`
   - `README.md`
   - `.gitignore`
3. Klik **"Commit changes"**

#### Cara B: Via Git CLI (Jika familiar dengan terminal)

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/roblox-donation-webhook.git
git push -u origin main
```

## ☁️ Langkah 2: Deploy ke Vercel

### 2.1 Daftar/Login Vercel

1. Buka [Vercel.com](https://vercel.com)
2. Klik **"Sign Up"** atau **"Login"**
3. Login dengan akun GitHub Anda

### 2.2 Import Project

1. Setelah login, klik **"Add New..."** → **"Project"**
2. Cari repository `roblox-donation-webhook`
3. Klik **"Import"**
4. Di halaman konfigurasi:
   - **Framework Preset**: Pilih **"Other"**
   - **Root Directory**: Biarkan default (`./`)
   - **Build Command**: Biarkan kosong
   - **Output Directory**: Biarkan kosong
5. Klik **"Deploy"**

### 2.3 Tunggu Deploy Selesai

- Proses deploy memakan waktu 1-3 menit
- Setelah selesai, Anda akan mendapat URL seperti: `https://your-project-name.vercel.app`
- **SIMPAN URL INI!** Anda akan memerlukannya nanti

### 2.4 Test Server

Buka URL Vercel Anda di browser. Anda harus melihat response JSON seperti:

```json
{
  "status": "Server aktif",
  "endpoints": {
    "webhook": "POST /webhook - Terima webhook dari Sociabuzz/Saweria",
    "latest": "GET /latest - Ambil donasi terbaru untuk Roblox",
    "test": "POST /test - Test donasi manual"
  }
}
```

## 🔗 Langkah 3: Pasang Webhook ke Sociabuzz/Saweria

### Untuk Sociabuzz:

1. Login ke [Sociabuzz.com](https://sociabuzz.com)
2. Masuk ke **Dashboard**
3. Pilih menu **"Webhook"** atau **"Integration"**
4. Tambah webhook baru:
   - **URL**: `https://your-vercel-url.vercel.app/webhook`
   - **Method**: POST
   - **Event**: Donation/Payment
5. Simpan

### Untuk Saweria:

1. Login ke [Saweria.co](https://saweria.co)
2. Masuk ke **Pengaturan** → **Webhook**
3. Aktifkan webhook
4. Masukkan URL: `https://your-vercel-url.vercel.app/webhook`
5. Simpan

## 🎮 Langkah 4: Setup Script di Roblox Studio

### 4.1 Buka Roblox Studio

1. Buka game/project Roblox Anda
2. Pastikan **HTTP Requests** sudah diaktifkan:
   - Klik **Home** tab → **Game Settings**
   - Pilih tab **Security**
   - Centang **"Allow HTTP Requests"**
   - Klik **Save**

### 4.2 Masukkan Script

1. Di Explorer panel, buka: **StarterPlayer** → **StarterPlayerScripts**
2. Klik kanan **StarterPlayerScripts** → **Insert Object** → **LocalScript**
3. Rename menjadi `DonationNotifier`
4. Copy semua kode dari file `DonationNotifier.lua`
5. Paste ke dalam script
6. **PENTING**: Ganti baris ini:
   ```lua
   local API_URL = "https://your-vercel-url.vercel.app/latest"
   ```
   Dengan URL Vercel Anda yang sebenarnya, contoh:
   ```lua
   local API_URL = "https://roblox-donation-webhook.vercel.app/latest"
   ```

### 4.3 Test di Studio

1. Klik tombol **Play** di Roblox Studio
2. Buka browser, akses: `https://your-vercel-url.vercel.app/test` (gunakan POST request)
   
   Atau gunakan curl di terminal:
   ```bash
   curl -X POST https://your-vercel-url.vercel.app/test
   ```

3. Notifikasi harus muncul di game Roblox Anda!

## 🧪 Testing Webhook

### Test Manual via Browser/Postman:

**Endpoint Test:**
```
POST https://your-vercel-url.vercel.app/test
```

**Test Webhook Manual:**
```
POST https://your-vercel-url.vercel.app/webhook
Content-Type: application/json

{
  "name": "John Doe",
  "amount": 50000,
  "message": "Semangat terus streamingnya!"
}
```

**Cek Donasi Terakhir:**
```
GET https://your-vercel-url.vercel.app/latest
```

## 🎨 Kustomisasi UI Notifikasi

Edit script Roblox untuk mengubah tampilan:

### Mengubah Warna Background:
```lua
notifFrame.BackgroundColor3 = Color3.fromRGB(30, 30, 30) -- Ubah angka RGB
```

### Mengubah Posisi:
```lua
notifFrame.Position = UDim2.new(0.5, 0, 0.05, 0) -- Ubah 0.05 untuk posisi vertikal
```

### Mengubah Ukuran:
```lua
notifFrame.Size = UDim2.new(0, 400, 0, 80) -- Lebar 400px, Tinggi 80px
```

### Mengubah Durasi Tampil:
```lua
task.wait(4) -- Ubah angka 4 (dalam detik)
```

## ❓ Troubleshooting

### Notifikasi tidak muncul:
1. Pastikan HTTP Requests diaktifkan di Game Settings → Security
2. Cek URL API sudah benar di script Roblox
3. Test endpoint `/latest` di browser, pastikan ada response
4. Cek Output/Console di Roblox Studio untuk error message

### Webhook tidak diterima:
1. Cek URL webhook di Sociabuzz/Saweria sudah benar
2. Test endpoint `/webhook` dengan Postman atau curl
3. Cek logs di Vercel Dashboard → Deployments → Functions

### Server tidak bisa diakses:
1. Pastikan deploy Vercel berhasil (status: Ready)
2. Cek apakah ada error di Vercel Dashboard
3. Test ulang dengan klik tombol "Redeploy" di Vercel

## 📝 Catatan Penting

- Sistem ini tidak menggunakan database, data hanya tersimpan di memori
- Setiap kali Vercel restart, data donasi akan hilang (ini normal untuk versi gratis)
- Script Roblox akan otomatis deteksi donasi baru setiap 5 detik
- Notifikasi hanya muncul untuk donasi baru (tidak duplikat)

## 🔐 Keamanan

Versi ini menggunakan public endpoint tanpa authentication. Untuk production yang lebih aman:
- Tambahkan API key authentication
- Gunakan rate limiting
- Validasi data webhook lebih ketat

## 📞 Support

Jika ada masalah:
1. Cek dokumentasi Sociabuzz/Saweria untuk format webhook mereka
2. Test endpoint dengan tools seperti Postman atau curl
3. Cek logs di Vercel Dashboard

## 📄 Lisensi

MIT License - Bebas digunakan dan dimodifikasi

---

**Selamat mencoba! 🚀**
