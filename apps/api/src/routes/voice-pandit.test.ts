import { describe, it, expect } from 'vitest';
import { __testing } from './voice-pandit.js';

const { turnBodySchema, redactPII, MAX_AUDIO_BYTES } = __testing;

describe('voice-pandit redactPII', () => {
  it('returns empty string unchanged', () => {
    expect(redactPII('')).toBe('');
  });

  it('redacts email addresses', () => {
    expect(redactPII('email me at user.name+tag@example.com please')).toBe(
      'email me at [redacted-email] please',
    );
  });

  it('redacts Indian mobile numbers with + and spaces', () => {
    const out = redactPII('call +91 98765 43210 anytime');
    expect(out).not.toContain('98765');
    expect(out).toContain('[redacted-phone]');
  });

  it('redacts plain 10-digit numbers', () => {
    const out = redactPII('call 9876543210 anytime');
    expect(out).not.toContain('9876543210');
    expect(out).toContain('[redacted-phone]');
  });

  it('redacts Aadhaar-length digit runs as id', () => {
    const out = redactPII('my id is 123456789012');
    expect(out).not.toContain('123456789012');
    // 12-digit run matches phone pattern first (>=7 digits) — both phone and
    // id redaction are acceptable; assert at least one redaction marker landed.
    expect(/\[redacted-(phone|id)\]/.test(out)).toBe(true);
  });

  it('leaves short numeric tokens like dates alone', () => {
    expect(redactPII('janmashtami 2026 is on 4 sep')).toBe('janmashtami 2026 is on 4 sep');
  });

  it('handles 50-utterance test corpus without leaking PII', () => {
    const corpus = [
      'My phone is +91 98765 43210',
      'mail me at devotee@gmail.com',
      'aadhaar 1234 5678 9012',
      'call me on 9123456789',
      'pan abcde1234f my email is x@y.in',
      'janmashtami 2026 abhishek booking',
      'recite gayatri mantra 108 times',
      'shubh muhurat for griha pravesh',
      'i need consultation 30 min',
      'whatsapp me at +1 415 555 0199',
      'send the receipt to a.b.c-d_e+1@sub.example.co.in',
      'card 4111111111111111 declined',
      'aadhaar number 999988887777',
      'contact +44 7700 900123',
      'kundli for 14 oct 1992',
      'om namah shivaya',
      'hare krishna',
      'panchang for 25 dec',
      'durga saptashati path',
      'ekadashi vrat 2026',
      'shiv abhishek at trimbakeshwar',
      'reach me on 022-12345678',
      'send to user@domain.io',
      'aadhar 111122223333',
      'phone 9988776655',
      'shri mahalakshmi puja',
      'rashi tula',
      'nakshatra rohini',
      'mahakaal darshan ujjain',
      'navratri 9 day fast',
      'sankalp for griha pravesh',
      'gotra kashyap',
      'gayatri mantra 1008 times',
      'aarti at 7 pm',
      'mail xyz@nri.com',
      'whatsapp +971 50 123 4567',
      'pancha bhoota linga yatra',
      'rudraksha 5 mukhi',
      'tirupati darshan booking',
      'shakti peeth kamakhya',
      'aadhar id 8888 7777 6666',
      'temple visit pune',
      'janmashtami abhishek mathura',
      'vivah muhurat may 2026',
      'mahamrityunjaya 108',
      'phone number 7711223344',
      'somnath jyotirlinga',
      'kedarnath yatra july',
      'sanskrit shloka gita 2.47',
      'devotional music suggestion',
    ];
    expect(corpus.length).toBe(50);
    for (const line of corpus) {
      const out = redactPII(line);
      // Hard assert: no email '@.' pattern and no >=7 contiguous digits remain
      expect(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(out)).toBe(false);
      // Allow short digit tokens (years, counts); only flag 7+ contiguous digits
      const longDigits = out.replace(/\[redacted-[a-z]+\]/g, '').match(/\d{7,}/g);
      expect(longDigits).toBeNull();
    }
  });
});

describe('voice-pandit turnBodySchema', () => {
  // 12-byte sample base64 — well above 8-char min, well under MAX
  const validAudio = Buffer.from('hello world!').toString('base64');

  it('accepts minimal valid request', () => {
    const r = turnBodySchema.safeParse({ audioBase64: validAudio });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.language).toBe('en');
      expect(r.data.mimeType).toBe('audio/webm');
    }
  });

  it('accepts explicit hi language', () => {
    const r = turnBodySchema.safeParse({ audioBase64: validAudio, language: 'hi' });
    expect(r.success).toBe(true);
  });

  it('rejects unknown language', () => {
    const r = turnBodySchema.safeParse({ audioBase64: validAudio, language: 'fr' });
    expect(r.success).toBe(false);
  });

  it('rejects audioBase64 shorter than 8 chars', () => {
    const r = turnBodySchema.safeParse({ audioBase64: 'abc' });
    expect(r.success).toBe(false);
  });

  it('rejects missing audioBase64', () => {
    const r = turnBodySchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it('rejects oversized audioBase64 over the MAX_AUDIO_BYTES cap', () => {
    // base64 expands ~4/3. Build a string just past the schema cap.
    const oversized = 'A'.repeat(Math.ceil((MAX_AUDIO_BYTES * 4) / 3) + 64);
    const r = turnBodySchema.safeParse({ audioBase64: oversized });
    expect(r.success).toBe(false);
  });

  it('accepts custom mimeType within bounds', () => {
    const r = turnBodySchema.safeParse({ audioBase64: validAudio, mimeType: 'audio/mp4' });
    expect(r.success).toBe(true);
  });

  it('rejects oversized mimeType', () => {
    const r = turnBodySchema.safeParse({ audioBase64: validAudio, mimeType: 'x'.repeat(120) });
    expect(r.success).toBe(false);
  });
});
