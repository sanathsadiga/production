import React, { useState, useEffect } from 'react';
import { AdminNavbar } from '../components/Navbar';
import { masterAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/manage-publications.css';

interface Publication {
  id: number;
  name: string;
  code?: string;
  type: 'VK' | 'OSP' | 'NAMMA';
  location?: string;
}

interface FormData {
  name: string;
  code: string;
  type: 'VK' | 'OSP' | 'NAMMA';
  location: string;
}

export const ManagePublications: React.FC = () => {
  const { user } = useAuth();
  const [publications, setPublications] = useState<Publication[]>([]);
  const [filteredPublications, setFilteredPublications] = useState<Publication[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'VK' | 'OSP' | 'NAMMA'>('ALL');
  const [filterLocation, setFilterLocation] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    type: 'VK',
    location: '',
  });

  useEffect(() => {
    loadPublications();
    loadLocations();
  }, []);

  useEffect(() => {
    let filtered = publications;

    if (filterType !== 'ALL') {
      filtered = filtered.filter((p) => p.type === filterType);
    }

    if (filterLocation !== 'ALL') {
      filtered = filtered.filter((p) => p.location === filterLocation);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPublications(filtered);
  }, [publications, filterType, filterLocation, searchTerm]);

  // Load publications from all types
  const loadPublications = async () => {
    setIsLoading(true);
    setError('');

    try {
      const [ospRes, vkRes, nammaRes] = await Promise.all([
        masterAPI.getPublications('OSP'),
        masterAPI.getPublications('VK'),
        masterAPI.getPublications('NAMMA'),
      ]);

      const ospData = ospRes.data.data || ospRes.data || [];
      const vkData = vkRes.data.data || vkRes.data || [];
      const nammaData = nammaRes.data.data || nammaRes.data || [];

      const allPublications = [
        ...(Array.isArray(ospData) ? ospData : []),
        ...(Array.isArray(vkData) ? vkData : []),
        ...(Array.isArray(nammaData) ? nammaData : []),
      ];

      setPublications(allPublications);
      console.log(`✅ Loaded ${allPublications.length} publications`);
    } catch (err) {
      console.error('Error loading publications:', err);
      setError('Failed to load publications');
    } finally {
      setIsLoading(false);
    }
  };

  // Load locations from users table
  const loadLocations = async () => {
    try {
      const response = await masterAPI.getLocations();
      const locData = response.data.data || response.data || [];
      setLocations(Array.isArray(locData) ? locData : []);
      console.log(`✅ Loaded ${locData.length} locations from users table`);
    } catch (err) {
      console.error('Error loading locations:', err);
      setError('Failed to load locations');
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({ name: '', code: '', type: 'VK', location: '' });
    setShowModal(true);
    setError('');
  };

  const openEditModal = (pub: Publication) => {
    setIsEditing(true);
    setEditingId(pub.id);
    setFormData({
      name: pub.name,
      code: pub.code || '',
      type: pub.type,
      location: pub.location || '',
    });
    setShowModal(true);
    setError('');
  };

  const closeModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setEditingId(null);
    setFormData({ name: '', code: '', type: 'VK', location: '' });
    setError('');
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Publication name is required');
      return false;
    }
    if (!formData.location.trim()) {
      setError('Location is required');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      if (isEditing && editingId) {
        // Update
        await masterAPI.updatePublication(editingId, formData);
        setSuccess('Publication updated successfully');
      } else {
        // Create
        await masterAPI.createPublication(formData);
        setSuccess('Publication created successfully');
      }

      closeModal();
      await loadPublications();
    } catch (err: any) {
      console.error('Error saving publication:', err);
      setError(err.response?.data?.error || 'Failed to save publication');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this publication?')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await masterAPI.deletePublication(id);
      setSuccess('Publication deleted successfully');
      await loadPublications();
    } catch (err: any) {
      console.error('Error deleting publication:', err);
      setError(err.response?.data?.error || 'Failed to delete publication');
    }
  };

  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      VK: '#4CAF50',
      OSP: '#2196F3',
      NAMMA: '#FF9800',
    };
    return colors[type] || '#999';
  };

  return (
    <div>
      <AdminNavbar />
      <div className="manage-publications" style={{ backgroundColor: '#f5f7fa', minHeight: '100vh', padding: '20px' }}>
        {/* Header Section */}
        <div style={{ maxWidth: '1400px', margin: '0 auto', marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 8px 0' }}>
                📰 Publications Directory
              </h1>
              <p style={{ fontSize: '16px', color: '#666', margin: 0 }}>
                Manage and organize all publications by type and location
              </p>
            </div>
            <button 
              className="btn-create" 
              onClick={openCreateModal}
              style={{
                backgroundColor: '#1976d2',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = '#1565c0';
                (e.target as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.4)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = '#1976d2';
                (e.target as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(25, 118, 210, 0.3)';
              }}
            >
              ➕ Add Publication
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <div style={{
              backgroundColor: '#ffebee',
              border: '1px solid #ef5350',
              color: '#c62828',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px',
            }}>
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div style={{
              backgroundColor: '#e8f5e9',
              border: '1px solid #66bb6a',
              color: '#2e7d32',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px',
            }}>
              ✅ {success}
            </div>
          )}
        </div>

        {/* Statistics Section */}
        {publications.length > 0 && (
          <div style={{ maxWidth: '1400px', margin: '0 auto', marginBottom: '30px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '16px' }}>
              📊 Statistics
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px',
            }}>
              {[
                { label: 'Total', value: publications.length, color: '#1976d2' },
                { label: 'OSP', value: publications.filter((p) => p.type === 'OSP').length, color: '#2196F3' },
                { label: 'VK', value: publications.filter((p) => p.type === 'VK').length, color: '#4CAF50' },
                { label: 'NAMMA', value: publications.filter((p) => p.type === 'NAMMA').length, color: '#FF9800' },
                { label: 'Locations', value: locations.length, color: '#9C27B0' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    borderTop: `4px solid ${stat.color}`,
                  }}
                >
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#999', fontWeight: '600' }}>
                    {stat.label}
                  </p>
                  <p style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: stat.color }}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Section */}
        <div style={{ maxWidth: '1400px', margin: '0 auto', marginBottom: '30px' }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              alignItems: 'flex-end',
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                  📂 Filter by Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.6 : 1,
                  }}
                >
                  <option value="ALL">All Types</option>
                  <option value="OSP">OSP</option>
                  <option value="VK">VK</option>
                  <option value="NAMMA">NAMMA</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                  📍 Filter by Location
                </label>
                <select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.6 : 1,
                  }}
                >
                  <option value="ALL">All Locations</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                  🔍 Search
                </label>
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    opacity: isLoading ? 0.6 : 1,
                    cursor: isLoading ? 'not-allowed' : 'text',
                  }}
                />
              </div>

              <div style={{
                backgroundColor: '#e3f2fd',
                padding: '10px 16px',
                borderRadius: '8px',
                textAlign: 'center',
                fontWeight: '600',
                color: '#1976d2',
                fontSize: '14px',
              }}>
                {filteredPublications.length} / {publications.length}
              </div>
            </div>
          </div>
        </div>

        {/* Publications Grid */}
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {isLoading ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#666',
              fontSize: '18px',
            }}>
              ⏳ Loading publications...
            </div>
          ) : filteredPublications.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '20px',
            }}>
              {filteredPublications.map((pub) => (
                <div
                  key={pub.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    transform: 'translateY(0)',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = 'translateY(-4px)';
                    el.style.boxShadow = '0 8px 16px rgba(0,0,0,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = 'translateY(0)';
                    el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                  }}
                >
                  {/* Card Header */}
                  <div style={{
                    padding: '16px',
                    borderBottom: '1px solid #eee',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#1a1a1a',
                    }}>
                      {pub.name}
                    </h3>
                    <span
                      style={{
                        backgroundColor: getTypeColor(pub.type),
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                      }}
                    >
                      {pub.type}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: '16px' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        📍 Location
                      </p>
                      <p style={{ margin: 0, fontSize: '15px', color: '#333', fontWeight: '600' }}>
                        {pub.location || 'Not specified'}
                      </p>
                    </div>
                    {pub.code && (
                      <div>
                        <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          📋 Code
                        </p>
                        <p style={{ margin: 0, fontSize: '15px', color: '#333', fontWeight: '600', fontFamily: 'monospace' }}>
                          {pub.code}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div style={{
                    padding: '12px 16px',
                    backgroundColor: '#f9f9f9',
                    borderTop: '1px solid #eee',
                    display: 'flex',
                    gap: '8px',
                  }}>
                    <button
                      onClick={() => openEditModal(pub)}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        backgroundColor: '#e3f2fd',
                        color: '#1976d2',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = '#bbdefb';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = '#e3f2fd';
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(pub.id)}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        backgroundColor: '#ffebee',
                        color: '#d32f2f',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = '#ffcdd2';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = '#ffebee';
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#999',
              fontSize: '18px',
              backgroundColor: 'white',
              borderRadius: '12px',
            }}>
              📭 No publications found
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
            }}
            onClick={closeModal}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{
                padding: '24px',
                borderBottom: '1px solid #eee',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#1a1a1a' }}>
                  {isEditing ? '✏️ Edit Publication' : '➕ New Publication'}
                </h2>
                <button
                  onClick={closeModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#999',
                    padding: '0',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#f0f0f0';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '24px' }}>
                {error && (
                  <div style={{
                    backgroundColor: '#ffebee',
                    border: '1px solid #ef5350',
                    color: '#c62828',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '14px',
                  }}>
                    ⚠️ {error}
                  </div>
                )}

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                    Publication Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., The Hindu"
                    disabled={isSaving}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      opacity: isSaving ? 0.6 : 1,
                      cursor: isSaving ? 'not-allowed' : 'text',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                    Code
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="e.g., THE001"
                    disabled={isSaving}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      opacity: isSaving ? 0.6 : 1,
                      cursor: isSaving ? 'not-allowed' : 'text',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                    Type *
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    disabled={isSaving}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      boxSizing: 'border-box',
                      opacity: isSaving ? 0.6 : 1,
                    }}
                  >
                    <option value="VK">VK</option>
                    <option value="OSP">OSP</option>
                    <option value="NAMMA">NAMMA</option>
                  </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                    Location 📍 *
                  </label>
                  <select
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    disabled={isSaving || locations.length === 0}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      cursor: isSaving || locations.length === 0 ? 'not-allowed' : 'pointer',
                      boxSizing: 'border-box',
                      opacity: isSaving || locations.length === 0 ? 0.6 : 1,
                    }}
                  >
                    <option value="">Select Location</option>
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                  {locations.length === 0 && (
                    <small style={{ display: 'block', marginTop: '8px', color: '#d32f2f' }}>
                      ⚠️ No locations available. Make sure users have locations configured.
                    </small>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '20px 24px',
                borderTop: '1px solid #eee',
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
              }}>
                <button
                  onClick={closeModal}
                  disabled={isSaving}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: '#f0f0f0',
                    color: '#333',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    opacity: isSaving ? 0.6 : 1,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSaving) {
                      (e.target as HTMLButtonElement).style.backgroundColor = '#e0e0e0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSaving) {
                      (e.target as HTMLButtonElement).style.backgroundColor = '#f0f0f0';
                    }
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || locations.length === 0}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: isSaving || locations.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: isSaving || locations.length === 0 ? 0.6 : 1,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSaving && locations.length > 0) {
                      (e.target as HTMLButtonElement).style.backgroundColor = '#1565c0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSaving && locations.length > 0) {
                      (e.target as HTMLButtonElement).style.backgroundColor = '#1976d2';
                    }
                  }}
                >
                  {isSaving ? '⏳ Saving...' : isEditing ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagePublications;