import { describe, expect, it } from 'vitest';
import { isValidCPF, maskCPF, maskPhone, onlyDigits } from '@/lib/masks';

describe('input masks', () => {
  it('formats CPF progressively and caps it at 11 digits', () => {
    expect(maskCPF('529')).toBe('529');
    expect(maskCPF('529982')).toBe('529.982');
    expect(maskCPF('52998224725')).toBe('529.982.247-25');
    expect(maskCPF('529.982.247-25')).toBe('529.982.247-25');
    expect(maskCPF('52998224725999')).toBe('529.982.247-25');
  });

  it('formats landline and mobile phone numbers with their respective lengths', () => {
    expect(maskPhone('1187654321')).toBe('(11) 8765-4321');
    expect(maskPhone('(11) 98765-4321')).toBe('(11) 98765-4321');
    expect(maskPhone('11987654321')).toBe('(11) 98765-4321');
    expect(maskPhone('11987654321999')).toBe('(11) 98765-4321');
  });

  it('preserves progressive phone input formatting', () => {
    expect(maskPhone('1')).toBe('(1');
    expect(maskPhone('11')).toBe('(11');
    expect(maskPhone('119')).toBe('(11) 9');
  });

  it('validates an 11-digit CPF and rejects repeated digits', () => {
    expect(isValidCPF('529.982.247-25')).toBe(true);
    expect(isValidCPF('111.111.111-11')).toBe(false);
    expect(isValidCPF('529.982.247')).toBe(false);
  });

  it('returns only digits', () => {
    expect(onlyDigits('(11) 98765-4321')).toBe('11987654321');
  });
});
