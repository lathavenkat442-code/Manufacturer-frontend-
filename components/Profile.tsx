
import React, { useState } from 'react';
import { User, StockItem, Transaction, BackupFrequency } from '../types';
import { LogOut, ShieldCheck, Download, FileSpreadsheet, HardDriveDownload, Globe, CheckCircle2, UploadCloud, Save, Cloud, Calendar, History, Settings, ToggleLeft, ToggleRight, Image, User as UserIcon, X, AlertTriangle, Eraser, Trash2, ChevronDown, Database, Wifi, WifiOff, Camera, Lock, KeyRound, Mail, ChevronLeft, Palette, RefreshCw, MousePointer2 } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../supabaseClient';
import { BUTTON_COLOR_PRESETS } from '../constants';

interface ProfileProps {
  user: User;
  updateUser: (u: User) => void;
  stocks: StockItem[];
  transactions: Transaction[];
  onLogout: () => void;
  onRestore: (data: any) => void;
  language: 'ta' | 'en';
  onLanguageChange: (lang: 'ta' | 'en') => void;
  onClearTransactions: () => void;
  onResetApp: () => void;
  customAppName: string;
  setCustomAppName: (name: string) => void;
  themeColor: string;
  onThemeChange: (color: string) => void;
  onBack: () => void;
  deferredPrompt: any;
  onInstall: () => Promise<void>;
}

