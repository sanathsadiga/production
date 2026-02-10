import React, { useState, useEffect } from 'react';
import { AdminNavbar } from '../components/Navbar';
import { masterAPI, productionAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import '../styles/admin-dashboard.css';

interface Publication {
  id: number;
  name: string;
  code?: string;
  type: 'VK' | 'OSP' | 'NAMMA';
  location?: string;
}

interface ChartData {
  po: any[];
  machine: any[];
  lprs: any[];
  newsprint: any[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

// Helper function to format dates - show only date, no time
const formatDateOnly = (dateString: string): string => {
  if (!dateString) return dateString;
  // Handle ISO format (2026-02-09T18:30:00.000Z) and space-separated format
  // Split by 'T' for ISO format, or by space for other formats
  const datePart = dateString.includes('T') ? dateString.split('T')[0] : dateString.split(' ')[0];
  return datePart || dateString;
};

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [vkPublications, setVkPublications] = useState<Publication[]>([]);
  const [ospPublications, setOspPublications] = useState<Publication[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  
  // All publications (unfiltered)
  const [allVkPublications, setAllVkPublications] = useState<Publication[]>([]);
  const [allOspPublications, setAllOspPublications] = useState<Publication[]>([]);

  // Selected publications
  const [selectedVkPub, setSelectedVkPub] = useState<string>('ALL');
  const [selectedOspPub, setSelectedOspPub] = useState<string>('ALL');

  // Filters
  const [filters, setFilters] = useState({
    startDate: (() => {
      // Get current date in Indian Standard Time (IST, UTC+5:30)
      const now = new Date();
      const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      
      // Get first day of current month
      const year = istTime.getFullYear();
      const month = istTime.getMonth();
      const day = 1;
      
      // Create date with proper formatting
      const firstDay = new Date(year, month, day);
      const year_str = firstDay.getFullYear();
      const month_str = String(firstDay.getMonth() + 1).padStart(2, '0');
      const day_str = String(firstDay.getDate()).padStart(2, '0');
      
      return `${year_str}-${month_str}-${day_str}`;
    })(),
    endDate: (() => {
      // Get current date in Indian Standard Time (IST, UTC+5:30)
      const now = new Date();
      const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      
      const year_str = istTime.getFullYear();
      const month_str = String(istTime.getMonth() + 1).padStart(2, '0');
      const day_str = String(istTime.getDate()).padStart(2, '0');
      
      return `${year_str}-${month_str}-${day_str}`;
    })(),
    location: '',
  });

  const [chartData, setChartData] = useState<ChartData>({
    po: [],
    machine: [],
    lprs: [],
    newsprint: [],
  });

  const [newsprintKgsData, setNewsprintKgsData] = useState<any[]>([]);
  const [newsprintAnalytics, setNewsprintAnalytics] = useState<any>(null);
  const [plateConsumptionAnalytics, setPlateConsumptionAnalytics] = useState<any>(null);
  const [machineAnalytics, setMachineAnalytics] = useState<any>(null);
  const [printOrdersAnalytics, setPrintOrdersAnalytics] = useState<any>(null);
  const [printDurationAnalytics, setPrintDurationAnalytics] = useState<any>(null);
  const [machineDowntimeData, setMachineDowntimeData] = useState<any[]>([]);
  const [machineDowntimeByMachine, setMachineDowntimeByMachine] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Downtime detail modal state
  const [downtimeDetailModal, setDowntimeDetailModal] = useState<any>(null);
  const [downtimeDetails, setDowntimeDetails] = useState<any[]>([]);

  // Load master data on mount
  useEffect(() => {
    const loadMasterData = async (): Promise<void> => {
      try {
        console.log('📡 Loading master data...');
        const [vkRes, ospRes, locRes] = await Promise.all([
          masterAPI.getPublications('VK'),
          masterAPI.getPublications('OSP'),
          masterAPI.getLocations(), // ✅ Fetch locations from users table, not publications
        ]);

        const vkData = vkRes.data.data || vkRes.data;
        const ospData = ospRes.data.data || ospRes.data;
        const locationData = locRes.data.data || locRes.data;

        const vkArray = Array.isArray(vkData) ? vkData : [];
        const ospArray = Array.isArray(ospData) ? ospData : [];
        const locationsArray = Array.isArray(locationData) ? locationData : [];

        // ✅ Store all publications (unfiltered) for filtering by location later
        setAllVkPublications(vkArray);
        setAllOspPublications(ospArray);
        
        // Initially show all publications
        setVkPublications(vkArray);
        setOspPublications(ospArray);

        // ✅ Set locations from API (user table only, excludes admins)
        console.log('✓ Locations from API:', locationsArray);
        setLocations(locationsArray);

        console.log('✓ Master data loaded:', { vk: vkArray.length, osp: ospArray.length, locations: locationsArray.length });
      } catch (error) {
        console.error('❌ Error loading master data:', error);
        setError('Failed to load master data');
      } finally {
        setIsLoading(false);
      }
    };

    loadMasterData();
  }, []);

  // Fetch analytics when filters or selected publications change
  useEffect(() => {
    const fetchAnalytics = async (): Promise<void> => {
      const pubIds: number[] = [];

      // ✅ Only add VK publications if VK is not set to empty
      if (selectedVkPub === 'ALL') {
        pubIds.push(...vkPublications.map((p) => p.id));
      } else if (selectedVkPub && selectedVkPub !== '') {
        pubIds.push(parseInt(selectedVkPub, 10));
      }

      // ✅ Only add OSP publications if OSP is not set to empty
      if (selectedOspPub === 'ALL') {
        pubIds.push(...ospPublications.map((p) => p.id));
      } else if (selectedOspPub && selectedOspPub !== '') {
        pubIds.push(parseInt(selectedOspPub, 10));
      }

      // If no publications selected, clear charts
      if (pubIds.length === 0) {
        setChartData({ po: [], machine: [], lprs: [], newsprint: [] });
        setNewsprintKgsData([]);
        setMachineDowntimeData([]);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const params = {
          publication_ids: pubIds.join(','),
          start_date: filters.startDate,
          end_date: filters.endDate,
          ...(filters.location && { location: filters.location }),
        };

        const [poRes, printOrdersRes, machineRes, machineDetailedRes, lprsRes, newsprintRes, newsprintKgsRes, plateRes, downtimeRes, downtimeByMachineRes, printDurationRes] =
          await Promise.all([
            productionAPI.getAnalyticsPO(params),
            productionAPI.getAnalyticsPrintOrders(params),
            productionAPI.getAnalyticsMachine(params),
            productionAPI.getAnalyticsMachineDetailed(params),
            productionAPI.getAnalyticsLPRS(params),
            productionAPI.getAnalyticsNewsprint(params),
            productionAPI.getAnalyticsNewsprintKgs(params),
            productionAPI.getAnalyticsPlateConsumption(params),
            productionAPI.getAnalyticsDowntime(params),
            productionAPI.getAnalyticsDowntimeByMachine(params),
            productionAPI.getAnalyticsPrintDuration(params),
          ]);

        setChartData({
          po: (poRes.data?.data || []).map((item: any) => ({
            ...item,
            date: item.date ? formatDateOnly(item.date) : item.date,
          })),
          machine: (machineRes.data?.data || []).map((item: any) => ({
            ...item,
            date: item.date ? formatDateOnly(item.date) : item.date,
          })),
          lprs: (lprsRes.data?.data || []).map((item: any) => ({
            ...item,
            date: item.date ? formatDateOnly(item.date) : item.date,
          })),
          newsprint: (newsprintRes.data?.data || []).map((item: any) => ({
            ...item,
            date: item.date ? formatDateOnly(item.date) : item.date,
          })),
        });
        setNewsprintKgsData((newsprintKgsRes.data?.daily_trend || []).map((item: any) => ({
          ...item,
          date: item.date ? formatDateOnly(item.date) : item.date,
        })));
        setNewsprintAnalytics({
          ...newsprintKgsRes.data,
          daily_trend: (newsprintKgsRes.data?.daily_trend || []).map((item: any) => ({
            ...item,
            date: item.date ? formatDateOnly(item.date) : item.date,
          })),
        });
        setPlateConsumptionAnalytics({
          ...plateRes.data,
          daily_trend: (plateRes.data?.daily_trend || []).map((item: any) => ({
            ...item,
            date: item.date ? formatDateOnly(item.date) : item.date,
          })),
          plate_per_page_trend: (plateRes.data?.plate_per_page_trend || []).map((item: any) => ({
            ...item,
            date: item.date ? formatDateOnly(item.date) : item.date,
          })),
        });
        setMachineAnalytics({
          ...machineDetailedRes.data,
          daily_trend: (machineDetailedRes.data?.daily_trend || []).map((item: any) => ({
            ...item,
            date: item.date ? formatDateOnly(item.date) : item.date,
          })),
        });
        setPrintOrdersAnalytics({
          ...printOrdersRes.data,
          daily_trend: (printOrdersRes.data?.daily_trend || []).map((item: any) => ({
            ...item,
            date: item.date ? formatDateOnly(item.date) : item.date,
          })),
        });
        setPrintDurationAnalytics({
          ...printDurationRes.data,
          daily_trend: (printDurationRes.data?.daily_trend || []).map((item: any) => ({
            ...item,
            date: item.date ? formatDateOnly(item.date) : item.date,
          })),
        });
        
        // Convert total_seconds to number for pie chart
        const downtimeData = (downtimeRes.data?.data || []).map((item: any) => ({
          ...item,
          total_seconds: typeof item.total_seconds === 'string' ? parseInt(item.total_seconds, 10) : item.total_seconds,
        }));
        setMachineDowntimeData(downtimeData);
        setMachineDowntimeByMachine(downtimeByMachineRes.data || {});

        console.log('✓ Analytics loaded');
        console.log('🔧 Downtime data:', downtimeData);
      } catch (err: any) {
        console.error('❌ Error fetching analytics:', err);
        setError(err.response?.data?.error || 'Failed to load analytics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
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

    // ✅ If location filter changed, update publications list
    if (name === 'location') {
      if (value === '') {
        // Show all publications if no location selected
        setVkPublications(allVkPublications);
        setOspPublications(allOspPublications);
      } else {
        // Filter publications by selected location
        const filteredVk = allVkPublications.filter(
          (pub) => pub.location?.toLowerCase() === value.toLowerCase()
        );
        const filteredOsp = allOspPublications.filter(
          (pub) => pub.location?.toLowerCase() === value.toLowerCase()
        );
        setVkPublications(filteredVk);
        setOspPublications(filteredOsp);
      }
      // Reset publication selections when location changes
      setSelectedVkPub('ALL');
      setSelectedOspPub('ALL');
    }
  };

  // ✅ Handle VK publication selection
  const handleVkPubChange = (value: string) => {
    console.log('🔍 VK Selection changed to:', value);
    if (value === '') {
      // If clearing VK, reset to ALL and unselect OSP
      console.log('  → Cleared VK, resetting to ALL');
      setSelectedVkPub('ALL');
      setSelectedOspPub('');
    } else if (value === 'ALL') {
      // If selecting ALL VK, unselect OSP
      console.log('  → Setting VK to ALL, clearing OSP');
      setSelectedVkPub('ALL');
      setSelectedOspPub('');
    } else {
      // If selecting individual VK, unselect OSP
      console.log('  → Individual VK selected, clearing OSP');
      setSelectedVkPub(value);
      setSelectedOspPub('');
    }
  };

  // ✅ Handle OSP publication selection
  const handleOspPubChange = (value: string) => {
    console.log('🔍 OSP Selection changed to:', value);
    if (value === '') {
      // If clearing OSP, reset to ALL and unselect VK
      console.log('  → Cleared OSP, resetting to ALL');
      setSelectedOspPub('ALL');
      setSelectedVkPub('');
    } else if (value === 'ALL') {
      // If selecting ALL OSP, unselect VK
      console.log('  → Setting OSP to ALL, clearing VK');
      setSelectedOspPub('ALL');
      setSelectedVkPub('');
    } else {
      // If selecting individual OSP, unselect VK
      console.log('  → Individual OSP selected, clearing VK');
      setSelectedOspPub(value);
      setSelectedVkPub('');
    }
  };

  // ✅ Handle downtime breakdown row click - show details
  const handleDowntimeRowClick = async (downtimeReason: any) => {
    console.log('🔍 Clicked downtime reason:', downtimeReason);
    setDowntimeDetailModal(downtimeReason);
    
    // Fetch detailed downtime entries for this reason from backend
    try {
      const publicationIds = selectedVkPub === 'ALL' && selectedOspPub === 'ALL'
        ? [...vkPublications, ...ospPublications].map((p) => p.id).join(',')
        : selectedVkPub === 'ALL'
        ? vkPublications.map((p) => p.id).join(',')
        : selectedOspPub === 'ALL'
        ? ospPublications.map((p) => p.id).join(',')
        : `${selectedVkPub || ''},${selectedOspPub || ''}`.split(',').filter(Boolean).join(',');

      const params = {
        publication_ids: publicationIds,
        start_date: filters.startDate,
        end_date: filters.endDate,
        ...(filters.location && { location: filters.location }),
      };

      const response = await productionAPI.getDowntimeDetails(downtimeReason.id, params);
      const detailedRecords = response.data.data || [];
      const avgPerDay = response.data.avg_per_day || '00:00:00'; // Get avg_per_day from backend

      console.log('📊 Downtime details records:', detailedRecords);
      console.log('📈 Avg per day from backend:', avgPerDay);

      // Get all publications with their locations
      const allPublications = [...vkPublications, ...ospPublications];
      
      // Group records by publication and sum durations
      const publicationDurations: { [key: string]: { location: string; durations: string[] } } = {};
      
      detailedRecords.forEach((record: any) => {
        const pubName = record.publication_name;
        const pub = allPublications.find((p) => p.name === pubName);
        const location = pub?.location || 'Unknown';
        const key = `${pubName}|${location}`;
        
        if (!publicationDurations[key]) {
          publicationDurations[key] = { location, durations: [] };
        }
        
        // Format duration - downtime_duration is stored as TIME format (HH:MM:SS string)
        let formattedDuration = '00:00:00';
        if (record.downtime_duration) {
          // If it's already in HH:MM:SS format, use it directly
          if (typeof record.downtime_duration === 'string' && record.downtime_duration.includes(':')) {
            formattedDuration = record.downtime_duration;
          } else {
            // If it's a number (seconds), convert to HH:MM:SS
            let duration = record.downtime_duration;
            if (typeof duration === 'string') {
              duration = parseInt(duration, 10);
            }
            
            if (duration && !isNaN(duration) && duration > 0) {
              const hours = Math.floor(duration / 3600);
              const minutes = Math.floor((duration % 3600) / 60);
              const seconds = Math.floor(duration % 60);
              formattedDuration = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }
          }
        }
        
        publicationDurations[key].durations.push(formattedDuration);
      });

      // Format publications with their durations
      const publicationsWithDurations = Object.entries(publicationDurations)
        .map(([key, data]) => {
          const [pubName] = key.split('|');
          const durationsStr = data.durations.length > 0 ? data.durations.join(', ') : '00:00:00';
          return `${pubName} (${data.location}) - ${durationsStr}`;
        })
        .join('\n');

      setDowntimeDetails([
        {
          reason: downtimeReason.downtime_reason,
          category: downtimeReason.category,
          occurrences: downtimeReason.total_occurrences,
          totalDuration: downtimeReason.total_duration,
          avgDuration: Math.round(downtimeReason.total_seconds / downtimeReason.total_occurrences),
          publications: publicationsWithDurations || 'No publications affected',
        }
      ]);
    } catch (err) {
      console.error('❌ Error fetching downtime details:', err);
      // Fallback: show all selected publications with locations if query fails
      const pubNamesWithLocation = [...vkPublications, ...ospPublications]
        .map((p) => `${p.name} (${p.location})`)
        .join(', ');

      setDowntimeDetails([
        {
          reason: downtimeReason.downtime_reason,
          category: downtimeReason.category,
          occurrences: downtimeReason.total_occurrences,
          totalDuration: downtimeReason.total_duration,
          avgDuration: Math.round(downtimeReason.total_seconds / downtimeReason.total_occurrences),
          publications: pubNamesWithLocation || 'All Publications',
        }
      ]);
    }
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
          <div className="loading">⏳ Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AdminNavbar />
      <div className="admin-dashboard">
        <div className="dashboard-header">
          <h1>📊 Production Analytics Dashboard</h1>
          <p>Welcome, {user?.name}</p>
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
          <h3>📰 Select Publications</h3>

          <div className="publications-dropdowns">
            <div className="dropdown-wrapper">
              <label htmlFor="vkPub">VK Publications</label>
              <select
                id="vkPub"
                value={selectedVkPub}
                onChange={(e) => handleVkPubChange(e.target.value)}
                className="publication-dropdown"
              >
                <option value="">-- Select VK Publication --</option>
                <option value="ALL">
                  ✓ All VK Publications ({vkPublications.length})
                </option>
                {vkPublications.map((pub) => (
                  <option key={`vk-${pub.id}`} value={pub.id}>
                    {pub.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="dropdown-wrapper">
              <label htmlFor="ospPub">OSP Publications</label>
              <select
                id="ospPub"
                value={selectedOspPub}
                onChange={(e) => handleOspPubChange(e.target.value)}
                className="publication-dropdown"
              >
                <option value="">-- Select OSP Publication --</option>
                <option value="ALL">
                  ✓ All OSP Publications ({ospPublications.length})
                </option>
                {ospPublications.map((pub) => (
                  <option key={`osp-${pub.id}`} value={pub.id}>
                    {pub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* CHARTS SECTION */}
        <div className="charts-container">
          <div className="chart-wrapper">
            <h3>�️ Print Orders (PO) - Comprehensive Analytics</h3>
            {printOrdersAnalytics && (printOrdersAnalytics.by_publication || []).length > 0 ? (
              <div style={{ width: '100%' }}>
                {/* Statistics Cards */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '15px',
                  marginBottom: '25px'
                }}>
                  <div style={{
                    backgroundColor: '#e3f2fd',
                    border: '2px solid #2196F3',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>TOTAL PRINT ORDERS</p>
                    <p style={{ margin: 0, color: '#2196F3', fontSize: '28px', fontWeight: 'bold' }}>
                      {printOrdersAnalytics.statistics?.total_unique_pos || 0}
                    </p>
                  </div>
                  <div style={{
                    backgroundColor: '#fff3e0',
                    border: '2px solid #ff9800',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>TOTAL PAGES PRINTED</p>
                    <p style={{ margin: 0, color: '#ff9800', fontSize: '28px', fontWeight: 'bold' }}>
                      {(printOrdersAnalytics.statistics?.total_pages || 0).toLocaleString()}
                    </p>
                  </div>
                 
                  <div style={{
                    backgroundColor: '#e8f5e9',
                    border: '2px solid #4caf50',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>MACHINES USED</p>
                    <p style={{ margin: 0, color: '#4caf50', fontSize: '28px', fontWeight: 'bold' }}>
                      {printOrdersAnalytics.statistics?.unique_machines || 0}
                    </p>
                  </div>
                  <div style={{
                    backgroundColor: '#fce4ec',
                    border: '2px solid #e91e63',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>PUBLICATIONS</p>
                    <p style={{ margin: 0, color: '#e91e63', fontSize: '28px', fontWeight: 'bold' }}>
                      {printOrdersAnalytics.statistics?.unique_publications || 0}
                    </p>
                  </div>
                </div>

                {/* POs by Publication Bar Chart */}
                <div style={{ marginBottom: '30px' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>📊 Print Orders by Publication</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={printOrdersAnalytics.by_publication || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="publication_name" angle={-45} textAnchor="end" height={80} />
                      <YAxis yAxisId="left" allowDecimals={false} />
                      <YAxis yAxisId="right" orientation="right" allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="total_pos" fill="#2196F3" name="POs" />
                      <Bar yAxisId="right" dataKey="total_pages" fill="#ff9800" name="Total Pages" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* POs by Machine Bar Chart */}
                <div style={{ marginBottom: '30px' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>⚙️ Print Orders by Machine</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={printOrdersAnalytics.by_machine || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="machine_name" angle={-45} textAnchor="end" height={80} />
                      <YAxis yAxisId="left" allowDecimals={false} />
                      <YAxis yAxisId="right" orientation="right" allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="total_pos" fill="#9c27b0" name="POs" />
                      <Bar yAxisId="right" dataKey="total_pages" fill="#ffc658" name="Total Pages" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Daily PO Trend Line Chart */}
                {printOrdersAnalytics.daily_trend && printOrdersAnalytics.daily_trend.length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>📈 Daily Print Orders Trend</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={printOrdersAnalytics.daily_trend || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDateOnly}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval={Math.max(0, Math.floor((printOrdersAnalytics.daily_trend?.length || 1) / 10) - 1)}
                        />
                        <YAxis yAxisId="left" allowDecimals={false} />
                        <YAxis yAxisId="right" orientation="right" allowDecimals={false} />
                        <Tooltip 
                          formatter={(value: any) => {
                            return typeof value === 'number' ? value.toFixed(0) : value;
                          }}
                          labelFormatter={(label) => `Date: ${formatDateOnly(label)}`}
                        />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="pos_created" stroke="#2196F3" name="POs Created" strokeWidth={2} />
                        <Line yAxisId="right" type="monotone" dataKey="total_pages" stroke="#ff9800" name="Total Pages" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}



                {/* Publication Summary Table */}
                {printOrdersAnalytics.by_publication && printOrdersAnalytics.by_publication.length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>📰 Publication Summary</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '12px',
                        border: '1px solid #ddd',
                      }}>
                        <thead style={{ backgroundColor: '#f5f5f5' }}>
                          <tr>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Publication</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Print Orders</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Total Pages</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Avg Pages/PO</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Min/Max Pages</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Machines</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Newsprint (Kg)</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Total Plates</th>
                          </tr>
                        </thead>
                        <tbody>
                          {printOrdersAnalytics.by_publication.map((pub: any, idx: number) => (
                            <tr key={idx} style={{
                              backgroundColor: idx % 2 === 0 ? '#fafafa' : 'white',
                            }}>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', fontWeight: '500' }}>
                                {pub.publication_name || 'Unknown'}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', color: '#2196F3' }}>
                                {pub.total_pos}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', color: '#ff9800', fontWeight: 'bold' }}>
                                {(pub.total_pages || 0).toLocaleString()}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', color: '#4caf50' }}>
                                {Math.round(pub.avg_pages_per_record || 0)}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', fontSize: '11px', color: '#666' }}>
                                {pub.min_pages} / {pub.max_pages}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', color: '#9c27b0' }}>
                                {pub.machines_used}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', color: '#673ab7' }}>
                                {Math.round(pub.total_newsprint_kgs * 100) / 100}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', color: '#f44336' }}>
                                {pub.total_plates}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Machine Summary Table */}
                {printOrdersAnalytics.by_machine && printOrdersAnalytics.by_machine.length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>⚙️ Machine Summary</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '12px',
                        border: '1px solid #ddd',
                      }}>
                        <thead style={{ backgroundColor: '#f5f5f5' }}>
                          <tr>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Machine</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Print Orders</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Total Pages</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Avg Pages/PO</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Min/Max Pages</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Publications</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Newsprint (Kg)</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Total Plates</th>
                          </tr>
                        </thead>
                        <tbody>
                          {printOrdersAnalytics.by_machine.map((machine: any, idx: number) => (
                            <tr key={idx} style={{
                              backgroundColor: idx % 2 === 0 ? '#fafafa' : 'white',
                            }}>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', fontWeight: '500' }}>
                                {machine.machine_name || 'Unknown'}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', color: '#2196F3' }}>
                                {machine.total_pos}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', color: '#ff9800', fontWeight: 'bold' }}>
                                {(machine.total_pages || 0).toLocaleString()}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', color: '#4caf50' }}>
                                {Math.round(machine.avg_pages_per_record || 0)}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', fontSize: '11px', color: '#666' }}>
                                {machine.min_pages} / {machine.max_pages}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', color: '#9c27b0' }}>
                                {machine.publications_printed}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', color: '#673ab7' }}>
                                {Math.round(machine.total_newsprint_kgs * 100) / 100}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', color: '#f44336' }}>
                                {machine.total_plates}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-data">No print orders data available</div>
            )}
          </div>

          {/* PRINT DURATION ANALYTICS SECTION */}
          <div className="chart-wrapper">
            <h3>⏱️ Print Duration - Hours Analysis</h3>
            {printDurationAnalytics && (printDurationAnalytics.by_publication || []).length > 0 ? (
              <div style={{ width: '100%' }}>
                {/* Statistics Cards */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '15px',
                  marginBottom: '25px'
                }}>
                  <div style={{
                    backgroundColor: '#e3f2fd',
                    border: '2px solid #2196F3',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>TOTAL HOURS</p>
                    <p style={{ margin: 0, color: '#2196F3', fontSize: '28px', fontWeight: 'bold' }}>
                      {(printDurationAnalytics.statistics?.total_hours || 0).toFixed(2)}
                    </p>
                  </div>
                  <div style={{
                    backgroundColor: '#fff3e0',
                    border: '2px solid #ff9800',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>AVG HOURS</p>
                    <p style={{ margin: 0, color: '#ff9800', fontSize: '28px', fontWeight: 'bold' }}>
                      {(printDurationAnalytics.statistics?.avg_hours || 0).toFixed(2)}
                    </p>
                  </div>
                  <div style={{
                    backgroundColor: '#e8f5e9',
                    border: '2px solid #4caf50',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>MIN HOURS</p>
                    <p style={{ margin: 0, color: '#4caf50', fontSize: '28px', fontWeight: 'bold' }}>
                      {(printDurationAnalytics.statistics?.min_hours || 0).toFixed(2)}
                    </p>
                  </div>
                  <div style={{
                    backgroundColor: '#fce4ec',
                    border: '2px solid #e91e63',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>MAX HOURS</p>
                    <p style={{ margin: 0, color: '#e91e63', fontSize: '28px', fontWeight: 'bold' }}>
                      {(printDurationAnalytics.statistics?.max_hours || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Hours by Publication Bar Chart */}
                <div style={{ marginBottom: '30px' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>📊 Print Duration by Publication</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={printDurationAnalytics.by_publication || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="publication_name" angle={-45} textAnchor="end" height={80} />
                      <YAxis yAxisId="left" allowDecimals={false} />
                      <YAxis yAxisId="right" orientation="right" allowDecimals={false} />
                      <Tooltip formatter={(value: any) => typeof value === 'number' ? value.toFixed(2) : value} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="total_hours" fill="#2196F3" name="Total Hours" />
                      <Bar yAxisId="right" dataKey="avg_hours" fill="#ff9800" name="Avg Hours" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Hours by Machine Bar Chart */}
                <div style={{ marginBottom: '30px' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>⚙️ Print Duration by Machine</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={printDurationAnalytics.by_machine || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="machine_name" angle={-45} textAnchor="end" height={80} />
                      <YAxis yAxisId="left" allowDecimals={false} />
                      <YAxis yAxisId="right" orientation="right" allowDecimals={false} />
                      <Tooltip formatter={(value: any) => typeof value === 'number' ? value.toFixed(2) : value} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="total_hours" fill="#9c27b0" name="Total Hours" />
                      <Bar yAxisId="right" dataKey="avg_hours" fill="#ffc658" name="Avg Hours" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Daily Print Duration Trend Line Chart */}
                {printDurationAnalytics.daily_trend && printDurationAnalytics.daily_trend.length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>📈 Daily Print Duration Trend</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={printDurationAnalytics.daily_trend || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDateOnly}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval={Math.max(0, Math.floor((printDurationAnalytics.daily_trend?.length || 1) / 10) - 1)}
                        />
                        <YAxis yAxisId="left" allowDecimals={false} />
                        <YAxis yAxisId="right" orientation="right" allowDecimals={false} />
                        <Tooltip 
                          formatter={(value: any) => {
                            return typeof value === 'number' ? value.toFixed(2) : value;
                          }}
                          labelFormatter={(label) => `Date: ${formatDateOnly(label)}`}
                        />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="total_hours" stroke="#2196F3" name="Total Hours" strokeWidth={2} />
                        <Line yAxisId="right" type="monotone" dataKey="avg_hours" stroke="#ff9800" name="Avg Hours" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Publication Summary Table */}
                {printDurationAnalytics.by_publication && printDurationAnalytics.by_publication.length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>📰 Publication Duration Summary</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '12px',
                        border: '1px solid #ddd',
                      }}>
                        <thead style={{ backgroundColor: '#f5f5f5' }}>
                          <tr>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Publication</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Total Hours</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Avg Hours</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Min Hours</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Max Hours</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Records</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Machines</th>
                          </tr>
                        </thead>
                        <tbody>
                          {printDurationAnalytics.by_publication.map((pub: any, idx: number) => (
                            <tr key={idx} style={{
                              backgroundColor: idx % 2 === 0 ? '#fafafa' : 'white',
                            }}>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', fontWeight: '500' }}>
                                {pub.publication_name || 'Unknown'}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', color: '#2196F3' }}>
                                {(pub.total_hours || 0).toFixed(2)}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', color: '#ff9800', fontWeight: 'bold' }}>
                                {(pub.avg_hours || 0).toFixed(2)}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', color: '#4caf50' }}>
                                {(pub.min_hours || 0).toFixed(2)}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', color: '#f44336', fontWeight: 'bold' }}>
                                {(pub.max_hours || 0).toFixed(2)}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', color: '#666' }}>
                                {pub.total_records}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', color: '#9c27b0' }}>
                                {pub.machines_used}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Machine Summary Table */}
                {printDurationAnalytics.by_machine && printDurationAnalytics.by_machine.length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>⚙️ Machine Duration Summary</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '12px',
                        border: '1px solid #ddd',
                      }}>
                        <thead style={{ backgroundColor: '#f5f5f5' }}>
                          <tr>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Machine</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Total Hours</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Avg Hours</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Min Hours</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Max Hours</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Records</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Publications</th>
                          </tr>
                        </thead>
                        <tbody>
                          {printDurationAnalytics.by_machine.map((machine: any, idx: number) => (
                            <tr key={idx} style={{
                              backgroundColor: idx % 2 === 0 ? '#fafafa' : 'white',
                            }}>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', fontWeight: '500' }}>
                                {machine.machine_name || 'Unknown'}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', color: '#2196F3' }}>
                                {(machine.total_hours || 0).toFixed(2)}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', color: '#ff9800', fontWeight: 'bold' }}>
                                {(machine.avg_hours || 0).toFixed(2)}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', color: '#4caf50' }}>
                                {(machine.min_hours || 0).toFixed(2)}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', color: '#f44336', fontWeight: 'bold' }}>
                                {(machine.max_hours || 0).toFixed(2)}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', color: '#666' }}>
                                {machine.total_records}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', color: '#9c27b0' }}>
                                {machine.publications_count}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-data">No print duration data available</div>
            )}
          </div>

          <div className="chart-wrapper">
            <h3>⚙️ Machine Usage - Detailed Analysis</h3>
            {machineAnalytics && (machineAnalytics.by_machine || []).length > 0 ? (
              <div style={{ width: '100%' }}>
                {/* Statistics Cards */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                  gap: '15px',
                  marginBottom: '25px'
                }}>
                  <div style={{
                    backgroundColor: '#e3f2fd',
                    border: '2px solid #2196F3',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>TOTAL MACHINES</p>
                    <p style={{ margin: 0, color: '#2196F3', fontSize: '24px', fontWeight: 'bold' }}>
                      {machineAnalytics.statistics?.total_machines || 0}
                    </p>
                  </div>
                  <div style={{
                    backgroundColor: '#fff3e0',
                    border: '2px solid #ff9800',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>TOTAL RECORDS</p>
                    <p style={{ margin: 0, color: '#ff9800', fontSize: '24px', fontWeight: 'bold' }}>
                      {machineAnalytics.statistics?.total_records || 0}
                    </p>
                  </div>
                  <div style={{
                    backgroundColor: '#f3e5f5',
                    border: '2px solid #9c27b0',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>TOTAL PAGES</p>
                    <p style={{ margin: 0, color: '#9c27b0', fontSize: '24px', fontWeight: 'bold' }}>
                      {machineAnalytics.statistics?.total_pages || 0}
                    </p>
                  </div>
                  <div style={{
                    backgroundColor: '#e8f5e9',
                    border: '2px solid #4caf50',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>AVG PAGES/RECORD</p>
                    <p style={{ margin: 0, color: '#4caf50', fontSize: '24px', fontWeight: 'bold' }}>
                      {machineAnalytics.statistics?.avg_pages_per_record || 0}
                    </p>
                  </div>
                </div>

                {/* Machine Usage Pie Chart */}
                <div style={{ marginBottom: '30px' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>🥧 Machine Usage Distribution</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={machineAnalytics.by_machine || []}
                        dataKey="total_pages"
                        nameKey="machine_name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                      >
                        {(machineAnalytics.by_machine || []).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => `${value} pages`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Machine Comparison Bar Chart */}
                <div style={{ marginBottom: '30px' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>📊 Machine Pages Comparison</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={machineAnalytics.by_machine || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="machine_name" angle={-45} textAnchor="end" height={80} />
                      <YAxis yAxisId="left" allowDecimals={false} />
                      <YAxis yAxisId="right" orientation="right" allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="total_pages" fill="#ff9800" name="Total Pages" />
                      <Bar yAxisId="right" dataKey="total_records" fill="#2196F3" name="Records" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Machine by Location Table */}
                {machineAnalytics.by_location && machineAnalytics.by_location.length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>📍 Machine Usage by Location</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '12px',
                        border: '1px solid #ddd',
                      }}>
                        <thead style={{ backgroundColor: '#f5f5f5' }}>
                          <tr>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Machine</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Location</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Records</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Total Pages</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Avg Pages</th>
                          </tr>
                        </thead>
                        <tbody>
                          {machineAnalytics.by_location.map((row: any, idx: number) => (
                            <tr key={idx} style={{
                              backgroundColor: idx % 2 === 0 ? '#fafafa' : 'white',
                            }}>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', fontWeight: '500' }}>
                                {row.machine_name || 'Unknown'}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd', fontSize: '11px' }}>
                                {row.location || '-'}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd', fontWeight: 'bold' }}>
                                {row.total_records || 0}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd', color: '#ff9800', fontWeight: 'bold' }}>
                                {row.total_pages || 0}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd', color: '#2196F3' }}>
                                {Math.round(row.avg_pages || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Machine by Publication Table */}
                {machineAnalytics.by_publication && machineAnalytics.by_publication.length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>📰 Machine Usage by Publication</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '12px',
                        border: '1px solid #ddd',
                      }}>
                        <thead style={{ backgroundColor: '#f5f5f5' }}>
                          <tr>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Machine</th>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Publication</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Records</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Total Pages</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Avg Pages</th>
                          </tr>
                        </thead>
                        <tbody>
                          {machineAnalytics.by_publication.map((row: any, idx: number) => (
                            <tr key={idx} style={{
                              backgroundColor: idx % 2 === 0 ? '#fafafa' : 'white',
                            }}>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', fontWeight: '500', width: '25%' }}>
                                {row.machine_name || 'Unknown'}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', fontSize: '11px', width: '25%' }}>
                                {row.publication_name || 'Unknown'}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd', fontWeight: 'bold', width: '15%' }}>
                                {row.total_records || 0}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd', color: '#ff9800', fontWeight: 'bold', width: '17%' }}>
                                {row.total_pages || 0}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd', color: '#2196F3', width: '18%' }}>
                                {Math.round(row.avg_pages || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Daily Trend Line Chart */}
                {machineAnalytics.daily_trend && machineAnalytics.daily_trend.length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>📈 Daily Machine Usage Trend</h4>
                    {(() => {
                      // Transform daily_trend data to pivot by machine
                      const pivotedData: { [key: string]: any } = {};
                      const machineNames = new Set<string>();
                      
                      (machineAnalytics.daily_trend || []).forEach((record: any) => {
                        if (!pivotedData[record.date]) {
                          pivotedData[record.date] = { date: record.date };
                        }
                        pivotedData[record.date][record.machine_name] = record.total_pages;
                        machineNames.add(record.machine_name);
                      });
                      
                      const chartDataPivoted = Object.values(pivotedData).sort((a: any, b: any) => 
                        new Date(a.date).getTime() - new Date(b.date).getTime()
                      );
                      
                      return (
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={chartDataPivoted}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={formatDateOnly}
                              angle={-45}
                              textAnchor="end"
                              height={80}
                              interval={Math.max(0, Math.floor((chartDataPivoted?.length || 1) / 10) - 1)}
                            />
                            <YAxis allowDecimals={false} />
                            <Tooltip 
                              formatter={(value: any) => {
                                return typeof value === 'number' ? value.toFixed(0) : value;
                              }}
                              labelFormatter={(label) => `Date: ${formatDateOnly(label)}`}
                            />
                            <Legend />
                            {/* Dynamically add lines for each machine */}
                            {Array.from(machineNames).map((machineName: any, idx: number) => (
                              <Line 
                                key={String(machineName)}
                                type="monotone" 
                                dataKey={String(machineName)}
                                stroke={COLORS[idx % COLORS.length]}
                                name={String(machineName)}
                                strokeWidth={2}
                                isAnimationActive={false}
                                connectNulls={true}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <div className="no-data">No machine data available</div>
            )}
          </div>

          <div className="chart-wrapper">
            <h3>⏱️ LPRS Time Trend</h3>
            {chartData.lprs && chartData.lprs.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData.lprs}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDateOnly}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={Math.max(0, Math.floor((chartData.lprs?.length || 1) / 10) - 1)}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="avg_lprs" stroke="#82ca9d" name="Avg LPRS" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">No data available</div>
            )}
          </div>

          <div className="chart-wrapper">
            <h3>🥄 Plate Consumption Analysis</h3>
            {plateConsumptionAnalytics && (plateConsumptionAnalytics.daily_trend || []).length > 0 ? (
              <div style={{ width: '100%' }}>
                {/* Statistics Cards */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '15px',
                  marginBottom: '25px'
                }}>
                  <div style={{
                    backgroundColor: '#fff3e0',
                    border: '2px solid #ff9800',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>TOTAL PLATES</p>
                    <p style={{ margin: 0, color: '#ff9800', fontSize: '24px', fontWeight: 'bold' }}>
                      {plateConsumptionAnalytics.statistics?.total_plates || 0}
                    </p>
                  </div>
                  <div style={{
                    backgroundColor: '#e3f2fd',
                    border: '2px solid #2196F3',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>AVG PER DAY</p>
                    <p style={{ margin: 0, color: '#2196F3', fontSize: '24px', fontWeight: 'bold' }}>
                      {plateConsumptionAnalytics.statistics?.avg_plates_per_day || 0}
                    </p>
                  </div>
                  <div style={{
                    backgroundColor: '#f3e5f5',
                    border: '2px solid #9c27b0',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>AVG PER RECORD</p>
                    <p style={{ margin: 0, color: '#9c27b0', fontSize: '24px', fontWeight: 'bold' }}>
                      {plateConsumptionAnalytics.statistics?.avg_plates_per_record || 0}
                    </p>
                  </div>
                  <div style={{
                    backgroundColor: '#e8f5e9',
                    border: '2px solid #4caf50',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>PLATE/PAGE</p>
                    <p style={{ margin: 0, color: '#4caf50', fontSize: '24px', fontWeight: 'bold' }}>
                      {plateConsumptionAnalytics.statistics?.plate_per_page?.toFixed(4) || '0.0000'}
                    </p>
                  </div>
                  <div style={{
                    backgroundColor: '#ffebee',
                    border: '2px solid #f44336',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>MAX PLATES</p>
                    <p style={{ margin: 0, color: '#f44336', fontSize: '24px', fontWeight: 'bold' }}>
                      {plateConsumptionAnalytics.statistics?.max_plates || 0}
                    </p>
                  </div>
                  <div style={{
                    backgroundColor: '#fce4ec',
                    border: '2px solid #e91e63',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>MIN PLATES</p>
                    <p style={{ margin: 0, color: '#e91e63', fontSize: '24px', fontWeight: 'bold' }}>
                      {plateConsumptionAnalytics.statistics?.min_plates || 0}
                    </p>
                  </div>
                </div>

                {/* Daily Trend Line Chart */}
                <div style={{ marginBottom: '30px' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>📈 Daily Plate Consumption Trend</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={plateConsumptionAnalytics.daily_trend || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={formatDateOnly}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={Math.max(0, Math.floor((plateConsumptionAnalytics.daily_trend?.length || 1) / 10) - 1)}
                      />
                      <YAxis yAxisId="left" allowDecimals={false} />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip 
                        formatter={(value: any) => {
                          return typeof value === 'number' ? value.toFixed(0) : value;
                        }}
                        labelFormatter={(label) => `Date: ${formatDateOnly(label)}`}
                      />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="total_plates" stroke="#ff9800" name="Total Plates" strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="total_pages" stroke="#2196F3" name="Total Pages" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* By Publication Bar Chart */}
                {plateConsumptionAnalytics.by_publication && plateConsumptionAnalytics.by_publication.length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>📰 Consumption by Publication</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={plateConsumptionAnalytics.by_publication}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="publication_name" angle={-45} textAnchor="end" height={80} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="total_plates" fill="#ff9800" name="Total Plates" />
                        <Bar dataKey="avg_plates" fill="#2196F3" name="Avg Plates" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* By Machine Bar Chart */}
                {plateConsumptionAnalytics.by_machine && plateConsumptionAnalytics.by_machine.length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>⚙️ Consumption by Machine</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={plateConsumptionAnalytics.by_machine}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="machine_name" angle={-45} textAnchor="end" height={80} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="total_plates" fill="#9c27b0" name="Total Plates" />
                        <Bar dataKey="avg_plates" fill="#673ab7" name="Avg Plates" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* By Operator Table */}
                {plateConsumptionAnalytics.by_operator && plateConsumptionAnalytics.by_operator.length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>👤 Consumption by Operator</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '12px',
                        border: '1px solid #ddd',
                      }}>
                        <thead style={{ backgroundColor: '#f5f5f5' }}>
                          <tr>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Operator Name</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Location</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Total Plates</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Avg Plates</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Min/Max</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Records</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Pages</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plateConsumptionAnalytics.by_operator.map((op: any, idx: number) => (
                            <tr key={idx} style={{
                              backgroundColor: idx % 2 === 0 ? '#fafafa' : 'white',
                            }}>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', fontWeight: '500' }}>
                                {op.operator_name || 'Unknown'}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd', fontSize: '11px' }}>
                                {op.location || '-'}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd', color: '#ff9800', fontWeight: 'bold' }}>
                                {Math.round(op.total_plates || 0)}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd', color: '#2196F3' }}>
                                {Math.round(op.avg_plates || 0)}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd', fontSize: '11px', color: '#666' }}>
                                {Math.round(op.min_plates || 0)} / {Math.round(op.max_plates || 0)}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>
                                {op.record_count || 0}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd', color: '#4caf50', fontWeight: '500' }}>
                                {Math.round(op.total_pages || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Plate Per Page Efficiency Chart */}
                {plateConsumptionAnalytics.plate_per_page_trend && plateConsumptionAnalytics.plate_per_page_trend.length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>📊 Plate Efficiency (Plates per Page)</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={plateConsumptionAnalytics.plate_per_page_trend || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDateOnly}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval={Math.max(0, Math.floor((plateConsumptionAnalytics.plate_per_page_trend?.length || 1) / 10) - 1)}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: any) => {
                            return typeof value === 'number' ? value.toFixed(4) : value;
                          }}
                          labelFormatter={(label) => `Date: ${formatDateOnly(label)}`}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="plate_per_page" stroke="#d32f2f" name="Plates/Page" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-data">No plate consumption data available</div>
            )}
          </div>

          <div className="chart-wrapper">
            <h3>📊 Newsprint KGs Analysis</h3>
            {newsprintAnalytics && (newsprintAnalytics.daily_trend || []).length > 0 ? (
              <div style={{ width: '100%' }}>
                {/* Statistics Cards */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '15px',
                  marginBottom: '25px'
                }}>
                  <div style={{
                    backgroundColor: '#fff3e0',
                    border: '2px solid #ff9800',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>TOTAL KGs</p>
                    <p style={{ margin: 0, color: '#ff9800', fontSize: '24px', fontWeight: 'bold' }}>
                      {newsprintAnalytics.statistics?.total_kgs || 0}
                    </p>
                  </div>
                  <div style={{
                    backgroundColor: '#e3f2fd',
                    border: '2px solid #2196F3',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>AVG PER DAY</p>
                    <p style={{ margin: 0, color: '#2196F3', fontSize: '24px', fontWeight: 'bold' }}>
                      {newsprintAnalytics.statistics?.avg_kgs_per_day || 0}
                    </p>
                  </div>
                  <div style={{
                    backgroundColor: '#f3e5f5',
                    border: '2px solid #9c27b0',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>AVG PER RECORD</p>
                    <p style={{ margin: 0, color: '#9c27b0', fontSize: '24px', fontWeight: 'bold' }}>
                      {newsprintAnalytics.statistics?.avg_kgs_per_record || 0}
                    </p>
                  </div>
                  <div style={{
                    backgroundColor: '#e8f5e9',
                    border: '2px solid #4caf50',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>MAX KGs</p>
                    <p style={{ margin: 0, color: '#4caf50', fontSize: '24px', fontWeight: 'bold' }}>
                      {newsprintAnalytics.statistics?.max_kgs || 0}
                    </p>
                  </div>
                  <div style={{
                    backgroundColor: '#ffebee',
                    border: '2px solid #f44336',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>MIN KGs</p>
                    <p style={{ margin: 0, color: '#f44336', fontSize: '24px', fontWeight: 'bold' }}>
                      {newsprintAnalytics.statistics?.min_kgs || 0}
                    </p>
                  </div>
                  <div style={{
                    backgroundColor: '#fce4ec',
                    border: '2px solid #e91e63',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>DAYS TRACKED</p>
                    <p style={{ margin: 0, color: '#e91e63', fontSize: '24px', fontWeight: 'bold' }}>
                      {newsprintAnalytics.statistics?.total_days || 0}
                    </p>
                  </div>
                </div>

                {/* Daily Trend Line Chart */}
                <div style={{ marginBottom: '30px' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>📈 Daily Consumption Trend</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={newsprintKgsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={formatDateOnly}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={Math.max(0, Math.floor((newsprintKgsData?.length || 1) / 10) - 1)}
                      />
                      <YAxis allowDecimals={false} />
                      <Tooltip 
                        formatter={(value: any) => {
                          return typeof value === 'number' ? value.toFixed(0) : value;
                        }}
                        labelFormatter={(label) => `Date: ${formatDateOnly(label)}`}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="total_kgs" stroke="#ff9800" name="Total KGs" strokeWidth={2} />
                      <Line type="monotone" dataKey="avg_kgs" stroke="#2196F3" name="Avg KGs/Record" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* By Publication Bar Chart */}
                {newsprintAnalytics.by_publication && newsprintAnalytics.by_publication.length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>📰 Consumption by Publication</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={newsprintAnalytics.by_publication}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="publication_name" angle={-45} textAnchor="end" height={80} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="total_kgs" fill="#ff9800" name="Total KGs" />
                        <Bar dataKey="avg_kgs" fill="#2196F3" name="Avg KGs" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                
                {/* Detailed Statistics Table */}
                {newsprintAnalytics.by_publication && newsprintAnalytics.by_publication.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>📊 Detailed Statistics</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '12px',
                        border: '1px solid #ddd',
                      }}>
                        <thead style={{ backgroundColor: '#f5f5f5' }}>
                          <tr>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Publication</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Total KGs</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Avg KGs</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Min KGs</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Max KGs</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Records</th>
                          </tr>
                        </thead>
                        <tbody>
                          {newsprintAnalytics.by_publication.map((pub: any, idx: number) => (
                            <tr key={idx} style={{
                              backgroundColor: idx % 2 === 0 ? '#fafafa' : 'white',
                            }}>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', fontWeight: '500' }}>
                                {pub.publication_name || 'Unknown'}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd', color: '#ff9800', fontWeight: 'bold' }}>
                                {Math.round(pub.total_kgs || 0)}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd', color: '#2196F3' }}>
                                {Math.round(pub.avg_kgs || 0)}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd', color: '#f44336' }}>
                                {Math.round(pub.min_kgs || 0)}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd', color: '#4caf50' }}>
                                {Math.round(pub.max_kgs || 0)}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>
                                {pub.record_count || 0}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-data">No data available</div>
            )}
          </div>

          <div className="chart-wrapper">
            <h3>🔧 Machine Downtime Breakdown</h3>
            {machineDowntimeData && machineDowntimeData.length > 0 ? (
              <div style={{ width: '100%' }}>
                {/* Statistics Cards */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '15px',
                  marginBottom: '25px'
                }}>
                  <div style={{
                    backgroundColor: '#fff3e0',
                    border: '2px solid #ff9800',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>TOTAL DOWNTIME</p>
                    <p style={{ margin: 0, color: '#ff9800', fontSize: '22px', fontWeight: 'bold' }}>
                      {machineDowntimeByMachine?.statistics?.total_downtime_formatted || '00:00:00'}
                    </p>
                  </div>
                  <div style={{
                    backgroundColor: '#e3f2fd',
                    border: '2px solid #2196F3',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>TOTAL INSTANCES</p>
                    <p style={{ margin: 0, color: '#2196F3', fontSize: '24px', fontWeight: 'bold' }}>
                      {machineDowntimeByMachine?.statistics?.total_instances || 0}
                    </p>
                  </div>
                  <div style={{
                    backgroundColor: '#f3e5f5',
                    border: '2px solid #9c27b0',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>MACHINES W/ DOWNTIME</p>
                    <p style={{ margin: 0, color: '#9c27b0', fontSize: '24px', fontWeight: 'bold' }}>
                      {machineDowntimeByMachine?.statistics?.total_machines_with_downtime || 0}
                    </p>
                  </div>
                  <div style={{
                    backgroundColor: '#e8f5e9',
                    border: '2px solid #4caf50',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>AVG PER INSTANCE</p>
                    <p style={{ margin: 0, color: '#4caf50', fontSize: '22px', fontWeight: 'bold' }}>
                      {machineDowntimeByMachine?.statistics?.avg_downtime_per_instance || '00:00:00'}
                    </p>
                  </div>
                </div>

                {/* Pie Chart - Downtime Distribution by Reason*/}
                <div style={{ marginBottom: '30px' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>Downtime Distribution by Reason</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={machineDowntimeData}
                        dataKey="total_seconds"
                        nameKey="downtime_reason"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                      >
                        {machineDowntimeData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => {
                          const seconds = Number(value);
                          const hours = Math.floor(seconds / 3600);
                          const minutes = Math.floor((seconds % 3600) / 60);
                          const secs = Math.floor(seconds % 60);
                          return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Machine Downtime Breakdown Table */}
                {machineDowntimeByMachine && (machineDowntimeByMachine.by_machine || []).length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>⚙️ Downtime by Machine</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '12px',
                        border: '1px solid #ddd',
                      }}>
                        <thead style={{ backgroundColor: '#f5f5f5' }}>
                          <tr>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Machine</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Total Hours</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Instances</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Avg Duration</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Min Duration</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Max Duration</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Days w/ Downtime</th>
                          </tr>
                        </thead>
                        <tbody>
                          {machineDowntimeByMachine.by_machine.map((row: any, idx: number) => (
                            <tr key={idx} style={{
                              backgroundColor: idx % 2 === 0 ? '#fafafa' : 'white',
                            }}>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', fontWeight: '500' }}>
                                {row.machine_name || 'Unknown'}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', color: '#ff9800' }}>
                                {row.total_downtime_formatted}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', color: '#2196F3', fontWeight: 'bold' }}>
                                {row.total_downtime_instances}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', color: '#9c27b0' }}>
                                {row.avg_downtime_formatted}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', color: '#4caf50', fontSize: '11px' }}>
                                {row.min_downtime_formatted}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', color: '#f44336', fontSize: '11px' }}>
                                {row.max_downtime_formatted}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>
                                {row.days_with_downtime}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Table - Detailed Breakdown */}
                <div style={{ marginTop: '30px' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>Detailed Downtime Breakdown</h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '13px',
                      border: '1px solid #ddd',
                    }}>
                      <thead style={{ backgroundColor: '#f5f5f5' }}>
                        <tr>
                          <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Downtime Reason</th>
                          <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Category</th>
                          <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Occurrences</th>
                          <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Total Duration</th>
                          <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Avg Duration</th>
                          <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Avg Per Day</th>
                        </tr>
                      </thead>
      <tbody>
                        {machineDowntimeData.map((item: any, index: number) => {
                          // Calculate average duration per occurrence
                          const avgSeconds = item.total_seconds / item.total_occurrences;
                          const avgHours = Math.floor(avgSeconds / 3600);
                          const avgMinutes = Math.floor((avgSeconds % 3600) / 60);
                          const avgSecs = Math.floor(avgSeconds % 60);
                          const avgDuration = `${String(avgHours).padStart(2, '0')}:${String(avgMinutes).padStart(2, '0')}:${String(avgSecs).padStart(2, '0')}`;

                          // Get avg per day directly from the response data
                          const avgPerDay = item.avg_per_day || '00:00:00';

                          return (
                            <tr 
                              key={index} 
                              style={{ 
                                backgroundColor: index % 2 === 0 ? '#fafafa' : 'white',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                              }}
                              onClick={() => handleDowntimeRowClick(item)}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#e3f2fd';
                                (e.currentTarget as HTMLTableRowElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLTableRowElement).style.backgroundColor = index % 2 === 0 ? '#fafafa' : 'white';
                                (e.currentTarget as HTMLTableRowElement).style.boxShadow = 'none';
                              }}
                            >
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', fontWeight: '500' }}>
                                {item.downtime_reason}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center' }}>
                                <span style={{
                                  backgroundColor: item.category === 'mechanical' ? '#ff6b6b' : item.category === 'electrical' ? '#ffc107' : '#17a2b8',
                                  color: 'white',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  textTransform: 'capitalize',
                                }}>
                                  {item.category}
                                </span>
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>
                                {item.total_occurrences}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', color: '#d32f2f' }}>
                                {item.total_duration}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', color: '#1976d2' }}>
                                {avgDuration}
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center', color: '#f57c00', fontWeight: '600' }}>
                                {avgPerDay}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-data">No downtime data available</div>
            )}
          </div>
        </div>

        {/* Downtime Detail Modal */}
        {downtimeDetailModal && (
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
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#1976d2', fontSize: '20px' }}>Downtime Breakdown Details</h2>
                <button 
                  onClick={() => setDowntimeDetailModal(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#999',
                  }}
                >
                  ×
                </button>
              </div>

              {downtimeDetails.length > 0 && (
                <div style={{ lineHeight: '1.8' }}>
                  <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
                    <p style={{ margin: '5px 0' }}>
                      <strong style={{ color: '#333' }}>Downtime Reason:</strong>
                      <span style={{ marginLeft: '10px', fontSize: '16px', color: '#555' }}>
                        {downtimeDetails[0].reason}
                      </span>
                    </p>
                  </div>

                  <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
                    <p style={{ margin: '5px 0' }}>
                      <strong style={{ color: '#333' }}>Category:</strong>
                      <span style={{
                        marginLeft: '10px',
                        backgroundColor: downtimeDetails[0].category === 'mechanical' ? '#ff6b6b' : downtimeDetails[0].category === 'electrical' ? '#ffc107' : '#17a2b8',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textTransform: 'capitalize',
                        display: 'inline-block',
                      }}>
                        {downtimeDetails[0].category}
                      </span>
                    </p>
                  </div>

                  <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
                    <p style={{ margin: '5px 0' }}>
                      <strong style={{ color: '#333' }}>Occurrences:</strong>
                      <span style={{ marginLeft: '10px', fontSize: '16px', fontWeight: 'bold', color: '#d32f2f' }}>
                        {downtimeDetails[0].occurrences}
                      </span>
                    </p>
                  </div>

                  <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
                    <p style={{ margin: '5px 0' }}>
                      <strong style={{ color: '#333' }}>Total Duration:</strong>
                      <span style={{ marginLeft: '10px', fontSize: '16px', fontWeight: 'bold', color: '#1976d2' }}>
                        {downtimeDetails[0].totalDuration}
                      </span>
                    </p>
                  </div>

                  <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
                    <p style={{ margin: '5px 0' }}>
                      <strong style={{ color: '#333' }}>Avg Duration Per Occurrence:</strong>
                      <span style={{ marginLeft: '10px', fontSize: '16px', fontWeight: 'bold', color: '#f57c00' }}>
                        {(() => {
                          const avgSeconds = downtimeDetails[0].avgDuration;
                          const avgHours = Math.floor(avgSeconds / 3600);
                          const avgMinutes = Math.floor((avgSeconds % 3600) / 60);
                          const avgSecs = Math.floor(avgSeconds % 60);
                          return `${String(avgHours).padStart(2, '0')}:${String(avgMinutes).padStart(2, '0')}:${String(avgSecs).padStart(2, '0')}`;
                        })()}
                      </span>
                    </p>
                  </div>

                  <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
                    <p style={{ margin: '5px 0' }}>
                      <strong style={{ color: '#333' }}>Avg Duration Per Day:</strong>
                      <span style={{ marginLeft: '10px', fontSize: '16px', fontWeight: 'bold', color: '#ff6b6b' }}>
                        {/* Show from machineDowntimeData - the modal data has avg_per_day */}
                        {machineDowntimeData.find((d: any) => d.id === downtimeDetailModal.id)?.avg_per_day || '00:00:00'}
                      </span>
                    </p>
                  </div>

                  <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
                    <p style={{ margin: '5px 0' }}>
                      <strong style={{ color: '#333' }}>Publications Affected:</strong>
                      <div style={{ marginLeft: '10px', fontSize: '14px', color: '#555', display: 'block', marginTop: '8px', whiteSpace: 'pre-wrap', lineHeight: '1.8', fontFamily: 'monospace' }}>
                        {downtimeDetails[0].publications}
                      </div>
                    </p>
                  </div>

                  <div style={{ marginTop: '20px' }}>
                    <button
                      onClick={() => setDowntimeDetailModal(null)}
                      style={{
                        backgroundColor: '#1976d2',
                        color: 'white',
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        transition: 'background-color 0.3s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1565c0'}
                      onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1976d2'}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
