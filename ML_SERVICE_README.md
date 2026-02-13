# AI Downtime & Maintenance Prediction System

## Overview

This system uses machine learning to predict equipment downtime and maintenance needs based on production data. It runs daily batch analysis to train models and provide predictions.

## Architecture

```
┌─────────────────────────────────────────────┐
│         Frontend (React)                    │
│    AI Insights Tab + Recommendations         │
└────────────────────┬────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────┐
│         Backend (Node.js/Express)            │
│    /api/ai/* endpoints                       │
└────────────────────┬────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────┐
│    ML Service (Python/Flask)                │
│  - Data preprocessing                       │
│  - Model training                           │
│  - Predictions & recommendations            │
└────────────────────┬────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────┐
│         MySQL Database                      │
│    production_records, downtime_details     │
└─────────────────────────────────────────────┘
```

## Features

### 1. **Downtime Prediction**
- Predicts probability of machine downtime in next 24 hours
- Uses historical data patterns and current metrics
- Risk levels: LOW, MEDIUM, HIGH

### 2. **Anomaly Detection**
- Detects unusual patterns in:
  - Plate consumption
  - Page counts
  - Production efficiency
- Flags machines with degrading performance

### 3. **Maintenance Recommendations**
- **URGENT**: Schedule within 1 day
- **NORMAL**: Plan within 3 days
- Based on: Risk scores, efficiency metrics, historical patterns

### 4. **Daily Batch Processing**
- Runs once per day (configurable)
- Retrains models with accumulated data
- Updates predictions for all machines
- Improves accuracy over time

## Setup Instructions

### Step 1: Install Python Dependencies

```bash
cd ml_service

# Make setup script executable
chmod +x setup.sh

# Run setup
./setup.sh

# This will:
# - Check Python 3 installation
# - Create virtual environment
# - Install requirements
# - Create .env file
```

### Step 2: Configure Environment

Edit `ml_service/.env`:

```env
# Database (same as backend)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=mmcl_db

# Flask
FLASK_ENV=production
PORT=5001
```

### Step 3: Start ML Service

**Development:**
```bash
cd ml_service
source venv/bin/activate
python app.py
```

**Production (with PM2):**
```bash
# Create ecosystem.config.js in root
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'mmcl-backend',
      script: 'dist/index.js',
      instances: 1,
      env: { NODE_ENV: 'production', PORT: 5004 }
    },
    {
      name: 'mmcl-ml-service',
      script: 'venv/bin/python',
      args: 'ml_service/app.py',
      instances: 1,
      env: { FLASK_ENV: 'production', PORT: 5001 }
    }
  ]
};
EOF

# Start both services
pm2 start ecosystem.config.js
pm2 save
```

### Step 4: Setup Daily Retraining (Cron Job)

```bash
# Make script executable
chmod +x ml_service/daily_retrain.sh

# Add to crontab (runs at 2 AM daily)
crontab -e

# Add this line:
0 2 * * * /var/www/production/ml_service/daily_retrain.sh
```

## API Endpoints

### 1. Get Maintenance Predictions

**Endpoint:** `GET /api/ai/predictions`

**Parameters:**
- `machine_id` (optional): Filter to specific machine

**Response:**
```json
{
  "success": true,
  "predictions": [
    {
      "machine_id": 1,
      "machine_name": "Machine A",
      "date": "2026-02-12",
      "downtime_risk": 75.5,
      "risk_level": "HIGH",
      "plates_per_page": 0.85,
      "plates_deviation": 0.12,
      "total_pages": 5000
    }
  ],
  "high_risk_count": 2,
  "medium_risk_count": 3
}
```

### 2. Get Recommendations

**Endpoint:** `GET /api/ai/recommendations`

**Response:**
```json
{
  "success": true,
  "recommendations": [
    {
      "machine_id": 1,
      "machine_name": "Machine A",
      "priority": "URGENT",
      "recommendation": "Schedule maintenance for Machine A - High downtime risk (75.5%)",
      "reason": "Plate efficiency deviation: 0.120",
      "suggested_date": "2026-02-13"
    }
  ],
  "total_urgent": 2,
  "total_normal": 3
}
```

### 3. Run Batch Analysis

**Endpoint:** `POST /api/ai/batch-analysis`

**Authorization:** Admin required

**Response:**
```json
{
  "success": true,
  "training": {
    "train_accuracy": 0.875,
    "test_accuracy": 0.82
  },
  "predictions": { ... }
}
```

### 4. Get Model Information

**Endpoint:** `GET /api/ai/model-info`

**Response:**
```json
{
  "model_trained": true,
  "model_path": "./models/downtime_model.pkl",
  "timestamp": "2026-02-12T14:30:00Z"
}
```

### 5. Health Check

