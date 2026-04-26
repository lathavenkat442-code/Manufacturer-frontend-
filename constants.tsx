
import React from 'react';

export const TRANSLATIONS = {
  ta: {
    appName: 'உற்பத்தியாளர்/manufacturer',
    dashboard: 'முகப்பு',
    stock: 'சரக்கு (Stock)',
    accounts: 'கணக்கு (Accounts)',
    profile: 'சுயவிவரம்',
    totalBalance: 'மொத்த இருப்பு',
    income: 'வரவு',
    expense: 'செலவு',
    addStock: 'சரக்கு சேர்',
    addTransaction: 'கணக்கு சேர்',
    editTransaction: 'கணக்கை மாற்ற',
    itemName: 'பொருளின் பெயர்',
    quantity: 'அளவு',
    price: 'விலை',
    category: 'வகை',
    save: 'சேமி',
    update: 'புதுப்பிக்க',
    cancel: 'ரத்து',
    photo: 'புகைப்படம்',
    noData: 'தகவல் ஏதும் இல்லை',
    lowStock: 'குறைவான இருப்பு',
    syncNotice: 'ஒரே கணக்கில் லாகின் செய்தால் அனைத்து மொபைல்களிலும் பார்க்கலாம்.',
    clearAll: 'அனைத்தையும் அழிக்க',
    confirmDeleteTxn: 'இந்த கணக்கை நீக்கவா?',
    confirmClearTxn: 'அனைத்து கணக்குகளையும் அழிக்கவா?',
    cantUndo: 'இதை மாற்ற முடியாது.',
    mobile: 'மொபைல் எண்',
    otp: 'OTP குறியீடு',
    sendOtp: 'OTP அனுப்பு',
    verify: 'சரிபார்',
    accountNotFound: 'இந்த கணக்கு இன்னும் உருவாக்கப்படவில்லை.',
    createAsk: 'புதியதாக கணக்கு தொடங்கவா?',
    yes: 'ஆம், தொடங்கு',
    no: 'வேண்டாம்',
    otpSent: 'OTP அனுப்பப்பட்டது: ',
    invalidOtp: 'தவறான OTP',
    loginFailed: 'தவறான தகவல்கள்',
    emailOrMobile: 'இமெயில் / மொபைல் எண்',
    selectCategoryFirst: 'முதலில் வகையை தேர்ந்தெடுக்கவும்',
    color: 'நிறம்',
    sleeve: 'கை வகை',
    fullHand: 'முழுக்கை',
    halfHand: 'அரைக்கை',
    size: 'சைஸ்',
    skipLogin: 'உள்நுழையாமல் தொடரவும்',
    selectColor: 'நிறத்தை தேர்ந்தெடுக்கவும்',
    partyName: 'பெயர் (Customer/Dealer)',
    ledger: 'பேரேடு (Ledger)',
    transactions: 'பரிவர்த்தனைகள்',
    receivable: 'நமக்கு வரவேண்டியது',
    payable: 'நாம் தரவேண்டியது',
    netBalance: 'மொத்த கணக்கு',
    forgotPassword: 'கடவுச்சொல் மறந்துவிட்டதா?',
    resetPassword: 'கடவுச்சொல் மீட்டெடுப்பு',
    sendResetLink: 'லிங்க் அனுப்புக',
    backToLogin: 'திரும்ப செல்ல',
    resetLinkSent: 'கடவுச்சொல் மீட்டெடுப்பு லிங்க் மின்னஞ்சலுக்கு அனுப்பப்பட்டது.'
  },
  en: {
    appName: 'உற்பத்தியாளர்/manufacturer',
    dashboard: 'Dashboard',
    stock: 'Stock',
    accounts: 'Accounts',
    profile: 'Profile',
    totalBalance: 'Total Balance',
    income: 'Income',
    expense: 'Expense',
    addStock: 'Add Stock',
    addTransaction: 'Add Entry',
    editTransaction: 'Edit Entry',
    itemName: 'Item Name',
    quantity: 'Quantity',
    price: 'Price',
    category: 'Category',
    save: 'Save',
    update: 'Update',
    cancel: 'Cancel',
    photo: 'Photo',
    noData: 'No Data',
    lowStock: 'Low Stock',
    syncNotice: 'Login to sync data across devices.',
    clearAll: 'Clear All',
    confirmDeleteTxn: 'Delete this entry?',
    confirmClearTxn: 'Clear all entries?',
    cantUndo: 'This cannot be undone.',
    mobile: 'Mobile Number',
    otp: 'OTP Code',
    sendOtp: 'Send OTP',
    verify: 'Verify',
    accountNotFound: 'Account not created yet.',
    createAsk: 'Do you want to create a new account?',
    yes: 'Yes, Create',
    no: 'No',
    otpSent: 'OTP Sent: ',
    invalidOtp: 'Invalid OTP',
    loginFailed: 'Invalid credentials',
    emailOrMobile: 'Email / Mobile Number',
    selectCategoryFirst: 'Select Category First',
    color: 'Color',
    sleeve: 'Sleeve',
    fullHand: 'Full Hand',
    halfHand: 'Half Hand',
    size: 'Size',
    skipLogin: 'Skip Login (Guest Mode)',
    selectColor: 'Select Color',
    partyName: 'Party Name (Customer/Dealer)',
    ledger: 'Ledger',
    transactions: 'Transactions',
    receivable: 'Receivable',
    payable: 'Payable',
    netBalance: 'Net Balance',
    forgotPassword: 'Forgot Password?',
    resetPassword: 'Reset Password',
    sendResetLink: 'Send Reset Link',
    backToLogin: 'Back to Login',
    resetLinkSent: 'Password reset link sent to your email.'
  }
};

