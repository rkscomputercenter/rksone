import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { servicesApi, systemApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { Service } from '../types';

interface BillItem {
  id: string;
  name: string;
  amount: string;
}

export default function BillingPage() {
  const { user, isSuperAdmin } = useAuth();
  
  const [services, setServices] = useState<Service[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [printMode, setPrintMode] = useState<'DISCLAIMER' | 'SEAL_SIGN'>('DISCLAIMER');
  const [isColorMode, setIsColorMode] = useState(false);
  
  // Date/Time state
  const now = new Date();
  const defaultDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const defaultTime = now.toLocaleTimeString('en-IN', { hour12: true, timeZone: 'Asia/Kolkata' });
  
  const [manualDate, setManualDate] = useState(defaultDate);
  const [manualTime, setManualTime] = useState(defaultTime);

  // Items
  const [items, setItems] = useState<BillItem[]>([
    { id: Date.now().toString(), name: '', amount: '' }
  ]);

  useEffect(() => {
    servicesApi.list({ active: true })
      .then(res => setServices(res.data.data ?? []))
      .catch(console.error);
  }, []);

  const handleAddItem = () => {
    setItems([...items, { id: Date.now().toString() + Math.random(), name: '', amount: '' }]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) return;
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: 'name' | 'amount', value: string) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Auto-fill price if they selected a service exactly matching a catalog item
        if (field === 'name') {
          const matchedService = services.find(s => s.name === value);
          if (matchedService) {
            updatedItem.amount = matchedService.price.toString();
          }
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const total = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const handlePrint = async (mode: 'DISCLAIMER' | 'SEAL_SIGN') => {
    setPrintMode(mode);
    // 1. Log the bill in the system
    try {
      await systemApi.logBill({
        customerName: customerName || 'Walk-in Customer',
        total,
        items,
        date: `${manualDate} ${manualTime}`
      });
    } catch (err) {
      console.error('Failed to log bill:', err);
    }
    
    // Wait for React to apply the printMode before triggering print
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Convert Date to DD/MM/YYYY for display
  const displayDateParts = manualDate.split('-');
  const displayDate = displayDateParts.length === 3 ? `${displayDateParts[2]}/${displayDateParts[1]}/${displayDateParts[0]}` : manualDate;

  return (
    <Layout title="Bill Generator">
      <div className="page-header no-print">
        <div>
          <div className="page-header-title">Bill Generator</div>
          <div className="page-header-sub">Generate and print professional invoices</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            className="btn btn-ghost" 
            onClick={() => setIsColorMode(!isColorMode)}
          >
            {isColorMode ? '🎨 Color Mode (ON)' : '⚫ B/W Mode (ON)'}
          </button>
          <button className="btn btn-secondary" onClick={() => handlePrint('DISCLAIMER')} disabled={total === 0}>
            🖨 Print (Disclaimer)
          </button>
          <button className="btn btn-primary" onClick={() => handlePrint('SEAL_SIGN')} disabled={total === 0}>
            🖨 Print (Seal & Sign)
          </button>
        </div>
      </div>

      <div className="billing-container no-print" style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* CONFIG SECTION (Only visible on screen) */}
        <div className="card">
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Bill Details</div>
          
          <div className="grid grid-2" style={{ gap: 16, marginBottom: 16 }}>
            <div className="form-group mb-0">
              <label className="form-label">Customer Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Walk-in Customer" 
                value={customerName} 
                onChange={e => setCustomerName(e.target.value)} 
              />
            </div>
            
            <div className="grid grid-2" style={{ gap: 16 }}>
              <div className="form-group mb-0">
                <label className="form-label">Date {isSuperAdmin ? '(Edit)' : '(Auto)'}</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={manualDate} 
                  onChange={e => setManualDate(e.target.value)}
                  disabled={!isSuperAdmin}
                />
              </div>
              <div className="form-group mb-0">
                <label className="form-label">Time {isSuperAdmin ? '(Edit)' : '(Auto)'}</label>
                <input 
                  type="time" 
                  className="form-input" 
                  value={manualTime.substring(0,5)} // Rough conversion for input
                  onChange={e => {
                    const d = new Date(`2000-01-01T${e.target.value}`);
                    setManualTime(d.toLocaleTimeString('en-IN', { hour12: true }));
                  }}
                  disabled={!isSuperAdmin}
                />
              </div>
            </div>
          </div>

          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, marginTop: 24 }}>Bill Items</div>
          
          <div className="items-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <datalist id="services-list">
              {services.map(s => <option key={s.id} value={s.name} />)}
            </datalist>

            {items.map((item, index) => (
              <div key={item.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Search service or type custom name..." 
                    value={item.name} 
                    onChange={e => handleItemChange(item.id, 'name', e.target.value)}
                    list="services-list"
                  />
                </div>
                <div style={{ width: 150 }}>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="Amount (₹)" 
                    value={item.amount} 
                    onChange={e => handleItemChange(item.id, 'amount', e.target.value)}
                  />
                </div>
                <button 
                  className="btn btn-ghost" 
                  style={{ padding: '10px 12px', color: 'var(--red)' }} 
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={items.length === 1}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={handleAddItem}>
            + Add Another Item
          </button>

          <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>Grand Total</span>
            <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-accent)' }}>₹{total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* PRINT TEMPLATE (Hidden on screen, shown in print) */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className={`print-only invoice-container ${isColorMode ? 'color-mode' : 'bw-mode'}`}>
        <div className="invoice-header">
          <img src="/logo.png" alt="RKS Logo" className="invoice-logo" />
          <div className="invoice-shop-details">
            <h1 className="invoice-shop-name">RKS Xerox and Computer center</h1>
            <p className="invoice-address">Opposite Taluk Office, Harur, Tamil Nadu 636903</p>
            <p className="invoice-contact">Phone: 9942891322  |  Email: rksxerox@gmail.com</p>
          </div>
        </div>

        <div className="invoice-meta">
          <div className="meta-left">
            <div><strong>Bill To:</strong> {customerName || 'Walk-in Customer'}</div>
            <div><strong>Generated By:</strong> {user?.name}</div>
          </div>
          <div className="meta-right">
            <div><strong>Date:</strong> {displayDate}</div>
            <div><strong>Time:</strong> {manualTime}</div>
          </div>
        </div>

        <table className="invoice-table">
          <thead>
            <tr>
              <th style={{ width: '10%', textAlign: 'center' }}>S.No</th>
              <th style={{ width: '65%', textAlign: 'left' }}>Particulars</th>
              <th style={{ width: '25%', textAlign: 'right' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id}>
                <td style={{ textAlign: 'center' }}>{i + 1}</td>
                <td>{item.name || '---'}</td>
                <td style={{ textAlign: 'right' }}>{parseFloat(item.amount || '0').toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} style={{ textAlign: 'right', fontWeight: 'bold' }}>Grand Total</td>
              <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.1em' }}>₹{total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="invoice-footer">
          {printMode === 'DISCLAIMER' ? (
            <>
              <p><strong>Disclaimer:</strong> Applicable to whomsoever it may concern.</p>
              <p><em>System generated bill. No signature required.</em></p>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 60 }}>
              <div style={{ borderTop: '1px solid #000', paddingTop: 8, width: 200, textAlign: 'center' }}>
                Customer Signature
              </div>
              <div style={{ borderTop: '1px solid #000', paddingTop: 8, width: 200, textAlign: 'center' }}>
                Authorized Seal & Signature
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        /* Hide print template on screen */
        .print-only { display: none; }

        /* Print Styles */
        @media print {
          @page { size: A4 portrait; margin: 15mm; }
          body { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            background: #fff !important; 
            margin: 0; 
            padding: 0; 
          }
          
          body * {
            visibility: hidden;
          }
          
          .print-only, .print-only * {
            visibility: visible;
          }
          
          .print-only { 
            display: block !important; 
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
          }
          
          .invoice-container {
            width: 100%;
            font-family: 'Inter', system-ui, sans-serif;
            color: #000;
          }

          .invoice-header {
            display: flex;
            align-items: center;
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }

          .invoice-logo {
            width: 120px;
            height: auto;
            margin-right: 20px;
          }

          .bw-mode .invoice-logo {
            filter: grayscale(100%);
          }
          
          .color-mode .invoice-shop-name {
            color: #570F8E;
          }
          .color-mode .invoice-table th {
            background-color: rgba(87, 15, 142, 0.1) !important;
            color: #570F8E;
            border-color: #570F8E;
          }
          .color-mode .invoice-table td {
            border-color: #570F8E;
          }
          .color-mode .invoice-table tfoot td {
            color: #B8860B;
            border-color: #570F8E;
          }
          .color-mode .invoice-header {
            border-bottom: 2px solid #570F8E;
          }

          .invoice-shop-details {
            flex: 1;
            text-align: center;
          }

          .invoice-shop-name {
            margin: 0 0 5px 0;
            font-size: 24px;
            font-weight: 900;
            text-transform: uppercase;
          }

          .invoice-address, .invoice-contact {
            margin: 0 0 3px 0;
            font-size: 14px;
          }

          .invoice-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            font-size: 14px;
            line-height: 1.6;
          }

          .meta-right {
            text-align: right;
          }

          .invoice-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
          }

          .invoice-table th, .invoice-table td {
            border: 1px solid #000;
            padding: 12px;
            font-size: 14px;
          }

          .invoice-table th {
            background-color: #f3f4f6 !important;
            font-weight: bold;
          }

          .invoice-footer {
            margin-top: 50px;
            text-align: center;
            font-size: 12px;
            color: #333;
            border-top: 1px dashed #ccc;
            padding-top: 20px;
          }
        }
      `}</style>
    </Layout>
  );
}
