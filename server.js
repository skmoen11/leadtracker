require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();

// MongoDB Connection
const uri = "mongodb+srv://leadUser:LeadSecure123@leadtracker.oeaph4z.mongodb.net/?retryWrites=true&w=majority&appName=leadTracker";
const client = new MongoClient(uri);

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Telegram IP Whitelist Middleware
app.use((req, res, next) => {
  const telegramIPs = ['149.154.160.0/20', '91.108.4.0/22'];
  const clientIP = req.ip || req.connection.remoteAddress;
  
  if (!telegramIPs.some(ipRange => {
    const [net, mask] = ipRange.split('/');
    return isIPInRange(clientIP, net, parseInt(mask));
  })) {
    return res.status(403).send('Forbidden');
  }
  next();
});

// Webhook Endpoint
app.post('/webhook', async (req, res) => {
  try {
    const leadData = {
      ...req.query,
      ...req.body,
      timestamp: new Date()
    };
    
    await client.db('leadTracker').collection('conversions').insertOne(leadData);
    res.status(200).send('OK');
  } catch (err) {
    console.error("Webhook Error:", err);
    res.status(500).send('Internal Server Error');
  }
});

// Data Endpoint
app.get('/getLeads', async (req, res) => {
  try {
    const data = await client.db('leadTracker')
      .collection('conversions')
      .find()
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();
    res.json(data);
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json([]);
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  try {
    await client.connect();
    console.log(`Server running on port ${PORT}`);
  } catch (err) {
    console.error("MongoDB Connection Failed:", err);
  }
});

// Helper Function for IP Check
function isIPInRange(ip, net, mask) {
  const ipParts = ip.split('.').map(Number);
  const netParts = net.split('.').map(Number);
  
  for (let i = 0; i < 4; i++) {
    if ((ipParts[i] & (256 - (1 << (32 - mask)))) !== (netParts[i] & (256 - (1 << (32 - mask)))) {
      return false;
    }
    mask = Math.max(0, mask - 8);
  }
  return true;
}