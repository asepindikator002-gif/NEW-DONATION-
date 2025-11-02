// api/webhook.js - Vercel Serverless Function
const fetch = require('node-fetch');

// Konfigurasi - ISI DARI ENVIRONMENT VARIABLES
const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY; // Open Cloud API Key dari Roblox
const ROBLOX_UNIVERSE_ID = process.env.ROBLOX_UNIVERSE_ID; // Universe ID game kamu
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET; // Secret untuk validasi
const MESSAGING_TOPIC = 'SociabuzzDonation'; // Topic untuk MessagingService

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Received webhook:', JSON.stringify(req.body, null, 2));

    // Validasi Secret Key dari header atau body
    const providedSecret = req.headers['x-webhook-secret'] || req.body.secret;
    
    if (providedSecret !== WEBHOOK_SECRET) {
      console.error('Invalid secret key');
      return res.status(401).json({ error: 'Unauthorized - Invalid secret key' });
    }

    // Parse data dari Sociabuzz
    // Format bisa berbeda tergantung Sociabuzz, sesuaikan dengan struktur data yang diterima
    const donationData = {
      donorName: req.body.supporter_name || req.body.name || 'Anonymous',
      amount: req.body.amount || req.body.donation_amount || 0,
      message: req.body.supporter_message || req.body.message || 'Terima kasih!',
      currency: req.body.currency || 'IDR'
    };

    // Validasi data
    if (!donationData.donorName || !donationData.amount) {
      console.error('Invalid donation data');
      return res.status(400).json({ error: 'Invalid donation data' });
    }

    // Format pesan untuk Roblox
    const robloxMessage = {
      donorName: donationData.donorName,
      amount: donationData.amount,
      message: donationData.message,
      currency: donationData.currency,
      timestamp: Date.now()
    };

    // Kirim ke Roblox menggunakan MessagingService
    const robloxResponse = await sendToRoblox(robloxMessage);

    if (robloxResponse.success) {
      console.log('Successfully sent to Roblox');
      return res.status(200).json({ 
        success: true, 
        message: 'Donation notification sent to Roblox',
        data: robloxMessage
      });
    } else {
      console.error('Failed to send to Roblox:', robloxResponse.error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to send to Roblox',
        details: robloxResponse.error
      });
    }

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: error.message 
    });
  }
};

// Fungsi untuk mengirim data ke Roblox via MessagingService
async function sendToRoblox(data) {
  try {
    const url = `https://apis.roblox.com/messaging-service/v1/universes/${ROBLOX_UNIVERSE_ID}/topics/${MESSAGING_TOPIC}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': ROBLOX_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: JSON.stringify(data)
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Roblox API error: ${response.status} - ${errorText}`);
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    };
  }
}
