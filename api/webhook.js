// api/webhook.js - Taruh file ini di folder api/ di project Vercel Anda

let latestDonation = {
  id: 0,
  nama: "Menunggu donasi pertama",
  jumlah: 0,
  pesan: "",
  timestamp: Date.now()
};

export default function handler(req, res) {
  // Enable CORS untuk Roblox
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET - Roblox mengambil data donasi terbaru
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      data: latestDonation,
      message: "Data donasi terbaru"
    });
  }

  // POST - Sociabuzz mengirim webhook donasi baru
  if (req.method === 'POST') {
    try {
      const donationData = req.body;

      // Validasi data dari Sociabuzz
      if (!donationData) {
        return res.status(400).json({
          success: false,
          message: "Data donasi tidak valid"
        });
      }

      // Update donation dengan ID increment
      latestDonation = {
        id: latestDonation.id + 1,
        nama: donationData.supporter_name || donationData.nama || "Anonim",
        jumlah: parseInt(donationData.amount || donationData.jumlah || 0),
        pesan: donationData.message || donationData.pesan || "",
        timestamp: Date.now()
      };

      console.log("Donasi baru diterima:", latestDonation);

      return res.status(200).json({
        success: true,
        message: "Donasi berhasil diterima",
        data: latestDonation
      });

    } catch (error) {
      console.error("Error processing webhook:", error);
      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan saat memproses donasi"
      });
    }
  }

  // Method tidak didukung
  return res.status(405).json({
    success: false,
    message: "Method tidak didukung"
  });
}
