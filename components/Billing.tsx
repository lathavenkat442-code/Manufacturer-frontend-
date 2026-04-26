import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, FileText, Search, Printer, CheckCircle, Clock } from 'lucide-react';
import { User, StockItem, Invoice, InvoiceItem, Customer } from '../types';

interface BillingProps {
  user: User;
  language: 'en' | 'ta';
  stocks: StockItem[];
  onBack: () => void;
  onAddTransaction: (txn: any) => void;
  onUpdateStock: (stockId: string, variantId: string, size: string, quantityToReduce: number) => void;
}

export default function Billing({ user, language, stocks, onBack, onAddTransaction, onUpdateStock }: BillingProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  // Sync sub-views with browser history to handle hardware back button
  useEffect(() => {
    const handlePopState = () => {
      if (isAdding) setIsAdding(false);
      if (viewInvoice) setViewInvoice(null);
    };

    if (isAdding || viewInvoice) {
      window.history.pushState({ subview: true }, '');
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAdding, viewInvoice]);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);

  useEffect(() => {
    const savedInvoices = localStorage.getItem(`viyabaari_invoices_${user.uid || 'guest'}`);
    if (savedInvoices) setInvoices(JSON.parse(savedInvoices));

    const savedCustomers = localStorage.getItem(`viyabaari_customers_${user.uid || 'guest'}`);
    if (savedCustomers) setCustomers(JSON.parse(savedCustomers));
  }, [user.uid]);

  const saveInvoices = (newInvoices: Invoice[]) => {
    setInvoices(newInvoices);
    localStorage.setItem(`viyabaari_invoices_${user.uid || 'guest'}`, JSON.stringify(newInvoices));
  };

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), stockId: '', variantId: '', name: '', size: '', quantity: 1, rate: 0, amount: 0 }]);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    const item = newItems[index];
    
    if (field === 'stockId') {
      const stock = stocks.find(s => s.id === value);
      if (stock) {
        item.stockId = stock.id;
        item.name = stock.name;
        item.rate = stock.price;
        // Auto-select first variant and size if available
        if (stock.variants.length > 0) {
          item.variantId = stock.variants[0].id;
          if (stock.variants[0].sizeStocks.length > 0) {
            item.size = stock.variants[0].sizeStocks[0].size;
          }
        }
      }
    } else {
      (item as any)[field] = value;
    }

    if (field === 'quantity' || field === 'rate' || field === 'stockId') {
      item.amount = Number(item.quantity) * Number(item.rate);
    }

    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const taxAmount = (subtotal - discount) * (taxPercent / 100);
  const total = subtotal - discount + taxAmount;

  const handleSaveInvoice = () => {
    if (!selectedCustomerId || items.length === 0) {
      alert(language === 'ta' ? 'வாடிக்கையாளர் மற்றும் பொருட்களை தேர்ந்தெடுக்கவும்' : 'Please select customer and add items');
      return;
    }

    if (isNaN(discount) || isNaN(taxPercent) || isNaN(paidAmount)) {
      alert(language === 'ta' ? 'சரியான எண்களை உள்ளிடவும்' : 'Please enter valid numbers');
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) return;

    const newInvoice: Invoice = {
      id: Date.now().toString(),
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      customerId: customer.id,
      customerName: customer.name,
      date: new Date().toISOString(),
      items,
      subtotal,
      discount,
      tax: taxAmount,
      total,
      paidAmount,
      status: paidAmount >= total ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID',
      createdAt: Date.now()
    };

    saveInvoices([newInvoice, ...invoices]);

    // Update stock quantities
    items.forEach(item => {
      if (item.stockId && item.variantId && item.size) {
        onUpdateStock(item.stockId, item.variantId, item.size, item.quantity);
      }
    });

    // Add transaction if paid
    if (paidAmount > 0) {
      onAddTransaction({
        id: Date.now().toString(),
        type: 'INCOME',
        amount: paidAmount,
        category: 'Sales',
        partyName: customer.name,
        description: `Invoice ${newInvoice.invoiceNumber}`,
        date: Date.now()
      });
    }

    setIsAdding(false);
    setItems([]);
    setSelectedCustomerId('');
    setDiscount(0);
    setTaxPercent(0);
    setPaidAmount(0);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredInvoices = invoices.filter(i => 
    i.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (viewInvoice) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto bg-white min-h-screen">
        <div className="flex items-center justify-between mb-8 print:hidden">
          <button onClick={() => setViewInvoice(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-zinc-600" />
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-xl font-bold hover:bg-zinc-800 transition-colors">
            <Printer size={18} />
            {language === 'ta' ? 'பிரிண்ட்' : 'Print'}
          </button>
        </div>

        <div className="border border-zinc-200 rounded-2xl p-8 print:border-none print:p-0">
          <div className="flex justify-between items-start mb-8 border-b pb-8">
            <div>
              <h1 className="text-3xl font-black text-zinc-900 mb-2">INVOICE</h1>
              <p className="text-zinc-500 font-medium">#{viewInvoice.invoiceNumber}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-zinc-900">{new Date(viewInvoice.createdAt).toLocaleDateString()}</p>
              <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold mt-2 ${
                viewInvoice.status === 'PAID' ? 'bg-green-100 text-green-700' :
                viewInvoice.status === 'PARTIAL' ? 'bg-orange-100 text-orange-700' :
                'bg-red-100 text-red-700'
              }`}>
                {viewInvoice.status === 'PAID' && <CheckCircle size={14} />}
                {viewInvoice.status === 'PARTIAL' && <Clock size={14} />}
                {viewInvoice.status}
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">Bill To:</h3>
            <p className="text-lg font-bold text-zinc-900">{viewInvoice.customerName}</p>
          </div>

          <table className="w-full mb-8 text-left">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="py-3 font-bold text-zinc-500">Item</th>
                <th className="py-3 font-bold text-zinc-500">Size</th>
                <th className="py-3 font-bold text-zinc-500 text-right">Qty</th>
                <th className="py-3 font-bold text-zinc-500 text-right">Rate</th>
                <th className="py-3 font-bold text-zinc-500 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {viewInvoice.items.map((item, idx) => (
                <tr key={idx} className="border-b border-zinc-100">
                  <td className="py-4 font-medium text-zinc-900">{item.name}</td>
                  <td className="py-4 text-zinc-600">{item.size}</td>
                  <td className="py-4 text-right text-zinc-900">{item.quantity}</td>
                  <td className="py-4 text-right text-zinc-900">₹{item.rate}</td>
                  <td className="py-4 text-right font-bold text-zinc-900">₹{item.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal</span>
                <span>₹{viewInvoice.subtotal}</span>
              </div>
              {viewInvoice.discount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Discount</span>
                  <span>-₹{viewInvoice.discount}</span>
                </div>
              )}
              {viewInvoice.tax > 0 && (
                <div className="flex justify-between text-zinc-600">
                  <span>Tax</span>
                  <span>₹{viewInvoice.tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-black text-zinc-900 border-t pt-3">
                <span>Total</span>
                <span>₹{viewInvoice.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-600 font-bold border-t pt-3">
                <span>Paid</span>
                <span>₹{viewInvoice.paidAmount}</span>
              </div>
              <div className="flex justify-between text-red-600 font-bold">
                <span>Balance</span>
                <span>₹{(viewInvoice.total - viewInvoice.paidAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isAdding) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-zinc-600" />
          </button>
          <h2 className="text-2xl font-black tamil-font text-zinc-800">{language === 'ta' ? 'புதிய பில்' : 'New Invoice'}</h2>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-100 space-y-6">
          <div>
            <label className="block text-sm font-bold text-zinc-500 mb-2">{language === 'ta' ? 'வாடிக்கையாளர்' : 'Customer'}</label>
            <select 
              value={selectedCustomerId} 
              onChange={e => setSelectedCustomerId(e.target.value)}
              className="w-full bg-zinc-50 p-4 rounded-2xl font-bold outline-none border focus:border-zinc-300"
            >
              <option value="">{language === 'ta' ? 'தேர்ந்தெடுக்கவும்' : 'Select Customer'}</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-bold text-zinc-500">{language === 'ta' ? 'பொருட்கள்' : 'Items'}</label>
              <button onClick={addItem} className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full flex items-center gap-1">
                <Plus size={16} /> Add Item
              </button>
            </div>
            
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="flex flex-wrap gap-3 items-end bg-zinc-50 p-4 rounded-2xl border border-zinc-100 relative">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Product</label>
                    <select 
                      value={item.stockId} 
                      onChange={e => updateItem(index, 'stockId', e.target.value)}
                      className="w-full bg-white p-3 rounded-xl font-bold outline-none border focus:border-zinc-300"
                    >
                      <option value="">Select Product</option>
                      {stocks.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {item.stockId && (
                    <>
                      <div className="w-full sm:w-32">
                        <label className="block text-xs font-bold text-zinc-500 mb-1">Variant/Size</label>
                        <select 
                          value={`${item.variantId}|${item.size}`} 
                          onChange={e => {
                            const [vId, sz] = e.target.value.split('|');
                            const newItems = [...items];
                            newItems[index].variantId = vId;
                            newItems[index].size = sz;
                            setItems(newItems);
                          }}
                          className="w-full bg-white p-3 rounded-xl font-bold outline-none border focus:border-zinc-300"
                        >
                          {stocks.find(s => s.id === item.stockId)?.variants.map(v => 
                            v.sizeStocks.map(sz => (
                              <option key={`${v.id}|${sz.size}`} value={`${v.id}|${sz.size}`}>
                                {sz.size} {sz.color ? `(${sz.color})` : ''} - Stock: {sz.quantity}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                      <div className="w-24">
                        <label className="block text-xs font-bold text-zinc-500 mb-1">Qty</label>
                        <input 
                          type="number" 
                          value={item.quantity} 
                          onChange={e => updateItem(index, 'quantity', Number(e.target.value))}
                          className="w-full bg-white p-3 rounded-xl font-bold outline-none border focus:border-zinc-300"
                          min="1"
                        />
                      </div>
                      <div className="w-32">
                        <label className="block text-xs font-bold text-zinc-500 mb-1">Rate (₹)</label>
                        <input 
                          type="number" 
                          value={item.rate} 
                          onChange={e => updateItem(index, 'rate', Number(e.target.value))}
                          className="w-full bg-white p-3 rounded-xl font-bold outline-none border focus:border-zinc-300"
                        />
                      </div>
                      <div className="w-32">
                        <label className="block text-xs font-bold text-zinc-500 mb-1">Amount</label>
                        <div className="p-3 font-black text-zinc-800 bg-zinc-100 rounded-xl">₹{item.amount}</div>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {items.length === 0 && (
                <div className="text-center py-8 text-zinc-400 font-medium bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                  No items added yet.
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-zinc-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-zinc-500 mb-2">Discount (₹)</label>
                <input 
                  type="number" 
                  value={discount} 
                  onChange={e => setDiscount(Number(e.target.value))}
                  className="w-full bg-zinc-50 p-4 rounded-2xl font-bold outline-none border focus:border-zinc-300"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-500 mb-2">Tax (%)</label>
                <input 
                  type="number" 
                  value={taxPercent} 
                  onChange={e => setTaxPercent(Number(e.target.value))}
                  className="w-full bg-zinc-50 p-4 rounded-2xl font-bold outline-none border focus:border-zinc-300"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-500 mb-2">Amount Paid Now (₹)</label>
                <input 
                  type="number" 
                  value={paidAmount} 
                  onChange={e => setPaidAmount(Number(e.target.value))}
                  className="w-full bg-green-50 text-green-700 p-4 rounded-2xl font-black outline-none border border-green-200 focus:border-green-400"
                />
              </div>
            </div>
            
            <div className="bg-zinc-900 text-white p-6 rounded-3xl flex flex-col justify-center space-y-4">
              <div className="flex justify-between text-zinc-400 font-medium">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-zinc-400 font-medium">
                <span>Discount</span>
                <span>-₹{discount}</span>
              </div>
              <div className="flex justify-between text-zinc-400 font-medium">
                <span>Tax</span>
                <span>₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-2xl font-black border-t border-zinc-800 pt-4">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-red-400 font-bold">
                <span>Balance Due</span>
                <span>₹{(total - paidAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSaveInvoice}
            className="w-full bg-amber-600 text-white p-4 rounded-2xl font-black shadow-lg hover:bg-amber-700 transition-colors"
          >
            {language === 'ta' ? 'பில்லை சேமி' : 'Save Invoice'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-200 rounded-full transition-colors md:hidden">
            <ArrowLeft size={24} className="text-zinc-600" />
          </button>
          <div>
            <h2 className="text-3xl font-black tamil-font text-zinc-800 tracking-tight">{language === 'ta' ? 'பில்லிங்' : 'Billing & Invoices'}</h2>
            <p className="text-zinc-500 font-medium mt-1">{language === 'ta' ? 'வாடிக்கையாளர் பில்கள்' : 'Manage customer invoices'}</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-amber-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-amber-700 transition-all flex items-center gap-2"
        >
          <Plus size={20} />
          {language === 'ta' ? 'புதிய பில்' : 'New Invoice'}
        </button>
      </div>

      <div className="bg-white rounded-3xl p-4 shadow-sm border border-zinc-100 mb-6 flex items-center gap-3">
        <Search className="text-zinc-400 ml-2" size={20} />
        <input 
          type="text"
          placeholder={language === 'ta' ? 'பில் எண் அல்லது பெயர் தேடுக...' : 'Search by invoice or name...'}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent outline-none font-bold text-zinc-700 placeholder-zinc-400"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredInvoices.map(invoice => (
          <div key={invoice.id} className="p-5 rounded-3xl border border-zinc-100 shadow-sm hover:shadow-md transition-shadow theme-card">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-zinc-400 mb-1">{new Date(invoice.createdAt).toLocaleDateString()}</p>
                <h3 className="font-black text-zinc-800 text-lg">{invoice.customerName}</h3>
                <p className="text-sm font-bold text-zinc-500">#{invoice.invoiceNumber}</p>
              </div>
              <div className={`p-2 rounded-xl theme-icon-bg ${
                invoice.status === 'PAID' ? 'bg-green-50 text-green-600' :
                invoice.status === 'PARTIAL' ? 'bg-orange-50 text-orange-600' :
                'bg-red-50 text-red-600'
              }`}>
                <FileText size={20} />
              </div>
            </div>
            
            <div className="flex justify-between items-end mt-6">
              <div>
                <p className="text-xs font-bold text-zinc-400 mb-1">Total Amount</p>
                <p className="font-black text-xl text-zinc-900">₹{invoice.total.toFixed(2)}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setViewInvoice(invoice)} className="p-2 bg-zinc-100 text-zinc-600 rounded-xl hover:bg-zinc-200 transition-colors">
                  <FileText size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredInvoices.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-zinc-100">
            <FileText className="mx-auto text-zinc-300 mb-4" size={48} />
            <p className="text-zinc-500 font-bold text-lg">No invoices found</p>
          </div>
        )}
      </div>
    </div>
  );
}
