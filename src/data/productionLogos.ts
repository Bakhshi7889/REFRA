import React from 'react';

// Crisp, lightweight vector marks and fallbacks for major production studios
export function getProductionCompanyLogo(name: string, rawLogoUrl?: string): string | null {
  if (rawLogoUrl) return rawLogoUrl;

  const n = (name || '').toLowerCase().trim();
  
  if (n.includes('marvel')) {
    return 'https://image.tmdb.org/t/p/w300/hUzeosd33nzE5MCNsZxCGEKTXaQ.png'; // Marvel Studios
  }
  if (n.includes('columbia pictures')) {
    return 'https://image.tmdb.org/t/p/w300/71BqEFAF4V3qjjMPCpLuyJFB9A.png'; // Columbia Pictures
  }
  if (n.includes('pascal')) {
    return 'https://image.tmdb.org/t/p/w300/p9qO34J4w99t699tL21gB7b4kYy.png'; // Pascal Pictures
  }
  if (n.includes('tsg')) {
    return 'https://image.tmdb.org/t/p/w300/7aJ79FMlCoYm0hN7z5u1o0K2m.png'; // TSG Entertainment
  }
  if (n.includes('warner bros') || n.includes('warner brothers')) {
    return 'https://image.tmdb.org/t/p/w300/ky0xOc55v0T4K4ZcNu8Z9w0h0Wz.png'; // Warner Bros.
  }
  if (n.includes('universal pictures') || n.includes('universal')) {
    return 'https://image.tmdb.org/t/p/w300/837bRzp8uvMr40Sl99BtURBdTx9.png'; // Universal
  }
  if (n.includes('disney')) {
    return 'https://image.tmdb.org/t/p/w300/wdrCwmR5r5x5B1q7k50L6a7L8M9.png'; // Walt Disney
  }
  if (n.includes('paramount')) {
    return 'https://image.tmdb.org/t/p/w300/gzclbm69iK0r3cIeQ0t8tYvJ8Qx.png'; // Paramount
  }
  if (n.includes('a24')) {
    return 'https://image.tmdb.org/t/p/w300/16vp6vM9vGf56Pq51bL3m7n6L0N.png'; // A24
  }
  if (n.includes('20th century') || n.includes('twentieth century')) {
    return 'https://image.tmdb.org/t/p/w300/qZCc1lty5FzX3gmPz9vN8Vb7r2x.png'; // 20th Century Studios
  }
  if (n.includes('sony pictures') || n.includes('sony')) {
    return 'https://image.tmdb.org/t/p/w300/GagSvqWlyPdkKYTaqkn9vW1pTq.png'; // Sony Pictures
  }
  if (n.includes('legendary')) {
    return 'https://image.tmdb.org/t/p/w300/5243884.png'; // Legendary Pictures
  }
  if (n.includes('blumhouse')) {
    return 'https://image.tmdb.org/t/p/w300/wz9i117tq4.png'; // Blumhouse
  }
  if (n.includes('lionsgate')) {
    return 'https://image.tmdb.org/t/p/w300/1635.png'; // Lionsgate
  }
  if (n.includes('pixar')) {
    return 'https://image.tmdb.org/t/p/w300/3.png'; // Pixar
  }
  if (n.includes('lucasfilm')) {
    return 'https://image.tmdb.org/t/p/w300/1.png'; // Lucasfilm
  }

  return null;
}
