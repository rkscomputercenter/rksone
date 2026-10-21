import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { exportsApi } from '../../api';
import type { DataExport } from '../../types';

export default function DataExports() {
  const [exports, setExports] = useState<DataExport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExports();
  }, []);

  const fetchExports = async () => {
    setLoading(true);
    try {
      const res = await exportsApi.list();
      if (res.data?.success) {
        setExports(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (id: string, fileName: string) => {
    const url = exportsApi.downloadUrl(id);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Layout title="Data Exports & Archives">
      <div className="page-header">
        <div>
          <div className="page-header-title">Data Exports & Archives</div>
          <div className="page-header-sub">Download your generated Excel reports before they expire</div>
        </div>
        <button className="btn btn-ghost" onClick={fetchExports} disabled={loading}>
          {loading ? 'Refreshing...' : '🔄 Refresh List'}
        </button>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div className="alert alert-info" style={{ marginBottom: 24 }}>
          <p style={{ margin: 0, fontSize: 14 }}>
            <strong>Note:</strong> Auto-cleanup generates Excel archives 5 days before deletion. These files expire and are permanently deleted 2 days after the cleanup executes. Please download them while they are available.
          </p>
        </div>

        {exports.length === 0 && !loading && (
          <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
            <p>No exports available at the moment.</p>
          </div>
        )}

        {exports.length > 0 && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Generated On</th>
                  <th>Scheduled Cleanup For</th>
                  <th>Expires On</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {exports.map(exp => {
                  const isExpired = new Date(exp.expiresAt) < new Date();
                  return (
                    <tr key={exp.id}>
                      <td><strong>{exp.fileName}</strong></td>
                      <td>{new Date(exp.createdAt).toLocaleString()}</td>
                      <td>{new Date(exp.scheduledFor).toLocaleDateString()}</td>
                      <td>
                        <span style={{ color: isExpired ? 'var(--red)' : 'var(--yellow)', fontWeight: 600 }}>
                          {new Date(exp.expiresAt).toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${isExpired ? 'badge-red' : 'badge-green'}`}>
                          {isExpired ? 'EXPIRED' : exp.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-sm btn-primary" 
                          disabled={isExpired}
                          onClick={() => downloadFile(exp.id, exp.fileName)}
                        >
                          ⬇ Download
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
