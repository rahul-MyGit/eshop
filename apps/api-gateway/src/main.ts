/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import express from 'express';

import cors from "cors";
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
// import swaggerUi from 'swagger-ui-express';
// import axios from 'axios';
import cookieParser from 'cookie-parser';
import proxy from "express-http-proxy"

const app = express();

app.use(cors({
  origin: ["http://localhost:3000"],
  allowedHeaders: ["Authorization", "Content-Type"],
  credentials: true
}))

app.use(morgan("dev"));
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use(cookieParser())
app.set("trust proxy", 1)

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req: any) => (req.user ? 1000 : 100),
  message: { error: "Too many messages. Please try again later" },
  standardHeaders: true,
  legacyHeaders: true,
  keyGenerator: (req: any) => {
    let ip = req.clientIp || req.ip;
    // Normalize IPv4-mapped IPv6 addresses
    if (ip && ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }
    return ip;
  }
})


app.use(limiter)

app.get('/gateway-health', (req, res) => {
  res.send({ message: 'Welcome to api-gateway!' });
});

app.use("/", proxy("http://localhost:6001"))

const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});
server.on('error', console.error);
