export const formatCurrency = (amount: number, currency: string = 'INR'): string => {
  const currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
    JPY: '¥',
  };

  const symbol = currencySymbols[currency] || '₹';
  
  // Format with proper decimal places
  const formattedAmount = Math.abs(amount).toFixed(2);
  
  return `${symbol}${formattedAmount}`;
};

export const getCurrencySymbol = (currency: string = 'INR'): string => {
  const currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
    JPY: '¥',
  };

  return currencySymbols[currency] || '₹';
};
