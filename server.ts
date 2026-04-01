import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import * as Tremendous from 'tremendous';

dotenv.config();

let tremendousClient: any = null;

function getTremendous() {
  if (!tremendousClient) {
    const apiKey = process.env.TREMENDOUS_API_KEY;
    if (!apiKey) {
      console.warn("TREMENDOUS_API_KEY not set, Tremendous payouts will fail.");
      return null;
    }
    tremendousClient = new (Tremendous as any)({
      apiKey: apiKey,
      baseUrl: process.env.TREMENDOUS_API_URL || 'https://testflight.tremendous.com/api/v2'
    });
  }
  return tremendousClient;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  console.log("Starting server...");
  console.log("NODE_ENV:", process.env.NODE_ENV);
  
  const app = express();
  const PORT = 3000;
  app.use(express.json());

  // M-Pesa API Routes
  app.post("/api/mpesa/stkpush", (req, res) => {
    const { phoneNumber, amount } = req.body;
    console.log(`Initiating STK Push for ${phoneNumber} with amount ${amount}`);
    
    // Mock successful response
    res.json({
      ResponseCode: "0",
      CustomerMessage: "Success. Request accepted for processing",
      CheckoutRequestID: "ws_CO_30032026170755" + Math.floor(Math.random() * 1000),
      MerchantRequestID: "29115-34620-1",
    });
  });

  app.post("/api/payout/mpesa", (req, res) => {
    const { phoneNumber, amount } = req.body;
    console.log(`Initiating M-Pesa payout for ${phoneNumber} with amount ${amount}`);
    
    // Mock successful payout
    res.json({
      success: true,
      transactionId: "MPESA-" + Math.random().toString(36).substr(2, 9),
      message: "Payout initiated successfully"
    });
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
    
    try {
      const client = getTremendous();
      if (!client) {
        throw new Error("Tremendous client not initialized");
      }
      
      // Tremendous Payout Logic
      // In a real app, you would map the method to Tremendous funding sources/products
      // const payout = await client.payouts.create({
      //   payment: {
      //     method: method === 'bank' ? 'bank_transfer' : 'paypal',
      //     amount: amount,
      //     currency: 'USD'
      //   },
      //   recipient: {
      //     name: bankDetails?.accountName || 'User',
      //     email: email
      //   }
      // });
      
      // Mock successful payout
      res.json({
        success: true,
        transactionId: "INT-" + Math.random().toString(36).substr(2, 9),
        message: "Payout initiated successfully via Tremendous"
      });
    } catch (error) {
      console.error("Tremendous payout error:", error);
      res.status(500).json({ success: false, error: "Failed to process Tremendous payout" });
    }
  });

  // Weather Proxy
  app.get("/api/weather", async (req, res) => {
    const { lat, lon } = req.query;
    try {
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Weather proxy error:", error);
      res.status(500).json({ error: "Failed to fetch weather" });
    }
  });

  // Geocoding Proxy
  app.get("/api/geocode", async (req, res) => {
    const { lat, lon } = req.query;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
        headers: {
          'User-Agent': 'PulseFeedApp/1.0'
        }
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Geocode proxy error:", error);
      res.status(500).json({ error: "Failed to fetch geocode" });
    }
  });

  // Health check route
  app.get("/health", (req, res) => {
    res.send("Server is alive!");
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
