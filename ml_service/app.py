"""
ML Service for Production Downtime & Maintenance Prediction
Runs as separate service, called by Node.js backend
"""

import os
import json
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
import joblib
from datetime import datetime, timedelta
import mysql.connector
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = Flask(__name__)
CORS(app)

# Model storage
MODELS_DIR = './models'
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs('./logs', exist_ok=True)

# Initialize models
downtime_model = None
maintenance_model = None
scaler = None
label_encoders = {}

# Database connection
def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database=os.getenv('DB_NAME', 'mmcl_db')
    )

# ============ DATA COLLECTION & PREPROCESSING ============

def fetch_production_data(days=30, publication_ids=None, start_date=None, end_date=None, location=None):
    """Fetch production data with optional filters"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
        SELECT 
            pr.id,
            pr.machine_id,
            m.name as machine_name,
            pr.publication_id,
            pub.name as publication_name,
            pr.total_pages,
            pr.plate_consumption,
            pr.color_pages,
            pr.bw_pages,
            pr.record_date,
            HOUR(pr.record_date) as hour_of_day,
            DAY(pr.record_date) as day_of_month,
            DAYOFWEEK(pr.record_date) as day_of_week
        FROM production_records pr
        LEFT JOIN machines m ON pr.machine_id = m.id
        LEFT JOIN publications pub ON pr.publication_id = pub.id
        LEFT JOIN users u ON pr.user_id = u.id
        WHERE 1=1
        """
        
        params = []
        
        # Date filters
        if start_date and end_date:
            query += " AND pr.record_date BETWEEN %s AND %s"
            params.extend([start_date, end_date])
        else:
            query += " AND pr.record_date >= DATE_SUB(NOW(), INTERVAL %s DAY)"
            params.append(days)
        
        # Publication filter
        if publication_ids:
            pub_list = [int(p) for p in str(publication_ids).split(',')]
            placeholders = ','.join(['%s'] * len(pub_list))
            query += f" AND pr.publication_id IN ({placeholders})"
            params.extend(pub_list)
        
        # Location filter
        if location:
            query += " AND u.location = %s"
            params.append(location)
        
        query += " ORDER BY pr.record_date ASC"
        
        cursor.execute(query, params)
        data = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return pd.DataFrame(data) if data else pd.DataFrame()
    
    except Exception as e:
        logger.error(f"Error fetching production data: {str(e)}")
        return pd.DataFrame()

def fetch_downtime_data(days=30):
    """Fetch downtime records to label training data"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
        SELECT 
            dd.id,
            dd.downtime_reason,
            dd.machine_id,
            dd.downtime_duration,
            dd.total_seconds,
            dd.record_date,
            m.name as machine_name
        FROM downtime_details dd
        LEFT JOIN machines m ON dd.machine_id = m.id
        WHERE dd.record_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
        """
        
        cursor.execute(query, (days,))
        data = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return pd.DataFrame(data) if data else pd.DataFrame()
    
    except Exception as e:
        logger.error(f"Error fetching downtime data: {str(e)}")
        return pd.DataFrame()

