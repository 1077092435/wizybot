export interface CurrencyConversionIntent {
    type: 'convert_amount' | 'product_price_in_currency';
    amount?: number;
    from?: string; 
    to?: string;  
    productQuery?: string; 
}

const CURRENCY_ALIASES: Record<string, string> = {
    dollar: 'USD', dollars: 'USD', usd: 'USD',
    'canadian dollar': 'CAD', 'canadian dollars': 'CAD', cad: 'CAD',
    euro: 'EUR', euros: 'EUR', eur: 'EUR',
    pound: 'GBP', pounds: 'GBP', 'british pound': 'GBP', gbp: 'GBP',
    yen: 'JPY', jpy: 'JPY',
    peso: 'MXN', pesos: 'MXN', mxn: 'MXN',
    'peso colombiano': 'COP', cop: 'COP',
    'real brasileño': 'BRL', brl: 'BRL', real: 'BRL',
    'franco suizo': 'CHF', chf: 'CHF',
    'yuan': 'CNY', cny: 'CNY',
};

const CURRENCY_PATTERNS = Object.keys(CURRENCY_ALIASES).sort((a, b) => b.length - a.length);

function findCurrencyInText(text: string): { code: string; matchedText: string } | null {
    const lower = text.toLowerCase();
    for (const pattern of CURRENCY_PATTERNS) {
        if (lower.includes(pattern)) {
            return { code: CURRENCY_ALIASES[pattern], matchedText: pattern };
        }
    }
    return null;
}


export function detectDirectConversion(enquiry: string): CurrencyConversionIntent | null {
    const lower = enquiry.toLowerCase();


    const amountMatch = lower.match(/(\d+(?:[.,]\d+)?)/);
    if (!amountMatch) return null;

    const amount = parseFloat(amountMatch[1].replace(',', '.'));

    const foundCurrencies: string[] = [];
    const lowerCopy = lower;
    for (const pattern of CURRENCY_PATTERNS) {
        if (lowerCopy.includes(pattern)) {
            const code = CURRENCY_ALIASES[pattern];
            if (!foundCurrencies.includes(code)) {
                foundCurrencies.push(code);
            }
        }
    }

    if (foundCurrencies.length < 2) return null;

    const amountIndex = lower.indexOf(amountMatch[1]);
    const firstCurrencyIndex = lower.indexOf(
        CURRENCY_PATTERNS.find(p => CURRENCY_ALIASES[p] === foundCurrencies[0])!,
    );

    let from: string;
    let to: string;

    if (firstCurrencyIndex < amountIndex) {
        to = foundCurrencies[0];
        from = foundCurrencies[1];
    } else {
        from = foundCurrencies[0];
        to = foundCurrencies[1];
    }

    return { type: 'convert_amount', amount, from, to };
}


export function detectProductPriceInCurrency(
    enquiry: string,
): CurrencyConversionIntent | null {
    const currency = findCurrencyInText(enquiry);
    if (!currency) return null;

    let productQuery = enquiry
        .toLowerCase()
        .replace(currency.matchedText, '')
        .replace(
            /\b(what|is|the|price|of|cost|costs|does|how|much|in|a|an)\b/g,
            ' ',
        )
        .replace(/[?.,!]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (!productQuery) return null;

    return {
        type: 'product_price_in_currency',
        to: currency.code,
        productQuery,
    };
}

export function detectCurrencyIntent(enquiry: string): CurrencyConversionIntent | null {
    return detectDirectConversion(enquiry) ?? detectProductPriceInCurrency(enquiry);
}