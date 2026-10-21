import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TermsPage() {
  const [isColorMode, setIsColorMode] = useState(false);
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: '20px' }}>
      <div className="page-header no-print" style={{ maxWidth: 800, margin: '0 auto 24px' }}>
        <div>
          <div className="page-header-title">Terms & Rules</div>
          <div className="page-header-sub">View and download shop policies and regulations</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate(-1)} className="btn btn-ghost">← Back</button>
          <button 
            className="btn btn-ghost" 
            onClick={() => setIsColorMode(!isColorMode)}
          >
            {isColorMode ? '🎨 Color Mode (ON)' : '⚫ B/W Mode (ON)'}
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            🖨 Print / Save PDF
          </button>
        </div>
      </div>

      <div className="card no-print" style={{ maxWidth: 800, margin: '0 auto', padding: '40px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 20 }}>RKS Xerox and Computer center</h2>
        <h3 style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 40 }}>Terms, Conditions & Rules</h3>
        
        <div className="terms-content" style={{ display: 'flex', flexDirection: 'column', gap: 20, lineHeight: 1.6 }}>
          <section>
            <h4>1. General Terms of Service</h4>
            <p>By using the services provided by RKS Xerox and Computer center, you agree to abide by all the rules and regulations outlined in this document. We reserve the right to refuse service to anyone who violates these terms.</p>
          </section>

          <section>
            <h4>2. Payment Policy</h4>
            <ul>
              <li>All payments must be completed at the time of service unless otherwise agreed upon in writing.</li>
              <li>We accept Cash, Online transfers, and other approved payment methods.</li>
              <li>Invoices are generated systematically and are binding.</li>
            </ul>
          </section>

          <section>
            <h4>3. Printing & Photocopying Rights</h4>
            <ul>
              <li>We strictly adhere to copyright laws. We will not print or copy protected materials without the explicit permission of the copyright holder.</li>
              <li>Customers are responsible for ensuring they hold the right to reproduce any materials they bring to the shop.</li>
            </ul>
          </section>

          <section>
            <h4>4. Security & Privacy</h4>
            <p>Any data provided to us for printing, scanning, or processing will be treated with strict confidentiality. We do not store personal customer data longer than necessary for the completion of the service. All logs and electronic files are securely auto-cleaned.</p>
          </section>

          <section>
            <h4>5. Violations & Bans</h4>
            <p>Any customer found to be harassing staff, attempting fraud, providing fake payment confirmations, or violating copyright laws will face an immediate and permanent ban from using our services. We reserve the right to report serious infractions to the appropriate authorities.</p>
          </section>

          <section>
            <h4>6. Disclaimer</h4>
            <p>We are not liable for any minor defects in printing caused by low-resolution source files provided by the customer. All outputs should be reviewed immediately upon receipt.</p>
          </section>
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

        <div style={{ textAlign: 'center', marginBottom: 40, marginTop: 20 }}>
          <h2 style={{ textTransform: 'uppercase', letterSpacing: 1.5, borderBottom: '2px solid #000', display: 'inline-block', paddingBottom: 5 }}>Terms, Conditions & Rules</h2>
        </div>

        <div className="print-terms-content" style={{ fontSize: 14, lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <h4 style={{ fontSize: 16, marginBottom: 8 }}>1. General Terms of Service</h4>
            <p>By using the services provided by RKS Xerox and Computer center, you agree to abide by all the rules and regulations outlined in this document. We reserve the right to refuse service to anyone who violates these terms.</p>
          </div>

          <div>
            <h4 style={{ fontSize: 16, marginBottom: 8 }}>2. Payment Policy</h4>
            <ul style={{ paddingLeft: 20 }}>
              <li>All payments must be completed at the time of service unless otherwise agreed upon in writing.</li>
              <li>We accept Cash, Online transfers, and other approved payment methods.</li>
              <li>Invoices are generated systematically and are binding.</li>
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: 16, marginBottom: 8 }}>3. Printing & Photocopying Rights</h4>
            <ul style={{ paddingLeft: 20 }}>
              <li>We strictly adhere to copyright laws. We will not print or copy protected materials without the explicit permission of the copyright holder.</li>
              <li>Customers are responsible for ensuring they hold the right to reproduce any materials they bring to the shop.</li>
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: 16, marginBottom: 8 }}>4. Security & Privacy</h4>
            <p>Any data provided to us for printing, scanning, or processing will be treated with strict confidentiality. We do not store personal customer data longer than necessary for the completion of the service. All logs and electronic files are securely auto-cleaned.</p>
          </div>

          <div>
            <h4 style={{ fontSize: 16, marginBottom: 8 }}>5. Violations & Bans</h4>
            <p>Any customer found to be harassing staff, attempting fraud, providing fake payment confirmations, or violating copyright laws will face an immediate and permanent ban from using our services. We reserve the right to report serious infractions to the appropriate authorities.</p>
          </div>

          <div>
            <h4 style={{ fontSize: 16, marginBottom: 8 }}>6. Disclaimer</h4>
            <p>We are not liable for any minor defects in printing caused by low-resolution source files provided by the customer. All outputs should be reviewed immediately upon receipt.</p>
          </div>
        </div>

        <div className="invoice-footer" style={{ marginTop: 80, borderTop: '1px solid #000', paddingTop: 20, textAlign: 'center', fontSize: 12 }}>
          <p><strong>All Rights Reserved. RKS Xerox and Computer center.</strong></p>
        </div>
      </div>

      <style>{`
        .terms-content h4 {
          margin-bottom: 8px;
          color: var(--text-primary);
        }
        .terms-content ul {
          padding-left: 20px;
          list-style-type: disc;
        }
        
        .print-only { display: none; }

        @media print {
          @page { size: A4 portrait; margin: 15mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: #fff !important; margin: 0; padding: 0; }
          
          .no-print { display: none !important; }

          .print-only { display: block !important; }
          
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
        }
      `}</style>
    </div>
  );
}
