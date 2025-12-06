// api/webhook.js - VERSI FIXED DENGAN DUPLICATE DETECTION
// Taruh file ini di folder api/ di project Vercel Anda

// Storage untuk multiple donations dengan duplicate detection
const donationHistory = new Map(); // Format: [id] => {donation, timestamp}
const processedWebhookIds = new Set(); // Track webhook IDs dari Sociabuzz

// Config
const CONFIG = {
  MAX_HISTORY: 100,           // Simpan max 100 donasi
  ID_EXPIRY_TIME: 600000,     // 10 menit (dalam ms)
  CLEANUP_INTERVAL: 120000,   // Cleanup setiap 2 menit
  WEBHOOK_DUPLICATE_WINDOW: 5000 // 5 detik untuk detect duplicate webhook
};

let donationCounter = 0;
let lastCleanupTime = Date.now();

// Fungsi untuk cleanup old donations
function cleanupOldDonations() {
  const now = Date.now();
  
  // Cleanup donation history
  for (const [id, data] of donationHistory.entries()) {
    if (now - data.timestamp > CONFIG.ID_EXPIRY_TIME) {
      donationHistory.delete(id);
      console.log(`[CLEANUP] Removed expired donation ID: ${id}`);
    }
  }
  
  // Cleanup webhook IDs (lebih agresif - 5 detik)
  const recentWebhooks = new Set();
  for (const webhookId of processedWebhookIds) {
    const parts = webhookId.split('_');
    const timestamp = parseInt(parts[parts.length - 1]);
    if (now - timestamp < CONFIG.WEBHOOK_DUPLICATE_WINDOW) {
      recentWebhooks.add(webhookId);
    }
  }
  processedWebhookIds.clear();
  recentWebhooks.forEach(id => processedWebhookIds.add(id));
  
  lastCleanupTime = now;
  console.log(`[CLEANUP] History size: ${donationHistory.size}, Recent webhooks: ${processedWebhookIds.size}`);
}

// Generate unique donation ID
function generateDonationId() {
  donationCounter++;
  return `DN_${Date.now()}_${donationCounter}`;
}

// Check if webhook is duplicate (same data dalam 5 detik)
function isWebhookDuplicate(webhookData) {
  // Create unique signature dari webhook
  const signature = `${webhookData.supporter_name || webhookData.nama}_${webhookData.amount || webhookData.jumlah}_${Date.now()}`;
  const webhookId = signature.substring(0, 50) + '_' + Date.now();
  
  // Check if similar webhook exists in last 5 seconds
  for (const existingId of processedWebhookIds) {
    const existingSignature = existingId.substring(0, existingId.lastIndexOf('_'));
    const currentSignature = webhookId.substring(0, webhookId.lastIndexOf('_'));
    
    if (existingSignature === currentSignature) {
      const existingTimestamp = parseInt(existingId.split('_').pop());
      if (Date.now() - existingTimestamp < CONFIG.WEBHOOK_DUPLICATE_WINDOW) {
        return true;
      }
    }
  }
  
  processedWebhookIds.add(webhookId);
  return false;
}

export default function handler(req, res) {
  // Auto cleanup jika sudah waktunya
  if (Date.now() - lastCleanupTime > CONFIG.CLEANUP_INTERVAL) {
    cleanupOldDonations();
  }
  
  // Enable CORS untuk Roblox
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // ==========================================
  // GET - Roblox mengambil semua donasi aktif
  // ==========================================
  if (req.method === 'GET') {
    const now = Date.now();
    const activeDonations = [];
    
    // Ambil semua donasi yang masih aktif (belum expired)
    for (const [id, data] of donationHistory.entries()) {
      if (now - data.timestamp < CONFIG.ID_EXPIRY_TIME) {
        activeDonations.push({
          id: id,
          nama: data.donation.nama,
          jumlah: data.donation.jumlah,
          pesan: data.donation.pesan,
          timestamp: data.timestamp
        });
      }
    }
    
    // Sort by timestamp (oldest first)
    activeDonations.sort((a, b) => a.timestamp - b.timestamp);
    
    console.log(`[GET] Sending ${activeDonations.length} active donations to Roblox`);
    
    return res.status(200).json({
      success: true,
      donations: activeDonations,
      count: activeDonations.length,
      message: "Active donations retrieved",
      timestamp: new Date().toISOString()
    });
  }
  
  // ==========================================
  // POST - Sociabuzz mengirim webhook donasi baru
  // ==========================================
  if (req.method === 'POST') {
    try {
      const webhookData = req.body;
      
      // Validasi data dari Sociabuzz
      if (!webhookData) {
        console.error("[ERROR] No webhook data received");
        return res.status(400).json({
          success: false,
          message: "Data donasi tidak valid"
        });
      }
      
      // Check webhook duplicate (spam dari Sociabuzz)
      if (isWebhookDuplicate(webhookData)) {
        console.log("[DUPLICATE WEBHOOK] Same webhook received within 5 seconds, ignoring");
        return res.status(200).json({
          success: false,
          message: "Duplicate webhook detected",
          note: "This webhook was already processed recently"
        });
      }
      
      // Parse donation data
      const donationId = generateDonationId();
      const donation = {
        nama: webhookData.supporter_name || webhookData.nama || "Anonim",
        jumlah: parseInt(webhookData.amount || webhookData.jumlah || 0),
        pesan: webhookData.message || webhookData.pesan || ""
      };
      
      // Validasi jumlah
      if (donation.jumlah <= 0) {
        console.error("[ERROR] Invalid donation amount:", donation.jumlah);
        return res.status(400).json({
          success: false,
          message: "Jumlah donasi tidak valid"
        });
      }
      
      // Simpan ke history
      donationHistory.set(donationId, {
        donation: donation,
        timestamp: Date.now()
      });
      
      // Cleanup jika history terlalu besar
      if (donationHistory.size > CONFIG.MAX_HISTORY) {
        // Hapus donasi tertua
        const oldestId = Array.from(donationHistory.keys())[0];
        donationHistory.delete(oldestId);
        console.log(`[CLEANUP] Removed oldest donation to maintain max size: ${oldestId}`);
      }
      
      console.log(`[NEW DONATION] ID: ${donationId}, Name: ${donation.nama}, Amount: Rp ${donation.jumlah.toLocaleString('id-ID')}`);
      
      return res.status(200).json({
        success: true,
        message: "Donasi berhasil diterima",
        data: {
          id: donationId,
          nama: donation.nama,
          jumlah: donation.jumlah,
          pesan: donation.pesan,
          timestamp: Date.now()
        },
        stats: {
          totalActive: donationHistory.size,
          maxHistory: CONFIG.MAX_HISTORY
        }
      });
      
    } catch (error) {
      console.error("[ERROR] Error processing webhook:", error);
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
