#!/bin/bash

# Daily ML Model Retraining Script
# Add to crontab: 0 2 * * * /path/to/mmcl-production/ml_service/daily_retrain.sh

set -e

# Configuration
PROJECT_DIR="/var/www/production"
ML_SERVICE_DIR="$PROJECT_DIR/ml_service"
LOG_FILE="$ML_SERVICE_DIR/logs/daily_retrain.log"
API_URL="http://localhost:5001"
BACKEND_URL="http://localhost:5004"

# Timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "$TIMESTAMP - Starting daily ML model retraining..." >> $LOG_FILE

# Check if ML service is running
if ! curl -s "$API_URL/health" > /dev/null; then
    echo "$TIMESTAMP - ERROR: ML service is not running" >> $LOG_FILE
    exit 1
fi

echo "$TIMESTAMP - ML service is running" >> $LOG_FILE

# Trigger batch analysis from backend
if [ -n "$BACKEND_AUTH_TOKEN" ]; then
    RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/ai/batch-analysis" \
        -H "Authorization: Bearer $BACKEND_AUTH_TOKEN" \
        -H "Content-Type: application/json")
    
    if echo "$RESPONSE" | grep -q "success"; then
        echo "$TIMESTAMP - Batch analysis completed successfully" >> $LOG_FILE
    else
        echo "$TIMESTAMP - ERROR: Batch analysis failed: $RESPONSE" >> $LOG_FILE
    fi
else
    # Alternative: Call ML service directly
    RESPONSE=$(curl -s -X POST "$API_URL/batch-analysis")
    
    if echo "$RESPONSE" | grep -q "success"; then
        echo "$TIMESTAMP - Batch analysis completed successfully" >> $LOG_FILE
    else
        echo "$TIMESTAMP - ERROR: Batch analysis failed: $RESPONSE" >> $LOG_FILE
    fi
fi

echo "$TIMESTAMP - Daily retraining job finished" >> $LOG_FILE
