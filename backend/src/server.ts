import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes";
import prescriptionRoutes from "./routes/prescriptionRoutes";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 4000);
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000";

app.use(cors({
  origin: corsOrigin,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "qr-prescription-api" });
});

app.use("/auth", authRoutes);
app.use("/prescriptions", prescriptionRoutes);

app.listen(port, () => {
  console.log(`API listening on ${port}`);
});
