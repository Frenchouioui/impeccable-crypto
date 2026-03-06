import axios from 'axios';

export default async function handler(req: any, res: any) {
  const { vs_currency, ids, order, per_page, sparkline, price_change_percentage } = req.query;

  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
      params: {
        vs_currency,
        ids,
        order,
        per_page,
        sparkline,
        price_change_percentage,
      },
    });

    // Add CORS headers to allow your frontend to communicate with this proxy
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Proxy error:', error.message);
    return res.status(error.response?.status || 500).json({ 
      error: 'Failed to fetch from CoinGecko',
      message: error.message 
    });
  }
}
