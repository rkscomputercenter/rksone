import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ListOrdered } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import SalesLedger, { isTodayIST, istDate, money } from '../../components/sales/SalesLedger';
import { transactionsApi } from '../../api';
import type { Transaction } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { PageLoading } from '../../components/ui/Loading';

const METHODS = [['', 'All'], ['CASH', 'Cash'], ['ONLINE', 'Online'], ['OTHER', 'Other']] as const;

export default function TransactionsList() {
  const { hasPermission, user } = useAuth();
  const { t } = useLanguage();
  const canManage = hasPermission('allRecords');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(istDate());
  const [paymentMethod, setPaymentMethod] = useState('');
  const [shop, setShop] = useState('');
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const multiShop = (user?.shopAccess?.length ?? 0) > 1;

  const load = () => {
    setLoading(true);
    transactionsApi.list({ date, ...(paymentMethod && { paymentMethod }), ...(shop && { shop }) })
      .then(r => {
        const data = r.data.data ?? [];
        setTransactions(data);
        setTotal(r.data.meta?.totalSum ?? data.reduce((s: number, x: any) => s + Number(x.totalPrice), 0));
      })
      .catch(() => setError('The list didn’t load. Check the connection and try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [date, paymentMethod, shop]);

  const handleDelete = async (id: string) => {
    try {
      setError('');
      await transactionsApi.delete(id);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'The sale was not deleted. Try again.');
    }
  };

  const isToday = date === istDate();
  const dateLabel = isToday ? 'today' : new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Layout title={t('nav.myTransactions' as any)}>
      <div className="page-header">
        <div>
          <div className="page-header-title">{canManage ? 'Sales' : t('nav.myTransactions' as any)}</div>
          <div className="page-header-sub">Every sale entered {dateLabel}. You can delete a sale on the day it was made.</div>
        </div>
        <Link to="/transactions/new" className="btn btn-primary hide-mobile"><Plus size={17} /> {t('nav.newEntry' as any)}</Link>
      </div>

      <div className="toolbar">
        <div className="seg" role="group" aria-label="Paid by">
          {METHODS.map(([value, label]) => (
            <button key={value} type="button" aria-pressed={paymentMethod === value} onClick={() => setPaymentMethod(value)}>{label}</button>
          ))}
        </div>
        {multiShop && (
          <div className="seg" role="group" aria-label="Shop">
            {[['', 'Both shops'], ['SHOP_COMPUTER', 'Computer'], ['SHOP_XEROX', 'Xerox']].map(([value, label]) => (
              <button key={value} type="button" aria-pressed={shop === value} onClick={() => setShop(value)}>{label}</button>
            ))}
          </div>
        )}
        <div style={{ marginLeft: 'auto' }}>
          {canManage
            ? <input type="date" aria-label="Date" className="form-input" style={{ width: 170 }} value={date} max={istDate()} onChange={e => setDate(e.target.value || istDate())} />
            : <span className="shop-tag">Today</span>}
        </div>
      </div>

      <div className="sumline">
        <span>{transactions.length} {transactions.length === 1 ? 'sale' : 'sales'}</span>
        <span className="sumline-total">₹{money(total)}</span>
      </div>

      {error && <div className="alert alert-error mb-16" role="alert">{error}</div>}

      {loading ? <PageLoading /> : transactions.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon"><ListOrdered size={28} /></div>
          <div className="empty-state-title">No sales {isToday ? 'yet today' : 'on this day'}</div>
          {isToday && <div className="empty-state-sub"><Link to="/transactions/new" className="btn-link">Enter the first sale</Link></div>}
        </div>
      ) : (
        <SalesLedger
          transactions={transactions}
          showShop={multiShop}
          canDelete={tx => isTodayIST(tx.createdAt)}
          onDelete={handleDelete}
        />
      )}
    </Layout>
  );
}
