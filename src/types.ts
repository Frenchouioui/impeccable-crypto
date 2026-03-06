export type Currency = 'usd' | 'eur';
export type Timeframe = '1h' | '24h' | '7d' | '30d';

export interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change1h: number;
  change24h: number;
  change7d: number;
  change30d: number;
  marketCap: number;
  category: string;
  image: string;
  rank: number;
}

export const INITIAL_WATCHLIST = [
  'bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple', 'dogecoin', 
  'cardano', 'tron', 'polkadot', 'chainlink', 'avalanche-2', 'shiba-inu', 
  'toncoin', 'near', 'uniswap', 'polygon', 'litecoin', 'pepe', 'aptos', 
  'cosmos', 'stellar', 'monero', 'okb', 'render-token', 'arbitrum'
];
