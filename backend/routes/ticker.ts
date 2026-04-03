import express, { Response } from 'express';

const router = express.Router();

let cachedTickerData: any = null;
let lastFetchTime = 0;
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

router.get('/', async (req: express.Request, res: Response) => {
    const now = Date.now();
    if (cachedTickerData && (now - lastFetchTime < CACHE_TTL)) {
        return res.json(cachedTickerData);
    }

    try {
        const yfSymbols = ['^GSPC', '^DJI', '^GSPTSE'];
        
        // Fetch Yahoo Finance symbols
        const yfPromises = yfSymbols.map(async (sym) => {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`;
            const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
            
            if (!response.ok) {
                console.warn(`Yahoo Finance failed for ${sym}: ${response.status}`);
                return null;
            }
            const data = await response.json();
            if (!data || !data.chart || !data.chart.result || !data.chart.result[0]) return null;
            
            const meta = data.chart.result[0].meta;
            return {
                symbol: sym,
                regularMarketPrice: meta.regularMarketPrice,
                regularMarketChange: meta.regularMarketPrice - meta.chartPreviousClose,
                currency: meta.currency || 'USD'
            };
        });

        // Fetch Commodities from CNBC (Yahoo Finance CL=F feed is bugged/delayed)
        const cnbcPromise = (async () => {
             try {
                 const url = `https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=@CL.1%7C@LCO.1&requestMethod=itv&noform=1&fund=1&exthrs=1&output=json&events=1`;
                 const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
                 if (!response.ok) return [];
                 const data = await response.json();
                 const quotes = data.FormattedQuoteResult?.FormattedQuote || [];
                 return quotes.map((q: any) => {
                     let sym = q.symbol;
                     if (sym === '@CL.1') sym = 'CL=F'; // Keep original symbol IDs mapped
                     if (sym === '@LCO.1') sym = 'BZ=F';
                     
                     return {
                         symbol: sym,
                         regularMarketPrice: parseFloat(q.last),
                         regularMarketChange: parseFloat(q.change),
                         currency: 'USD' // Commodities generally trade globally in USD
                     };
                 });
             } catch (e) {
                 console.error("CNBC Fetch Error", e);
                 return [];
             }
        })();

        const yfRawResults = await Promise.all(yfPromises);
        const cnbcRawResults = await cnbcPromise;
        const rawResults = [...yfRawResults, ...cnbcRawResults];
        const results = rawResults.filter(r => r !== null);

        const formattedResults = results
            .map((item: any) => {
                let price = item.regularMarketPrice;
                let change = item.regularMarketChange;

                let displayName = item.symbol;
                if (item.symbol === '^GSPTSE') displayName = 'TSX';
                if (item.symbol === '^GSPC') displayName = 'S&P 500';
                if (item.symbol === '^DJI') displayName = 'DOW';
                if (item.symbol === 'CL=F') displayName = 'WTI Crude';
                if (item.symbol === 'BZ=F') displayName = 'Brent Crude';

                // Calculate percent change
                const previousClose = item.regularMarketPrice - item.regularMarketChange;
                const percentChange = previousClose !== 0 ? (item.regularMarketChange / previousClose) * 100 : 0;

                return {
                    symbol: item.symbol,
                    name: displayName,
                    price: price,
                    change: change,
                    percentChange: percentChange,
                    currency: item.currency
                };
            });

        cachedTickerData = { items: formattedResults, cachedAt: now };
        lastFetchTime = now;

        res.json(cachedTickerData);
    } catch (error: any) {
        console.error('Error fetching ticker data:', error.message);
        if (cachedTickerData) {
            return res.json(cachedTickerData);
        }
        res.status(500).json({ message: 'Failed to fetch ticker data', error: error.message });
    }
});

export default router;
