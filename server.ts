import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import * as Tremendous from 'tremendous';

dotenv.config();

const tremendous = new (Tremendous as any)({
  apiKey: process.env.TREMENDOUS_API_KEY || '',
  baseUrl: process.env.TREMENDOUS_API_URL || 'https://testflight.tremendous.com/api/v2'
});

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
      // Tremendous Payout Logic
      // In a real app, you would map the method to Tremendous funding sources/products
      // const payout = await tremendous.payouts.create({
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
