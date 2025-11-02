# 🎮 Sociabuzz to Roblox Donation Notifier

Sistem notifikasi real-time untuk menampilkan donasi dari Sociabuzz ke dalam game Roblox dengan tampilan elegant dan minimalis.

## ✨ Fitur

- ✅ Notifikasi real-time saat ada donasi
- ✅ Tampilan minimalis hitam/abu-abu transparan
- ✅ Animasi fade in/out yang smooth
- ✅ Sound effect untuk setiap donasi
- ✅ Queue system (antrian notifikasi)
- ✅ Ditampilkan ke semua player di game
- ✅ Format currency otomatis (Rupiah)

## 📋 Prasyarat

- [x] Akun Sociabuzz Creator
- [x] Game Roblox yang sudah published
- [x] Akun GitHub
- [x] Akun Vercel
- [x] Node.js terinstall di komputer (untuk testing lokal)

---

## 🚀 Langkah 1: Setup Roblox Open Cloud API

### 1.1 Dapatkan API Key

1. Buka [Roblox Creator Dashboard](https://create.roblox.com/credentials)
2. Klik **"CREATE API KEY"**
3. Isi form:
   - **Name**: `Sociabuzz Webhook`
   - **Description**: `API key for donation notifications`
4. Di bagian **Access Permissions**, pilih:
   - **Messaging Service** → Centang **Publish**
5. Di **Experiences**, pilih game kamu
6. Klik **Save & Generate Key**
7. **COPY dan SIMPAN** API Key (tidak bisa dilihat lagi!)

### 1.2 Dapatkan Universe ID

1. Buka game kamu di Roblox Studio
2. Klik **File** > **Game Settings** (atau tekan Alt+S)
3. Di tab **Basic Info**, cari **Universe ID**
4. Copy Universe ID tersebut

---

## 🚀 Langkah 2: Setup Backend (Vercel)

### 2.1 Struktur Folder

Buat struktur folder seperti ini:

```
sociabuzz-roblox-webhook/
├── api/
│   └── webhook.js
├── package.json
├── vercel.json
├── .env.example
├── .gitignore
└── README.md
```

### 2.2 Install Dependencies

```bash
npm install
```

### 2.3 Setup Environment Variables

1. Copy file `.env.example` menjadi `.env`
   ```bash
   cp .env.example .env
   ```

2. Edit file `.env` dan isi dengan data kamu:
   ```env
   ROBLOX_API_KEY=rbx_cloud_xxxxxxxxxxxxx
   ROBLOX_UNIVERSE_ID=1234567890
   WEBHOOK_SECRET=buatRandomStringYangKuat123!@#
   ```

### 2.4 Upload ke GitHub

```bash
git init
git add .
git commit -m "Initial commit: Sociabuzz to Roblox webhook"
git branch -M main
git remote add origin https://github.com/username/sociabuzz-roblox-webhook.git
git push -u origin main
```

### 2.5 Deploy ke Vercel

1. Login ke [Vercel](https://vercel.com)
2. Klik **"Add New Project"**
3. Import repository GitHub kamu
4. Di **Environment Variables**, tambahkan:
   - `ROBLOX_API_KEY` = (API key dari langkah 1.1)
   - `ROBLOX_UNIVERSE_ID` = (Universe ID dari langkah 1.2)
   - `WEBHOOK_SECRET` = (String random yang kuat)
5. Klik **Deploy**
6. Tunggu sampai selesai, copy URL deploy (contoh: `https://your-project.vercel.app`)

---

## 🚀 Langkah 3: Setup Roblox Game

### 3.1 Enable HTTP Requests & MessagingService

1. Buka game di Roblox Studio
2. Klik **Home** > **Game Settings**
3. Pergi ke tab **Security**
4. Centang **"Allow HTTP Requests"**
5. Klik **Save**

### 3.2 Install Server Script

1. Di **Explorer**, buka **ServerScriptService**
2. Klik kanan > **Insert Object** > **Script**
3. Rename menjadi `DonationReceiver`
4. Copy-paste code dari file `ServerScript.lua`
5. Save script

### 3.3 Install Client Script (UI)

1. Di **Explorer**, buka **StarterPlayer** > **StarterPlayerScripts**
2. Klik kanan > **Insert Object** > **LocalScript**
3. Rename menjadi `DonationNotificationUI`
4. Copy-paste code dari file `LocalScript.lua`
5. Save script

### 3.4 Upload Sound Effect

1. Cari sound effect notification di:
   - [Roblox Library](https://create.roblox.com/marketplace/audio)
   - Atau upload sound sendiri
2. Copy **Asset ID** dari sound (contoh: `9770089602`)
3. Buka `LocalScript.lua` di Roblox Studio
4. Ganti line ini:
   ```lua
   local SOUND_ID = "rbxassetid://9770089602"
   ```
   Dengan Asset ID sound kamu

### 3.5 Publish Game

1. Klik **File** > **Publish to Roblox**
2. Test dulu di Roblox Studio dengan menekan **F5**

---

## 🚀 Langkah 4: Setup Sociabuzz Webhook

### 4.1 Konfigurasi Webhook

1. Login ke [Sociabuzz Creator](https://sociabuzz.com)
2. Masuk ke **Dashboard**
3. Cari menu **Webhook** atau **Integrasi**
4. Tambah webhook baru:
   - **URL**: `https://your-project.vercel.app/api/webhook`
   - **Method**: POST
   - **Secret/Token**: (string yang sama dengan `WEBHOOK_SECRET` di .env)
5. Save webhook

### 4.2 Test Webhook

Ada beberapa cara untuk test:

**Opsi 1: Test dari Sociabuzz**
- Gunakan fitur "Test Webhook" jika tersedia di dashboard Sociabuzz

**Opsi 2: Test Manual dengan cURL**
```bash
curl -X POST https://your-project.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: your_secret_key_here" \
  -d '{
    "supporter_name": "Test Donor",
    "amount": 50000,
    "supporter_message": "Semangat terus!"
  }'
```

**Opsi 3: Test dari Roblox Studio**
- Uncomment code test di `ServerScript.lua` (line terakhir)
- Run game di Studio, notifikasi akan muncul otomatis

---

## 🎨 Kustomisasi

### Ubah Warna UI

Edit di `LocalScript.lua`:

```lua
-- Background color (line ~50)
container.BackgroundColor3 = Color3.fromRGB(20, 20, 20) -- Hitam

-- Text color nama donor (line ~85)
donorName.TextColor3 = Color3.fromRGB(255, 255, 255) -- Putih

-- Text color amount (line ~96)
amount.TextColor3 = Color3.fromRGB(100, 255, 100) -- Hijau

-- Text color message (line ~119)
message.TextColor3 = Color3.fromRGB(200, 200, 200) -- Abu-abu terang
```

### Ubah Durasi Notifikasi

Edit di `LocalScript.lua` (line ~228):

```lua
-- Tunggu 6 detik (ubah angka ini)
task.wait(6)
```

### Ubah Posisi Notifikasi

Edit di `LocalScript.lua` (line ~51):

```lua
-- Posisi saat ini: tengah atas, 20px dari atas
container.Position = UDim2.new(0.5, 0, 0, 20)

-- Contoh posisi lain:
-- Kiri atas: UDim2.new(0, 20, 0, 20)
-- Kanan atas: UDim2.new(1, -420, 0, 20)
-- Tengah layar: UDim2.new(0.5, 0, 0.5, 0)
```

---

## 🐛 Troubleshooting

### Notifikasi tidak muncul di Roblox

**Cek 1: Vercel Logs**
```bash
vercel logs your-project-name
```
Lihat apakah ada error saat webhook diterima

**Cek 2: Roblox Studio Output**
- Buka game di Studio
- Lihat **Output** window (View > Output)
- Harusnya ada message: "✅ Successfully subscribed to Sociabuzz donations!"

**Cek 3: API Key Permission**
- Pastikan API Key memiliki permission **Messaging Service: Publish**
- Pastikan API Key untuk Universe ID yang benar

**Cek 4: Enable HTTP Requests**
- Game Settings > Security > Allow HTTP Requests harus dicentang

### Webhook error 401 (Unauthorized)

- `WEBHOOK_SECRET` di Vercel harus sama dengan yang di Sociabuzz
- Cek header `x-webhook-secret` atau field `secret` di body

### Webhook error 500

- Cek Vercel logs untuk detail error
- Pastikan `ROBLOX_API_KEY` dan `ROBLOX_UNIVERSE_ID` benar

### Sound tidak play

- Pastikan Asset ID sound benar
- Sound harus public/accessible
- Cek volume player tidak di-mute

---

## 📊 Format Data Sociabuzz

Script ini support format umum dari Sociabuzz. Jika format berbeda, edit `api/webhook.js`:

```javascript
// Sesuaikan dengan struktur data dari Sociabuzz
const donationData = {
  donorName: req.body.supporter_name || req.body.name || 'Anonymous',
  amount: req.body.amount || req.body.donation_amount || 0,
  message: req.body.supporter_message || req.body.message || '',
  currency: req.body.currency || 'IDR'
};
```

---

## 📝 Rate Limits

### Roblox MessagingService
- **150 requests per minute** per Universe
- Jika exceed, error 429 (Too Many Requests)

### Vercel Free Tier
- **100 GB-hours** per month
- Biasanya cukup untuk webhook notifications

---

## 🔒 Keamanan

1. **Jangan commit `.env`** ke Git (sudah ada di .gitignore)
2. **Gunakan secret key yang kuat** (minimal 32 karakter random)
3. **Rotate API key** secara berkala
4. **Monitor Vercel logs** untuk aktivitas mencurigakan

---

## 🤝 Support

Jika ada masalah atau pertanyaan:
1. Cek **Troubleshooting** section di atas
2. Cek Vercel logs: `vercel logs`
3. Cek Roblox Studio Output window
4. Review konfigurasi environment variables

---

## 📄 License

MIT License - Feel free to modify and use!

---

## 🎉 Happy Streaming!

Selamat! Sistem notifikasi donasi Sociabuzz ke Roblox sudah siap digunakan. 

Setiap ada donasi, semua player di game akan melihat notifikasi yang elegant dan minimalis! 🚀