const Profile: React.FC<ProfileProps> = ({ user, updateUser, stocks, transactions, onLogout, onRestore, language, onLanguageChange, onClearTransactions, onResetApp, customAppName, setCustomAppName, themeColor, onThemeChange, onBack, deferredPrompt, onInstall }) => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [tempAccountInput, setTempAccountInput] = useState('');
  const [showFrequencyDropdown, setShowFrequencyDropdown] = useState(false);
  
  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editAvatar, setEditAvatar] = useState(user.avatar || '');
  const [editMobile, setEditMobile] = useState(user.mobile || '');
  const [editEmail, setEditEmail] = useState(user.email || '');
  const [editAddress, setEditAddress] = useState(user.address || '');
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showAllSettings, setShowAllSettings] = useState(false);
  
  // Password Change State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Delete Account State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'CONFIRM' | 'OTP'>('CONFIRM');
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 150;
          const MAX_HEIGHT = 150;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            setEditAvatar(dataUrl);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async () => {
    setEditError('');
    setEditSuccess('');
    setIsSavingProfile(true);
    try {
      if (isSupabaseConfigured && navigator.onLine) {
        const updateData: any = {
          data: { full_name: editName, avatar_url: editAvatar, mobile: editMobile, address: editAddress }
        };
        if (editEmail && editEmail !== user.email) {
            updateData.email = editEmail;
        }
        const { error } = await supabase.auth.updateUser(updateData);
        if (error) throw error;
      }
      updateUser({ ...user, name: editName, avatar: editAvatar, mobile: editMobile, email: editEmail, address: editAddress });
      setEditSuccess(language === 'ta' ? 'சுயவிவரம் புதுப்பிக்கப்பட்டது!' : 'Profile updated successfully!');
      setTimeout(() => {
        setIsEditingProfile(false);
        setEditSuccess('');
      }, 1500);
    } catch (error: any) {
      setEditError(error.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert(language === 'ta' ? 'கடவுச்சொற்கள் பொருந்தவில்லை' : 'Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      alert(language === 'ta' ? 'கடவுச்சொல் குறைந்தது 6 எழுத்துக்கள் இருக்க வேண்டும்' : 'Password must be at least 6 characters');
      return;
    }
    
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        alert(language === 'ta' ? 'கடவுச்சொல் மாற்றப்பட்டது' : 'Password updated successfully');
        setShowPasswordModal(false);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        alert("Offline mode: Cannot update password.");
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  const initiateDeleteAccount = () => {
    // Simulate sending OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    console.log(`[Viyabaari Security] Your deletion OTP is: ${code}`);
    alert(language === 'ta' 
      ? `பாதுகாப்பு குறியீடு (OTP) உங்கள் மின்னஞ்சலுக்கு அனுப்பப்பட்டுள்ளது (Console-ஐ பார்க்கவும்: ${code})` 
      : `Security OTP sent to your email (Check Console: ${code})`);
    setDeleteStep('OTP');
  };

  const confirmDeleteAccount = async () => {
    if (otpInput !== generatedOtp) {
      alert(language === 'ta' ? 'தவறான குறியீடு' : 'Invalid OTP');
      return;
    }
    
    try {
      // 1. Mark account as deleted in Supabase Metadata
      if (isSupabaseConfigured) {
          await supabase.auth.updateUser({ data: { is_deleted: true } });
      }

      // 2. Delete User Data from tables
      if (isSupabaseConfigured && user.uid) {
        const uidKey = user.uid;
        const stocks = JSON.parse(localStorage.getItem(`viyabaari_stocks_${uidKey}`) || '[]');
        const txns = JSON.parse(localStorage.getItem(`viyabaari_txns_${uidKey}`) || '[]');
        if (stocks.length > 0) await supabase.from('stock_items').delete().in('id', stocks.map((s:any)=>s.id));
        if (txns.length > 0) await supabase.from('transactions').delete().in('id', txns.map((t:any)=>t.id));
      }
      
      // 3. Clear Local Data & Sign Out
      onResetApp();
      
      alert(language === 'ta' ? 'உங்கள் கணக்கு நீக்கப்பட்டது' : 'Your account has been deleted');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    try {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }, 100);
    } catch (e) {
        console.error("Download failed:", e);
        alert(language === 'ta' ? 'பதிவிறக்கம் தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்.' : 'Download failed. Please try again.');
    }
  };

  const exportStocks = () => {
    let csvContent = "ID,Name,Category,VariantID,Size,Quantity,Price,LastUpdated\n";
    stocks.forEach(item => {
      // Handle variants
      if (item.variants) {
          item.variants.forEach((variant, vIdx) => {
              variant.sizeStocks.forEach(ss => {
                  csvContent += `${item.id},"${item.name}",${item.category},"${vIdx + 1}","${ss.size}",${ss.quantity},${item.price},${new Date(item.lastUpdated).toISOString()}\n`;
              });
          });
      } else {
        // Fallback for old structure just in case
        csvContent += `${item.id},"${item.name}",${item.category},"Main","General",0,${item.price},${new Date(item.lastUpdated).toISOString()}\n`;
      }
    });
    downloadFile(csvContent, `Viyabaari_Stocks_${user.name}.csv`, 'text/csv;charset=utf-8;');
  };

  const exportTransactions = () => {
    let csvContent = "ID,Date,Type,Amount,Category,Description\n";
    transactions.forEach(txn => {
      csvContent += `${txn.id},${new Date(txn.date).toISOString()},${txn.type},${txn.amount},${txn.category},"${txn.description}"\n`;
    });
    downloadFile(csvContent, `Viyabaari_Accounts_${user.name}.csv`, 'text/csv;charset=utf-8;');
  };

  const performBackup = () => {
    setIsBackingUp(true);
    
    // Use requestAnimationFrame to ensure UI updates before heavy JSON operation
    requestAnimationFrame(() => {
        setTimeout(() => {
          try {
              // Check if photos should be included
              const includePhotos = user.includePhotosInBackup !== false; // Default to true if undefined
              
              const stocksToSave = includePhotos 
                ? stocks 
                : stocks.map(s => ({ 
                    ...s, 
                    variants: s.variants.map(v => ({...v, imageUrl: ''})) 
                  })); // Remove images from variants if disabled

              const backup = {
                user: { ...user, backupEmail: user.backupEmail || user.email },
                stocks: stocksToSave,
                transactions,
                timestamp: Date.now(),
                backupType: 'full'
              };
              
              const backupAccount = user.backupEmail || user.email;
              const jsonString = JSON.stringify(backup, null, 2);
              
              downloadFile(jsonString, `Viyabaari_Backup_${backupAccount}_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
              
              // Update last backup time
              updateUser({
                ...user,
                lastBackupDate: Date.now()
              });
          } catch (e) {
              console.error("Backup generation failed:", e);
              alert(language === 'ta' ? 'பேக்கப் உருவாக்குவதில் பிழை ஏற்பட்டது. புகைப்படங்கள் இல்லாமல் முயற்சிக்கவும்.' : 'Error creating backup. Try disabling photos.');
          } finally {
              setIsBackingUp(false);
          }
        }, 500); // Small delay to show "Backing up..." state
    });
  };

  const frequencyOptions = [
    { value: 'daily', label: language === 'ta' ? 'தினசரி' : 'Daily' },
    { value: 'weekly', label: language === 'ta' ? 'வாரம் ஒருமுறை' : 'Weekly' },
    { value: 'monthly', label: language === 'ta' ? 'மாதம் ஒருமுறை' : 'Monthly' },
    { value: 'never', label: language === 'ta' ? 'வேண்டாம்' : 'Never' }
  ];

  const updateFrequency = (val: string) => {
    updateUser({
      ...user,
      backupFrequency: val as BackupFrequency
    });
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          onRestore(data);
        } catch (err) {
          alert("Error parsing backup file");
        }
      };
      reader.readAsText(file);
    }
    // Reset input value so same file can be selected again
    e.target.value = '';
  };

  const formatLastBackup = (timestamp?: number) => {
    if (!timestamp) return language === 'ta' ? 'இன்னும் இல்லை' : 'Never';
    return new Date(timestamp).toLocaleString(language, {
       hour: 'numeric', minute: 'numeric', day: 'numeric', month: 'short'
    });
  };

  // Calculate approximate backup size
  const currentStocksSize = user.includePhotosInBackup !== false ? stocks : stocks.map(s => ({
      ...s, 
      variants: s.variants.map(v => ({...v, imageUrl: ''}))
  }));
  const dataSize = JSON.stringify({ user, stocks: currentStocksSize, transactions }).length;
  const sizeString = dataSize > 1024 * 1024 ? `${(dataSize / (1024 * 1024)).toFixed(2)} MB` : dataSize > 1024 ? `${(dataSize / 1024).toFixed(2)} KB` : `${dataSize} Bytes`;

  return (
    <div className="p-4 space-y-6 pb-28 md:pb-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="p-2 bg-white rounded-full shadow-sm hover:bg-zinc-50 transition">
          <ChevronLeft size={20} className="text-zinc-600" />
        </button>
        <h2 className="text-xl font-black tamil-font text-zinc-900">
          {language === 'ta' ? 'சுயவிவரம்' : 'Profile'}
        </h2>
      </div>

      {/* User Profile Header */}
      <div className="bg-white rounded-[2.5rem] p-8 text-center shadow-lg relative overflow-hidden border border-zinc-100">
        <div className="absolute top-0 right-0 p-4 opacity-5">
           <ShieldCheck size={140} className="text-zinc-900" />
        </div>
        <div className="relative z-10">
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="w-24 h-24 bg-gradient-to-br from-zinc-800 to-zinc-950 rounded-full flex items-center justify-center text-white shadow-2xl border-4 border-white overflow-hidden">
               {user.avatar ? (
                 <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                 <span className="text-3xl font-black">{user.name[0].toUpperCase()}</span>
               )}
            </div>
          </div>
          
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight">{user.name}</h2>
          <p className="text-sm text-zinc-500 font-bold mb-1">{user.email}</p>
          {user.mobile && <p className="text-sm text-zinc-400 font-medium mb-1">{user.mobile}</p>}
          {user.address && <p className="text-xs text-zinc-400 font-medium mb-4 max-w-[250px] mx-auto leading-relaxed">{user.address}</p>}
          {!user.address && <div className="mb-4"></div>}
          
          <div className="flex justify-center gap-2">
             <div className="px-4 py-2 bg-emerald-500 text-white rounded-full text-[10px] font-black flex items-center gap-2 shadow-lg shadow-emerald-100">
                <CheckCircle2 size={14}/> {language === 'ta' ? 'கணக்கு பாதுகாப்பானது' : 'Account Secured'}
             </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button 
          onClick={() => setShowAllSettings(!showAllSettings)}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-zinc-200 rounded-2xl font-black text-sm text-zinc-800 shadow-sm hover:bg-zinc-50 transition active:scale-95"
        >
          {showAllSettings ? (
            <>
              <ChevronDown size={18} className="rotate-180" />
              {language === 'ta' ? 'குறைவாகக் காட்டு' : 'Show Less'}
            </>
          ) : (
            <>
              <Settings size={18} />
              {language === 'ta' ? 'அமைப்புகள் மற்றும் விவரங்கள்' : 'Settings & Details'}
            </>
          )}
        </button>
      </div>

      {showAllSettings && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
  
        {/* Theme Color Selection */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-zinc-100 space-y-4">
          <div className="flex items-center gap-3 px-1">
            <Palette size={22} className="text-zinc-800" />
            <h3 className="font-black text-lg tamil-font text-zinc-900">
              {language === 'ta' ? 'பின்னணி நிறம்' : 'Background Color'}
            </h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { id: 'bg-zinc-50', color: 'bg-zinc-200' },
              { id: 'bg-blue-50', color: 'bg-blue-200' },
              { id: 'bg-emerald-50', color: 'bg-emerald-200' },
              { id: 'bg-rose-50', color: 'bg-rose-200' },
              { id: 'bg-amber-50', color: 'bg-amber-200' },
              { id: 'bg-indigo-50', color: 'bg-indigo-200' },
              { id: 'bg-purple-50', color: 'bg-purple-200' },
              { id: 'bg-teal-50', color: 'bg-teal-200' },
            ].map((theme) => (
              <button
                key={theme.id}
                onClick={() => onThemeChange(theme.id)}
                className={`w-12 h-12 rounded-full ${theme.color} border-4 transition-all ${themeColor === theme.id ? 'border-zinc-800 scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                aria-label={theme.id}
              />
            ))}
          </div>
        </div>

        {/* Language Selection */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-zinc-100 space-y-4">
          <div className="flex items-center gap-3 px-1">
            <Globe size={22} className="text-zinc-800" />
            <h3 className="font-black text-lg tamil-font text-zinc-900">
              {language === 'ta' ? 'மொழியை மாற்றவும்' : 'Change Language'}
            </h3>
          </div>
          <div className="flex bg-zinc-100 p-1.5 rounded-2xl">
            <button 
              onClick={() => onLanguageChange('ta')} 
              className={`flex-1 py-4 rounded-xl font-black transition-all ${language === 'ta' ? 'bg-white text-zinc-900 shadow-md' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              தமிழ்
            </button>
            <button 
              onClick={() => onLanguageChange('en')} 
              className={`flex-1 py-4 rounded-xl font-black transition-all ${language === 'en' ? 'bg-white text-zinc-900 shadow-md' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              English
            </button>
          </div>
        </div>

        {/* Update & Cache Management */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-zinc-100 space-y-4">
          <div className="flex items-center gap-3 px-1">
            <RefreshCw size={22} className="text-zinc-800" />
            <h3 className="font-black text-lg tamil-font text-zinc-900">
              {language === 'ta' ? 'அப்டேட் மற்றும் கேச்' : 'Update & Cache'}
            </h3>
          </div>
          <p className="text-xs font-bold text-zinc-500 px-1 leading-relaxed">
            {language === 'ta' 
              ? 'புதிய வசதிகள் தெரியவில்லை என்றால் அல்லது ஆப் மெதுவாக இருந்தால் கீழே உள்ள பட்டனை அழுத்தவும்.' 
              : 'If new features are not visible or the app is slow, tap the button below.'}
          </p>
          <button 
            onClick={() => {
              if (window.confirm(language === 'ta' ? 'புதிய அப்டேட்களை சரிபார்க்க ஆப் ரீஸ்டார்ட் செய்யப்படும். தொடரவா?' : 'App will restart to check for updates. Continue?')) {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(registrations => {
                    for (let registration of registrations) {
                      registration.unregister();
                    }
                    window.location.reload();
                  });
                } else {
                  window.location.reload();
                }
              }
            }}
            className="w-full py-4 bg-zinc-900 text-white rounded-xl font-black text-sm shadow-lg shadow-zinc-200 hover:bg-zinc-800 transition flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} />
            {language === 'ta' ? 'அப்டேட் சரிபார்க்க (Check Updates)' : 'Check for Updates'}
          </button>
        </div>

        {/* PWA Installation Section */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-zinc-100 space-y-4">
          <div className="flex items-center gap-3 px-1">
            <Download size={22} className="text-zinc-800" />
            <h3 className="font-black text-lg tamil-font text-zinc-900">
              {language === 'ta' ? 'ஆப்பை இன்ஸ்டால் செய்ய' : 'Install App'}
            </h3>
          </div>
          
          {window.matchMedia('(display-mode: standalone)').matches ? (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
              <CheckCircle2 className="text-emerald-500" size={20} />
              <p className="text-xs font-bold text-emerald-700">
                {language === 'ta' ? 'ஆப் ஏற்கனவே இன்ஸ்டால் செய்யப்பட்டுள்ளது!' : 'App is already installed!'}
              </p>
            </div>
          ) : deferredPrompt ? (
            <div className="space-y-4">
              <p className="text-xs font-bold text-zinc-500 px-1 leading-relaxed">
                {language === 'ta' 
                  ? 'ஆப்பை உங்கள் மொபைலில் இன்ஸ்டால் செய்து இன்னும் வேகமாகப் பயன்படுத்தலாம்.' 
                  : 'Install the app on your phone for a faster and better experience.'}
              </p>
              <button 
                onClick={onInstall}
                className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-sm shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition flex items-center justify-center gap-2"
              >
                <Download size={18} />
                {language === 'ta' ? 'இன்ஸ்டால் செய்க (Install Now)' : 'Install Now'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                <h4 className="text-xs font-black text-zinc-800 mb-2 flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  {language === 'ta' ? 'இன்ஸ்டால் செய்வது எப்படி?' : 'How to Install?'}
                </h4>
                <ul className="text-[10px] font-bold text-zinc-500 space-y-3 list-disc pl-4">
                  <li>
                    <span className="text-zinc-900 font-black">Android (Chrome):</span><br/>
                    {language === 'ta' 
                      ? 'பிரவுசரின் மேல் வலதுபுறம் உள்ள 3 புள்ளிகளைத் தொட்டு "Install App" என்பதைத் தேர்ந்தெடுக்கவும்.' 
                      : 'Tap the 3 dots in browser menu and select "Install App".'}
                  </li>
                  <li>
                    <span className="text-zinc-900 font-black">iPhone (Safari):</span><br/>
                    {language === 'ta' 
                      ? 'கீழே உள்ள "Share" பட்டனைத் தொட்டு "Add to Home Screen" என்பதைத் தேர்ந்தெடுக்கவும்.' 
                      : 'Tap the "Share" button and select "Add to Home Screen".'}
                  </li>
                  <li>
                    <span className="text-zinc-900 font-black">Desktop:</span><br/>
                    {language === 'ta' 
                      ? 'அட்ரஸ் பாரில் உள்ள "Install" ஐகானை அழுத்தவும்.' 
                      : 'Click the "Install" icon in the address bar.'}
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* WhatsApp Style Backup Section */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-md border border-zinc-100 space-y-6">
           <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
             <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                <Cloud size={24} />
             </div>
             <div>
               <h3 className="font-black text-xl tamil-font text-zinc-900">
                 {language === 'ta' ? 'தரவு பாதுகாப்பு' : 'Data Backup'}
               </h3>
               <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Backup & Restore</p>
             </div>
           </div>

           <div className="space-y-2">
              <div className="flex items-start gap-3">
                 <History size={16} className="text-zinc-400 mt-1" />
                 <div>
                    <p className="text-xs text-zinc-500 font-bold tamil-font">{language === 'ta' ? 'கடைசியாக சேமித்தது:' : 'Last Backup:'}</p>
                    <p className="text-sm font-black text-zinc-900">{formatLastBackup(user.lastBackupDate)}</p>
                 </div>
              </div>
              <div className="flex items-start gap-3">
                 <div className="w-4"></div>
                 <div>
                    <p className="text-xs text-zinc-500 font-bold tamil-font">{language === 'ta' ? 'மொத்த அளவு:' : 'Total Size:'}</p>
                    <p className="text-sm font-black text-zinc-900">{sizeString}</p>
                 </div>
              </div>
           </div>

           <button 
             onClick={performBackup} 
             disabled={isBackingUp}
             className="w-full bg-zinc-900 text-white p-4 rounded-2xl font-black text-sm shadow-lg shadow-zinc-200 hover:bg-zinc-800 transition active:scale-95 flex justify-center items-center gap-2"
           >
              {isBackingUp ? (
                 <span className="animate-pulse">{language === 'ta' ? 'ஏற்றப்படுகிறது...' : 'Backing up...'}</span>
              ) : (
                 <>{language === 'ta' ? 'பேக்கப் (BACK UP)' : 'BACK UP'}</>
              )}
           </button>

           <div className="pt-2 space-y-4">
              {/* Account Selection (Clickable) */}
              <button onClick={() => setShowAccountModal(true)} className="flex items-center justify-between p-3 bg-zinc-50 rounded-2xl w-full hover:bg-zinc-100 transition text-left">
                 <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-full shadow-sm">
                       <img src="https://cdn-icons-png.flaticon.com/512/300/300221.png" className="w-5 h-5 opacity-80" alt="Google" />
                    </div>
                    <div>
                       <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{language === 'ta' ? 'கணக்கு' : 'Google Account'}</p>
                       <p className="text-xs font-black text-zinc-800">{user.backupEmail || user.email}</p>
                    </div>
                 </div>
                 <Settings size={16} className="text-zinc-400" />
              </button>

              {/* Custom Dropdown for Backup Frequency */}
              <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-2xl relative z-20">
                 <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-zinc-400" />
                    <div>
                       <p className="text-xs font-black text-zinc-800 tamil-font">{language === 'ta' ? 'பேக்கப் நினைவூட்டல்' : 'Back up frequency'}</p>
                    </div>
                 </div>
                 
                 <div className="relative">
                    <button 
                        onClick={() => setShowFrequencyDropdown(!showFrequencyDropdown)}
                        className="flex items-center gap-2 text-xs font-bold text-zinc-800 outline-none"
                    >
                        <span>{frequencyOptions.find(o => o.value === (user.backupFrequency || 'weekly'))?.label}</span>
                        <ChevronDown size={14} className={`transition-transform ${showFrequencyDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showFrequencyDropdown && (
                        <div className="absolute top-full right-0 mt-2 w-40 bg-white border border-zinc-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                            {frequencyOptions.map(opt => (
                                <div 
                                    key={opt.value}
                                    onClick={() => {
                                        updateFrequency(opt.value);
                                        setShowFrequencyDropdown(false);
                                    }}
                                    className={`px-4 py-3 text-xs font-bold cursor-pointer hover:bg-zinc-100 border-b border-zinc-50 last:border-0 ${user.backupFrequency === opt.value ? 'text-zinc-900 bg-zinc-100' : 'text-zinc-600'}`}
                                >
                                    {opt.label}
                                </div>
                            ))}
                        </div>
                    )}
                 </div>
                 {/* Backdrop to close */}
                 {showFrequencyDropdown && (
                    <div className="fixed inset-0 z-[-1]" onClick={() => setShowFrequencyDropdown(false)}></div>
                 )}
              </div>

              {/* Include Photos Toggle */}
              <button 
                 onClick={() => updateUser({...user, includePhotosInBackup: user.includePhotosInBackup === false ? true : false})}
                 className="flex items-center justify-between p-3 bg-zinc-50 rounded-2xl w-full"
              >
                  <div className="flex items-center gap-3">
                      <Image size={18} className="text-zinc-400" />
                      <div>
                         <p className="text-xs font-black text-zinc-800 tamil-font">{language === 'ta' ? 'படங்களை சேர்க்கவும்' : 'Include Photos'}</p>
                         <p className="text-[10px] text-zinc-500 font-bold">{language === 'ta' ? 'மொத்த அளவு அதிகரிக்கும்' : 'Increases backup size'}</p>
                      </div>
                  </div>
                  <div className={`transition-colors ${user.includePhotosInBackup !== false ? 'text-emerald-500' : 'text-zinc-300'}`}>
                      {user.includePhotosInBackup !== false ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                  </div>
              </button>
              
              <div className="border-t border-zinc-100 pt-4">
                 <label className="flex items-center justify-center gap-2 w-full p-4 border border-zinc-200 text-zinc-800 rounded-2xl font-bold text-xs cursor-pointer hover:bg-zinc-100 transition">
                    <UploadCloud size={16} />
                    <span>{language === 'ta' ? 'பேக்கப் ஃபைலை மீட்டெடுக்க (Restore)' : 'Restore from Backup File'}</span>
                    <input type="file" onChange={handleFileRestore} accept=".json" className="hidden" />
                 </label>
              </div>
           </div>
        </div>

        {/* Export Excel Reports */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-lg border border-zinc-100 space-y-4">
          <div className="flex items-center gap-3 px-1 border-b border-zinc-100 pb-3">
             <HardDriveDownload size={22} className="text-zinc-400" />
             <h3 className="font-bold text-zinc-600 tamil-font">Excel Reports</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            <button 
              onClick={exportStocks} 
              className="flex items-center gap-4 p-4 bg-zinc-50 rounded-2xl hover:bg-zinc-100 transition-colors group"
            >
              <div className="bg-white p-3 rounded-xl shadow-sm text-zinc-800 group-hover:text-zinc-900">
                 <FileSpreadsheet size={20} />
              </div>
              <span className="font-bold text-zinc-800 text-sm">
                {language === 'ta' ? 'சரக்கு பட்டியல் (Excel)' : 'Inventory Stock (Excel)'}
              </span>
            </button>
            
            <button 
              onClick={exportTransactions} 
              className="flex items-center gap-4 p-4 bg-zinc-50 rounded-2xl hover:bg-zinc-100 transition-colors group"
            >
              <div className="bg-white p-3 rounded-xl shadow-sm text-zinc-800 group-hover:text-zinc-900">
                 <Download size={20} />
              </div>
              <span className="font-bold text-zinc-800 text-sm">
                {language === 'ta' ? 'வரவு செலவு (Excel)' : 'Account Ledger (Excel)'}
              </span>
            </button>
          </div>
        </div>

      </div>
      )}

      {/* Logout Button */}
        <button 
          onClick={onLogout} 
          className="w-full bg-rose-50 p-6 rounded-[1.5rem] shadow-sm flex items-center justify-center gap-4 text-rose-600 font-black border border-rose-100 hover:bg-rose-100 transition active:scale-[0.98]"
        >
          <LogOut size={24} />
          <span className="uppercase tracking-widest text-sm">{language === 'ta' ? 'வெளியேறவும்' : 'Logout'}</span>
        </button>

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center mb-2">
                 <h3 className="font-black text-lg text-zinc-900 tamil-font">{language === 'ta' ? 'சுயவிவரம் மாற்ற' : 'Edit Profile'}</h3>
                 <button onClick={() => setIsEditingProfile(false)} className="p-2 bg-zinc-100 rounded-full"><X size={16}/></button>
              </div>
              
              <div className="flex justify-center mb-4">
                 <label className="relative cursor-pointer group">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-zinc-100 group-hover:border-zinc-300 transition">
                       {editAvatar ? (
                           <img src={editAvatar} className="w-full h-full object-cover" alt="Avatar" />
                       ) : (
                           <div className="w-full h-full bg-zinc-50 flex items-center justify-center text-zinc-400"><UserIcon size={40}/></div>
                       )}
                    </div>
                    <div className="absolute bottom-0 right-0 bg-zinc-900 p-2 rounded-full text-white shadow-md">
                       <Camera size={14} />
                    </div>
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                 </label>
              </div>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto px-1 pb-2">
                 <div>
                   <label className="text-xs font-bold text-zinc-500 ml-1">{language === 'ta' ? 'பெயர்' : 'Name'}</label>
                   <input 
                     value={editName}
                     onChange={(e) => setEditName(e.target.value)}
                     className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-zinc-200"
                   />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-zinc-500 ml-1">{language === 'ta' ? 'போன் நம்பர்' : 'Phone Number'}</label>
                   <input 
                     value={editMobile}
                     onChange={(e) => setEditMobile(e.target.value)}
                     className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-zinc-200"
                   />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-zinc-500 ml-1">{language === 'ta' ? 'இமெயில்' : 'Email'}</label>
                   <input 
                     value={editEmail}
                     onChange={(e) => setEditEmail(e.target.value)}
                     className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-zinc-200"
                   />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-zinc-500 ml-1">{language === 'ta' ? 'முகவரி' : 'Address'}</label>
                   <textarea 
                     value={editAddress}
                     onChange={(e) => setEditAddress(e.target.value)}
                     rows={3}
                     className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-zinc-200 resize-none"
                   />
                 </div>
              </div>

              {editError && <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold border border-rose-100">{editError}</div>}
              {editSuccess && <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-bold border border-emerald-100">{editSuccess}</div>}

              <button 
                onClick={handleUpdateProfile} 
                disabled={isSavingProfile}
                className={`w-full bg-zinc-900 text-white p-4 rounded-xl font-black mt-4 shadow-lg shadow-zinc-200 ${isSavingProfile ? 'opacity-50 cursor-not-allowed' : 'hover:bg-zinc-800'}`}
              >
                 {isSavingProfile ? (language === 'ta' ? 'சேமிக்கப்படுகிறது...' : 'Saving...') : (language === 'ta' ? 'சேமிக்க' : 'Save Changes')}
              </button>
           </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center mb-2">
                 <h3 className="font-black text-lg text-zinc-900 tamil-font">{language === 'ta' ? 'கடவுச்சொல் மாற்ற' : 'Change Password'}</h3>
                 <button onClick={() => setShowPasswordModal(false)} className="p-2 bg-zinc-100 rounded-full"><X size={16}/></button>
              </div>
              
              <div className="space-y-3">
                 <div>
                    <label className="text-xs font-bold text-zinc-500 ml-1">{language === 'ta' ? 'புதிய கடவுச்சொல்' : 'New Password'}</label>
                    <input 
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-zinc-200"
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-zinc-500 ml-1">{language === 'ta' ? 'மீண்டும் உள்ளிடவும்' : 'Confirm Password'}</label>
                    <input 
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-zinc-200"
                    />
                 </div>
              </div>

              <button onClick={handleChangePassword} className="w-full bg-zinc-900 text-white p-4 rounded-xl font-black mt-4 shadow-lg shadow-zinc-200">
                 {language === 'ta' ? 'மாற்றுக' : 'Update Password'}
              </button>
           </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl space-y-4 border-2 border-rose-100">
              <div className="flex justify-between items-center mb-2">
                 <h3 className="font-black text-lg text-rose-600 tamil-font flex items-center gap-2">
                    <AlertTriangle size={20} />
                    {language === 'ta' ? 'கணக்கை நீக்க' : 'Delete Account'}
                 </h3>
                 <button onClick={() => setShowDeleteModal(false)} className="p-2 bg-zinc-100 rounded-full"><X size={16}/></button>
              </div>

              {deleteStep === 'CONFIRM' ? (
                  <div className="space-y-4">
                      <p className="text-sm font-bold text-zinc-600 leading-relaxed">
                          {language === 'ta' 
                            ? 'உங்கள் கணக்கு மற்றும் அனைத்து தரவுகளும் நிரந்தரமாக நீக்கப்படும். இதை மீட்டெடுக்க முடியாது.' 
                            : 'Your account and all data will be permanently deleted. This action cannot be undone.'}
                      </p>
                      <button onClick={initiateDeleteAccount} className="w-full bg-rose-600 text-white p-4 rounded-xl font-black shadow-lg shadow-rose-200 hover:bg-rose-700 transition">
                          {language === 'ta' ? 'தொடரவும் (Send OTP)' : 'Proceed (Send OTP)'}
                      </button>
                  </div>
              ) : (
                  <div className="space-y-4">
                      <div className="bg-zinc-50 p-4 rounded-xl flex items-center gap-3">
                          <Mail className="text-zinc-600" size={24} />
                          <div>
                              <p className="text-xs font-bold text-zinc-900">{language === 'ta' ? 'மின்னஞ்சலை பார்க்கவும்' : 'Check your Email'}</p>
                              <p className="text-[10px] text-zinc-500 font-bold">{user.email}</p>
                          </div>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-zinc-500 ml-1">{language === 'ta' ? 'OTP குறியீடு' : 'Enter OTP Code'}</label>
                          <input 
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value)}
                            placeholder="123456"
                            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black text-center text-xl tracking-widest outline-none focus:ring-2 focus:ring-rose-100"
                          />
                      </div>
                      <button onClick={confirmDeleteAccount} className="w-full bg-rose-600 text-white p-4 rounded-xl font-black shadow-lg shadow-rose-200 hover:bg-rose-700 transition">
                          {language === 'ta' ? 'உறுதிப்படுத்தவும்' : 'Confirm Deletion'}
                      </button>
                  </div>
              )}
           </div>
        </div>
      )}

      {/* Account Selection Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center mb-2">
                 <h3 className="font-black text-lg text-zinc-900 tamil-font">{language === 'ta' ? 'கணக்கை தேர்வு செய்க' : 'Choose an Account'}</h3>
                 <button onClick={() => setShowAccountModal(false)} className="p-2 bg-zinc-100 rounded-full"><X size={16}/></button>
              </div>
              
              <div className="space-y-2">
                 {/* Default Account */}
                 <button onClick={() => { updateUser({...user, backupEmail: user.email}); setShowAccountModal(false); }} className={`flex items-center gap-3 w-full p-4 rounded-xl border-2 transition ${!user.backupEmail || user.backupEmail === user.email ? 'border-emerald-500 bg-emerald-50' : 'border-transparent bg-zinc-50'}`}>
                    <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-800 font-bold">{user.email[0].toUpperCase()}</div>
                    <div className="text-left">
                       <p className="font-bold text-sm text-zinc-900">{user.email}</p>
                       <p className="text-[10px] text-zinc-500">Device Account</p>
                    </div>
                    {(!user.backupEmail || user.backupEmail === user.email) && <CheckCircle2 size={20} className="ml-auto text-emerald-500" />}
                 </button>

                 {/* Selected Custom Account (if any) */}
                 {user.backupEmail && user.backupEmail !== user.email && (
                    <button onClick={() => setShowAccountModal(false)} className="flex items-center gap-3 w-full p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50">
                       <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold">{user.backupEmail[0].toUpperCase()}</div>
                       <div className="text-left">
                          <p className="font-bold text-sm text-zinc-900">{user.backupEmail}</p>
                          <p className="text-[10px] text-zinc-500">Backup Account</p>
                       </div>
                       <CheckCircle2 size={20} className="ml-auto text-emerald-500" />
                    </button>
                 )}

                 <div className="border-t pt-4 mt-2">
                    <p className="text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wide">{language === 'ta' ? 'வேறு கணக்கை சேர்க்க' : 'Add another account'}</p>
                    <div className="flex gap-2">
                       <input 
                         value={tempAccountInput}
                         onChange={(e) => setTempAccountInput(e.target.value)}
                         placeholder="email@example.com"
                         className="flex-1 p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold outline-none focus:border-zinc-400"
                       />
                       <button 
                         onClick={() => { 
                           if(tempAccountInput) {
                             updateUser({...user, backupEmail: tempAccountInput}); 
                             setTempAccountInput('');
                             setShowAccountModal(false); 
                           }
                         }} 
                         className="bg-zinc-900 text-white px-4 rounded-xl font-bold text-sm"
                       >
                         {language === 'ta' ? 'சேர்' : 'Add'}
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
