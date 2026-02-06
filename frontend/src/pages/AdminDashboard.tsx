import React, { useState, useEffect } from 'react';
import { AdminNavbar } from '../components/Navbar';
import { masterAPI, productionAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../styles/admin-dashboard.css';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [publications, setPublications] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    location: '',
    publication: '',
  });

  const [chartData, setChartData] = useState({
    po: [],
    machine: [],
    lprs: [],
    newsprint: [],
  });

  // Add new state variables
  const [newsprintKgsData, setNewsprintKgsData] = useState<any[]>([]);
  const [machineDowntimeData, setMachineDowntimeData] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

  useEffect(() => {
    const loadMasterData = async (): Promise<void> => {
      try {
        const [pubRes, locRes] = await Promise.all([
          masterAPI.getPublications(),
          masterAPI.getLocations(),
        ]);

        // Handle publications
        const pubData = pubRes.data.data || pubRes.data;
        setPublications(Array.isArray(pubData) ? pubData : []);

        // Handle locations
        const locData = locRes.data;
        setLocations(Array.isArray(locData) ? locData : []);
      } catch (error) {
        console.error('Error loading master data:', error);
        setError('Failed to load master data');
      }
    };

    loadMasterData();
  }, []);

  // Update useEffect to fetch new analytics
  useEffect(() => {
    if (!filters.publication) return;

    const fetchAnalytics = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [po, machine, lprs, newsprint, newsprintKgs, machineDowntime] = await Promise.all([
          productionAPI.getPoAnalytics(
            parseInt(filters.publication),
            filters.startDate,
            filters.endDate,
            filters.location || undefined
          ),
          productionAPI.getMachineAnalytics(
            parseInt(filters.publication),
            filters.startDate,
            filters.endDate,
            filters.location || undefined
          ),
          productionAPI.getLprsAnalytics(
            parseInt(filters.publication),
            filters.startDate,
            filters.endDate,
            filters.location || undefined
          ),
          productionAPI.getNewsprintAnalytics(
            parseInt(filters.publication),
            filters.startDate,
            filters.endDate,
            filters.location || undefined
          ),
          productionAPI.getNewsprintKgsAnalytics(
            parseInt(filters.publication),
            filters.startDate,
            filters.endDate,
            filters.location || undefined
          ),
          productionAPI.getMachineDowntimeAnalytics(
            parseInt(filters.publication),
            filters.startDate,
            filters.endDate,
            filters.location || undefined
          ),
        ]);

        setChartData({
          po: po.data?.data || po.data || [],
          machine: machine.data?.data || machine.data || [],
          lprs: lprs.data?.data || lprs.data || [],
          newsprint: newsprint.data?.data || newsprint.data || [],
        });

        setNewsprintKgsData(newsprintKgs.data?.data || newsprintKgs.data || []);
        setMachineDowntimeData(machineDowntime.data?.data || machineDowntime.data || []);

        console.log('Analytics data loaded:', {
          po: po.data?.data,
          machine: machine.data?.data,
          lprs: lprs.data?.data,
          newsprint: newsprint.data?.data,
          newsprintKgs: newsprintKgs.data?.data,
          machineDowntime: machineDowntime.data?.data,
        });
      } catch (err: any) {
        console.error('Error fetching analytics:', err);
        setError(err.response?.data?.error || 'Failed to load analytics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [filters.publication, filters.startDate, filters.endDate, filters.location]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div>
      <AdminNavbar />
      <div className="admin-dashboard">
        <div className="dashboard-header">
          <h2>Welcome, {user?.name}</h2>
          <p>Admin Dashboard - Data Analysis</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="filters-container">
          <h3>Filters</h3>
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
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="publication">Publication *</label>
              <select
                id="publication"
                name="publication"
                value={filters.publication}
                onChange={handleFilterChange}
              >
                <option value="">Select Publication</option>
                {publications.map(pub => (
                  <option key={pub.id} value={pub.id}>{pub.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {isLoading && <div className="loading">Loading charts...</div>}

        {!isLoading && filters.publication && (
          <div className="charts-container">
            <div className="chart-wrapper">
              <h3>PO Distribution</h3>
              {chartData.po.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.po}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="po_number" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total_pages" fill="#8884d8" name="Total Pages" />
                    <Bar dataKey="count" fill="#82ca9d" name="Records" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="no-data">No data available</p>
              )}
            </div>

            <div className="chart-wrapper">
              <h3>Machine Usage</h3>
              {chartData.machine.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.machine}
                      dataKey="total_pages"
                      nameKey="machine_name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {chartData.machine.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="no-data">No data available</p>
              )}
            </div>

            <div className="chart-wrapper">
              <h3>LPRS Time Trend (Last 7 days)</h3>
              {chartData.lprs.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.lprs}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="avg_lprs_minutes" stroke="#8884d8" name="Avg LPRS (minutes)" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="no-data">No data available</p>
              )}
            </div>

            <div className="chart-wrapper">
              <h3>Newsprint Consumption</h3>
              {chartData.newsprint.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.newsprint}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="newsprint_name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total_consumption" fill="#82ca9d" name="Total Consumption" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="no-data">No data available</p>
              )}
            </div>

            {/* Newsprint KGs Consumption */}
            <div className="chart-wrapper">
              <h3>Newsprint KGs Consumption</h3>
              {newsprintKgsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={newsprintKgsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="newsprint_name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any) => {
                        if (typeof value === 'number') {
                          return `${parseFloat(value.toString()).toFixed(2)} kg`;
                        }
                        return value || '-';
                      }}
                      labelFormatter={(label: any) => `${label}`}
                    />
                    <Legend />
                    <Bar dataKey="total_kgs" fill="#ff9800" name="Total KGs" />
                    <Bar dataKey="avg_kgs" fill="#ffc658" name="Avg KGs per Record" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="no-data">No data available</p>
              )}
            </div>

            {/* Machine Breakdown by Downtime Reasons */}
            <div className="chart-wrapper">
              <h3>Machine Downtime by Reason (Minutes)</h3>
              {machineDowntimeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={machineDowntimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="machine_name" />
                    <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      formatter={(value: any) => {
                        if (typeof value === 'number') {
                          return `${value} min`;
                        }
                        return value || '-';
                      }}
                      labelFormatter={(label: any) => `${label}`}
                    />
                    <Legend />
                    {machineDowntimeData.length > 0 && 
                      Object.keys(machineDowntimeData[0])
                        .filter(key => key !== 'machine_name')
                        .map((reason, index) => {
                          const colors = [
                            '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', 
                            '#0088fe', '#00c49f', '#ffbb28', '#ff8042'
                          ];
                          return (
                            <Line
                              key={reason}
                              type="monotone"
                              dataKey={reason}
                              stroke={colors[index % colors.length]}
                              strokeWidth={2}
                              connectNulls
                            />
                          );
                        })
                    }
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="no-data">No downtime data available</p>
              )}
            </div>
          </div>
        )}

        {!filters.publication && (
          <div className="no-selection">
            <p>Please select a publication to view analytics</p>
          </div>
        )}
      </div>
    </div>
  );
};
