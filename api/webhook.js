// api/webhook.js - ONE-TIME DELIVERY VERSION
const { kv } = require('@vercel/kv');

// Config
const CONFIG = {
  MAX_HISTORY: 100,
  ID_EXPIRY_TIME: 600000,        // 10 menit (fallback)
  DUPLICATE_WINDOW: 30000,       // 30 detik untuk detect duplicate
  CLEANUP_INTERVAL: 120000       // Cleanup setiap 2 menit
};

let lastCleanupTime = Date.now();

// Check if KV is available
async function isKVAvailable() {
  try {
    await kv.ping();
    return true;
  } catch (error) {
    console.error('[KV CHECK] KV not available:', error.message);
    return false;
  }
}

// Generate unique fingerprint
function generateDonationFingerprint(data) {
  const name = (data.supporter_name || data.nama || "").trim().toLowerCase();
  const amount = parseInt(data.amount || data.jumlah || 0);
  const message = (data.message || data.pesan || "").trim().toLowerCase();
  return `${name}|${amount}|${message}`;
}

// Cleanup expired donations
async function cleanupExpiredDonations() {
  try {
    const kvAvailable = await isKVAvailable();
    if (!kvAvailable) {
      console.log('[CLEANUP] Skipped - KV not available');
      return;
    }

    const now = Date.now();
    const keys = await kv.keys('donation:*');
    
    for (const key of keys) {
      const data = await kv.get(key);
      if (data && (now - data.timestamp > CONFIG.ID_EXPIRY_TIME)) {
        await kv.del(key);
        console.log(`[CLEANUP] Removed expired: ${key}`);
      }
    }
    
    const fpKeys = await kv.keys('fingerprint:*');
    for (const key of fpKeys) {
      const timestamp = await kv.get(key);
      if (timestamp && (now - timestamp > CONFIG.DUPLICATE_WINDOW)) {
        await kv.del(key);
      }
    }
    
    lastCleanupTime = now;
    console.log(`[CLEANUP] Completed at ${new Date().toISOString()}`);
  } catch (error) {
    console.error('[CLEANUP ERROR]', error);
  }
}

// Check if donation is duplicate
async function isDuplicateDonation(fingerprint) {
  try {
    const key = `fingerprint:${fingerprint}`;
    const lastSeen = await kv.get(key);
    
    if (lastSeen) {
      const timeSince = Date.now() - lastSeen;
      if (timeSince < CONFIG.DUPLICATE_WINDOW) {
        console.log(`[DUPLICATE] Same donation seen ${timeSince}ms ago`);
        return true;
      }
    }
    
    await kv.set(key, Date.now(), { ex: 60 });
    return false;
  } catch (error) {
    console.error('[DUPLICATE CHECK ERROR]', error);
    return false;
  }
}

module.exports = async function handler(req, res) {
  // Check KV availability first
  const kvAvailable = await isKVAvailable();
  
  if (!kvAvailable) {
    console.error('[ERROR] Vercel KV is not available. Check configuration.');
    return res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable - Storage not configured',
      error: 'KV_NOT_AVAILABLE'
    });
  }

  // Auto cleanup
  if (Date.now() - lastCleanupTime > CONFIG.CLEANUP_INTERVAL) {
    cleanupExpiredDonations().catch(console.error);
  }
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // ==========================================
  // GET - Roblox ambil donasi (ONE-TIME DELIVERY)
  // ==========================================
  if (req.method === 'GET') {
    try {
      const now = Date.now();
      const keys = await kv.keys('donation:*');
      const activeDonations = [];
      const keysToDelete = []; // Track keys to delete after sending
      
      for (const key of keys) {
        const data = await kv.get(key);
        if (data && (now - data.timestamp < CONFIG.ID_EXPIRY_TIME)) {
          activeDonations.push({
            id: key.replace('donation:', ''),
            nama: data.nama,
            jumlah: data.jumlah,
            pesan: data.pesan,
            timestamp: data.timestamp
          });
          
          // Mark for deletion (ONE-TIME DELIVERY)
          keysToDelete.push(key);
        }
      }
      
      // Sort by timestamp
      activeDonations.sort((a, b) => a.timestamp - b.timestamp);
      
      console.log(`[GET] Returning ${activeDonations.length} donations`);
      
      // Delete donations after sending (ONE-TIME DELIVERY)
      if (keysToDelete.length > 0) {
        for (const key of keysToDelete) {
          await kv.del(key);
          console.log(`[DELIVERED] Deleted: ${key} (one-time delivery)`);
        }
      }
      
      return res.status(200).json({
        success: true,
        donations: activeDonations,
        count: activeDonations.length,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('[GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching donations',
        error: error.message
      });
    }
  }
  
  // ==========================================
  // POST - Sociabuzz webhook donasi baru
  // ==========================================
  if (req.method === 'POST') {
    try {
      const webhookData = req.body;
      
      if (!webhookData) {
        return res.status(400).json({
          success: false,
          message: 'No data received'
        });
      }
      
      const donation = {
        nama: (webhookData.supporter_name || webhookData.nama || "Anonim").trim(),
        jumlah: parseInt(webhookData.amount || webhookData.jumlah || 0),
        pesan: (webhookData.message || webhookData.pesan || "").trim()
      };
      
      if (donation.jumlah <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount'
        });
      }
      
      const fingerprint = generateDonationFingerprint(webhookData);
      const isDuplicate = await isDuplicateDonation(fingerprint);
      
      if (isDuplicate) {
        console.log(`[REJECTED] Duplicate: ${donation.nama} - Rp${donation.jumlah}`);
        return res.status(200).json({
          success: false,
          message: 'Duplicate donation detected',
          data: {
            nama: donation.nama,
            jumlah: donation.jumlah,
            reason: 'Same donation within 30 seconds'
          }
        });
      }
      
      const donationId = `DN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Save dengan expiry time yang lebih pendek (5 menit cukup)
      await kv.set(`donation:${donationId}`, {
        nama: donation.nama,
        jumlah: donation.jumlah,
        pesan: donation.pesan,
        timestamp: Date.now()
      }, { ex: 300 }); // 5 menit expiry (fallback jika tidak ter-delete)
      
      console.log(`[NEW] ${donationId} - ${donation.nama} - Rp${donation.jumlah.toLocaleString('id-ID')}`);
      
      return res.status(200).json({
        success: true,
        message: 'Donation received',
        data: {
          id: donationId,
          nama: donation.nama,
          jumlah: donation.jumlah,
          pesan: donation.pesan,
          timestamp: Date.now()
        }
      });
      
    } catch (error) {
      console.error('[POST ERROR]', error);
      return res.status(500).json({
        success: false,
        message: 'Error processing donation',
        error: error.message
      });
    }
  }
  
  return res.status(405).json({
    success: false,
    message: 'Method not allowed'
  });
};
