export type Currency = 'usd' | 'eur';

export interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  category: string;
  image: string;
  rank: number;
}

export const INITIAL_WATCHLIST = [
  'bitcoin', 'ethereum', 'solana', 'cardano', 'polkadot', 'chainlink', 
  'avalanche-2', 'uniswap', 'near', 'ripple', 'dogecoin', 'shiba-inu',
  'polkadot', 'cosmos', 'chainlink', 'tron', 'polygon', 'dai', 'litecoin'
];
