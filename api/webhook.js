// api/webhook.js - UPDATE untuk handle format Sociabuzz dengan benar

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

      // Log untuk debugging
      console.log("Raw webhook data:", JSON.stringify(donationData));

      // Validasi data dari Sociabuzz
      if (!donationData) {
        return res.status(400).json({
          success: false,
          message: "Data donasi tidak valid"
        });
      }

      // Extract nama dengan prioritas berbeda-beda
      let nama = "Anonim";
      
      // Cek berbagai kemungkinan field nama dari Sociabuzz
      if (donationData.name) {
        nama = donationData.name;
      } else if (donationData.supporter_name) {
        nama = donationData.supporter_name;
      } else if (donationData.supporter) {
        nama = donationData.supporter;
      } else if (donationData.display_name) {
        nama = donationData.display_name;
      } else if (donationData.donor_name) {
        nama = donationData.donor_name;
      } else if (donationData.supporter_full_name) {
        nama = donationData.supporter_full_name;
      } else if (donationData.nama) {
        nama = donationData.nama;
      }

      // Jika masih Anonim dan ada field lain, ambil dari field pertama yang ada value
      if (nama === "Anonim" || !nama || nama.trim() === "") {
        const possibleNameFields = Object.keys(donationData).filter(key => 
          typeof donationData[key] === 'string' && 
          donationData[key].length > 0 &&
          !key.toLowerCase().includes('email') &&
          !key.toLowerCase().includes('id') &&
          !key.toLowerCase().includes('amount') &&
          !key.toLowerCase().includes('message')
        );
        
        if (possibleNameFields.length > 0) {
          nama = donationData[possibleNameFields[0]];
        }
      }

      // Extract jumlah donasi
      let jumlah = 0;
      if (donationData.amount) {
        jumlah = parseInt(donationData.amount);
      } else if (donationData.jumlah) {
        jumlah = parseInt(donationData.jumlah);
      } else if (donationData.donation_amount) {
        jumlah = parseInt(donationData.donation_amount);
      } else if (donationData.total) {
        jumlah = parseInt(donationData.total);
      }

      // Extract pesan
      let pesan = "";
      if (donationData.message) {
        pesan = donationData.message;
      } else if (donationData.pesan) {
        pesan = donationData.pesan;
      } else if (donationData.supporter_message) {
        pesan = donationData.supporter_message;
      } else if (donationData.comment) {
        pesan = donationData.comment;
      }

      // Update donation dengan ID increment
      latestDonation = {
        id: latestDonation.id + 1,
        nama: nama || "Anonim",
        jumlah: jumlah || 0,
        pesan: pesan || "",
        timestamp: Date.now(),
        raw_data: donationData // Simpan raw data untuk debugging
      };

      console.log("Processed donation:", latestDonation);

      return res.status(200).json({
        success: true,
        message: "Donasi berhasil diterima",
        data: latestDonation
      });

    } catch (error) {
      console.error("Error processing webhook:", error);
      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan saat memproses donasi",
        error: error.message
      });
    }
  }

  // Method tidak didukung
  return res.status(405).json({
    success: false,
    message: "Method tidak didukung"
  });
}
