import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import axios from 'axios';

dotenv.config();

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
    
    // Mock successful payout
    res.json({
      success: true,
      transactionId: "INT-" + Math.random().toString(36).substr(2, 9),
      message: "Payout initiated successfully"
    });
  });

  // Weather Proxy
  app.get("/api/weather", async (req, res) => {
    const { lat, lon } = req.query;
    console.log(`[Weather] Request received: lat=${lat}, lon=${lon}`);
    
    if (!lat || !lon || lat === 'undefined' || lon === 'undefined') {
      console.warn("[Weather] Invalid coordinates provided");
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    try {
      console.log(`[Weather] Fetching from Open-Meteo...`);
      const response = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'PulseFeedApp/1.0'
        }
      });
      console.log(`[Weather] Open-Meteo response received: ${response.status}`);
      res.json(response.data);
    } catch (error: any) {
      console.error("[Weather] Proxy error:", error.message);
      if (error.response) {
        console.error("[Weather] Open-Meteo error response:", error.response.status, error.response.data);
      }
      res.status(500).json({ error: "Failed to fetch weather", details: error.message });
    }
  });

  // Geocoding Proxy
  app.get("/api/geocode", async (req, res) => {
    const { lat, lon } = req.query;
    console.log(`[Geocode] Fetching for lat=${lat}, lon=${lon}`);
    
    if (!lat || !lon || lat === 'undefined' || lon === 'undefined') {
      console.warn("[Geocode] Invalid coordinates provided");
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    try {
      const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
        headers: {
          'User-Agent': 'PulseFeedApp/1.0'
        },
        timeout: 10000 // 10s timeout
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("[Geocode] Proxy error:", error.message);
      res.status(500).json({ error: "Failed to fetch geocode", details: error.message });
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
