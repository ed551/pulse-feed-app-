import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory storage for transaction results (for demo purposes)
  const transactionResults = new Map<string, any>();

  // M-Pesa Express (STK Push) Logic
  const getMpesaAccessToken = async () => {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    
    if (!consumerKey || !consumerSecret) {
      throw new Error("M-Pesa Consumer Key or Secret is missing in environment variables.");
    }

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

    const response = await fetch(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.errorMessage || "Failed to get M-Pesa access token");
    }
    return data.access_token;
  };

  // API Routes
  app.post("/api/mpesa/stkpush", async (req, res) => {
    try {
      const { phoneNumber, amount } = req.body;
      const accessToken = await getMpesaAccessToken();

      const url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
      const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
      const shortcode = process.env.MPESA_SHORTCODE || "174379";
      const passkey = process.env.MPESA_PASSKEY || "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
      
      const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

      const payload = {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: shortcode,
        PhoneNumber: phoneNumber,
        CallBackURL: `${process.env.APP_URL}/api/mpesa/callback`,
        AccountReference: "Pulse Feeds",
        TransactionDesc: "Payment for Pulse Feeds",
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      // Initialize the transaction in our local storage
      if (data.CheckoutRequestID) {
        transactionResults.set(data.CheckoutRequestID, { status: "pending" });
      }

      res.json(data);
    } catch (error: any) {
      console.error("M-Pesa STK Push Error:", error);
      res.status(500).json({ error: error.message || "Failed to initiate STK Push" });
    }
  });

  // M-Pesa Callback
  app.post("/api/mpesa/callback", (req, res) => {
    const callbackData = req.body.Body.stkCallback;
    const checkoutRequestID = callbackData.CheckoutRequestID;
    
    console.log(`M-Pesa Callback for ${checkoutRequestID}:`, JSON.stringify(callbackData, null, 2));
    
    // Store the result
    transactionResults.set(checkoutRequestID, {
      status: callbackData.ResultCode === 0 ? "success" : "failed",
      resultDesc: callbackData.ResultDesc,
      data: callbackData
    });

    res.json({ ResultCode: 0, ResultDesc: "Success" });
  });

  // Polling endpoint for transaction status
  app.get("/api/mpesa/status/:checkoutRequestId", (req, res) => {
    const { checkoutRequestId } = req.params;
    const result = transactionResults.get(checkoutRequestId);
    
    if (!result) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    
    res.json(result);
  });

  // URL Shortener Proxy
  app.get("/api/shorten", async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
      const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url as string)}`);
      if (response.ok) {
        const shortUrl = await response.text();
        res.json({ shortUrl });
      } else {
        res.status(500).json({ error: "Failed to shorten URL" });
      }
    } catch (error) {
      console.error("URL Shortener Error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // International Payout Endpoint
  app.post("/api/payout/international", async (req, res) => {
    try {
      const { method, amount, email, bankDetails } = req.body;
      
      // Here you would integrate with Stripe Connect, PayPal Payouts, or Wise API
      // For demonstration, we simulate a successful payout
      
      console.log(`Processing ${method} payout of $${amount} to ${email || bankDetails?.accountNumber}`);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const transactionId = `INT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      res.json({
        success: true,
        transactionId,
        status: "success",
        message: `Successfully processed ${method} payout.`
      });
    } catch (error: any) {
      console.error("International Payout Error:", error);
      res.status(500).json({ error: error.message || "Failed to process international payout" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom", // Changed from "spa" to "custom" to handle root serving
    });
    app.use(vite.middlewares);
    
    // Explicitly serve index.html from root
    app.get("/", (req, res) => {
      res.sendFile(path.join(process.cwd(), "index.html"));
    });
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