def engineer_features(df_production, df_downtime):
    """Create features for machine learning"""
    
    if df_production.empty:
        logger.warning("No production data available for feature engineering")
        return pd.DataFrame()
    
    # Group by machine and date
    daily_data = df_production.groupby(['machine_id', 'machine_name', pd.Grouper(key='record_date', freq='D')]).agg({
        'total_pages': 'sum',
        'plate_consumption': 'sum',
        'color_pages': 'sum',
        'bw_pages': 'sum',
        'id': 'count'  # number of records
    }).reset_index()
    
    daily_data.columns = ['machine_id', 'machine_name', 'date', 'total_pages', 'total_plates', 'color_pages', 'bw_pages', 'num_records']
    
    # Calculate efficiency metrics
    daily_data['plates_per_page'] = daily_data['total_plates'] / (daily_data['total_pages'] + 1)
    daily_data['color_ratio'] = daily_data['color_pages'] / (daily_data['total_pages'] + 1)
    daily_data['bw_ratio'] = daily_data['bw_pages'] / (daily_data['total_pages'] + 1)
    
    # Rolling averages (3-day, 7-day)
    daily_data = daily_data.sort_values('date')
    daily_data['plates_per_page_ma3'] = daily_data.groupby('machine_id')['plates_per_page'].transform(lambda x: x.rolling(3, min_periods=1).mean())
    daily_data['plates_per_page_ma7'] = daily_data.groupby('machine_id')['plates_per_page'].transform(lambda x: x.rolling(7, min_periods=1).mean())
    daily_data['total_pages_ma3'] = daily_data.groupby('machine_id')['total_pages'].transform(lambda x: x.rolling(3, min_periods=1).mean())
    
    # Deviation from moving average
    daily_data['plates_deviation'] = (daily_data['plates_per_page'] - daily_data['plates_per_page_ma7']).fillna(0)
    daily_data['pages_deviation'] = (daily_data['total_pages'] - daily_data['total_pages_ma3']).fillna(0)
    
    # Day of week, hour features
    daily_data['day_of_week'] = daily_data['date'].dt.dayofweek
    daily_data['week_number'] = daily_data['date'].dt.isocalendar().week
    
    # Label data: did downtime occur?
    daily_data['had_downtime'] = 0
    
    if not df_downtime.empty:
        downtime_dates = set()
        for _, row in df_downtime.iterrows():
            downtime_dates.add((row['machine_id'], pd.Timestamp(row['record_date']).date()))
        
        daily_data['had_downtime'] = daily_data.apply(
            lambda row: 1 if (row['machine_id'], pd.Timestamp(row['date']).date()) in downtime_dates else 0,
            axis=1
        )
    else:
        # If no downtime data, use synthetic labeling based on anomalies
        # High plates deviation or unusual patterns
        daily_data['had_downtime'] = (
            (daily_data['plates_deviation'].abs() > daily_data['plates_deviation'].std() * 1.5) |
            (daily_data['pages_deviation'].abs() > daily_data['pages_deviation'].std() * 1.5)
        ).astype(int)
    
    return daily_data

# ============ MODEL TRAINING ============

def train_downtime_model(X, y):
    """Train downtime prediction model"""
    global downtime_model, scaler
    
    try:
        logger.info("Training downtime prediction model...")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train model (RandomForest for interpretability)
        downtime_model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            random_state=42,
            class_weight='balanced'  # Handle imbalanced data
        )
        
        downtime_model.fit(X_train_scaled, y_train)
        
        # Evaluate
        train_score = downtime_model.score(X_train_scaled, y_train)
        test_score = downtime_model.score(X_test_scaled, y_test)
        
        logger.info(f"Model trained - Train accuracy: {train_score:.3f}, Test accuracy: {test_score:.3f}")
        
        # Save model
        joblib.dump(downtime_model, f'{MODELS_DIR}/downtime_model.pkl')
        joblib.dump(scaler, f'{MODELS_DIR}/scaler.pkl')
        
        return {'train_accuracy': train_score, 'test_accuracy': test_score}
    
    except Exception as e:
        logger.error(f"Error training model: {str(e)}")
        return None

# ============ PREDICTION ============

