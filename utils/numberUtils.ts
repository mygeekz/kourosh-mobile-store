import { numberToWords } from '@persian-tools/persian-tools';

/**
 * Removes all non-digit characters from a string.
 * @param input The string to clean.
 * @returns A string containing only digits.
 */
export const cleanNumber = (input: string): string => {
  if (typeof input !== 'string') return '';
  return input.replace(/[^0-9]/g, '');
};

/**
 * Formats a number or numeric string with thousand separators.
 * @param num The number or string to format.
 * @returns A comma-separated string, or an empty string if input is invalid.
 */
export const formatNumberWithCommas = (num: string | number): string => {
  const str = String(num);
  const cleanedStr = cleanNumber(str);
  if (cleanedStr === '') return '';
  
  // Use toLocaleString for reliable formatting
  return Number(cleanedStr).toLocaleString('en-US');
};

/**
 * Converts a number or numeric string to Persian words and appends "تومان".
 * @param num The number or string to convert.
 * @returns The number in Persian words, or an empty string for zero or invalid input.
 */
export const convertNumberToPersianWords = (num: string | number): string => {
  const rawNumStr = cleanNumber(String(num));
  if (rawNumStr === '') return '';

  const numericValue = parseInt(rawNumStr, 10);
  if (isNaN(numericValue) || numericValue === 0) {
    return '';
  }

  return `${numberToWords(numericValue)} تومان`;
};
