const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simpan donasi terbaru dalam memori
let latestDonation = null;
let donationId = 0;

// Endpoint untuk menerima webhook dari Sociabuzz/Saweria
app.post('/webhook', (req, res) => {
  try {
    console.log('Webhook diterima:', req.body);
    
    // Format data dari Sociabuzz/Saweria
    // Sociabuzz biasanya mengirim: name, amount, message
    // Saweria biasanya mengirim: donator_name, amount, message
    
    const donation = {
      id: ++donationId,
      nama: req.body.name || req.body.donator_name || req.body.donor_name || 'Anonim',
      jumlah: req.body.amount || req.body.donation_amount || 0,
      pesan: req.body.message || req.body.donation_message || 'Terima kasih!',
      timestamp: Date.now()
    };
    
    latestDonation = donation;
    console.log('Donasi tersimpan:', donation);
    
    res.status(200).json({ 
      success: true, 
      message: 'Webhook diterima',
      data: donation 
    });
  } catch (error) {
    console.error('Error webhook:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error memproses webhook' 
    });
  }
});

// Endpoint untuk Roblox mengambil donasi terbaru
app.get('/latest', (req, res) => {
  if (latestDonation) {
    res.status(200).json({
      success: true,
      data: latestDonation
    });
  } else {
    res.status(200).json({
      success: false,
      message: 'Belum ada donasi'
    });
  }
});

// Endpoint untuk mengetes webhook (manual trigger)
app.post('/test', (req, res) => {
  const testDonation = {
    id: ++donationId,
    nama: 'Test Donor',
    jumlah: 10000,
    pesan: 'Ini adalah donasi test!',
    timestamp: Date.now()
  };
  
  latestDonation = testDonation;
  
  res.status(200).json({
    success: true,
    message: 'Test donasi berhasil',
    data: testDonation
  });
});

// Endpoint root untuk pengecekan server
app.get('/', (req, res) => {
  res.json({
    status: 'Server aktif',
    endpoints: {
      webhook: 'POST /webhook - Terima webhook dari Sociabuzz/Saweria',
      latest: 'GET /latest - Ambil donasi terbaru untuk Roblox',
      test: 'POST /test - Test donasi manual'
    }
  });
});

// Untuk local development
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
  });
}

// Export untuk Vercel
module.exports = app;