def predict_maintenance_risk(machine_id=None):
    """Predict maintenance risk for machines"""
    global downtime_model, scaler
    
    try:
        if downtime_model is None:
            return {'error': 'Model not trained yet'}
        
        # Fetch latest data
        df_prod = fetch_production_data(days=30)
        if df_prod.empty:
            return {'error': 'No production data available'}
        
        # Engineer features
        df_features = engineer_features(df_prod, pd.DataFrame())
        
        if df_features.empty:
            return {'error': 'Could not engineer features'}
        
        # Select feature columns (must match training)
        feature_cols = [
            'total_pages', 'total_plates', 'color_pages', 'bw_pages', 'num_records',
            'plates_per_page', 'color_ratio', 'bw_ratio',
            'plates_per_page_ma3', 'plates_per_page_ma7', 'total_pages_ma3',
            'plates_deviation', 'pages_deviation', 'day_of_week'
        ]
        
        X = df_features[feature_cols].fillna(0)
        X_scaled = scaler.transform(X)
        
        # Predict
        predictions = downtime_model.predict_proba(X_scaled)
        
        # Build response
        results = []
        for idx, row in df_features.iterrows():
            risk_score = predictions[idx][1]  # Probability of downtime
            
            results.append({
                'machine_id': int(row['machine_id']),
                'machine_name': row['machine_name'],
                'date': row['date'].strftime('%Y-%m-%d'),
                'downtime_risk': round(risk_score * 100, 2),
                'risk_level': 'HIGH' if risk_score > 0.7 else 'MEDIUM' if risk_score > 0.4 else 'LOW',
                'plates_per_page': round(row['plates_per_page'], 3),
                'plates_deviation': round(row['plates_deviation'], 3),
                'total_pages': int(row['total_pages'])
            })
        
        # Filter to specific machine if requested
        if machine_id:
            results = [r for r in results if r['machine_id'] == machine_id]
        
        # Sort by risk score
        results.sort(key=lambda x: x['downtime_risk'], reverse=True)
        
        return {
            'success': True,
            'predictions': results,
            'high_risk_count': sum(1 for r in results if r['risk_level'] == 'HIGH'),
            'medium_risk_count': sum(1 for r in results if r['risk_level'] == 'MEDIUM')
        }
    
    except Exception as e:
        logger.error(f"Error making predictions: {str(e)}")
        return {'error': str(e)}

# ============ DAILY TRAINING JOB ============

def daily_retraining():
    """Train model with accumulated data (run daily)"""
    try:
        logger.info("Starting daily model retraining...")
        
        # Fetch data
        df_prod = fetch_production_data(days=90)  # Last 90 days
        df_downtime = fetch_downtime_data(days=90)
        
        if df_prod.empty:
            logger.warning("No production data available for retraining")
            return {'error': 'No data'}
        
        # Engineer features
        df_features = engineer_features(df_prod, df_downtime)
        
        if df_features.empty:
            logger.warning("Could not engineer features")
            return {'error': 'Feature engineering failed'}
        
        # Prepare data
        feature_cols = [
            'total_pages', 'total_plates', 'color_pages', 'bw_pages', 'num_records',
            'plates_per_page', 'color_ratio', 'bw_ratio',
            'plates_per_page_ma3', 'plates_per_page_ma7', 'total_pages_ma3',
            'plates_deviation', 'pages_deviation', 'day_of_week'
        ]
        
        X = df_features[feature_cols].fillna(0)
        y = df_features['had_downtime']
        
        logger.info(f"Training data: {len(X)} samples, {y.sum()} with downtime")
        
        # Train
        result = train_downtime_model(X, y)
        
        logger.info("Daily retraining completed")
        return {'success': True, **result}
    
    except Exception as e:
        logger.error(f"Error in daily retraining: {str(e)}")
        return {'error': str(e)}

# ============ API ENDPOINTS ============

