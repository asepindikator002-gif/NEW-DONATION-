// api/webhook.js - FIXED VERSION dengan Anti-Spam yang BENAR
// Menggunakan Vercel KV untuk persistent storage

import { kv } from '@vercel/kv';

// Config
const CONFIG = {
  MAX_HISTORY: 100,
  ID_EXPIRY_TIME: 600000,        // 10 menit
  DUPLICATE_WINDOW: 30000,       // 30 detik untuk detect duplicate
  CLEANUP_INTERVAL: 120000       // Cleanup setiap 2 menit
};

let lastCleanupTime = Date.now();

// Generate unique fingerprint dari donation (TANPA timestamp!)
function generateDonationFingerprint(data) {
  const name = (data.supporter_name || data.nama || "").trim().toLowerCase();
  const amount = parseInt(data.amount || data.jumlah || 0);
  const message = (data.message || data.pesan || "").trim().toLowerCase();
  
  // Fingerprint hanya dari data donasi, bukan timestamp
  return `${name}|${amount}|${message}`;
}

// Cleanup expired donations
async function cleanupExpiredDonations() {
  try {
    const now = Date.now();
    const keys = await kv.keys('donation:*');
    
    for (const key of keys) {
      const data = await kv.get(key);
      if (data && (now - data.timestamp > CONFIG.ID_EXPIRY_TIME)) {
        await kv.del(key);
        console.log(`[CLEANUP] Removed expired: ${key}`);
      }
    }
    
    // Cleanup fingerprints (30 detik window)
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
    
    // Record fingerprint dengan timestamp
    await kv.set(key, Date.now(), { ex: 60 }); // Expire in 60 seconds
    return false;
  } catch (error) {
    console.error('[DUPLICATE CHECK ERROR]', error);
    return false; // Fail open - allow donation
  }
}

export default async function handler(req, res) {
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
  // GET - Roblox ambil semua donasi aktif
  // ==========================================
  if (req.method === 'GET') {
    try {
      const now = Date.now();
      const keys = await kv.keys('donation:*');
      const activeDonations = [];
      
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
        }
      }
      
      // Sort by timestamp
      activeDonations.sort((a, b) => a.timestamp - b.timestamp);
      
      console.log(`[GET] Returning ${activeDonations.length} donations`);
      
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
      
      // Parse donation
      const donation = {
        nama: (webhookData.supporter_name || webhookData.nama || "Anonim").trim(),
        jumlah: parseInt(webhookData.amount || webhookData.jumlah || 0),
        pesan: (webhookData.message || webhookData.pesan || "").trim()
      };
      
      // Validate amount
      if (donation.jumlah <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount'
        });
      }
      
      // Generate fingerprint (TANPA timestamp!)
      const fingerprint = generateDonationFingerprint(webhookData);
      
      // Check duplicate
      const isDuplicate = await isDuplicateDonation(fingerprint);
      if (isDuplicate) {
        console.log(`[REJECTED] Duplicate donation blocked: ${donation.nama} - Rp${donation.jumlah}`);
        return res.status(200).json({
          success: false,
          message: 'Duplicate donation detected and blocked',
          data: {
            nama: donation.nama,
            jumlah: donation.jumlah,
            reason: 'Same donation received within 30 seconds'
          }
        });
      }
      
      // Generate unique ID
      const donationId = `DN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Save to KV
      await kv.set(`donation:${donationId}`, {
        nama: donation.nama,
        jumlah: donation.jumlah,
        pesan: donation.pesan,
        timestamp: Date.now()
      }, { ex: Math.floor(CONFIG.ID_EXPIRY_TIME / 1000) }); // Auto-expire
      
      console.log(`[NEW DONATION] ${donationId} - ${donation.nama} - Rp${donation.jumlah.toLocaleString('id-ID')}`);
      
      return res.status(200).json({
        success: true,
        message: 'Donation received successfully',
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
}
