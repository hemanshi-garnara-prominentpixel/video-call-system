import { ConnectClient } from "@aws-sdk/client-connect";
import dotenv from "dotenv";

dotenv.config();
const region = process.env.AWS_REGION;

if (!region) {
  throw new Error("AWS_REGION is missing in .env");
}

export const connectClient = new ConnectClient({
  region
});