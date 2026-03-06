export interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  category: string;
}

export const MOCK_DATA: CryptoAsset[] = [
  // Major
  { id: '1', symbol: 'BTC', name: 'Bitcoin', price: 65432, change24h: 2.4, marketCap: 1200000000000, category: 'Main' },
  { id: '2', symbol: 'ETH', name: 'Ethereum', price: 3456, change24h: -1.2, marketCap: 400000000000, category: 'Main' },
  { id: '3', symbol: 'SOL', name: 'Solana', price: 145, change24h: 5.6, marketCap: 65000000000, category: 'Main' },
  
  // Infrastructure
  { id: '4', symbol: 'DOT', name: 'Polkadot', price: 8.5, change24h: -0.8, marketCap: 12000000000, category: 'Infra' },
  { id: '5', symbol: 'LINK', name: 'Chainlink', price: 18.2, change24h: 1.4, marketCap: 11000000000, category: 'Infra' },
  { id: '6', symbol: 'AVAX', name: 'Avalanche', price: 42.1, change24h: -3.2, marketCap: 15000000000, category: 'Infra' },
  
  // DEX/DeFi
  { id: '7', symbol: 'UNI', name: 'Uniswap', price: 12.4, change24h: 4.1, marketCap: 7000000000, category: 'DeFi' },
  { id: '8', symbol: 'AAVE', name: 'Aave', price: 115, change24h: -2.1, marketCap: 1700000000, category: 'DeFi' },
  { id: '9', symbol: 'MKR', name: 'Maker', price: 2900, change24h: 0.5, marketCap: 2600000000, category: 'DeFi' },
  
  // Others
  { id: '10', symbol: 'ADA', name: 'Cardano', price: 0.45, change24h: -1.5, marketCap: 16000000000, category: 'Others' },
  { id: '11', symbol: 'DOGE', name: 'Dogecoin', price: 0.15, change24h: 8.2, marketCap: 22000000000, category: 'Others' },
  { id: '12', symbol: 'SHIB', name: 'Shiba Inu', price: 0.000025, change24h: -4.3, marketCap: 15000000000, category: 'Others' },
  { id: '13', symbol: 'NEAR', name: 'Near Protocol', price: 6.8, change24h: 2.9, marketCap: 7200000000, category: 'Others' },
];
