import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AdminNavbar } from '../components/Navbar';
import { masterAPI, productionAPI, aiAPI } from '../services/api';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import BuildIcon from '@mui/icons-material/Build';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TimerIcon from '@mui/icons-material/Timer';
import SettingsIcon from '@mui/icons-material/Settings';
import PrintIcon from '@mui/icons-material/Print';
import StackedBarChartIcon from '@mui/icons-material/StackedBarChart';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
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

  const [chartData, setChartData] = useState<ChartData>({
    po: [],
    machine: [],
    lprs: [],
    newsprint: [],
  }); // Used for legacy data storage

  const [newsprintKgsData, setNewsprintKgsData] = useState<any[]>([]); // Used in newsprint tab
  const [newsprintAnalytics, setNewsprintAnalytics] = useState<any>(null); // Used in newsprint tab
  const [plateConsumptionAnalytics, setPlateConsumptionAnalytics] = useState<any>(null); // Used in plate tab
  const [machineAnalytics, setMachineAnalytics] = useState<any>(null); // Used in machine tab
  const [printOrdersAnalytics, setPrintOrdersAnalytics] = useState<any>(null); // Used in PO tab
  const [printDurationAnalytics, setPrintDurationAnalytics] = useState<any>(null); // Used in duration tab
  const [wastesAnalytics, setWastesAnalytics] = useState<any>(null); // Used in wastes tab
  const [aiPredictions, setAIPredictions] = useState<any>(null); // Used in ai tab
  const [aiRecommendations, setAIRecommendations] = useState<any>(null); // Used in ai tab
  const [machineDowntimeData, setMachineDowntimeData] = useState<any[]>([]);
  const [machineDowntimeByMachine, setMachineDowntimeByMachine] = useState<any>(null); // Used in breakdown tab
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Sidebar tab state
  const [activeTab, setActiveTab] = useState<'breakdown' | 'po' | 'duration' | 'machine' | 'plate' | 'newsprint' | 'wastes' | 'ai'>('breakdown');
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
          masterAPI.getLocations(),
        ]);

        const vkData = vkRes.data.data || vkRes.data;
        const ospData = ospRes.data.data || ospRes.data;
        const locationData = locRes.data.data || locRes.data;

        const vkArray = Array.isArray(vkData) ? vkData : [];
        const ospArray = Array.isArray(ospData) ? ospData : [];
        const locationsArray = Array.isArray(locationData) ? locationData : [];

        setAllVkPublications(vkArray);
        setAllOspPublications(ospArray);
        
        setVkPublications(vkArray);
        setOspPublications(ospArray);
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

        const [poRes, printOrdersRes, machineRes, machineDetailedRes, lprsRes, newsprintRes, newsprintKgsRes, plateRes, downtimeRes, downtimeByMachineRes, printDurationRes, wastesRes] =
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
            productionAPI.getAnalyticsWastes(params),
          ]);

        // Fetch AI recommendations separately (don't block if ML service is down)
        try {
          const recRes = await aiAPI.getMaintenanceRecommendations(params);
          const predRes = await aiAPI.getMaintenancePredictions();
          setAIRecommendations(recRes.data);
          setAIPredictions(predRes.data);
        } catch (aiErr: any) {
          console.warn('⚠️ AI service unavailable:', aiErr.message);
          setAIRecommendations(null);
          setAIPredictions(null);
        }

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
        setWastesAnalytics({
          ...wastesRes.data,
          daily_trend: (wastesRes.data?.daily_trend || []).map((item: any) => ({
            ...item,
            date: item.date ? formatDateOnly(item.date) : item.date,
          })),
        });
        
        const downtimeData = (downtimeRes.data?.data || []).map((item: any) => ({
          ...item,
          total_seconds: typeof item.total_seconds === 'string' ? parseInt(item.total_seconds, 10) : item.total_seconds,
        }));
        setMachineDowntimeData(downtimeData);
        setMachineDowntimeByMachine(downtimeByMachineRes.data || {});

        console.log('✓ Analytics loaded');
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
    console.log('🔍 VK Selection changed to:', value);
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
    console.log('🔍 OSP Selection changed to:', value);
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

  const handleDowntimeRowClick = async (downtimeReason: any) => {
    console.log('🔍 Clicked downtime reason:', downtimeReason);
    setDowntimeDetailModal(downtimeReason);
    
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

      console.log('📊 Downtime details records:', detailedRecords);

      const allPublications = [...vkPublications, ...ospPublications];
      
      const publicationDurations: { [key: string]: { location: string; durations: string[] } } = {};
      
      detailedRecords.forEach((record: any) => {
        const pubName = record.publication_name;
        const pub = allPublications.find((p) => p.name === pubName);
        const location = pub?.location || 'Unknown';
        const key = `${pubName}|${location}`;
        
        if (!publicationDurations[key]) {
          publicationDurations[key] = { location, durations: [] };
        }
        
        let formattedDuration = '00:00:00';
        if (record.downtime_duration) {
          if (typeof record.downtime_duration === 'string' && record.downtime_duration.includes(':')) {
            formattedDuration = record.downtime_duration;
          } else {
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

        {/* CHARTS SECTION WITH SIDEBAR TABS */}
        <div style={{ display: 'flex', gap: '20px', marginTop: '30px' }}>
          {/* SIDEBAR */}
          <div style={{
            width: sidebarOpen ? '200px' : '60px',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            padding: '15px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'width 0.3s ease',
            height: 'fit-content',
            position: 'sticky',
            top: '20px'
          }}>
            {/* Sidebar Toggle Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {sidebarOpen ? <KeyboardArrowLeftIcon /> : <KeyboardArrowRightIcon />}
            </button>

            {/* Tab Buttons */}
            {sidebarOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => setActiveTab('breakdown')}
                  style={{
                    padding: '12px',
                    backgroundColor: activeTab === 'breakdown' ? '#2196F3' : '#e0e0e0',
                    color: activeTab === 'breakdown' ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <BuildIcon sx={{ fontSize: '18px' }} /> Breakdown
                </button>
                <button
                  onClick={() => setActiveTab('po')}
                  style={{
                    padding: '12px',
                    backgroundColor: activeTab === 'po' ? '#2196F3' : '#e0e0e0',
                    color: activeTab === 'po' ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AssignmentIcon sx={{ fontSize: '18px' }} /> Print Orders
                </button>
                <button
                  onClick={() => setActiveTab('duration')}
                  style={{
                    padding: '12px',
                    backgroundColor: activeTab === 'duration' ? '#2196F3' : '#e0e0e0',
                    color: activeTab === 'duration' ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <TimerIcon sx={{ fontSize: '18px' }} /> Duration
                </button>
                <button
                  onClick={() => setActiveTab('machine')}
                  style={{
                    padding: '12px',
                    backgroundColor: activeTab === 'machine' ? '#2196F3' : '#e0e0e0',
                    color: activeTab === 'machine' ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <SettingsIcon sx={{ fontSize: '18px' }} /> Machine
                </button>
                <button
                  onClick={() => setActiveTab('plate')}
                  style={{
                    padding: '12px',
                    backgroundColor: activeTab === 'plate' ? '#2196F3' : '#e0e0e0',
                    color: activeTab === 'plate' ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <PrintIcon sx={{ fontSize: '18px' }} /> Plate
                </button>
                <button
                  onClick={() => setActiveTab('newsprint')}
                  style={{
                    padding: '12px',
                    backgroundColor: activeTab === 'newsprint' ? '#2196F3' : '#e0e0e0',
                    color: activeTab === 'newsprint' ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <StackedBarChartIcon sx={{ fontSize: '18px' }} /> Newsprint
                </button>
                <button
                  onClick={() => setActiveTab('wastes')}
                  style={{
                    padding: '12px',
                    backgroundColor: activeTab === 'wastes' ? '#2196F3' : '#e0e0e0',
                    color: activeTab === 'wastes' ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <DeleteOutlineIcon sx={{ fontSize: '18px' }} /> Wastes
                </button>
                <button
                  onClick={() => setActiveTab('ai')}
                  style={{
                    padding: '12px',
                    backgroundColor: activeTab === 'ai' ? '#2196F3' : '#e0e0e0',
                    color: activeTab === 'ai' ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <SmartToyIcon sx={{ fontSize: '18px' }} /> AI Insights
                </button>
              </div>
            )}

            {/* Collapsed Icons */}
            {!sidebarOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div
                  onClick={() => { setSidebarOpen(true); setActiveTab('breakdown'); }}
                  style={{
                    padding: '12px',
                    backgroundColor: activeTab === 'breakdown' ? '#2196F3' : '#e0e0e0',
                    color: activeTab === 'breakdown' ? 'white' : '#333',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Breakdown"
                >
                  <BuildIcon />
                </div>
                <div
                  onClick={() => { setSidebarOpen(true); setActiveTab('po'); }}
                  style={{
                    padding: '12px',
                    backgroundColor: activeTab === 'po' ? '#2196F3' : '#e0e0e0',
                    color: activeTab === 'po' ? 'white' : '#333',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Print Orders"
                >
                  <AssignmentIcon />
                </div>
                <div
                  onClick={() => { setSidebarOpen(true); setActiveTab('duration'); }}
                  style={{
                    padding: '12px',
                    backgroundColor: activeTab === 'duration' ? '#2196F3' : '#e0e0e0',
                    color: activeTab === 'duration' ? 'white' : '#333',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Duration"
                >
                  <TimerIcon />
                </div>
                <div
                  onClick={() => { setSidebarOpen(true); setActiveTab('machine'); }}
                  style={{
                    padding: '12px',
                    backgroundColor: activeTab === 'machine' ? '#2196F3' : '#e0e0e0',
                    color: activeTab === 'machine' ? 'white' : '#333',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Machine"
                >
                  <SettingsIcon />
                </div>
                <div
                  onClick={() => { setSidebarOpen(true); setActiveTab('plate'); }}
                  style={{
                    padding: '12px',
                    backgroundColor: activeTab === 'plate' ? '#2196F3' : '#e0e0e0',
                    color: activeTab === 'plate' ? 'white' : '#333',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Plate"
                >
                  <PrintIcon />
                </div>
                <div
                  onClick={() => { setSidebarOpen(true); setActiveTab('newsprint'); }}
                  style={{
                    padding: '12px',
                    backgroundColor: activeTab === 'newsprint' ? '#2196F3' : '#e0e0e0',
                    color: activeTab === 'newsprint' ? 'white' : '#333',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Newsprint"
                >
                  <StackedBarChartIcon />
                </div>
                <div
                  onClick={() => { setSidebarOpen(true); setActiveTab('wastes'); }}
                  style={{
                    padding: '12px',
                    backgroundColor: activeTab === 'wastes' ? '#2196F3' : '#e0e0e0',
                    color: activeTab === 'wastes' ? 'white' : '#333',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Wastes"
                >
                  <DeleteOutlineIcon />
                </div>
                <div
                  onClick={() => { setSidebarOpen(true); setActiveTab('ai'); }}
                  style={{
                    padding: '12px',
                    backgroundColor: activeTab === 'ai' ? '#2196F3' : '#e0e0e0',
                    color: activeTab === 'ai' ? 'white' : '#333',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="AI Insights"
                >
                  <SmartToyIcon />
                </div>
              </div>
            )}
          </div>

          {/* MAIN CONTENT AREA */}
          <div style={{ flex: 1 }}>
            {/* BREAKDOWN TAB */}
            {activeTab === 'breakdown' && (
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
                        <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>TOTAL DOWNTIME REASONS</p>
                        <p style={{ margin: 0, color: '#ff9800', fontSize: '28px', fontWeight: 'bold' }}>
                          {machineDowntimeData.length}
                        </p>
                      </div>
                      <div style={{
                        backgroundColor: '#e3f2fd',
                        border: '2px solid #2196F3',
                        borderRadius: '8px',
                        padding: '15px',
                        textAlign: 'center'
                      }}>
                        <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>TOTAL OCCURRENCES</p>
                        <p style={{ margin: 0, color: '#2196F3', fontSize: '28px', fontWeight: 'bold' }}>
                          {machineDowntimeData.reduce((sum, item) => sum + (item.total_occurrences || 0), 0)}
                        </p>
                      </div>
                      <div style={{
                        backgroundColor: '#f3e5f5',
                        border: '2px solid #9c27b0',
                        borderRadius: '8px',
                        padding: '15px',
                        textAlign: 'center'
                      }}>
                        <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>TOTAL DURATION</p>
                        <p style={{ margin: 0, color: '#9c27b0', fontSize: '28px', fontWeight: 'bold' }}>
                          {machineDowntimeData.reduce((sum, item) => sum + (item.total_seconds || 0), 0) > 0
                            ? (() => {
                                const totalSecs = machineDowntimeData.reduce((sum, item) => sum + (item.total_seconds || 0), 0);
                                const hours = Math.floor(totalSecs / 3600);
                                const mins = Math.floor((totalSecs % 3600) / 60);
                                return `${hours}h ${mins}m`;
                              })()
                            : '0h'}
                        </p>
                      </div>
                      <div style={{
                        backgroundColor: '#e8f5e9',
                        border: '2px solid #4caf50',
                        borderRadius: '8px',
                        padding: '15px',
                        textAlign: 'center'
                      }}>
                        <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>AVG DURATION</p>
                        <p style={{ margin: 0, color: '#4caf50', fontSize: '28px', fontWeight: 'bold' }}>
                          {machineDowntimeData.length > 0
                            ? (() => {
                                const avgSecs = Math.round(
                                  machineDowntimeData.reduce((sum, item) => sum + (item.total_seconds || 0), 0) /
                                  machineDowntimeData.reduce((sum, item) => sum + (item.total_occurrences || 0), 0)
                                );
                                const hours = Math.floor(avgSecs / 3600);
                                const mins = Math.floor((avgSecs % 3600) / 60);
                                return `${hours}h ${mins}m`;
                              })()
                            : '0h'}
                        </p>
                      </div>
                    </div>

                    {/* Pie Chart */}
                    <div style={{ marginBottom: '30px' }}>
                      <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>Downtime Distribution by Reason</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={machineDowntimeData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry: any) => `${entry.downtime_reason} (${entry.total_occurrences})`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="total_seconds"
                            nameKey="downtime_reason"
                          >
                            {machineDowntimeData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => `${value} seconds`} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Detailed Table */}
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
                            {machineDowntimeData.map((item, idx) => {
                              const avgSecs = Math.round(item.total_seconds / item.total_occurrences);
                              const avgHours = Math.floor(avgSecs / 3600);
                              const avgMinutes = Math.floor((avgSecs % 3600) / 60);
                              const avgSec = Math.floor(avgSecs % 60);
                              const avgDuration = `${String(avgHours).padStart(2, '0')}:${String(avgMinutes).padStart(2, '0')}:${String(avgSec).padStart(2, '0')}`;
                              
                              const totalHours = Math.floor(item.total_seconds / 3600);
                              const totalMinutes = Math.floor((item.total_seconds % 3600) / 60);
                              const totalSec = Math.floor(item.total_seconds % 60);
                              const totalDuration = `${String(totalHours).padStart(2, '0')}:${String(totalMinutes).padStart(2, '0')}:${String(totalSec).padStart(2, '0')}`;

                              const avgPerDay = item.avg_per_day || '00:00:00';

                              return (
                                <tr 
                                  key={idx} 
                                  style={{ 
                                    backgroundColor: idx % 2 === 0 ? '#fafafa' : 'white',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                  }}
                                  onClick={() => handleDowntimeRowClick(item)}
                                  onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#e3f2fd';
                                    (e.currentTarget as HTMLTableRowElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                                  }}
                                  onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLTableRowElement).style.backgroundColor = idx % 2 === 0 ? '#fafafa' : 'white';
                                    (e.currentTarget as HTMLTableRowElement).style.boxShadow = 'none';
                                  }}
                                >
                                  <td style={{ padding: '10px', borderBottom: '1px solid #ddd', fontWeight: '500' }}>
                                    {item.downtime_reason}
                                  </td>
                                  <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center' }}>
                                    <span style={{
                                      backgroundColor: item.category === 'mechanical' ? '#ff6b6b' : item.category === 'electrical' ? '#ffc107' : item.category === 'material' ? '#17a2b8' : '#999',
                                      color: item.category === 'electrical' ? '#333' : 'white',
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
                                    {totalDuration}
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
            )}

            {/* PO TAB - Similar structure for other tabs */}
            {activeTab === 'po' && (
              <div className="chart-wrapper">
                <h3>📋 Print Orders (PO) - Comprehensive Analytics</h3>
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
                              angle={-45}
                              textAnchor="end"
                              height={80}
                              interval={Math.max(0, Math.floor((printOrdersAnalytics.daily_trend?.length || 1) / 10) - 1)}
                            />
                            <YAxis yAxisId="left" allowDecimals={false} />
                            <YAxis yAxisId="right" orientation="right" allowDecimals={false} />
                            <Tooltip />
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
            )}

            {/* DURATION TAB */}
            {activeTab === 'duration' && (
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
                              angle={-45}
                              textAnchor="end"
                              height={80}
                              interval={Math.max(0, Math.floor((printDurationAnalytics.daily_trend?.length || 1) / 10) - 1)}
                            />
                            <YAxis yAxisId="left" allowDecimals={false} />
                            <YAxis yAxisId="right" orientation="right" allowDecimals={false} />
                            <Tooltip />
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
            )}

            {/* MACHINE TAB */}
            {activeTab === 'machine' && (
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
                        <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>TOTAL PLATES</p>
                        <p style={{ margin: 0, color: '#ff9800', fontSize: '24px', fontWeight: 'bold' }}>
                          {machineAnalytics.statistics?.total_plates || 0}
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
                      <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>🥧 Machine Plates Distribution</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={machineAnalytics.by_machine || []}
                            dataKey="total_plates"
                            nameKey="machine_name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                          >
                            {(machineAnalytics.by_machine || []).map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => `${value} plates`} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Machine Comparison Bar Chart */}
                    <div style={{ marginBottom: '30px' }}>
                      <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>📊 Machine Plates Comparison</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={machineAnalytics.by_machine || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="machine_name" angle={-45} textAnchor="end" height={80} />
                          <YAxis yAxisId="left" allowDecimals={false} />
                          <YAxis yAxisId="right" orientation="right" allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Bar yAxisId="left" dataKey="total_pages" fill="#2196F3" name="Pages" />
                          <Bar yAxisId="right" dataKey="total_plates" fill="#ff9800" name="Plates" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Daily Trend Line Chart */}
                    <div style={{ marginBottom: '30px' }}>
                      <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>📈 Daily Machine Plates Trend</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={machineAnalytics.daily_trend || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="total_plates" stroke="#ff9800" name="Plates" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="no-data">No machine usage data available</div>
                )}
              </div>
            )}

            {/* PLATE TAB */}
            {activeTab === 'plate' && (
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
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            interval={Math.max(0, Math.floor((plateConsumptionAnalytics.daily_trend?.length || 1) / 10) - 1)}
                          />
                          <YAxis yAxisId="left" allowDecimals={false} />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Legend />
                          <Line yAxisId="left" type="monotone" dataKey="total_plates" stroke="#ff9800" name="Total Plates" strokeWidth={2} />
                          <Line yAxisId="right" type="monotone" dataKey="total_pages" stroke="#2196F3" name="Total Pages" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="no-data">No plate consumption data available</div>
                )}
              </div>
            )}

            {/* NEWSPRINT TAB */}
            {activeTab === 'newsprint' && (
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
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            interval={Math.max(0, Math.floor((newsprintKgsData?.length || 1) / 10) - 1)}
                          />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="total_kgs" stroke="#ff9800" name="Total KGs" strokeWidth={2} />
                          <Line type="monotone" dataKey="avg_kgs" stroke="#2196F3" name="Avg KGs/Record" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="no-data">No newsprint data available</div>
                )}
              </div>
            )}

            {/* WASTES TAB */}
            {activeTab === 'wastes' && (
              <div className="chart-wrapper">
                <h3>🗑️ Plates & Wastes Comparison</h3>
                {wastesAnalytics ? (
                  <div>
                    {/* Key Statistics Cards - Plates vs Wastes */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                      gap: '20px',
                      marginBottom: '40px'
                    }}>
                      <div style={{
                        padding: '25px',
                        backgroundColor: '#FFF3E0',
                        borderRadius: '8px',
                        textAlign: 'center',
                        border: '3px solid #ff9800',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}>
                        <p style={{ margin: '0', color: '#666', fontSize: '14px', fontWeight: '500' }}>Total Plates Consumed</p>
                        <h2 style={{ margin: '10px 0 0 0', color: '#ff9800', fontSize: '36px', fontWeight: 'bold' }}>
                          {wastesAnalytics.statistics?.total_plates || 0}
                        </h2>
                      </div>
                      <div style={{
                        padding: '25px',
                        backgroundColor: '#FFEBEE',
                        borderRadius: '8px',
                        textAlign: 'center',
                        border: '3px solid #f44336',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}>
                        <p style={{ margin: '0', color: '#666', fontSize: '14px', fontWeight: '500' }}>Total Wastes Generated</p>
                        <h2 style={{ margin: '10px 0 0 0', color: '#f44336', fontSize: '36px', fontWeight: 'bold' }}>
                          {wastesAnalytics.statistics?.total_wastes || 0}
                        </h2>
                      </div>
                    </div>

                    {/* Simple Comparison Bar Chart */}
                    <div style={{ marginBottom: '40px' }}>
                      <h4 style={{ fontSize: '16px', marginBottom: '15px', color: '#333', fontWeight: 'bold' }}>📊 Plates vs Wastes Comparison</h4>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={[
                          {
                            name: 'Total',
                            plates: wastesAnalytics.statistics?.total_plates || 0,
                            wastes: wastesAnalytics.statistics?.total_wastes || 0
                          }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip 
                            formatter={(value: any) => value?.toLocaleString?.() || value || 0}
                            contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #ccc' }}
                          />
                          <Legend 
                            wrapperStyle={{ paddingTop: '20px' }}
                            formatter={(value) => value === 'plates' ? '📋 Plates Consumed' : '🗑️ Wastes Generated'}
                          />
                          <Bar dataKey="plates" fill="#ff9800" name="plates" radius={[8, 8, 0, 0]} />
                          <Bar dataKey="wastes" fill="#f44336" name="wastes" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* PO Comparison Table - Detail view of all records */}
                    {wastesAnalytics.plate_comparison && wastesAnalytics.plate_comparison.length > 0 && (
                      <div style={{ marginBottom: '30px' }}>
                        <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>📋 PO Comparison: Plates, Pages & Wastes</h4>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            overflow: 'hidden'
                          }}>
                            <thead style={{ backgroundColor: '#f5f5f5' }}>
                              <tr>
                                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>PO#</th>
                                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Publication</th>
                                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Machine</th>
                                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Pages</th>
                                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Plates</th>
                                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Wastes</th>
                                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {wastesAnalytics.plate_comparison.map((record: any, idx: number) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                  <td style={{ padding: '12px', fontWeight: 'bold', color: '#2196F3' }}>{record.po_number}</td>
                                  <td style={{ padding: '12px' }}>{record.publication_name || 'N/A'}</td>
                                  <td style={{ padding: '12px' }}>{record.machine_name || 'N/A'}</td>
                                  <td style={{ padding: '12px', textAlign: 'right', color: '#4caf50', fontWeight: '500' }}>{record.total_pages || 0}</td>
                                  <td style={{ padding: '12px', textAlign: 'right', color: '#ff9800', fontWeight: '500' }}>{record.plate_consumption || 0}</td>
                                  <td style={{ padding: '12px', textAlign: 'right', color: '#f44336', fontWeight: 'bold' }}>{record.wastes || 0}</td>
                                  <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>{record.record_date ? formatDateOnly(record.record_date) : 'N/A'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="no-data">No wastes data available</div>
                )}
              </div>
            )}

            {/* AI INSIGHTS TAB */}
            {activeTab === 'ai' && (
              <div className="chart-wrapper">
                <h3>🤖 AI Maintenance Predictions & Recommendations</h3>
                {aiRecommendations && aiRecommendations.recommendations && aiRecommendations.recommendations.length > 0 ? (
                  <div style={{ width: '100%' }}>
                    {/* Recommendations Summary */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: '15px',
                      marginBottom: '25px'
                    }}>
                      <div style={{
                        backgroundColor: '#ffebee',
                        border: '2px solid #f44336',
                        borderRadius: '8px',
                        padding: '15px',
                        textAlign: 'center'
                      }}>
                        <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>URGENT MAINTENANCE</p>
                        <p style={{ margin: 0, color: '#f44336', fontSize: '24px', fontWeight: 'bold' }}>
                          {aiRecommendations.total_urgent || 0}
                        </p>
                      </div>
                      <div style={{
                        backgroundColor: '#fff3e0',
                        border: '2px solid #ff9800',
                        borderRadius: '8px',
                        padding: '15px',
                        textAlign: 'center'
                      }}>
                        <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px', fontWeight: 'bold' }}>NORMAL MAINTENANCE</p>
                        <p style={{ margin: 0, color: '#ff9800', fontSize: '24px', fontWeight: 'bold' }}>
                          {aiRecommendations.total_normal || 0}
                        </p>
                      </div>
                    </div>

                    {/* Recommendations List */}
                    <div style={{ marginBottom: '30px' }}>
                      <h4 style={{ fontSize: '14px', marginBottom: '15px', color: '#333' }}>📋 Maintenance Recommendations</h4>
                      {aiRecommendations.recommendations.map((rec: any, idx: number) => (
                        <div 
                          key={idx}
                          style={{
                            padding: '15px',
                            marginBottom: '12px',
                            border: `3px solid ${rec.priority === 'URGENT' ? '#f44336' : '#ff9800'}`,
                            borderRadius: '8px',
                            backgroundColor: rec.priority === 'URGENT' ? '#ffebee' : '#fff3e0'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                            <h5 style={{ margin: 0, color: '#333', fontSize: '16px' }}>
                              {rec.machine_name}
                            </h5>
                            <span style={{
                              padding: '4px 12px',
                              backgroundColor: rec.priority === 'URGENT' ? '#f44336' : '#ff9800',
                              color: 'white',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}>
                              {rec.priority}
                            </span>
                          </div>
                          <p style={{ margin: '8px 0', color: '#555', fontSize: '14px' }}>
                            <strong>Recommendation:</strong> {rec.recommendation}
                          </p>
                          <p style={{ margin: '8px 0', color: '#666', fontSize: '13px' }}>
                            <strong>Reason:</strong> {rec.reason}
                          </p>
                          <p style={{ margin: '8px 0', color: '#666', fontSize: '12px' }}>
                            <strong>Suggested Date:</strong> {rec.suggested_date}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="no-data">
                    <p>⏳ Loading AI predictions...</p>
                    <p style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
                      Make sure the ML service is running on port 5001
                    </p>
                  </div>
                )}
              </div>
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
                  {downtimeDetails.map((detail, idx) => (
                    <div key={idx}>
                      <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
                        <strong style={{ color: '#333' }}>Reason:</strong>
                        <p style={{ margin: '5px 0 0 0', color: '#666' }}>{detail.reason}</p>
                      </div>

                      <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
                        <strong style={{ color: '#333' }}>Occurrences:</strong>
                        <p style={{ margin: '5px 0 0 0', color: '#666' }}>{detail.occurrences}</p>
                      </div>

                      <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
                        <strong style={{ color: '#333' }}>Total Duration:</strong>
                        <p style={{ margin: '5px 0 0 0', color: '#666' }}>{detail.totalDuration}</p>
                      </div>

                      <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
                        <strong style={{ color: '#333' }}>Average Duration:</strong>
                        <p style={{ margin: '5px 0 0 0', color: '#666' }}>
                          {(() => {
                            const hours = Math.floor(detail.avgDuration / 3600);
                            const mins = Math.floor((detail.avgDuration % 3600) / 60);
                            const secs = detail.avgDuration % 60;
                            return `${hours}h ${mins}m ${secs}s`;
                          })()}
                        </p>
                      </div>

                      <div>
                        <strong style={{ color: '#333' }}>Affected Publications:</strong>
                        <p style={{ margin: '5px 0 0 0', color: '#666', whiteSpace: 'pre-wrap' }}>{detail.publications}</p>
                      </div>
                    </div>
                  ))}
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
