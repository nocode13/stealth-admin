import Big from 'big.js';

export const thousandsSeparator = (value: number | string) => {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

export const toSum = (tiyin: number): number => new Big(tiyin).div(100).toNumber();

export const toTiyin = (sum: number): number => new Big(sum).times(100).round(0).toNumber();

export const toRound = (value: number, decimals = 2): number => new Big(value).round(decimals).toNumber();

export const formatAmount = (amount: number) => {
  return thousandsSeparator(toRound(toSum(amount)));
};
