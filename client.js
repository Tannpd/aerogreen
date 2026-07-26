// AeroGreen JavaScript SDK Client
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const CONTRACT_ADDRESS = "0xcF9D961d48a0210480B91B094861647D278c1726";

export async function getFlightsCount() {
  const client = createClient({ chain: studionet });
  const count = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_flights_count",
    args: []
  });
  return Number(count);
}

export async function getFlight(flightId) {
  const client = createClient({ chain: studionet });
  const flightJsonStr = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_flight",
    args: [flightId]
  });
  return JSON.parse(flightJsonStr);
}