export const CATEGORIES = [
  'Shirts (சட்டைகள்)',
  'Pants (பேன்ட்)',
  'Accessories (பாகங்கள்)',
  'ஆண்கள் ஆடை (Men)',
  'பெண்கள் ஆடை (Women)',
  'டாப்ஸ் (Tops)',
  'கணவன் மனைவி காம்போ (Couple Combo)',
  'ஃபேமிலி காம்போ (Family Combo)'
];

export const SHIRT_SIZES = [
  'S-36',
  'M-38',
  'L-40',
  'XL-42',
  'XXL-44'
];

export const PREDEFINED_COLORS = [
  { name: 'கருப்பு', code: '#000000', text: 'white' }, // Black
  { name: 'வெள்ளை', code: '#FFFFFF', text: 'black' }, // White
  { name: 'கிரே', code: '#6B7280', text: 'white' }, // Grey
  { name: 'நேவி ப்ளூ', code: '#1E3A8A', text: 'white' }, // Navy Blue
  { name: 'ஸ்கை ப்ளூ', code: '#0EA5E9', text: 'black' }, // Sky Blue
  { name: 'ரெட்', code: '#DC2626', text: 'white' }, // Red
  { name: 'தக்காளி', code: '#EF4444', text: 'white' }, // Tomato
  { name: 'ஆரஞ்சு', code: '#F97316', text: 'white' }, // Orange
  { name: 'மஞ்சள்', code: '#FACC15', text: 'black' }, // Yellow
  { name: 'மஸ்டர்ட்', code: '#CA8A04', text: 'white' }, // Mustard
  { name: 'சந்தனம்', code: '#FDE68A', text: 'black' }, // Sandal
  { name: 'B. கிரீன்', code: '#064E3B', text: 'white' }, // Bottle Green
  { name: 'சட்னி', code: '#16A34A', text: 'white' }, // Chutney
  { name: 'L. கிரீன்', code: '#86EFAC', text: 'black' }, // L.Green
  { name: 'மெரூன்', code: '#800000', text: 'white' }, // Maroon
  { name: 'பிங்க்', code: '#EC4899', text: 'white' }, // Pink
  { name: 'L.பிங்க்', code: '#F9A8D4', text: 'black' }, // L.Pink
  { name: 'ஊதா', code: '#7C3AED', text: 'white' }, // Purple
  { name: 'எல் வைலட்', code: '#A78BFA', text: 'black' }, // L.Violet
  { name: 'லாவெண்டர்', code: '#C4B5FD', text: 'black' }, // Lavender
  { name: 'ரெக்ஸோனா', code: '#2DD4BF', text: 'black' }, // Rexona
  { name: 'காபி', code: '#78350F', text: 'white' } // Coffee
];

export const YARN_TYPES = [
  '50d', '80d', '75d', '68d', '34d', '30kota', 'multi kota', '110d', '150d', 'Half Fine Zari', 'Tested Zari', 'Imitation Zari'
];

export const YARN_COLORS = [
  'red', 'black', 'rani', 'b.green', 'green', 'rexona', 'sumathi', 'tusser', 'cream', 'babha', 'gold', 'pink', 'violet', 'lemon', 'copper', 'white', 'r.blue', 'navyblue', 'maroon',
  'சில்வர் ஜரிகை', 'காப்பர் ஜரிகை', 'கோல்டு ஜரிகை', 'பிங்க் காப்பர் ஜரிகை'
];

export const BUTTON_COLOR_PRESETS = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Light Gray', hex: '#F4F4F5' },
  { name: 'Sky Blue', hex: '#F0F9FF' },
  { name: 'Cream', hex: '#FFFBEB' },
  { name: 'Mint', hex: '#F0FDF4' },
  { name: 'Rose', hex: '#FFF1F2' },
  { name: 'Indigo', hex: '#EEF2FF' },
  { name: 'Slate', hex: '#F8FAFC' },
  { name: 'Gold', hex: '#FEF3C7' },
  { name: 'Dark Indigo', hex: '#4F46E5' },
  { name: 'Deep Emerald', hex: '#059669' },
  { name: 'Classic Black', hex: '#18181B' },
];
