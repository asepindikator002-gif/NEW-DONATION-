// api/webhook.js - DEBUG VERSION (Returns field analysis in response)
const { kv } = require('@vercel/kv');

const CONFIG = {
  MAX_HISTORY: 100,
  ID_EXPIRY_TIME: 600000,
  DUPLICATE_WINDOW: 30000,
  CLEANUP_INTERVAL: 120000
};

let lastCleanupTime = Date.now();

async function isKVAvailable() {
  try {
    await kv.ping();
    return true;
  } catch (error) {
    console.error('[KV CHECK] KV not available:', error.message);
    return false;
  }
}

function generateDonationFingerprint(data) {
  const name = (data.supporter_name || data.nama || "").trim().toLowerCase();
  const amount = parseInt(data.amount || data.jumlah || 0);
  const message = (data.message || data.pesan || "").trim().toLowerCase();
  return `${name}|${amount}|${message}`;
}

async function cleanupExpiredDonations() {
  try {
    const kvAvailable = await isKVAvailable();
    if (!kvAvailable) return;

    const now = Date.now();
    const keys = await kv.keys('donation:*');
    
    for (const key of keys) {
      const data = await kv.get(key);
      if (data && (now - data.timestamp > CONFIG.ID_EXPIRY_TIME)) {
        await kv.del(key);
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
  } catch (error) {
    console.error('[CLEANUP ERROR]', error);
  }
}

async function isDuplicateDonation(fingerprint) {
  try {
    const key = `fingerprint:${fingerprint}`;
    const lastSeen = await kv.get(key);
    
    if (lastSeen) {
      const timeSince = Date.now() - lastSeen;
      if (timeSince < CONFIG.DUPLICATE_WINDOW) {
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
  const kvAvailable = await isKVAvailable();
  
  if (!kvAvailable) {
    return res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable',
      error: 'KV_NOT_AVAILABLE'
    });
  }

  if (Date.now() - lastCleanupTime > CONFIG.CLEANUP_INTERVAL) {
    cleanupExpiredDonations().catch(console.error);
  }
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // ==========================================
  // GET - Roblox ambil donasi
  // ==========================================
  if (req.method === 'GET') {
    try {
      const now = Date.now();
      const keys = await kv.keys('donation:*');
      const activeDonations = [];
      const keysToDelete = [];
      
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
          keysToDelete.push(key);
        }
      }
      
      activeDonations.sort((a, b) => a.timestamp - b.timestamp);
      
      if (keysToDelete.length > 0) {
        for (const key of keysToDelete) {
          await kv.del(key);
          console.log(`[DELIVERED] Deleted: ${key}`);
        }
      }
      
      return res.status(200).json({
        success: true,
        donations: activeDonations,
        count: activeDonations.length,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error fetching donations',
        error: error.message
      });
    }
  }
  
  // ==========================================
  // POST - Sociabuzz webhook WITH DEBUG
  // ==========================================
  if (req.method === 'POST') {
    try {
      const webhookData = req.body;
      
      // 🔍 ANALYZE ALL POSSIBLE NAME FIELDS
      const fieldAnalysis = {
        supporter_name: webhookData.supporter_name || null,
        nama: webhookData.nama || null,
        name: webhookData.name || null,
        donor_name: webhookData.donor_name || null,
        donator_name: webhookData.donator_name || null,
        supporter_object: webhookData.supporter || null,
        user_object: webhookData.user || null,
        amount: webhookData.amount || null,
        jumlah: webhookData.jumlah || null,
        message: webhookData.message || null,
        pesan: webhookData.pesan || null,
        all_keys: Object.keys(webhookData)
      };
      
      console.log('[FIELD ANALYSIS]', JSON.stringify(fieldAnalysis, null, 2));
      
      if (!webhookData) {
        return res.status(400).json({
          success: false,
          message: 'No data received'
        });
      }
      
      // Try ALL possible name field combinations
      const donation = {
        nama: (
          webhookData.supporter_name || 
          webhookData.nama || 
          webhookData.name ||
          webhookData.donor_name ||
          webhookData.donator_name ||
          (webhookData.supporter && webhookData.supporter.name) ||
          (webhookData.user && webhookData.user.name) ||
          (webhookData.supporter && webhookData.supporter.username) ||
          (webhookData.user && webhookData.user.username) ||
          "Anonim"
        ).toString().trim(),
        jumlah: parseInt(
          webhookData.amount || 
          webhookData.jumlah || 
          webhookData.donation_amount ||
          webhookData.total ||
          0
        ),
        pesan: (
          webhookData.message || 
          webhookData.pesan || 
          webhookData.comment ||
          webhookData.note ||
          ""
        ).toString().trim()
      };
      
      console.log('[PARSED]', donation);
      
      if (donation.jumlah <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount',
          debug: {
            fieldAnalysis,
            parsed: donation
          }
        });
      }
      
      const fingerprint = generateDonationFingerprint(webhookData);
      const isDuplicate = await isDuplicateDonation(fingerprint);
      
      if (isDuplicate) {
        return res.status(200).json({
          success: false,
          message: 'Duplicate donation detected',
          data: donation,
          debug: {
            fieldAnalysis,
            reason: 'Same donation within 30 seconds'
          }
        });
      }
      
      const donationId = `DN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await kv.set(`donation:${donationId}`, {
        nama: donation.nama,
        jumlah: donation.jumlah,
        pesan: donation.pesan,
        timestamp: Date.now()
      }, { ex: 300 });
      
      console.log(`[NEW] ${donationId} - ${donation.nama} - Rp${donation.jumlah.toLocaleString('id-ID')}`);
      
      // ✅ RETURN DEBUG INFO IN RESPONSE
      return res.status(200).json({
        success: true,
        message: 'Donation received',
        data: {
          id: donationId,
          nama: donation.nama,
          jumlah: donation.jumlah,
          pesan: donation.pesan,
          timestamp: Date.now()
        },
        debug: {
          receivedFields: fieldAnalysis,
          parsedResult: donation,
          allWebhookKeys: Object.keys(webhookData),
          webhookDataSample: webhookData
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
