export const getCurrentMonth = (): number => new Date().getMonth() + 1;
export const getCurrentYear = (): number => new Date().getFullYear();

export const getMonthDateRange = (month: number, year: number): { start: Date; end: Date } => {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
};

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
};
