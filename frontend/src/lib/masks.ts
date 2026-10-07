export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function maskCPF(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function maskPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';

  const areaCode = digits.slice(0, 2);
  const subscriber = digits.slice(2);
  const prefixLength = digits.length === 11 ? 5 : 4;

  if (subscriber.length <= prefixLength) {
    return `(${areaCode}) ${subscriber}`;
  }

  return `(${areaCode}) ${subscriber.slice(0, prefixLength)}-${subscriber.slice(prefixLength)}`;
}

export function isValidCPF(value: string): boolean {
  const digits = onlyDigits(value);
  return digits.length === 11 && !/^(\d)\1{10}$/.test(digits);
}
