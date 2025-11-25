'use client';

import { useState, useEffect } from 'react';
import { Settings, MapPin, Package, Grid, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { settings } from '@/lib/api';

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState('locations');
    const [locations, setLocations] = useState([]);
    const [conditions, setConditions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [editing, setEditing] = useState(null);
    const [adding, setAdding] = useState(false);
    const [formData, setFormData] = useState({});

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [locRes, condRes, catRes] = await Promise.all([
                settings.getLocations(),
                settings.getConditions(),
                settings.getCategories()
            ]);
            setLocations(locRes.data.data);
            setConditions(condRes.data.data);
            setCategories(catRes.data.data);
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async function handleAdd(type) {
        try {
            if (type === 'locations') {
                await settings.createLocation(formData);
            } else if (type === 'conditions') {
                await settings.createCondition(formData);
            } else {
                await settings.createCategory(formData);
            }
            loadData();
            setAdding(false);
            setFormData({});
        } catch (error) {
            console.error('Error adding:', error);
            alert('Failed to add item');
        }
    }

    async function handleUpdate(type, id) {
        try {
            if (type === 'locations') {
                await settings.updateLocation(id, formData);
            } else if (type === 'conditions') {
                await settings.updateCondition(id, formData);
            } else {
                await settings.updateCategory(id, formData);
            }
            loadData();
            setEditing(null);
            setFormData({});
        } catch (error) {
            console.error('Error updating:', error);
            alert('Failed to update item');
        }
    }

    async function handleDelete(type, id) {
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            if (type === 'locations') {
                await settings.deleteLocation(id);
            } else if (type === 'conditions') {
                await settings.deleteCondition(id);
            } else {
                await settings.deleteCategory(id);
            }
            loadData();
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Failed to delete item');
        }
    }

    const tabs = [
        { id: 'locations', icon: MapPin, label: 'Storage Locations', data: locations },
        { id: 'conditions', icon: Package, label: 'Conditions', data: conditions },
        { id: 'categories', icon: Grid, label: 'Categories', data: categories }
    ];

    const activeData = tabs.find(t => t.id === activeTab)?.data || [];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-accent-500 bg-clip-text text-transparent flex items-center gap-3">
                    <Settings size={36} />
                    Admin Settings
                </h1>
                <p className="text-gray-400 mt-2">Manage storage locations, conditions, and categories</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-white/10">
                {tabs.map(({ id, icon: Icon, label }) => (
                    <button
                        key={id}
                        onClick={() => {
                            setActiveTab(id);
                            setAdding(false);
                            setEditing(null);
                        }}
                        className={`flex items-center gap-2 px-6 py-3 font-semibold transition-colors ${activeTab === id
                                ? 'border-b-2 border-primary-500 text-white'
                                : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <Icon size={20} />
                        {label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">{tabs.find(t => t.id === activeTab)?.label}</h2>
                    <button
                        onClick={() => {
                            setAdding(true);
                            setFormData({});
                        }}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Add New
                    </button>
                </div>

                {/* Add Form */}
                {adding && (
                    <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                        <h3 className="font-semibold mb-4">Add New {tabs.find(t => t.id === activeTab)?.label.slice(0, -1)}</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <input
                                type="text"
                                placeholder="Code (e.g., A1, NEW)"
                                value={formData.code || ''}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                className="input-field"
                            />
                            <input
                                type="text"
                                placeholder="Name"
                                value={formData.name || ''}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="input-field"
                            />
                            <input
                                type="text"
                                placeholder="Description (optional)"
                                value={formData.description || ''}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="input-field col-span-2"
                            />
                            {activeTab === 'conditions' && (
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Multiplier (e.g., 0.85)"
                                    value={formData.multiplier || ''}
                                    onChange={(e) => setFormData({ ...formData, multiplier: e.target.value })}
                                    className="input-field"
                                />
                            )}
                            {activeTab === 'categories' && (
                                <input
                                    type="text"
                                    placeholder="eBay Category ID (optional)"
                                    value={formData.ebayId || ''}
                                    onChange={(e) => setFormData({ ...formData, ebayId: e.target.value })}
                                    className="input-field"
                                />
                            )}
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => handleAdd(activeTab)} className="btn-primary">
                                <Save size={18} className="inline mr-2" />
                                Save
                            </button>
                            <button onClick={() => setAdding(false)} className="btn-secondary">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b border-white/10">
                            <tr className="text-left">
                                <th className="p-4 font-semibold">Code</th>
                                <th className="p-4 font-semibold">Name</th>
                                <th className="p-4 font-semibold">Description</th>
                                {activeTab === 'conditions' && <th className="p-4 font-semibold">Multiplier</th>}
                                {activeTab === 'categories' && <th className="p-4 font-semibold">eBay ID</th>}
                                <th className="p-4 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeData.map((item) => (
                                <tr key={item.id} className="border-b border-white/5 hover:bg-white/5">
                                    {editing === item.id ? (
                                        <>
                                            <td className="p-4">
                                                <input
                                                    type="text"
                                                    value={formData.code}
                                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                                    className="input-field py-2"
                                                />
                                            </td>
                                            <td className="p-4">
                                                <input
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    className="input-field py-2"
                                                />
                                            </td>
                                            <td className="p-4">
                                                <input
                                                    type="text"
                                                    value={formData.description || ''}
                                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                    className="input-field py-2"
                                                />
                                            </td>
                                            {activeTab === 'conditions' && (
                                                <td className="p-4">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={formData.multiplier}
                                                        onChange={(e) => setFormData({ ...formData, multiplier: e.target.value })}
                                                        className="input-field py-2"
                                                    />
                                                </td>
                                            )}
                                            {activeTab === 'categories' && (
                                                <td className="p-4">
                                                    <input
                                                        type="text"
                                                        value={formData.ebayId || ''}
                                                        onChange={(e) => setFormData({ ...formData, ebayId: e.target.value })}
                                                        className="input-field py-2"
                                                    />
                                                </td>
                                            )}
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleUpdate(activeTab, item.id)}
                                                        className="text-green-400 hover:text-green-300"
                                                    >
                                                        <Save size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditing(null)}
                                                        className="text-gray-400 hover:text-gray-300"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="p-4 font-mono text-primary-400">{item.code}</td>
                                            <td className="p-4 font-semibold">{item.name}</td>
                                            <td className="p-4 text-gray-400">{item.description || '-'}</td>
                                            {activeTab === 'conditions' && (
                                                <td className="p-4 text-gray-300">{item.multiplier}</td>
                                            )}
                                            {activeTab === 'categories' && (
                                                <td className="p-4 text-gray-300">{item.ebayId || '-'}</td>
                                            )}
                                            <td className="p-4">
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => {
                                                            setEditing(item.id);
                                                            setFormData(item);
                                                        }}
                                                        className="text-blue-400 hover:text-blue-300"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(activeTab, item.id)}
                                                        className="text-red-400 hover:text-red-300"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
