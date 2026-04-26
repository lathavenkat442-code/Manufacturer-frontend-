
export const shareText = (text: string) => {
  if (navigator.share) {
    navigator.share({
      text: text
    }).catch(err => {
      if (err.name === 'AbortError') {
        console.log('Share canceled by user');
        return;
      }
      console.error('Error sharing:', err);
      // Fallback to WhatsApp if share fails for other reasons
      const encodedText = encodeURIComponent(text);
      const whatsappUrl = `https://wa.me/?text=${encodedText}`;
      window.open(whatsappUrl, '_blank');
    });
  } else {
    // Fallback to WhatsApp for browsers that don't support navigator.share
    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  }
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export const getContrastColor = (hexcolor: string) => {
  if (!hexcolor || !hexcolor.startsWith('#')) return 'black';
  const r = parseInt(hexcolor.substring(1, 3), 16);
  const g = parseInt(hexcolor.substring(3, 5), 16);
  const b = parseInt(hexcolor.substring(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? 'black' : 'white';
};