**Endpoint:** `GET /api/ai/health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-12T14:30:00Z"
}
```

## Frontend Integration

### Add AI Insights Tab

In `AdminDashboard.tsx`:

```typescript
// Import API
import { aiAPI } from '../services/api';

// Add state
const [aiPredictions, setAIPredictions] = useState<any>(null);
const [aiRecommendations, setAIRecommendations] = useState<any>(null);

// Fetch in useEffect
const fetchAIAnalysis = async () => {
  try {
    const [predRes, recRes] = await Promise.all([
      aiAPI.getMaintenancePredictions(),
      aiAPI.getMaintenanceRecommendations()
    ]);
    setAIPredictions(predRes.data);
    setAIRecommendations(recRes.data);
  } catch (error) {
    console.error('Error fetching AI analysis:', error);
  }
};

// Add to sidebar
<button onClick={() => setActiveTab('ai')}>
  <SmartToyIcon /> AI Insights
</button>

// Add tab content
{activeTab === 'ai' && (
  <div className="chart-wrapper">
    <h3>🤖 AI Maintenance Predictions</h3>
    
    {/* Recommendations Cards */}
    {aiRecommendations?.recommendations?.map(rec => (
      <div key={rec.machine_id} style={{
        padding: '15px',
        border: `2px solid ${rec.priority === 'URGENT' ? '#f44336' : '#ff9800'}`,
        borderRadius: '8px',
        marginBottom: '10px'
      }}>
        <h4>{rec.machine_name}</h4>
        <p><strong>Priority:</strong> {rec.priority}</p>
        <p>{rec.recommendation}</p>
        <p><small>{rec.reason}</small></p>
        <p><strong>Suggested:</strong> {rec.suggested_date}</p>
      </div>
    ))}
    
    {/* Predictions Table */}
    {/* Create table showing all predictions with risk scores */}
  </div>
)}
```

## Model Training Details

### Features Used

1. **Production Metrics:**
   - Total pages printed
   - Total plates consumed
   - Color vs B&W pages ratio
   - Number of production records

2. **Efficiency Metrics:**
   - Plates per page
   - Color ratio
   - B&W ratio

3. **Time Series Features:**
   - 3-day moving average (plates/page)
   - 7-day moving average (plates/page)
   - 3-day moving average (total pages)
   - Deviation from moving averages

4. **Temporal Features:**
   - Day of week
   - Week number

### Labels

- **Positive (1):** Machine had downtime on that day
- **Negative (0):** No downtime recorded

**Note:** Without historical downtime data, system uses synthetic labeling based on anomalies (high deviations from normal patterns).

### Model Algorithm

**Random Forest Classifier**
- 100 trees
- Max depth: 10
- Balanced class weights (handles imbalanced data)
- Feature scaling with StandardScaler

### Retraining

- **Frequency:** Daily
- **Data window:** Last 90 days
- **Training/Test split:** 80/20
- **Improvements:** Model accuracy improves as more downtime data is collected

## Monitoring

### Check Service Status

```bash
# ML Service health
curl http://localhost:5001/health

# Get model info
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5004/api/ai/model-info
```

### View Logs

```bash
# ML Service logs
tail -f ml_service/logs/daily_retrain.log

# PM2 logs
pm2 logs mmcl-ml-service
```

### Performance Metrics

After each training run, check:
- Training accuracy
- Test accuracy
- Number of high-risk machines
- Anomalies detected

## Troubleshooting

### ML Service Won't Start

```bash
# Check Python installation
python3 --version

# Check virtual environment
source ml_service/venv/bin/activate
python -m pip list

# Check port availability
lsof -i :5001
```

### Backend Can't Connect to ML Service

```bash
# Check ML service is running
curl http://localhost:5001/health

# Check firewall
# Update ML_SERVICE_URL in backend if needed
```

### No Predictions Generated

```bash
# Check if production data exists
mysql -u root -p mmcl_db -e "SELECT COUNT(*) FROM production_records;"

# Check model status
curl http://localhost:5004/api/ai/model-info

# Manually trigger retraining
curl -X POST http://localhost:5004/api/ai/batch-analysis \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Future Enhancements

1. **Multiple Models:**
   - Separate models for each machine type
   - Newsprint-specific predictions
   - Location-based patterns

2. **Advanced Features:**
   - LSTM/RNN for time series
   - Deep learning models
   - Ensemble methods

3. **Data Collection:**
   - Collect actual downtime data
   - Improve label accuracy
   - Feature engineering from domain experts

4. **Production:**
   - GPU acceleration
   - Model versioning
   - A/B testing models
   - Real-time streaming predictions

## Support

For issues or improvements:
1. Check logs in `ml_service/logs/`
2. Verify database connectivity
3. Ensure Python 3.8+ is installed
4. Verify all required packages installed: `pip list`
