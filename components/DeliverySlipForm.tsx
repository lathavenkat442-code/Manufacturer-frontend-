import React, { useState, useEffect } from 'react';
import { User, Weaver, Warper, CompanyProfile, DeliverySlip, DeliverySlipItem, YarnDispatch, YarnEntry } from '../types';
import { ArrowLeft, Plus, Trash2, Save, Printer } from 'lucide-react';
import { YARN_TYPES, YARN_COLORS } from '../constants';

interface DeliverySlipFormProps {
  user: User;
  language: 'ta' | 'en';
  type: 'warper' | 'weaver';
  initialCategory?: 'warp' | 'weft' | 'zari';
  onBack: () => void;
}

const DeliverySlipForm: React.FC<DeliverySlipFormProps> = ({ user, language, type, initialCategory, onBack }) => {
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<CompanyProfile>({
    name: '',
    tamilName: '',
    gstin: '',
    phone: '',
    address: ''
  });

  const [recipients, setRecipients] = useState<(Weaver | Warper)[]>([]);
  const [slips, setSlips] = useState<DeliverySlip[]>([]);
  const [dispatches, setDispatches] = useState<YarnDispatch[]>([]);
  const [entries, setEntries] = useState<YarnEntry[]>([]);

  const [slipDate, setSlipDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedRecipientId, setSelectedRecipientId] = useState('');
  const [items, setItems] = useState<DeliverySlipItem[]>([
    { id: Date.now().toString(), yarnType: '', color: '', weightKg: 0, count: 0, yarnCategory: initialCategory || (type === 'warper' ? 'warp' : 'weft') }
  ]);

  useEffect(() => {
    const savedProfile = localStorage.getItem(`viyabaari_company_profile_${user.uid || 'guest'}`);
    if (savedProfile) {
      const parsed = JSON.parse(savedProfile);
      setCompanyProfile(parsed);
      setProfileForm(parsed);
    } else {
      setIsEditingProfile(true);
    }

    const savedRecipients = localStorage.getItem(`viyabaari_${type}s_${user.uid || 'guest'}`);
    if (savedRecipients) setRecipients(JSON.parse(savedRecipients));

    const savedSlips = localStorage.getItem(`viyabaari_delivery_slips_${user.uid || 'guest'}`);
    if (savedSlips) setSlips(JSON.parse(savedSlips));

    const savedDispatches = localStorage.getItem(`viyabaari_yarn_dispatches_${user.uid || 'guest'}`);
    if (savedDispatches) setDispatches(JSON.parse(savedDispatches));

    const savedEntries = localStorage.getItem(`viyabaari_yarn_entries_${user.uid || 'guest'}`);
    if (savedEntries) setEntries(JSON.parse(savedEntries));
  }, [user.uid, type]);

  const nextSlipNumber = slips.length > 0 ? Math.max(...slips.map(s => s.slipNumber)) + 1 : 1;

  const handleSaveProfile = () => {
    setCompanyProfile(profileForm);
    localStorage.setItem(`viyabaari_company_profile_${user.uid || 'guest'}`, JSON.stringify(profileForm));
    setIsEditingProfile(false);
  };

  const handleAddItem = () => {
    setItems([...items, { id: Date.now().toString(), yarnType: '', color: '', weightKg: 0, count: 0, yarnCategory: initialCategory || (type === 'warper' ? 'warp' : 'weft') }]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof DeliverySlipItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSaveSlip = () => {
    if (!selectedRecipientId) {
      alert(language === 'ta' ? 'பெயரை தேர்ந்தெடுக்கவும்' : 'Please select a name');
      return;
    }

    const validItems = items.filter(item => item.yarnType && item.color && item.weightKg > 0);
    if (validItems.length === 0) {
      alert(language === 'ta' ? 'குறைந்தபட்சம் ஒரு பொருளையாவது சேர்க்கவும்' : 'Please add at least one valid item');
      return;
    }

    // Check Stock
    const requiredStock: Record<string, number> = {};
    for (const item of validItems) {
      const key = `${item.yarnCategory}_${item.yarnType}_${item.color}`;
      requiredStock[key] = (requiredStock[key] || 0) + item.weightKg;
    }

    for (const key in requiredStock) {
      const [cat, type, col] = key.split('_');
      const received = entries.filter(e => e.yarnCategory === cat && e.yarnType === type && e.color === col).reduce((sum, e) => sum + e.weightKg, 0);
      const dispatched = dispatches.filter(d => d.yarnCategory === cat && d.yarnType === type && d.color === col).reduce((sum, d) => sum + d.weightKg, 0);
      const available = received - dispatched;

      if (requiredStock[key] > available) {
        alert(language === 'ta' ? `${type} - ${col} ஸ்டாக் இல்லை! (மீதம்: ${available} kg)` : `Out of stock for ${type} - ${col}! (Available: ${available} kg)`);
        return;
      }
    }

    const newSlip: DeliverySlip = {
      id: Date.now().toString(),
      slipNumber: nextSlipNumber,
      date: slipDate,
      recipientType: type,
      recipientId: selectedRecipientId,
      items: validItems,
      createdAt: Date.now()
    };

    const updatedSlips = [...slips, newSlip];
    setSlips(updatedSlips);
    localStorage.setItem(`viyabaari_delivery_slips_${user.uid || 'guest'}`, JSON.stringify(updatedSlips));

    // Create YarnDispatches
    const newDispatches: YarnDispatch[] = validItems.map(item => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      date: slipDate,
      recipientType: type,
      recipientId: selectedRecipientId,
      yarnCategory: item.yarnCategory,
      yarnType: item.yarnType,
      color: item.color,
      weightKg: item.weightKg,
      createdAt: Date.now()
    }));

    const updatedDispatches = [...dispatches, ...newDispatches];
    setDispatches(updatedDispatches);
    localStorage.setItem(`viyabaari_yarn_dispatches_${user.uid || 'guest'}`, JSON.stringify(updatedDispatches));

    alert(language === 'ta' ? 'டெலிவரி ஸ்லிப் சேமிக்கப்பட்டது!' : 'Delivery slip saved!');
    onBack();
  };

  if (isEditingProfile) {
    return (
      <div className="p-4 pb-24 md:pb-4 md:max-w-none mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-3 mb-6">
          {companyProfile && (
            <button onClick={() => setIsEditingProfile(false)} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition">
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
          )}
          <h2 className="text-xl font-black tamil-font text-gray-800">
            {language === 'ta' ? 'கம்பெனி விவரங்கள்' : 'Company Profile'}
          </h2>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
          <input 
            type="text" 
            placeholder={language === 'ta' ? 'கம்பெனி பெயர் (English)' : 'Company Name (English)'}
            value={profileForm.name}
            onChange={e => setProfileForm({...profileForm, name: e.target.value})}
            className="w-full p-4 bg-gray-50 rounded-2xl outline-none border border-gray-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 font-bold"
          />
          <input 
            type="text" 
            placeholder={language === 'ta' ? 'கம்பெனி பெயர் (தமிழ்)' : 'Company Name (Tamil)'}
            value={profileForm.tamilName}
            onChange={e => setProfileForm({...profileForm, tamilName: e.target.value})}
            className="w-full p-4 bg-gray-50 rounded-2xl outline-none border border-gray-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 font-bold tamil-font"
          />
          <input 
            type="text" 
            placeholder="GSTIN"
            value={profileForm.gstin}
            onChange={e => setProfileForm({...profileForm, gstin: e.target.value})}
            className="w-full p-4 bg-gray-50 rounded-2xl outline-none border border-gray-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 font-bold"
          />
          <input 
            type="text" 
            placeholder={language === 'ta' ? 'போன் நம்பர்' : 'Phone Number'}
            value={profileForm.phone}
            onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
            className="w-full p-4 bg-gray-50 rounded-2xl outline-none border border-gray-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 font-bold"
          />
          <textarea 
            placeholder={language === 'ta' ? 'முகவரி' : 'Address'}
            value={profileForm.address}
            onChange={e => setProfileForm({...profileForm, address: e.target.value})}
            className="w-full p-4 bg-gray-50 rounded-2xl outline-none border border-gray-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 font-bold resize-none h-24"
          />
          <button onClick={handleSaveProfile} className="w-full py-4 bg-zinc-900 text-white font-black rounded-2xl shadow-lg hover:bg-zinc-800 transition">
            {language === 'ta' ? 'சேமி' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 pb-24 md:pb-4 max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h2 className="text-xl font-black tamil-font text-gray-800">
            {type === 'warper' ? (language === 'ta' ? 'வார்ப்பு டெலிவரி ஸ்லிப்' : 'Warper Delivery Slip') : (language === 'ta' ? 'தறி டெலிவரி ஸ்லிப்' : 'Weaver Delivery Slip')}
          </h2>
        </div>
        <button onClick={() => setIsEditingProfile(true)} className="text-xs font-bold text-zinc-700 bg-zinc-100 px-3 py-1.5 rounded-full hover:bg-zinc-200 transition">
          {language === 'ta' ? 'எடிட் கம்பெனி' : 'Edit Company'}
        </button>
      </div>

      <div className="bg-blue-50/50 p-4 sm:p-6 rounded-3xl border border-blue-100 shadow-sm relative overflow-hidden">
        {/* Slip Header */}
        <div className="text-center mb-6 border-b border-blue-200 pb-4">
          <div className="flex justify-between text-xs font-bold text-blue-800 mb-2">
            <span>GSTIN: {companyProfile?.gstin || '-'}</span>
            <span>Cell: {companyProfile?.phone || '-'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-blue-900 mb-1">{companyProfile?.name || 'COMPANY NAME'}</h1>
          <h2 className="text-lg sm:text-xl font-bold text-blue-800 tamil-font mb-2">{companyProfile?.tamilName || 'கம்பெனி பெயர்'}</h2>
          <p className="text-xs font-medium text-blue-700">{companyProfile?.address || 'Address'}</p>
        </div>

        {/* Slip Details */}
        <div className="flex justify-between items-center mb-4 text-sm font-bold text-blue-900">
          <div className="flex items-center gap-2">
            <span className="text-blue-700">No.</span>
            <span className="text-lg">{nextSlipNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-700">Date:</span>
            <input 
              type="date" 
              value={slipDate}
              onChange={e => setSlipDate(e.target.value)}
              className="bg-white border border-blue-200 rounded-lg px-2 py-1 outline-none focus:border-blue-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <span className="text-blue-700 font-bold">M/s.</span>
          <select 
            value={selectedRecipientId}
            onChange={e => setSelectedRecipientId(e.target.value)}
            className="flex-1 bg-white border border-blue-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 font-bold text-blue-900"
          >
            <option value="">{language === 'ta' ? 'பெயரை தேர்ந்தெடுக்கவும்' : 'Select Name'}</option>
            {recipients.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-2xl border border-blue-200 overflow-hidden mb-4">
          <div className="grid grid-cols-12 bg-blue-100 text-blue-900 font-bold text-xs sm:text-sm text-center border-b border-blue-200">
            <div className="col-span-5 p-2 border-r border-blue-200">{language === 'ta' ? 'விவரம் (நூல் & கலர்)' : 'Particulars'}</div>
            <div className="col-span-3 p-2 border-r border-blue-200">{language === 'ta' ? 'எடை/கிலோ' : 'Weight'}</div>
            <div className="col-span-3 p-2 border-r border-blue-200">{language === 'ta' ? 'உருவு' : 'Count'}</div>
            <div className="col-span-1 p-2"></div>
          </div>
          
          {items.map((item, index) => (
            <div key={item.id} className="grid grid-cols-12 border-b border-blue-100 last:border-0 items-center">
              <div className="col-span-5 p-2 border-r border-blue-100 space-y-2">
                <select 
                  value={item.yarnType}
                  onChange={e => handleItemChange(item.id, 'yarnType', e.target.value)}
                  className="w-full bg-gray-50 rounded p-1.5 text-xs sm:text-sm font-bold outline-none focus:bg-blue-50"
                >
                  <option value="">{language === 'ta' ? 'நூல் வகை' : 'Yarn Type'}</option>
                  {YARN_TYPES.map(yt => (
                    <option key={yt} value={yt}>{yt}</option>
                  ))}
                </select>
                <select 
                  value={item.color}
                  onChange={e => handleItemChange(item.id, 'color', e.target.value)}
                  className="w-full bg-gray-50 rounded p-1.5 text-xs sm:text-sm font-bold outline-none focus:bg-blue-50"
                >
                  <option value="">{language === 'ta' ? 'கலர்' : 'Color'}</option>
                  {YARN_COLORS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  value={item.yarnCategory}
                  onChange={e => handleItemChange(item.id, 'yarnCategory', e.target.value)}
                  className="w-full bg-gray-50 rounded p-1 text-xs font-bold outline-none focus:bg-blue-50 text-blue-700"
                >
                  <option value="warp">{language === 'ta' ? 'வார்ப்பு' : 'Warp'}</option>
                  <option value="weft">{language === 'ta' ? 'ஊடை' : 'Weft'}</option>
                  <option value="zari">{language === 'ta' ? 'ஜரிகை' : 'Zari'}</option>
                </select>
              </div>
              <div className="col-span-3 p-2 border-r border-blue-100 h-full">
                <input 
                  type="number" 
                  placeholder="0"
                  value={item.weightKg || ''}
                  onChange={e => handleItemChange(item.id, 'weightKg', parseFloat(e.target.value) || 0)}
                  className="w-full h-full text-center bg-transparent text-sm font-bold outline-none"
                />
              </div>
              <div className="col-span-3 p-2 border-r border-blue-100 h-full">
                <input 
                  type="number" 
                  placeholder="0"
                  value={item.count || ''}
                  onChange={e => handleItemChange(item.id, 'count', parseFloat(e.target.value) || 0)}
                  className="w-full h-full text-center bg-transparent text-sm font-bold outline-none"
                />
              </div>
              <div className="col-span-1 p-2 flex justify-center">
                {items.length > 1 && (
                  <button onClick={() => handleRemoveItem(item.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={handleAddItem}
          className="w-full py-3 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-600 font-bold text-sm hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 mb-6"
        >
          <Plus size={16} /> {language === 'ta' ? 'புதிய வரிசை சேர்' : 'Add Row'}
        </button>

        <div className="flex gap-4">
          <button 
            onClick={handleSaveSlip}
            className="flex-1 bg-rose-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-rose-100 hover:bg-rose-700 hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Save size={20} /> {language === 'ta' ? 'சேமி & வரவு வை' : 'Save & Credit'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeliverySlipForm;
