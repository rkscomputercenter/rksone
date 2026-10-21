import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { expenseCategoriesApi } from '../../api';

interface Category {
  id: string;
  name: string;
}

export default function ManageExpenseCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await expenseCategoriesApi.list();
      setCategories(res.data.data ?? []);
    } catch (err) {
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await expenseCategoriesApi.create(newName);
      setNewName('');
      setIsAdding(false);
      loadCategories();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add category');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await expenseCategoriesApi.update(id, editName);
      setEditingId(null);
      loadCategories();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update category');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await expenseCategoriesApi.delete(id);
      loadCategories();
    } catch (err) {
      setError('Failed to delete category');
    }
  };

  return (
    <Layout title="Expense Categories">
      <div className="page-header">
        <div className="page-header-title">Expense Categories</div>
        <button className="btn btn-primary" onClick={() => setIsAdding(true)}>+ Add Category</button>
      </div>

      {error && <div className="alert alert-error mb-16">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="text-center p-20">Loading...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Category Name</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isAdding && (
                <tr>
                  <td>
                    <form onSubmit={handleAdd}>
                      <input 
                        className="form-input" 
                        value={newName} 
                        onChange={e => setNewName(e.target.value)} 
                        placeholder="Category name..."
                        autoFocus
                      />
                    </form>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-primary btn-sm mr-8" onClick={handleAdd}>Save</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setIsAdding(false)}>Cancel</button>
                  </td>
                </tr>
              )}
              {categories.map(cat => (
                <tr key={cat.id}>
                  <td>
                    {editingId === cat.id ? (
                      <input 
                        className="form-input" 
                        value={editName} 
                        onChange={e => setEditName(e.target.value)} 
                        autoFocus
                      />
                    ) : (
                      <span className="font-semibold">{cat.name}</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {editingId === cat.id ? (
                      <>
                        <button className="btn btn-primary btn-sm mr-8" onClick={() => handleUpdate(cat.id)}>Save</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-ghost btn-sm mr-8" onClick={() => {
                          setEditingId(cat.id);
                          setEditName(cat.name);
                        }}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(cat.id)}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && categories.length === 0 && !isAdding && (
                <tr>
                  <td colSpan={2} className="text-center p-20 text-muted">No categories found. Click "Add Category" to start.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
