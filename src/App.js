import { useState } from 'react';
import './App.css';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export function buildUsageRows(apiUsageResponse) {
  const daily = apiUsageResponse?.data?.daily || {};
  const rows = [];

  Object.keys(daily)
    .sort()
    .forEach((date) => {
      const endpointUsage = daily[date] || {};
      const entries = Object.entries(endpointUsage);

      if (entries.length === 0) {
        rows.push({ date, endpoint: 'No activity', calls: 0 });
        return;
      }

      entries.forEach(([endpoint, value]) => {
        rows.push({
          date,
          endpoint,
          calls: Number(value) || 0,
        });
      });
    });

  return rows;
}

export function getDailySummary(results) {
  const dailyData = {};

  results
    .filter((result) => result.status === 'Success')
    .forEach((result) => {
      result.usageRows.forEach((row) => {
        if (!dailyData[row.date]) {
          dailyData[row.date] = 0;
        }
        dailyData[row.date] += Number(row.calls) || 0;
      });
    });

  return Object.entries(dailyData)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, calls]) => ({
      date,
      calls,
    }));
}

function App() {
  const [apiKeys, setApiKeys] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rangeType, setRangeType] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getDateRange = () => {
    if (rangeType === 'today') {
      const today = getTodayDate();
      return { start: today, end: today };
    }

    if (rangeType === 'week') {
      const end = new Date();
      const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      };
    }

    if (rangeType === 'month') {
      const end = new Date();
      const start = new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      };
    }

    if (rangeType === 'custom') {
      return { start: customStartDate, end: customEndDate };
    }

    return { start: '', end: '' };
  };

  const handleFetchData = async () => {
    if (!apiKeys.trim()) {
      setError('Please enter at least one API key');
      return;
    }

    const dateObj = getDateRange();
    if (!dateObj.start || !dateObj.end) {
      setError('Please choose a valid date range');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

    const keys = apiKeys.split(',').map((key) => key.trim()).filter(Boolean);
    const newResults = [];

    for (const apiKey of keys) {
      try {
        const response = await fetch(
          '/api/getVirusTotal',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              apiKey,
              startDate: dateObj.start,
              endDate: dateObj.end,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const totalData = data.data?.total || {};
        const usageRows = buildUsageRows(data);
        const totalConsumption = usageRows.reduce((sum, row) => sum + (Number(row.calls) || 0), 0);
        const uniqueEndpoints = Object.keys(totalData).length;
        const endpointSummary = Object.keys(totalData).length > 0
          ? Object.entries(totalData).map(([key, val]) => `${key}: ${val}`).join(', ')
          : 'No activity';

        newResults.push({
          apiKey: apiKey.substring(0, 8) + '***',
          status: 'Success',
          totalRequests: totalConsumption,
          activeEndpoints: uniqueEndpoints,
          range: `${dateObj.start} → ${dateObj.end}`,
          endpoints: endpointSummary,
          usageRows,
        });
      } catch (err) {
        newResults.push({
          apiKey: apiKey.substring(0, 8) + '***',
          status: 'Error',
          totalRequests: 'N/A',
          activeEndpoints: 'N/A',
          range: `${dateObj.start} → ${dateObj.end}`,
          endpoints: err.message,
          usageRows: [],
        });
      }
    }

    setResults(newResults);
    setLoading(false);
  };

  const totalRequests = results
    .filter((result) => result.status === 'Success')
    .reduce((sum, result) => sum + (Number(result.totalRequests) || 0), 0);

  const totalActiveEndpoints = results
    .filter((result) => result.status === 'Success')
    .reduce((sum, result) => sum + (Number(result.activeEndpoints) || 0), 0);

  const dailySummaryData = getDailySummary(results);

  return (
    <div className="App">
      <div className="container">
        <h1>VirusTotal API Usage Tracker</h1>
        <p className="subtitle">Track usage across custom date ranges and endpoint activity.</p>

        <div className="input-section">
          <label htmlFor="apiKeys">VirusTotal API Keys (comma-separated):</label>
          <textarea
            id="apiKeys"
            value={apiKeys}
            onChange={(e) => setApiKeys(e.target.value)}
            placeholder="Paste your API keys here, separated by commas"
            rows="4"
            className="api-input"
          />

          <div className="range-controls">
            <label htmlFor="rangeType">Date range</label>
            <select
              id="rangeType"
              value={rangeType}
              onChange={(e) => setRangeType(e.target.value)}
              className="range-select"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="custom">Custom range</option>
            </select>

            {rangeType === 'custom' && (
              <div className="custom-dates">
                <div>
                  <label htmlFor="customStartDate">Start date</label>
                  <input
                    id="customStartDate"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="date-input"
                  />
                </div>
                <div>
                  <label htmlFor="customEndDate">End date</label>
                  <input
                    id="customEndDate"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="date-input"
                  />
                </div>
              </div>
            )}
          </div>

          <button onClick={handleFetchData} disabled={loading} className="btn-fetch">
            {loading ? 'Fetching...' : 'Fetch Usage Data'}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {results.length > 0 && dailySummaryData.length > 0 && (
          <div className="chart-section">
            <h2>Daily API Calls Summary</h2>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailySummaryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="calls" fill="#1976d2" name="Total Calls" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="results-section">
            <h2>Usage Summary</h2>

            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">Total requests</span>
                <strong>{totalRequests}</strong>
              </div>
              <div className="stat-card">
                <span className="stat-label">Active endpoints</span>
                <strong>{totalActiveEndpoints}</strong>
              </div>
              <div className="stat-card">
                <span className="stat-label">Keys checked</span>
                <strong>{results.length}</strong>
              </div>
              <div className="stat-card">
                <span className="stat-label">Selected range</span>
                <strong>{getDateRange().start || '—'} to {getDateRange().end || '—'}</strong>
              </div>
            </div>

            <table className="results-table summary-table">
              <thead>
                <tr>
                  <th>API Key</th>
                  <th>Range</th>
                  <th>Status</th>
                  <th>Requests Used</th>
                  <th>Active Endpoints</th>
                  <th>Endpoints Accessed</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, idx) => (
                  <tr key={idx} className={result.status === 'Success' ? 'success' : 'error'}>
                    <td>{result.apiKey}</td>
                    <td>{result.range}</td>
                    <td>{result.status}</td>
                    <td className="consumption">{result.totalRequests}</td>
                    <td>{result.activeEndpoints}</td>
                    <td>{result.endpoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {results.filter((result) => result.status === 'Success').map((result, idx) => (
              <div key={`details-${idx}`} className="detail-card">
                <h3>{result.apiKey} usage by date</h3>
                <table className="results-table details-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Endpoint</th>
                      <th>Calls</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.usageRows.length > 0 ? (
                      result.usageRows.map((row, rowIndex) => (
                        <tr key={`${result.apiKey}-${row.date}-${row.endpoint}-${rowIndex}`}>
                          <td>{row.date}</td>
                          <td>{row.endpoint}</td>
                          <td className="consumption">{row.calls}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3">No usage data found for this date range.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
