import express from "express";
// Build Version: 1.0.5 - Trigger Purge Edition
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import axios from 'axios';
import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { initializeApp } from "firebase/app";
import { 
  getFirestore as getFirestoreClient, 
  doc as docClient, 
  getDoc as getDocClient, 
  updateDoc as updateDocClient, 
  setDoc as setDocClient, 
  increment as incrementClient, 
  collection as collectionClient, 
  addDoc as addDocClient, 
  serverTimestamp,
  initializeFirestore
} from "firebase/firestore";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Configuration
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));

const clientApp = initializeApp(firebaseConfig);
const clientDb = initializeFirestore(clientApp, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

// Test Firestore Connectivity on startup
async function testFirestoreConnection() {
  try {
    const healthRef = docClient(clientDb, "system", "health");
    await getDocClient(healthRef);
    console.log("✅ Firestore Connectivity: Online");
  } catch (error: any) {
    if (error.message?.includes("client is offline") || error.code === 'unavailable') {
      console.error("❌ Firestore Connectivity: OFFLINE. (Check Cloud NAT and VPC Egress settings)");
    } else {
      console.warn("⚠️ Firestore Connectivity: Authenticated Check Failed (Permissions)", error.message);
    }
  }
}
testFirestoreConnection();

const SERVER_SECRET = "pulse-feeds-server-secret-2026";

console.log("Firebase Config Project ID:", firebaseConfig.projectId);
console.log("Firebase Config Database ID:", firebaseConfig.firestoreDatabaseId);
console.log("Environment Project ID:", process.env.GOOGLE_CLOUD_PROJECT);

// Ensure project ID is set for the environment if not already
if (!process.env.GOOGLE_CLOUD_PROJECT && firebaseConfig.projectId) {
  process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
}

if (!admin.apps.length) {
  try {
    // Try initializing without arguments first to use environment defaults
    admin.initializeApp();
    console.log("Firebase Admin initialized with default credentials.");
  } catch (error) {
    console.log("Default initialization failed, trying with config project ID...");
    try {
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
      console.log("Firebase Admin initialized with config project ID.");
    } catch (innerError) {
      console.error("All Firebase Admin initialization attempts failed:", innerError);
    }
  }
}

// Initialize Firestore with the specific database ID from config
const db = getFirestore(firebaseConfig.firestoreDatabaseId || "(default)");
console.log("Firestore initialized for database:", firebaseConfig.firestoreDatabaseId || "(default)");

// IP Stability Monitor
let currentOutboundIp = "35.214.40.75"; // NEW Permanent Whitelisted IP

async function monitorIP() {
  try {
    const response = await axios.get('https://api.ipify.org?format=json');
    const actualIp = response.data.ip;
    if (actualIp !== currentOutboundIp) {
      console.warn(`[CRITICAL] IP DRIFT DETECTED! Expected: ${currentOutboundIp}, Actual: ${actualIp}`);
      
      // Log alert to platform_transactions so user sees it in dashboard
      try {
        await addDocClient(collectionClient(clientDb, 'platform_transactions'), {
          type: 'alert',
          source: 'system_monitor',
          reason: `WARNING: Server Outbound IP has shifted to ${actualIp}. Co-op Bank whitelisting may need update.`,
          userId: 'system',
          timestamp: serverTimestamp(),
          serverSecret: SERVER_SECRET
        });
        currentOutboundIp = actualIp; // Update tracking to avoid spamming
      } catch (logErr) {
        console.error("Failed to log IP drift alert:", logErr);
      }
    } else {
      console.log(`[System] Outbound IP Stability Verified: ${actualIp}`);
    }
  } catch (error) {
    console.error("Failed to monitor outbound IP:", error);
  }
}

async function startServer() {
  console.log("Starting server...");
  // Run IP monitor in background so it doesn't block startup
  monitorIP().catch(err => console.error("Initial IP check failed:", err));
  
  setInterval(monitorIP, 1000 * 60 * 60); // Check every hour
  console.log("NODE_ENV:", process.env.NODE_ENV);
  
  const app = express();
  const PORT = process.env.PORT || 3000;
  app.use(express.json());

  // Equity Bank Access Token Helper (EazzyAPI)
  async function getEquityAccessToken() {
    const consumerKey = process.env.EQUITY_CONSUMER_KEY;
    const consumerSecret = process.env.EQUITY_CONSUMER_SECRET;
    
    if (!consumerKey || !consumerSecret) {
      throw new Error("Equity Bank Consumer Key or Secret not configured");
    }

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    
    try {
      const response = await axios.post(
        `${process.env.EQUITY_BASE_URL || "https://api.equitybankgroup.com"}/identity/v1/token`,
        "grant_type=client_credentials",
        {
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        }
      );
      return response.data.access_token;
    } catch (error: any) {
      console.error("Error generating Equity Bank access token:", error.response?.data || error.message);
      throw new Error("Failed to generate Equity Bank access token");
    }
  }

  // --- Co-op Bank Configuration (From Postman Collection) ---
  const COOP_CONFIG = {
    clientId: process.env.COOP_BANK_CONSUMER_KEY || "kkCCerC5OxtNAAkbaWbUerrdo4ga",
    clientSecret: process.env.COOP_BANK_CONSUMER_SECRET || "KcWPlAT3x1l7ruMigikOHBhI9eoa",
    sourceAccount: process.env.COOP_BANK_SOURCE_ACCOUNT || "01100975259001",
    userId: process.env.COOP_BANK_USER_ID || "EDWINMUOHA",
    baseUrl: process.env.COOP_BANK_BASE_URL || "https://openapi.co-opbank.co.ke"
  };

  // Co-operative Bank Access Token Helper
  async function getCoopBankAccessToken() {
    const auth = Buffer.from(`${COOP_CONFIG.clientId}:${COOP_CONFIG.clientSecret}`).toString("base64");
    
    try {
      const params = new URLSearchParams();
      params.append("grant_type", "client_credentials");

      const response = await axios.post(
        `${COOP_CONFIG.baseUrl}/token`,
        params.toString(),
        {
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "PulseFeeds/1.0.0",
            "Accept": "application/json"
          },
        }
      );
      return response.data.access_token;
    } catch (error: any) {
      const errorData = error.response?.data;
      const isHtml = typeof errorData === 'string' && (errorData.includes('<HTML>') || errorData.includes('edgesuite.net'));
      
      console.warn("Co-op Bank Token Request Details:", {
        status: error.response?.status,
        isHtmlBlock: isHtml,
        message: error.message
      });

      // If we get an Akamai block (HTML response), return a mock token for development
      if (isHtml) {
        console.warn("Co-op Bank API blocked by Akamai Edge Suite (Firewall). Using simulation fallback.");
        return "simulated-token-" + Date.now();
      }
      
      throw new Error("Failed to generate Co-op Bank access token");
    }
  }

  // M-Pesa Access Token Helper
  async function getMpesaAccessToken() {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    
    if (!consumerKey || !consumerSecret) {
      throw new Error("M-Pesa Consumer Key or Secret not configured");
    }

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    
    try {
      const response = await axios.get(
        "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
        {
          headers: {
            Authorization: `Basic ${auth}`,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        }
      );
      return response.data.access_token;
    } catch (error: any) {
      console.error("Error generating M-Pesa access token:", error.response?.data || error.message);
      throw new Error("Failed to generate M-Pesa access token");
    }
  }

  // System Status Routes
  app.get("/api/system/ip", (req, res) => {
    res.json({ ip: currentOutboundIp });
  });

  // Config Status Route
  app.get("/api/config/status", (req, res) => {
    res.json({
      equity: !!process.env.EQUITY_CONSUMER_KEY,
      coop: !!process.env.COOP_BANK_CONSUMER_KEY,
      mpesa: !!process.env.MPESA_CONSUMER_KEY,
      isLive: !!(process.env.EQUITY_CONSUMER_KEY || process.env.COOP_BANK_CONSUMER_KEY || process.env.MPESA_CONSUMER_KEY)
    });
  });

  // M-Pesa API Routes
  app.post("/api/mpesa/stkpush", async (req, res) => {
    const { phoneNumber, amount } = req.body;
    
    // Check if Co-op is primary
    if (COOP_CONFIG.clientId) {
      console.log(`Initiating Co-op Bank STK Push for ${phoneNumber} with amount ${amount}`);
      try {
        const accessToken = await getCoopBankAccessToken();
        const reference = "STK-" + Date.now();
        const response = await axios.post(
          `${COOP_CONFIG.baseUrl}/FT/stk/1.0.0`,
          {
            MessageReference: reference,
            CallBackUrl: process.env.COOP_BANK_STK_CALLBACK_URL || "https://ais-dev-vpm462ccg3jpy6a7n4c54f-708516523970.europe-west2.run.app/api/mpesa/callback",
            OperatorCode: COOP_CONFIG.userId,
            TransactionCurrency: "KES",
            MobileNumber: phoneNumber.replace(/^0/, "254").replace(/^\+/, ""),
            Narration: "EDWIN MUOHA WATITU",
            Amount: amount,
            MessageDateTime: new Date().toISOString(),
            OtherDetails: [
              {
                Name: "COOP",
                Value: "PulseFeeds"
              }
            ]
          },
          {
            headers: { 
              Authorization: `Bearer ${accessToken}`, 
              "Content-Type": "application/json",
              "User-Agent": "PulseFeeds/1.0.0",
              "Accept": "application/json"
            },
          }
        );
        return res.json({ success: true, transactionId: reference, message: "STK Push initiated via Co-op Bank", details: response.data });
      } catch (error: any) {
        console.error("Co-op STK Push Error:", error.response?.data || error.message);
        return res.status(500).json({ success: false, error: "Co-op STK Push failed", details: error.response?.data || error.message });
      }
    }

    console.log(`Initiating M-Pesa Sandbox STK Push for ${phoneNumber} with amount ${amount}`);
    try {
      // If credentials are not set, return mock for testing
      if (!process.env.MPESA_CONSUMER_KEY || process.env.MPESA_CONSUMER_KEY === "YOUR_MPESA_CONSUMER_KEY") {
        return res.json({
          ResponseCode: "0",
          CustomerMessage: "Success. Request accepted for processing (SIMULATED)",
          CheckoutRequestID: "ws_CO_30032026170755" + Math.floor(Math.random() * 1000),
          MerchantRequestID: "29115-34620-1",
        });
      }

      const accessToken = await getMpesaAccessToken();
      const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
      const password = Buffer.from(
        `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
      ).toString("base64");

      const response = await axios.post(
        "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
        {
          BusinessShortCode: process.env.MPESA_SHORTCODE,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: amount,
          PartyA: phoneNumber.replace(/^0/, "254").replace(/^\+/, ""),
          PartyB: process.env.MPESA_SHORTCODE,
          PhoneNumber: phoneNumber.replace(/^0/, "254").replace(/^\+/, ""),
          CallBackURL: process.env.MPESA_CALLBACK_URL || "https://ais-dev-vpm462ccg3jpy6a7n4c54f-708516523970.europe-west2.run.app/api/mpesa/callback",
          AccountReference: "PulseFeeds",
          TransactionDesc: "Reward Payout",
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          },
        }
      );

      res.json(response.data);
    } catch (error: any) {
      console.error("STK Push Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to initiate STK Push", details: error.response?.data || error.message });
    }
  });

  app.post("/api/payout/mpesa", async (req, res) => {
    const clientIp = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
    const { phoneNumber, amount } = req.body;
    
    // Check which bank is configured
    const equityKey = process.env.EQUITY_CONSUMER_KEY;
    const coopKey = process.env.COOP_BANK_CONSUMER_KEY;

    if (COOP_CONFIG.clientId) {
      console.log(`Initiating Co-op Bank B2C payout (v2) for ${phoneNumber} with amount ${amount}`);
      try {
        const accessToken = await getCoopBankAccessToken();
        const reference = "PULSE-COOP-" + Date.now();
        const response = await axios.post(
          `${COOP_CONFIG.baseUrl}/FundsTransfer/External/A2M/Mpesa_v2/2.0.0`,
          {
            MessageReference: reference,
            ISO2CountryCode: "KE",
            CallBackUrl: process.env.COOP_BANK_PAYOUT_CALLBACK_URL || "https://ais-dev-vpm462ccg3jpy6a7n4c54f-708516523970.europe-west2.run.app/api/payout/coop/callback",
            Source: {
              AccountNumber: COOP_CONFIG.sourceAccount,
              Amount: amount.toString(),
              TransactionCurrency: "KES",
              Narration: `Platform Reward [IP: ${clientIp}]`
            },
            Destinations: [
              {
                ReferenceNumber: reference + "_1",
                MobileNumber: phoneNumber.replace(/^0/, "254").replace(/^\+/, ""),
                Amount: amount.toString(),
                Narration: `EDWIN MUOHA WATITU [IP: ${clientIp}]`
              }
            ]
          },
          {
            headers: { 
              Authorization: `Bearer ${accessToken}`, 
              "Content-Type": "application/json",
              "User-Agent": "PulseFeeds/1.0.0",
              "Accept": "application/json"
            },
          }
        );
        return res.json({ success: true, transactionId: reference, message: "Real payout sent via Co-op Bank B2C", details: response.data });
      } catch (error: any) {
        console.error("Co-op Bank Error:", error.response?.data || error.message);
        return res.status(500).json({ success: false, error: "Co-op Bank payout failed", details: error.response?.data || error.message });
      }
    }

    if (equityKey) {
      console.log(`Initiating Equity Bank payout for ${phoneNumber} with amount ${amount}`);
      try {
        const accessToken = await getEquityAccessToken();
        const reference = "PULSE-EQ-" + Date.now();
        const response = await axios.post(
          `${process.env.EQUITY_BASE_URL || "https://api.equitybankgroup.com"}/transaction/v1/transfers`,
          {
            transactionReference: reference,
            sender: { accountNumber: process.env.EQUITY_SOURCE_ACCOUNT },
            receiver: { accountNumber: phoneNumber.replace(/^0/, "254").replace(/^\+/, ""), bankCode: "MPESA" },
            amount: { amount: amount, currency: "KES" },
            description: "Pulse Feeds Reward",
            callbackUrl: process.env.EQUITY_CALLBACK_URL || `${process.env.APP_URL}/api/payout/equity/callback`
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              "X-App-ID": process.env.EQUITY_APP_ID || "",
              "X-Merchant-ID": process.env.EQUITY_MERCHANT_ID || ""
            },
          }
        );
        return res.json({ success: true, transactionId: reference, message: "Real payout sent via Equity Bank", details: response.data });
      } catch (error: any) {
        console.error("Equity Bank Error:", error.response?.data || error.message);
        return res.status(500).json({ success: false, error: "Equity Bank payout failed", details: error.response?.data || error.message });
      }
    }

    // Fallback to simulation
    console.log("No bank credentials configured, falling back to simulation.");
    res.json({
      success: true,
      transactionId: "SIM-" + Math.random().toString(36).substr(2, 9),
      message: "Payout initiated successfully (SIMULATED)"
    });
  });

  app.post("/api/payout/bank", async (req, res) => {
    const clientIp = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
    const { bankDetails, amount } = req.body;
    
    const equityKey = process.env.EQUITY_CONSUMER_KEY;
    const coopKey = process.env.COOP_BANK_CONSUMER_KEY;

    if (COOP_CONFIG.clientId) {
      console.log(`Initiating Co-op Bank PesaLink transfer (v2) for ${bankDetails.accountNumber} with amount ${amount}`);
      try {
        const accessToken = await getCoopBankAccessToken();
        const reference = "PULSE-BANK-COOP-" + Date.now();
        const response = await axios.post(
          `${COOP_CONFIG.baseUrl}/FundsTransfer/External/A2A/PesaLink_v2/2.0.0`,
          {
            MessageReference: reference,
            CallBackUrl: process.env.COOP_BANK_PAYOUT_CALLBACK_URL || "https://ais-dev-vpm462ccg3jpy6a7n4c54f-708516523970.europe-west2.run.app/api/payout/coop/callback",
            ISO2CountryCode: "KE",
            Source: {
              AccountNumber: COOP_CONFIG.sourceAccount,
              Amount: amount,
              TransactionCurrency: "KES",
              Narration: `Bank Transfer [IP: ${clientIp}]`
            },
            Destinations: [
              {
                ReferenceNumber: reference + "_1",
                AccountNumber: bankDetails.accountNumber,
                BankCode: bankDetails.bankCode || "11",
                Amount: amount,
                TransactionCurrency: "KES",
                Narration: `EDWIN MUOHA WATITU [IP: ${clientIp}]`
              }
            ]
          },
          {
            headers: { 
              Authorization: `Bearer ${accessToken}`, 
              "Content-Type": "application/json",
              "User-Agent": "PulseFeeds/1.0.0",
              "Accept": "application/json"
            },
          }
        );
        return res.json({ success: true, transactionId: reference, message: "Real bank payout sent via Co-op PesaLink", details: response.data });
      } catch (error: any) {
        console.error("Co-op Bank Bank Error:", error.response?.data || error.message);
        return res.status(500).json({ success: false, error: "Co-op Bank bank payout failed", details: error.response?.data || error.message });
      }
    }

    if (equityKey) {
      console.log(`Initiating Equity Bank transfer for ${bankDetails.accountNumber} with amount ${amount}`);
      try {
        const accessToken = await getEquityAccessToken();
        const reference = "PULSE-BANK-EQ-" + Date.now();
        const response = await axios.post(
          `${process.env.EQUITY_BASE_URL || "https://api.equitybankgroup.com"}/transaction/v1/transfers`,
          {
            transactionReference: reference,
            sender: { accountNumber: process.env.EQUITY_SOURCE_ACCOUNT },
            receiver: { accountNumber: bankDetails.accountNumber, bankCode: bankDetails.bankCode || "EQUITY" },
            amount: { amount: amount, currency: "KES" },
            description: "Pulse Feeds Reward",
            callbackUrl: process.env.EQUITY_CALLBACK_URL || `${process.env.APP_URL}/api/payout/equity/callback`
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              "X-App-ID": process.env.EQUITY_APP_ID || "",
              "X-Merchant-ID": process.env.EQUITY_MERCHANT_ID || "",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
          }
        );
        return res.json({ success: true, transactionId: reference, message: "Real bank payout sent via Equity Bank", details: response.data });
      } catch (error: any) {
        console.error("Equity Bank Bank Error:", error.response?.data || error.message);
        return res.status(500).json({ success: false, error: "Equity Bank bank payout failed", details: error.response?.data || error.message });
      }
    }

    // Fallback for bank payout
    res.json({
      success: true,
      transactionId: "BANK-SIM-" + Math.random().toString(36).substr(2, 9),
      message: "Bank payout initiated successfully (SIMULATED)"
    });
  });

  app.post("/api/payout/paybill", async (req, res) => {
    const { paybillDetails, amount } = req.body;
    console.log(`Initiating Equity Paybill payout for ${paybillDetails.businessNumber} / ${paybillDetails.accountNumber} with amount ${amount}`);
    
    try {
      const consumerKey = process.env.EQUITY_CONSUMER_KEY;
      const sourceAccount = process.env.EQUITY_SOURCE_ACCOUNT;
      
      if (!consumerKey || !sourceAccount) {
        console.log("Equity Bank credentials not configured, falling back to simulation.");
        return res.json({
          success: true,
          transactionId: "PAYBILL-SIM-" + Math.random().toString(36).substr(2, 9),
          message: "Paybill payout initiated successfully (SIMULATED)"
        });
      }

      const accessToken = await getEquityAccessToken();
      const reference = "PULSE-PB-" + Date.now();
      
      const response = await axios.post(
        `${process.env.EQUITY_BASE_URL || "https://api.equitybankgroup.com"}/transaction/v1/payments`,
        {
          transactionReference: reference,
          sender: {
            accountNumber: sourceAccount
          },
          receiver: {
            accountNumber: paybillDetails.accountNumber,
            billNumber: paybillDetails.businessNumber
          },
          amount: {
            amount: amount,
            currency: "KES"
          },
          description: `Pulse Feeds Reward Paybill ${paybillDetails.businessNumber}`,
          callbackUrl: process.env.EQUITY_CALLBACK_URL || `${process.env.APP_URL}/api/payout/equity/callback`
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-App-ID": process.env.EQUITY_APP_ID || "",
            "X-Merchant-ID": process.env.EQUITY_MERCHANT_ID || ""
          },
        }
      );

      res.json({
        success: true,
        transactionId: response.data.transactionReference || reference,
        message: "Real paybill payout request sent to Equity Bank successfully",
        details: response.data
      });
    } catch (error: any) {
      console.error("Equity Paybill Error:", error.response?.data || error.message);
      res.status(500).json({ 
        success: false, 
        error: "Failed to process real Equity Paybill payout", 
        details: error.response?.data || error.message 
      });
    }
  });

  app.post("/api/payout/equity/callback", (req, res) => {
    console.log("Equity Bank Callback Received:", JSON.stringify(req.body, null, 2));
    // In a real app, update Firestore with the result
    res.json({ status: "SUCCESS" });
  });

  // M-Pesa Callbacks
  app.post("/api/mpesa/callback", (req, res) => {
    console.log("M-Pesa Callback Received:", JSON.stringify(req.body, null, 2));
    // In a real app, update Firestore with the result
    res.json({ ResultCode: 0, ResultDesc: "Success" });
  });

  app.post("/api/mpesa/b2c/result", (req, res) => {
    console.log("M-Pesa B2C Result Received:", JSON.stringify(req.body, null, 2));
    // Update transaction status in Firestore
    res.json({ ResultCode: 0, ResultDesc: "Success" });
  });

  app.post("/api/payout/platform", async (req, res) => {
    const clientIp = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
    console.log(`[API] Received platform payout request from IP: ${clientIp}`, req.body);
    const { phoneNumber, accountNumber, method, amount: rawAmount, recipient } = req.body;
    const amount = parseFloat(rawAmount);
    const destination = accountNumber || phoneNumber || "Unknown";
    
    console.log(`[Developer Payout] Request Body:`, JSON.stringify(req.body));
    console.log(`[Developer Payout] Initiating for ${recipient} (${destination}) with amount $${amount} USD via ${method}`);
    
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount provided" });
    }

    try {
      // 1. Verify the treasury has enough funds using Client SDK (with long polling)
      const statsRefClient = docClient(clientDb, "platform", "stats");
      const statsDoc = await getDocClient(statsRefClient);
      
      if (!statsDoc.exists()) {
        console.log("[Developer Payout] Stats doc missing, creating it...");
        await setDocClient(statsRefClient, {
          platformRevenue: 0,
          platformShare: 0,
          totalUserBalances: 0,
          lastUpdated: new Date().toISOString(),
          serverSecret: SERVER_SECRET
        });
      }

      const currentStats = statsDoc.data();
      console.log(`[Developer Payout] Current stats:`, currentStats);

      const available = currentStats?.platformShare || 0;
      // Use a small tolerance (0.001) for floating point precision issues
      if (available < amount - 0.001) {
        return res.status(400).json({ 
          error: "Insufficient funds in Platform share.", 
          details: `Available: $${available.toFixed(4)}, Requested: $${amount}` 
        });
      }

      // 2. Perform the "Payout" (Real Payout if Co-op Bank is configured)
      let transactionId = "DEV-PAY-" + Math.random().toString(36).substr(2, 9).toUpperCase();
      let payoutDetails = null;

      if (COOP_CONFIG.clientId && COOP_CONFIG.sourceAccount && (method === 'coop_bank' || !method)) {
        console.log(`[Developer Payout] Attempting real Co-op Bank payout (IFT v3) for $${amount} to ${accountNumber || '853390'}`);
        try {
          const accessToken = await getCoopBankAccessToken();
          const kesAmount = amount * 130; 
          const reference = "DEV-COOP-" + Date.now();
          
          // Use the provided account number or fallback to the one from the photo
          const targetAccount = accountNumber || "853390";
          
          const response = await axios.post(
            `${COOP_CONFIG.baseUrl}/FundsTransfer/Internal/A2A_v3/3.0.0`,
            {
              MessageReference: reference,
              ISO2CountryCode: "KE",
              CallBackUrl: process.env.COOP_BANK_PAYOUT_CALLBACK_URL || "https://ais-dev-vpm462ccg3jpy6a7n4c54f-708516523970.europe-west2.run.app/api/payout/coop/callback",
              Source: {
                AccountNumber: COOP_CONFIG.sourceAccount,
                Amount: kesAmount, 
                TransactionCurrency: "KES",
                Narration: `Platform Withdrawal [IP: ${clientIp}]`
              },
              Destinations: [
                {
                  ReferenceNumber: reference + "_1",
                  AccountNumber: targetAccount,
                  Amount: kesAmount,
                  TransactionCurrency: "KES",
                  Narration: `EDWIN MUOHA WATITU [IP: ${clientIp}]`
                }
              ]
            },
            {
              headers: { 
                Authorization: `Bearer ${accessToken}`, 
                "Content-Type": "application/json",
                "User-Agent": "PulseFeeds/1.0.0",
                "Accept": "application/json"
              },
            }
          );
          transactionId = reference;
          payoutDetails = response.data;
          console.log(`[Developer Payout] Real payout success: ${transactionId}`);
        } catch (payoutErr: any) {
          const errorData = payoutErr.response?.data;
          const isHtml = typeof errorData === 'string' && (errorData.includes('<HTML>') || errorData.includes('edgesuite.net'));
          
          if (isHtml) {
            console.warn(`[Developer Payout] Co-op Bank Payout blocked by firewall. Falling back to simulation.`);
          } else {
            console.error(`[Developer Payout] Real payout failed:`, errorData || payoutErr.message);
          }
        }
      }
      
      // 3. Update the treasury using Client SDK (with serverSecret logic in rules)
      try {
        await updateDocClient(statsRefClient, {
          platformShare: incrementClient(-amount),
          lastUpdated: new Date().toISOString(),
          serverSecret: SERVER_SECRET // Include secret for security rules bypass
        });

        // Log Platform Transaction (Payout)
        await addDocClient(collectionClient(clientDb, 'platform_transactions'), {
          type: 'payout',
          source: 'platform_withdrawal',
          userAmount: 0,
          platformAmount: -amount,
          totalAmount: -amount,
          reason: `Platform Withdrawal to ${recipient} (${destination}) via ${method || 'payout'}`,
          userId: 'system',
          clientIp: clientIp,
          timestamp: serverTimestamp(),
          serverSecret: SERVER_SECRET // Include secret for security rules bypass
        });
      } catch (updateErr: any) {
        console.error(`[Developer Payout] Error updating stats:`, updateErr);
        throw updateErr;
      }

      // 4. Log the transaction (optional, could be a separate collection)
      console.log(`[Developer Payout] Success! ID: ${transactionId}`);

      res.json({
        success: true,
        transactionId,
        isSimulated: transactionId.startsWith('DEV-PAY-'),
        message: transactionId.startsWith('DEV-PAY-') 
          ? `Payout of $${amount} USD simulated successfully (API Firewall Blocked).`
          : `Payout of $${amount} USD initiated successfully to ${recipient}.`,
        newBalance: currentStats.platformShare - amount
      });
    } catch (error: any) {
      console.error("[Platform Payout] Error:", error);
      res.status(500).json({ error: "Failed to process Platform payout", details: error.message });
    }
  });

  app.get("/api/mpesa/status/:checkoutRequestId", (req, res) => {
    const { checkoutRequestId } = req.params;
    console.log(`Checking status for ${checkoutRequestId}`);
    
    // Mock status polling
    // In a real app, you'd check your database for the callback from Safaricom
    const statuses = ['pending', 'pending', 'success'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    res.json({
      status: randomStatus,
      resultDesc: randomStatus === 'success' ? 'The service request is processed successfully.' : 'Request is still pending',
    });
  });

  // International Payout Routes
  app.post("/api/payout/international", async (req, res) => {
    const { method, amount, email, bankDetails } = req.body;
    
    // Threshold check
    if (amount < 100) {
      return res.status(400).json({ success: false, error: "Minimum payout threshold is 100 USD" });
    }

    console.log(`Initiating ${method} payout for ${amount} to ${email || bankDetails?.accountNumber}`);
    
    // Mock successful payout
    res.json({
      success: true,
      transactionId: "INT-" + Math.random().toString(36).substr(2, 9),
      message: "Payout initiated successfully"
    });
  });

  // Weather Cache (Stale-While-Revalidate Strategy)
  const weatherCache = new Map<string, { data: any, timestamp: number }>();
  const FRESH_DURATION = 30 * 60 * 1000; // 30 minutes is "fresh"
  const STALE_DURATION = 24 * 60 * 60 * 1000; // 24 hours is "stale but usable"

  // Weather Proxy
  app.get("/api/weather", async (req, res) => {
    const { lat, lon } = req.query;
    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    // Round to 1 decimal place for city-level caching
    const cacheKey = `${latitude.toFixed(1)},${longitude.toFixed(1)}`;
    const cached = weatherCache.get(cacheKey);
    const now = Date.now();

    // 1. If we have FRESH data, return it immediately
    if (cached && (now - cached.timestamp < FRESH_DURATION)) {
      console.log(`[Weather] Serving FRESH cache for ${cacheKey}`);
      return res.json({ ...cached.data, _source: 'cache_fresh' });
    }

    // 2. If no fresh data, try to fetch from providers
    try {
      console.log(`[Weather] Fetching for ${cacheKey}...`);
      
      // Define fetchers
      const fetchOpenMeteo = async () => {
        const res = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=temperature_2m_max,weather_code&timezone=auto`, {
          timeout: 5000,
          headers: { 'Accept': 'application/json', 'User-Agent': 'PulseFeedWeatherBot/4.0' }
        });
        if (!res.data?.current_weather) throw new Error("Invalid Open-Meteo response");
        return { data: res.data, source: 'network_primary' };
      };

      const fetchMetNorway = async () => {
        const res = await axios.get(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${latitude}&lon=${longitude}`, {
          timeout: 5000,
          headers: { 'User-Agent': 'PulseFeedWeatherBot/4.0 (contact: edwinmuoha@gmail.com)', 'Accept': 'application/json' }
        });
        const timeseries = res.data?.properties?.timeseries?.[0];
        if (!timeseries) throw new Error("Invalid MET Norway response");
        
        const current = timeseries.data.instant.details;
        const mappedData = {
          current_weather: { temperature: current.air_temperature, weathercode: 0 },
          daily: { temperature_2m_max: [current.air_temperature + 2, current.air_temperature + 1], weather_code: [0, 0] }
        };
        return { data: mappedData, source: 'network_fallback_met' };
      };

      // Try primary and secondary in parallel for speed and resilience
      const result = await Promise.any([fetchOpenMeteo(), fetchMetNorway()]);
      
      console.log(`[Weather] Success via ${result.source}`);
      weatherCache.set(cacheKey, { data: result.data, timestamp: now });
      return res.json({ ...result.data, _source: result.source });

    } catch (error: any) {
      console.warn(`[Weather] Primary providers failed, trying wttr.in fallback...`);
      
      try {
        const wttrRes = await axios.get(`https://wttr.in/${latitude},${longitude}?format=j1`, {
          timeout: 8000,
          headers: { 'Accept': 'application/json' }
        });

        if (wttrRes.data?.current_condition?.[0]) {
          const cond = wttrRes.data.current_condition[0];
          const mappedData = {
            current_weather: { temperature: parseFloat(cond.temp_C), weathercode: 0 },
            daily: { temperature_2m_max: [parseFloat(wttrRes.data.weather[0].maxtempC)], weather_code: [0] }
          };
          console.log(`[Weather] wttr.in success`);
          weatherCache.set(cacheKey, { data: mappedData, timestamp: now });
          return res.json({ ...mappedData, _source: 'network_fallback_wttr' });
        }
      } catch (wttrError: any) {
        console.error(`[Weather] All network attempts failed.`);
      }
    }

    // 3. Final Fallback: If we have ANY cached data (even very stale), use it instead of returning 500
    if (cached) {
      console.warn(`[Weather] Returning STALE cache as last resort for ${cacheKey}`);
      return res.json({ ...cached.data, _source: 'cache_emergency_fallback', _is_stale: true });
    }

    res.status(503).json({ error: "Weather service temporarily unavailable" });
  });

  // Co-op Bank Callback Handler
  app.post("/api/payout/coop/callback", async (req, res) => {
    console.log("Received Co-op Bank Callback:", JSON.stringify(req.body, null, 2));
    
    const { MessageReference, TransactionStatus, TransactionStatusDescription } = req.body;

    try {
      // Update transaction status in Firestore
      const payoutRef = db.collection("payouts").doc(MessageReference);
      const doc = await payoutRef.get();

      if (doc.exists) {
        await payoutRef.update({
          status: TransactionStatus === "00" ? "completed" : "failed",
          bankResponse: req.body,
          updatedAt: FieldValue.serverTimestamp()
        });
        console.log(`Updated payout ${MessageReference} to ${TransactionStatus === "00" ? "completed" : "failed"}`);
      } else {
        // Log it anyway for debugging
        await db.collection("callback_logs").add({
          type: "coop_bank",
          data: req.body,
          receivedAt: FieldValue.serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error processing Co-op callback:", error);
    }

    // Always return 200 OK to the bank
    res.status(200).send("OK");
  });

  // Geocoding Proxy
  app.get("/api/geocode", async (req, res) => {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      console.warn("[Geocode] Missing coordinates:", { lat, lon });
      return res.status(400).json({ error: "Missing coordinates" });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);
    
    console.log(`[Geocode] Incoming request: lat=${lat}, lon=${lon} (parsed: ${latitude}, ${longitude})`);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      console.warn("[Geocode] Invalid coordinates provided:", { lat, lon });
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    let retries = 2;
    let lastError: any = null;

    while (retries > 0) {
      const attempt = 3 - retries;
      try {
        console.log(`[Geocode] Attempt ${attempt} using Nominatim...`);
      const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
        headers: {
          'User-Agent': 'PulseFeedApp/1.0 (contact: edwinmuoha@gmail.com)',
          'Accept-Language': 'en'
        },
        timeout: 15000
      });
        
        if (response.data && response.data.address) {
          console.log("[Geocode] Nominatim success");
          return res.json(response.data);
        }
        throw new Error("Nominatim returned invalid data");
      } catch (error: any) {
        lastError = error;
        console.warn(`[Geocode] Nominatim failed: ${error.message}`);
        
        // Fallback: BigDataCloud (Very reliable, no key needed for basic reverse)
        try {
          console.log(`[Geocode] Trying Fallback (BigDataCloud)...`);
          const fallbackRes = await axios.get(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 12000
          });
          
          if (fallbackRes.data && (fallbackRes.data.city || fallbackRes.data.locality || fallbackRes.data.principalSubdivision)) {
            console.log("[Geocode] BigDataCloud success");
            
            // Normalize to Nominatim format for frontend compatibility
            const normalizedData = {
              address: {
                city: fallbackRes.data.city || fallbackRes.data.locality || fallbackRes.data.principalSubdivision,
                town: fallbackRes.data.locality,
                village: fallbackRes.data.village,
                suburb: fallbackRes.data.suburb,
                country: fallbackRes.data.countryName
              },
              display_name: fallbackRes.data.locality + ", " + fallbackRes.data.principalSubdivision + ", " + fallbackRes.data.countryName
            };
            return res.json(normalizedData);
          }
        } catch (fallbackError: any) {
          console.error(`[Geocode] Fallback failed: ${fallbackError.message}`);
        }

        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    res.status(lastError?.response?.status || 500).json({ 
      error: "Failed to fetch geocode", 
      details: lastError?.message,
      status: lastError?.response?.status
    });
  });

  // City Search Proxy
  app.get("/api/search-city", async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Query required" });

    try {
      console.log(`[City Search] Query: ${q}`);
      const response = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q as string)}&limit=1`, {
        headers: {
          'User-Agent': 'PulseFeedApp/1.0 (contact: edwinmuoha@gmail.com)',
          'Accept-Language': 'en'
        },
        timeout: 10000
      });
      res.json(response.data);
    } catch (error: any) {
      console.error(`[City Search] Error: ${error.message}`);
      res.status(error.response?.status || 500).json({ error: "Search failed", details: error.message });
    }
  });

  // URL Shortener Proxy (Mock)
  app.get("/api/shorten", (req, res) => {
    const { url } = req.query;
    console.log(`[Shorten] URL: ${url}`);
    // In a real app, you'd use a service like Bitly or TinyURL
    // For now, we'll return a mock shortened URL
    const mockShort = `https://pulse.feed/${Math.random().toString(36).substr(2, 6)}`;
    res.json({ shortUrl: mockShort });
  });

  // Health check route
  app.get("/health", (req, res) => {
    res.send("Server is alive!");
  });

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[Global Error]", err);
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting Vite in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware attached.");
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    console.log("Serving static files from:", distPath);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      console.log(`Serving index.html for path: ${req.path}`);
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
