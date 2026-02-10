import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { productionAPI, masterAPI } from '../services/api';
import { AdminNavbar } from '../components/Navbar';

interface Publication {
  id: number;
  name: string;
  code?: string;
  type: 'VK' | 'OSP' | 'NAMMA';
  location?: string;
}

interface Machine {
  id: number;
  name: string;
  code: string;
}

interface ProductionRecord {
  id: number;
  user_id: number;
  user_name?: string;
  user_email?: string;
  user_location?: string;
  publication_id: number | null;
  custom_publication_name: string | null;
  po_number: number;
  color_pages: number;
  bw_pages: number;
  total_pages: number;
  machine_id: number;
  lprs_time: string;
  page_start_time: string;
  page_end_time: string;
  newsprint_id: number | null;
  newsprint_kgs: number;
  plate_consumption: number;
  remarks: string;
  record_date: string;
  created_at: string;
  downtime_entries?: any[];
}

export const AdminReports: React.FC = () => {
  const { user } = useAuth();
  const [vkPublications, setVkPublications] = useState<Publication[]>([]);
  const [ospPublications, setOspPublications] = useState<Publication[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [downtimeReasons, setDowntimeReasons] = useState<any[]>([]);

  // All publications (unfiltered)
  const [allVkPublications, setAllVkPublications] = useState<Publication[]>([]);
  const [allOspPublications, setAllOspPublications] = useState<Publication[]>([]);

  // Selected publications
  const [selectedVkPub, setSelectedVkPub] = useState<string>('ALL');
  const [selectedOspPub, setSelectedOspPub] = useState<string>('ALL');

  // Filters
  const [filters, setFilters] = useState({
    startDate: (() => {
      const now = new Date();
      const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const year = istTime.getFullYear();
      const month = istTime.getMonth();
      const day = 1;
      const firstDay = new Date(year, month, day);
      const year_str = firstDay.getFullYear();
      const month_str = String(firstDay.getMonth() + 1).padStart(2, '0');
      const day_str = String(firstDay.getDate()).padStart(2, '0');
      return `${year_str}-${month_str}-${day_str}`;
    })(),
    endDate: (() => {
      const now = new Date();
      const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const year_str = istTime.getFullYear();
      const month_str = String(istTime.getMonth() + 1).padStart(2, '0');
      const day_str = String(istTime.getDate()).padStart(2, '0');
      return `${year_str}-${month_str}-${day_str}`;
    })(),
    location: '',
  });

  const [allRecords, setAllRecords] = useState<ProductionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalRecord, setModalRecord] = useState<ProductionRecord | null>(null);

  // Load master data on mount
  useEffect(() => {
    const loadMasterData = async (): Promise<void> => {
      try {
        console.log('📡 Loading master data...');
        const [vkRes, ospRes, locRes, machRes, dtRes] = await Promise.all([
          masterAPI.getPublications('VK'),
          masterAPI.getPublications('OSP'),
          masterAPI.getLocations(),
          masterAPI.getMachines(),
          masterAPI.getDowntimeReasons(),
        ]);

        const vkData = vkRes.data.data || vkRes.data;
        const ospData = ospRes.data.data || ospRes.data;
        const locationData = locRes.data.data || locRes.data;
        const machData = machRes.data.data || machRes.data;
        const dtData = dtRes.data.data || dtRes.data;

        const vkArray = Array.isArray(vkData) ? vkData : [];
        const ospArray = Array.isArray(ospData) ? ospData : [];
        const locationsArray = Array.isArray(locationData) ? locationData : [];
        const machArray = Array.isArray(machData) ? machData : [];
        const dtArray = Array.isArray(dtData) ? dtData : [];

        setAllVkPublications(vkArray);
        setAllOspPublications(ospArray);
        setVkPublications(vkArray);
        setOspPublications(ospArray);
        setLocations(locationsArray);
        setMachines(machArray);
        setDowntimeReasons(dtArray);

        console.log('✓ Master data loaded');
      } catch (error) {
        console.error('❌ Error loading master data:', error);
        setError('Failed to load master data');
      } finally {
        setIsLoading(false);
      }
    };

    loadMasterData();
  }, []);

  // Fetch records when filters change
  useEffect(() => {
    const fetchRecords = async (): Promise<void> => {
      const pubIds: number[] = [];

      if (selectedVkPub === 'ALL') {
        pubIds.push(...vkPublications.map((p) => p.id));
      } else if (selectedVkPub && selectedVkPub !== '') {
        pubIds.push(parseInt(selectedVkPub, 10));
      }

      if (selectedOspPub === 'ALL') {
        pubIds.push(...ospPublications.map((p) => p.id));
      } else if (selectedOspPub && selectedOspPub !== '') {
        pubIds.push(parseInt(selectedOspPub, 10));
      }

      // Allow empty pubIds - admin can view all records
      setIsLoading(true);
      setError('');

      try {
        const params: any = {
          start_date: filters.startDate,
          end_date: filters.endDate,
        };

        if (pubIds.length > 0) {
          params.publication_ids = pubIds.join(',');
        }

        if (filters.location) {
          params.location = filters.location;
        }

        const res = await productionAPI.getRecords(params);
        const recordsData = res.data.data || res.data || [];
        setAllRecords(Array.isArray(recordsData) ? recordsData : []);

        console.log('✓ Records loaded:', recordsData.length);
      } catch (err: any) {
        console.error('❌ Error fetching records:', err);
        setError(err.response?.data?.error || 'Failed to load records');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecords();
  }, [
    selectedVkPub,
    selectedOspPub,
    filters.startDate,
    filters.endDate,
    filters.location,
    vkPublications,
    ospPublications,
  ]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === 'location') {
      if (value === '') {
        setVkPublications(allVkPublications);
        setOspPublications(allOspPublications);
      } else {
        const filteredVk = allVkPublications.filter(
          (pub) => pub.location?.toLowerCase() === value.toLowerCase()
        );
        const filteredOsp = allOspPublications.filter(
          (pub) => pub.location?.toLowerCase() === value.toLowerCase()
        );
        setVkPublications(filteredVk);
        setOspPublications(filteredOsp);
      }
      setSelectedVkPub('ALL');
      setSelectedOspPub('ALL');
    }
  };

  const handleVkPubChange = (value: string) => {
    if (value === '') {
      setSelectedVkPub('ALL');
      setSelectedOspPub('');
    } else if (value === 'ALL') {
      setSelectedVkPub('ALL');
      setSelectedOspPub('');
    } else {
      setSelectedVkPub(value);
      setSelectedOspPub('');
    }
  };

  const handleOspPubChange = (value: string) => {
    if (value === '') {
      setSelectedOspPub('ALL');
      setSelectedVkPub('');
    } else if (value === 'ALL') {
      setSelectedOspPub('ALL');
      setSelectedVkPub('');
    } else {
      setSelectedOspPub(value);
      setSelectedVkPub('');
    }
  };

  const getPublicationName = (pubId: number | null, customName: string | null): string => {
    if (customName) return customName;
    if (pubId) {
      const allPubs = [...vkPublications, ...ospPublications];
      const pub = allPubs.find((p) => p.id === pubId);
      return pub?.name || 'Unknown';
    }
    return 'N/A';
  };

  const getMachineName = (machineId: number): string => {
    const machine = machines.find((m) => m.id === machineId);
    return machine?.name || 'Unknown';
  };

  const getDowntimeReasonName = (reasonId: number): string => {
    const reason = downtimeReasons.find((r) => r.id === reasonId);
    return reason?.reason || reason?.name || `Unknown (ID: ${reasonId})`;
  };

  if (!user || user.role !== 'admin') {
    return (
      <div>
        <AdminNavbar />
        <div className="admin-dashboard">
          <div className="error-message">🔒 Admin access required</div>
        </div>
      </div>
    );
  }

  if (isLoading && vkPublications.length === 0) {
    return (
      <div>
        <AdminNavbar />
        <div className="admin-dashboard">
          <div className="loading">⏳ Loading reports...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AdminNavbar />
      <div className="admin-dashboard">
        <div className="dashboard-header">
          <h1>📊 Production Records Reports</h1>
          <p>View all user submissions with filters</p>
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {/* FILTERS SECTION */}
        <div className="filters-container">
          <div className="filters-grid">
            <div className="filter-group">
              <label htmlFor="startDate">Start Date</label>
              <input
                id="startDate"
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
              />
            </div>
            <div className="filter-group">
              <label htmlFor="endDate">End Date</label>
              <input
                id="endDate"
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
              />
            </div>
            <div className="filter-group">
              <label htmlFor="location">Location</label>
              <select
                id="location"
                name="location"
                value={filters.location}
                onChange={handleFilterChange}
              >
                <option value="">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* PUBLICATION SELECTION SECTION */}
        <div className="publication-selection-container">
          <h3>📰 Filter by Publications (Optional)</h3>
          <div className="publications-dropdowns">
            <div className="publication-filter">
              <label htmlFor="vkFilter">VK Publications</label>
              <select
                id="vkFilter"
                value={selectedVkPub}
                onChange={(e) => handleVkPubChange(e.target.value)}
              >
                <option value="ALL">All VK ({vkPublications.length})</option>
                {vkPublications.map((pub) => (
                  <option key={pub.id} value={pub.id}>
                    {pub.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="publication-filter">
              <label htmlFor="ospFilter">OSP Publications</label>
              <select
                id="ospFilter"
                value={selectedOspPub}
                onChange={(e) => handleOspPubChange(e.target.value)}
              >
                <option value="ALL">All OSP ({ospPublications.length})</option>
                {ospPublications.map((pub) => (
                  <option key={pub.id} value={pub.id}>
                    {pub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* RECORDS TABLE SECTION */}
        <div className="reports-container">
          <h3>📋 Production Records ({allRecords.length})</h3>

          {allRecords.length > 0 ? (
            <div className="table-wrapper">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>Submitted By</th>
                    <th>Location</th>
                    <th>Date</th>
                    <th>Publication</th>
                    <th>PO #</th>
                    <th>Machine</th>
                    <th>Color Pg</th>
                    <th>BW Pg</th>
                    <th>Total Pg</th>
                    <th>LPRS Time</th>
                    <th>Print Time</th>
                    <th>Newsprint (Kg)</th>
                    <th>Plate</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allRecords.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <strong>{record.user_name || 'Unknown'}</strong>
                        <br />
                        <small>{record.user_email || ''}</small>
                      </td>
                      <td>{record.user_location || 'N/A'}</td>
                      <td>{new Date(record.record_date).toLocaleDateString()}</td>
                      <td>{getPublicationName(record.publication_id, record.custom_publication_name)}</td>
                      <td><strong>{record.po_number}</strong></td>
                      <td>{getMachineName(record.machine_id)}</td>
                      <td>{record.color_pages}</td>
                      <td>{record.bw_pages}</td>
                      <td><strong>{record.total_pages}</strong></td>
                      <td>{record.lprs_time}</td>
                      <td>{record.page_start_time} - {record.page_end_time}</td>
                      <td>{(parseFloat(record.newsprint_kgs?.toString() || "0")).toFixed(2)}</td>
                      <td>{record.plate_consumption}</td>
                      <td className="actions-cell">
                        <button
                          className="btn-view"
                          onClick={() => setModalRecord(record)}
                          title="View details"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-records">
              <p>No production records found for the selected filters.</p>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {modalRecord && (
          <div style={{
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
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '10px',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            }}>
              <h3>📄 Record Details</h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '15px',
                marginTop: '15px',
              }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Submitted By</label>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}>{modalRecord.user_name}</p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Email</label>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}>{modalRecord.user_email}</p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Date</label>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}>{new Date(modalRecord.record_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Publication</label>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}>
                    {getPublicationName(modalRecord.publication_id, modalRecord.custom_publication_name)}
                  </p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>PO Number</label>
                  <p style={{ margin: '5px 0', fontSize: '14px', fontWeight: 'bold' }}>{modalRecord.po_number}</p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Machine</label>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}>{getMachineName(modalRecord.machine_id)}</p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Color Pages</label>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}>{modalRecord.color_pages}</p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>BW Pages</label>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}>{modalRecord.bw_pages}</p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Total Pages</label>
                  <p style={{ margin: '5px 0', fontSize: '14px', fontWeight: 'bold' }}>{modalRecord.total_pages}</p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>LPRS Time</label>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}>{modalRecord.lprs_time}</p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Page Start Time</label>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}>{modalRecord.page_start_time}</p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Page End Time</label>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}>{modalRecord.page_end_time}</p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Newsprint (Kg)</label>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}>{(parseFloat(modalRecord.newsprint_kgs?.toString() || "0")).toFixed(2)}</p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Plate Consumption</label>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}>{modalRecord.plate_consumption}</p>
                </div>
              </div>

              {/* Downtime Breakdown Section */}
              {modalRecord.downtime_entries && modalRecord.downtime_entries.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>⏹️ Downtime Breakdown</label>
                  <div style={{ marginTop: '10px' }}>
                    {modalRecord.downtime_entries.map((entry: any, idx: number) => (
                      <div key={idx} style={{
                        padding: '8px',
                        backgroundColor: '#fff3e0',
                        borderLeft: '4px solid #ff9800',
                        marginBottom: '8px',
                        borderRadius: '4px',
                      }}>
                        <p style={{ margin: '0 0 5px 0', fontSize: '13px', fontWeight: 'bold', color: '#ff6f00' }}>
                          Reason: {getDowntimeReasonName(entry.downtime_reason_id)}
                        </p>
                        <p style={{ margin: '0', fontSize: '13px', color: '#666' }}>
                          Duration: <strong>{entry.downtime_duration}</strong>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {modalRecord.remarks && (
                <div style={{ marginTop: '20px' }}>
                  <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Remarks</label>
                  <p style={{ margin: '5px 0', fontSize: '14px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
                    {modalRecord.remarks}
                  </p>
                </div>
              )}

              <div style={{
                display: 'flex',
                gap: '10px',
                marginTop: '25px',
                justifyContent: 'flex-end',
              }}>
                <button
                  onClick={() => setModalRecord(null)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReports;
