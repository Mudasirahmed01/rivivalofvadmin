// Product and order prices are stored as Pakistani Rupees in Supabase.
export const formatPKR = (pkrAmount: number): string => {
  const roundedAmount = Math.round(pkrAmount);
  return `Rs ${roundedAmount.toLocaleString("en-PK")}`;
};

export const formatPKRShort = (pkrAmount: number): string => {
  const roundedAmount = Math.round(pkrAmount);
  if (roundedAmount >= 1000) {
    return `Rs ${(roundedAmount / 1000).toFixed(1)}K`;
  }
  return `Rs ${roundedAmount.toLocaleString("en-PK")}`;
};
