import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

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
  app.post("/api/payout/international", (req, res) => {
    const { method, amount, email, bankDetails } = req.body;
    console.log(`Initiating ${method} payout for ${amount} to ${email || bankDetails?.accountNumber}`);
    
    // Mock successful payout
    res.json({
      success: true,
      transactionId: "INT-" + Math.random().toString(36).substr(2, 9),
      message: "Payout initiated successfully"
    });
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
