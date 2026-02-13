"""
AI Recommendations Engine
Analyzes production efficiency vs downtime to recommend maintenance
"""

import mysql.connector
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

def get_db_connection(host, user, password, database):
    return mysql.connector.connect(
        host=host,
        user=user,
        password=password,
        database=database
    )

def analyze_machine_efficiency(conn, machine_id, publication_ids=None, start_date=None, end_date=None, location=None):
    """
    Analyze machine efficiency by comparing:
    - Actual print time (page_start_time to page_end_time)
    - Downtime incidents
    - Breakdown duration
    """
    cursor = conn.cursor(dictionary=True)
    
    # Get production records for this machine
    query = """
    SELECT 
        pr.id,
        pr.machine_id,
        m.name as machine_name,
        pr.publication_id,
        pub.name as publication_name,
        pr.po_number,
        pr.total_pages,
        pr.plate_consumption,
        pr.page_start_time,
        pr.page_end_time,
        pr.record_date,
        u.location
    FROM production_records pr
    LEFT JOIN machines m ON pr.machine_id = m.id
    LEFT JOIN publications pub ON pr.publication_id = pub.id
    LEFT JOIN users u ON pr.user_id = u.id
    WHERE pr.machine_id = %s
    """
    
    params = [machine_id]
    
    # Date filters
    if start_date and end_date:
        query += " AND pr.record_date BETWEEN %s AND %s"
        params.extend([start_date, end_date])
    else:
        query += " AND pr.record_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
    
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
    
    query += " ORDER BY pr.record_date DESC"
    
    cursor.execute(query, params)
    records = cursor.fetchall()
    
    if not records:
        return None
    
    # Get downtime for these records
    record_ids = [r['id'] for r in records]
    if record_ids:
        placeholders = ','.join(['%s'] * len(record_ids))
        cursor.execute(f"""
        SELECT 
            production_record_id,
            reason_id,
            dr.reason as reason_name,
            duration_minutes,
            recorded_date
        FROM machine_downtime md
        LEFT JOIN downtime_reasons dr ON md.reason_id = dr.id
        WHERE production_record_id IN ({placeholders})
        """, record_ids)
        downtime_records = cursor.fetchall()
    else:
        downtime_records = []
    
    # Build downtime map
    downtime_map = {}
    for dt in downtime_records:
        rec_id = dt['production_record_id']
        if rec_id not in downtime_map:
            downtime_map[rec_id] = []
        downtime_map[rec_id].append(dt)
    
    # Analyze each production record
    total_print_time = 0
    total_downtime = 0
    breakdown_count = 0
    total_reducable_downtime = 0
    affected_publications = set()
    
    for record in records:
        # Calculate print duration from start/end times
        try:
            if record['page_start_time'] and record['page_end_time']:
                from datetime import datetime as dt_parse
                start = dt_parse.strptime(str(record['page_start_time']), '%H:%M:%S')
                end = dt_parse.strptime(str(record['page_end_time']), '%H:%M:%S')
                
                # Handle day boundary crossing
                duration = (end - start).total_seconds() / 60
                if duration < 0:
                    duration += 24 * 60
                
                total_print_time += duration
        except:
            pass
        
        # Add downtime
        if record['id'] in downtime_map:
            for dt in downtime_map[record['id']]:
                dur = dt.get('duration_minutes', 0) or 0
                total_downtime += dur
                total_reducable_downtime += dur  # Assume all downtime is somewhat reducable
                breakdown_count += 1
        
        affected_publications.add(record.get('publication_name', 'Unknown'))
    
    cursor.close()
    
    return {
        'machine_id': machine_id,
        'machine_name': records[0]['machine_name'],
        'total_print_time': total_print_time,
        'total_downtime': total_downtime,
        'breakdown_count': breakdown_count,
        'reducable_downtime': total_reducable_downtime,
        'record_count': len(records),
        'affected_publications': list(affected_publications),
        'efficiency_percentage': (total_print_time / (total_print_time + total_downtime) * 100) if (total_print_time + total_downtime) > 0 else 0
    }

def generate_recommendations(conn, filters=None):
    """
    Generate maintenance recommendations based on efficiency analysis
    
    Args:
        conn: Database connection
        filters: Dict with publication_ids, start_date, end_date, location
    """
    filters = filters or {}
    
    cursor = conn.cursor(dictionary=True)
    
    # Get all machines
    cursor.execute("SELECT id, name FROM machines ORDER BY name")
    machines = cursor.fetchall()
    cursor.close()
    
    recommendations = []
    
    for machine in machines:
        analysis = analyze_machine_efficiency(
            conn,
            machine['id'],
            publication_ids=filters.get('publication_ids'),
            start_date=filters.get('start_date'),
            end_date=filters.get('end_date'),
            location=filters.get('location')
        )
        
        if not analysis:
            continue
        
        # Determine priority based on efficiency and downtime
        efficiency = analysis['efficiency_percentage']
        breakdowns = analysis['breakdown_count']
        reducable = analysis['reducable_downtime']
        
        # Priority rules
        if breakdowns > 5 and reducable > 120:  # 5+ breakdowns, 2+ hours reducable downtime
            priority = 'URGENT'
            recommendation = f"CRITICAL MAINTENANCE - {breakdowns} breakdowns, {reducable:.0f} min downtime detected"
            reason = f"Machine has lost significant productive time. Efficiency: {efficiency:.1f}%. Immediate inspection required."
        elif breakdowns > 3 and reducable > 60:  # 3+ breakdowns, 1+ hour reducable downtime
            priority = 'URGENT'
            recommendation = f"Schedule urgent maintenance - {breakdowns} recent breakdowns"
            reason = f"Recurring failures detected. {reducable:.0f} minutes of downtime is reducable. Could improve efficiency by {100-efficiency:.1f}%"
        elif breakdowns > 2:
            priority = 'NORMAL'
            recommendation = f"Plan preventive maintenance - {breakdowns} breakdowns in recent runs"
            reason = f"Pattern of failures detected. Current efficiency: {efficiency:.1f}%"
        elif efficiency < 85:  # Less than 85% efficient
            priority = 'NORMAL'
            recommendation = "Inspect and optimize machine settings"
            reason = f"Downtime is {analysis['total_downtime']:.0f} min vs print time {analysis['total_print_time']:.0f} min (efficiency: {efficiency:.1f}%)"
        else:
            continue  # Machine is healthy
        
        publications = ', '.join(analysis['affected_publications'][:3])
        if len(analysis['affected_publications']) > 3:
            publications += '...'
        
        recommendations.append({
            'machine_id': analysis['machine_id'],
            'machine_name': analysis['machine_name'],
            'priority': priority,
            'recommendation': recommendation,
            'reason': reason,
            'suggested_date': (datetime.now() + timedelta(days=1 if priority == 'URGENT' else 3)).strftime('%Y-%m-%d'),
            'metrics': {
                'total_print_time_minutes': int(analysis['total_print_time']),
                'total_downtime_minutes': int(analysis['total_downtime']),
                'reducable_downtime_minutes': int(analysis['reducable_downtime']),
                'breakdown_events': analysis['breakdown_count'],
                'efficiency_percentage': round(efficiency, 1),
                'production_runs': analysis['record_count'],
                'affected_publications': analysis['affected_publications'][:3]
            }
        })
    
    return {
        'recommendations': recommendations,
        'total_urgent': sum(1 for r in recommendations if r['priority'] == 'URGENT'),
        'total_normal': sum(1 for r in recommendations if r['priority'] == 'NORMAL')
    }
