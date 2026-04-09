
import dotenv from 'dotenv';
dotenv.config();
import { getAccessToken } from './services/graphservice.js';
async function run() {
  try {
    const token = await getAccessToken();
    const response = await fetch("https://graph.microsoft.com/v1.0/subscriptions", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