@app.route('/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})

@app.route('/train', methods=['POST'])
def train():
    """Manually trigger model training"""
    result = daily_retraining()
    return jsonify(result)

@app.route('/predict', methods=['GET'])
def predict():
    """Get downtime predictions"""
    machine_id = request.args.get('machine_id', type=int)
    result = predict_maintenance_risk(machine_id)
    return jsonify(result)

@app.route('/model-info', methods=['GET'])
def model_info():
    """Get model information"""
    model_exists = downtime_model is not None
    return jsonify({
        'model_trained': model_exists,
        'model_path': f'{MODELS_DIR}/downtime_model.pkl' if model_exists else None,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/batch-analysis', methods=['POST'])
def batch_analysis():
    """Run batch analysis (called daily from Node.js)"""
    try:
        # Retrain model
        train_result = daily_retraining()
        
        if train_result.get('error'):
            return jsonify({'success': False, 'error': train_result['error']})
        
        # Get predictions
        pred_result = predict_maintenance_risk()
        
        return jsonify({
            'success': True,
            'training': train_result,
            'predictions': pred_result
        })
    
    except Exception as e:
        logger.error(f"Error in batch analysis: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/recommendations', methods=['GET'])
def get_recommendations():
    """Get maintenance recommendations based on production efficiency and downtime"""
    try:
        # Extract filters from query parameters
        publication_ids = request.args.get('publication_ids')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        location = request.args.get('location')
        
        logger.info(f"Recommendations request - pub_ids: {publication_ids}, dates: {start_date} to {end_date}, location: {location}")
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get all machines
        cursor.execute("SELECT id, name FROM machines ORDER BY name")
        machines = cursor.fetchall()
        logger.info(f"Found {len(machines)} machines")
        
        recommendations = []
        
        # Analyze each machine
        for machine in machines:
            machine_id = machine['id']
            machine_name = machine['name']
            logger.info(f"Analyzing machine {machine_id} ({machine_name})")
            
            # Get production records for this machine with filters
            query = """
            SELECT 
                pr.id,
                pr.machine_id,
                pr.total_pages,
                pr.plate_consumption,
                pr.page_start_time,
                pr.page_end_time,
                pr.record_date,
                pub.name as publication_name
            FROM production_records pr
            LEFT JOIN publications pub ON pr.publication_id = pub.id
            WHERE pr.machine_id = %s
            """
            
            params = [machine_id]
            
            # Apply filters
            if start_date and end_date:
                query += " AND pr.record_date BETWEEN %s AND %s"
                params.extend([start_date, end_date])
            else:
                query += " AND pr.record_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
            
            if publication_ids:
                pub_list = [int(p) for p in str(publication_ids).split(',')]
                placeholders = ','.join(['%s'] * len(pub_list))
                query += f" AND pr.publication_id IN ({placeholders})"
                params.extend(pub_list)
            
            if location:
                query += " AND EXISTS (SELECT 1 FROM users u WHERE u.id = pr.user_id AND u.location = %s)"
                params.append(location)
            
            query += " ORDER BY pr.record_date DESC"
            
            cursor.execute(query, params)
            records = cursor.fetchall()
            logger.info(f"Machine {machine_id}: Found {len(records) if records else 0} production records")
            
            if not records:
                continue
            
            # Get downtime for these records from downtime_entries table
            record_ids = [r['id'] for r in records]
            if record_ids:
                placeholders = ','.join(['%s'] * len(record_ids))
                cursor.execute(f"""
                SELECT 
                    de.production_record_id,
                    de.downtime_reason_id,
                    dr.reason as reason_name,
                    de.downtime_duration
                FROM downtime_entries de
                LEFT JOIN downtime_reasons dr ON de.downtime_reason_id = dr.id
                WHERE de.production_record_id IN ({placeholders})
                """, record_ids)
                downtime_records = cursor.fetchall()
                logger.info(f"Machine {machine_id}: Found {len(downtime_records) if downtime_records else 0} downtime entries")
            else:
                downtime_records = []
                logger.info(f"Machine {machine_id}: No record IDs to query downtime")
            
            # Build downtime map
            downtime_map = {}
            for dt in downtime_records:
                rec_id = dt['production_record_id']
                if rec_id not in downtime_map:
                    downtime_map[rec_id] = []
                downtime_map[rec_id].append(dt)
            
            # Analyze metrics
            total_print_time = 0
            total_downtime = 0
            breakdown_count = 0
            affected_pubs = set()
            
            for record in records:
                # Calculate print duration from start/end times (in minutes)
                try:
                    if record['page_start_time'] and record['page_end_time']:
                        from datetime import datetime as dt_parse, time as time_type
                        
                        # Convert to datetime if needed
                        if isinstance(record['page_start_time'], time_type):
                            start_dt = dt_parse.combine(datetime.now().date(), record['page_start_time'])
                            end_dt = dt_parse.combine(datetime.now().date(), record['page_end_time'])
                        else:
                            start_dt = dt_parse.strptime(str(record['page_start_time']), '%H:%M:%S')
                            end_dt = dt_parse.strptime(str(record['page_end_time']), '%H:%M:%S')
                        
                        duration_minutes = (end_dt - start_dt).total_seconds() / 60
                        
                        # Handle day boundary (if end < start, it crossed midnight)
                        if duration_minutes < 0:
                            duration_minutes += 24 * 60
                        
                        if duration_minutes > 0:
                            total_print_time += duration_minutes
                except Exception as e:
                    logger.debug(f"Could not parse times for record {record['id']}: {e}")
                    pass
                
                # Add downtime for this record
                if record['id'] in downtime_map:
                    for dt in downtime_map[record['id']]:
                        # Convert TIME format (HH:MM:SS) to minutes
                        try:
                            duration_str = str(dt.get('downtime_duration', '00:00:00'))
                            parts = duration_str.split(':')
                            hours = int(parts[0]) if len(parts) > 0 else 0
                            minutes = int(parts[1]) if len(parts) > 1 else 0
                            seconds = int(parts[2]) if len(parts) > 2 else 0
                            dur_minutes = (hours * 60) + minutes + (seconds / 60)
                        except:
                            dur_minutes = 0
                        
                        total_downtime += dur_minutes
                        breakdown_count += 1
                
                if record.get('publication_name'):
                    affected_pubs.add(record['publication_name'])
            
            # Skip if no data
            if total_print_time == 0 and total_downtime == 0:
                logger.info(f"Machine {machine_id}: Skipping - no print time or downtime data")
                continue
            
            # If we have any downtime, generate a recommendation even if print_time is 0
            if breakdown_count == 0:
                logger.info(f"Machine {machine_id}: Skipping - no breakdowns detected")
                continue
            
            # Calculate efficiency
            total_time = total_print_time + total_downtime
            efficiency = (total_print_time / total_time * 100) if total_time > 0 else 100
            
            logger.info(f"Machine {machine_id}: print_time={total_print_time:.1f}min, downtime={total_downtime:.1f}min, breakdowns={breakdown_count}, efficiency={efficiency:.1f}%")
            
            # Determine priority based on downtime impact
            priority = None
            recommendation = None
            reason = None
            
            if breakdown_count > 5 and total_downtime > 120:  # 5+ breakdowns, 2+ hours downtime
                priority = 'URGENT'
                recommendation = f"CRITICAL MAINTENANCE - {breakdown_count} breakdowns, {total_downtime:.0f} min downtime"
                reason = f"Machine efficiency dropped to {efficiency:.1f}%. Immediate inspection needed."
            elif breakdown_count > 3 and total_downtime > 60:  # 3+ breakdowns, 1+ hour downtime
                priority = 'URGENT'
                recommendation = f"Schedule urgent maintenance - {breakdown_count} breakdowns detected"
                reason = f"Total downtime: {total_downtime:.0f} minutes. Could improve efficiency by {100-efficiency:.1f}%"
            elif breakdown_count > 2:
                priority = 'NORMAL'
                recommendation = f"Plan preventive maintenance - {breakdown_count} recent breakdowns"
                reason = f"Pattern detected. Current efficiency: {efficiency:.1f}%"
            elif efficiency < 85:  # Less than 85% efficient
                priority = 'NORMAL'
                recommendation = "Inspect and optimize machine settings"
                reason = f"Downtime: {total_downtime:.0f} min vs print time: {total_print_time:.0f} min"
            
            if priority:
                affected_pubs_list = list(affected_pubs)[:3]
                recommendations.append({
                    'machine_id': machine_id,
                    'machine_name': machine_name,
                    'priority': priority,
                    'recommendation': recommendation,
                    'reason': reason,
                    'suggested_date': (datetime.now() + timedelta(days=1 if priority == 'URGENT' else 3)).strftime('%Y-%m-%d'),
                    'metrics': {
                        'total_print_time_minutes': int(total_print_time),
                        'total_downtime_minutes': int(total_downtime),
                        'breakdown_events': breakdown_count,
                        'efficiency_percentage': round(efficiency, 1),
                        'production_runs': len(records),
                        'affected_publications': affected_pubs_list
                    }
                })
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'total_urgent': sum(1 for r in recommendations if r['priority'] == 'URGENT'),
            'total_normal': sum(1 for r in recommendations if r['priority'] == 'NORMAL'),
            'analysis_type': 'downtime_impact',
            'status': 'real_data' if recommendations else 'no_downtime_data'
        })
    
    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    logger.info("Starting ML Service...")
    
    # Initial training
    logger.info("Performing initial training...")
    daily_retraining()
    
    # Start Flask app
    port = int(os.getenv('PORT', 5004))
    app.run(host='0.0.0.0', port=port, debug=False)
