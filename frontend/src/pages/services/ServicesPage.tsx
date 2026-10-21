import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { servicesApi } from '../../api';
import { useLanguage } from '../../context/LanguageContext';
import type { Service, ServiceCategory, Shop } from '../../types';

const CATS: ServiceCategory[] = ['GOVT', 'PRINTING', 'CARDS', 'OTHER'];

interface ServiceModalProps {
  service?: Service;
  onClose: () => void;
  onSave: () => void;
}

function ServiceModal({ service, onClose, onSave }: ServiceModalProps) {
  const [name, setName] = useState(service?.name ?? '');
  const [category, setCategory] = useState<ServiceCategory>(service?.category ?? 'OTHER');
  const [price, setPrice] = useState(service?.price?.toString() ?? '');
  const [isActive, setIsActive] = useState(service?.isActive ?? true);
  const [shop, setShop] = useState<Shop>(service?.shop ?? 'SHOP_COMPUTER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name required'); return; }
    const p = parseFloat(price);
    if (isNaN(p) || p < 0) { setError('Valid price required'); return; }
    setLoading(true);
    try {
      if (service) {
        await servicesApi.update(service.id, { name, category, price: p, isActive, shop });
      } else {
        await servicesApi.create({ name, category, price: p, isActive, shop });
      }
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Save failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{service ? t('services.modalEdit' as any) : t('services.modalAdd' as any)}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">{t('services.serviceName' as any)}</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="..." autoFocus />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">{t('services.category' as any)}</label>
                <select className="form-select" value={category} onChange={e => setCategory(e.target.value as ServiceCategory)}>
                  {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('services.price' as any)} (₹)</label>
                <input className="form-input" type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Shop</label>
                <select className="form-select" value={shop} onChange={e => setShop(e.target.value as Shop)}>
                  <option value="SHOP_COMPUTER">Shop Computer</option>
                  <option value="SHOP_XEROX">Shop Xerox</option>
                </select>
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('services.visibleTo' as any)}</span>
            </label>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>{t('services.modalCancel' as any)}</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? t('services.modalSaving' as any) : t('services.modalSave' as any)}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalService, setModalService] = useState<Service | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const { t } = useLanguage();

  const load = () => {
    setLoading(true);
    servicesApi.list()
      .then(r => setServices(r.data.data ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = services.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase()));
  const grouped = CATS.reduce((acc, cat) => {
    const items = filtered.filter(s => s.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {} as Record<string, Service[]>);

  const handleToggle = async (s: Service) => {
    try { await servicesApi.update(s.id, { isActive: !s.isActive }); load(); }
    catch (err: any) { setError(err.response?.data?.error || 'Update failed'); }
  };

  const handleDelete = async (s: Service) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try { await servicesApi.delete(s.id); load(); }
    catch (err: any) { setError(err.response?.data?.error || 'Delete failed'); }
  };

  return (
    <Layout title={t('services.title' as any)}>
      {showModal && (
        <ServiceModal service={modalService} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); load(); }} />
      )}
      <div className="page-header">
        <div>
          <div className="page-header-title">{t('services.catalog' as any)}</div>
          <div className="page-header-sub">{services.length} {t('services.servicesCount' as any)}, {services.filter(s => s.isActive).length} {t('services.activeCount' as any)}</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setModalService(undefined); setShowModal(true); }}>{t('services.add' as any)}</button>
      </div>

      {error && <div className="alert alert-error mb-16">{error}</div>}

      <div className="search-box" style={{ marginBottom: 20 }}>
        <span className="search-icon">🔍</span>
        <input className="form-input search-input" placeholder={t('services.search' as any)} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="page-loading"><div className="spinner spinner-lg" /></div> : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 24 }}>
            <div className="section-title">{cat}</div>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>{t('services.name' as any)}</th><th>Shop</th><th>{t('services.price' as any)}</th><th>{t('services.status' as any)}</th><th>{t('services.actions' as any)}</th></tr></thead>
                <tbody>
                  {items.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 500 }}>{s.name}</td>
                      <td>
                        <span className="badge" style={{ background: s.shop === 'SHOP_XEROX' ? '#fde68a' : '#bfdbfe', color: '#1f2937' }}>
                          {s.shop?.replace('SHOP_', '') || 'COMPUTER'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--color-accent)' }}>₹{Number(s.price).toFixed(2)}</td>
                      <td>{s.isActive ? <span className="badge badge-green">{t('services.statusActive' as any)}</span> : <span className="badge badge-red">{t('services.statusInactive' as any)}</span>}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setModalService(s); setShowModal(true); }}>{t('services.edit' as any)}</button>
                          <button className={`btn btn-sm ${s.isActive ? 'btn-danger' : 'btn-success'}`} onClick={() => handleToggle(s)}>
                            {s.isActive ? t('services.deactivate' as any) : t('services.activate' as any)}
                          </button>
                          <button className="btn btn-ghost btn-sm text-red" onClick={() => handleDelete(s)} title="Delete">🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </Layout>
  );
}
