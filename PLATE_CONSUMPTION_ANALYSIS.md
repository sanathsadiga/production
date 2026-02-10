# Plate Consumption Analysis - Enhanced Dashboard

## Overview
The Plate Consumption Analysis provides comprehensive insights into printing plate usage patterns across publications, machines, and operators. This is a critical efficiency metric for monitoring print production costs and resource utilization.

---

## Backend Enhancement (`/analytics/plate-consumption`)

### New Data Structure
The endpoint returns 6 different data sets for multi-dimensional analysis:

```json
{
  "daily_trend": [...],              // Daily plate consumption data
  "by_publication": [...],           // Aggregated by publication
  "by_machine": [...],               // Aggregated by machine
  "by_operator": [...],              // Aggregated by operator/user
  "plate_per_page_trend": [...],     // Efficiency metric over time
  "statistics": {
    "total_plates": number,
    "avg_plates_per_record": number,
    "avg_plates_per_day": number,
    "min_plates": number,
    "max_plates": number,
    "total_records": number,
    "total_days": number,
    "total_pages": number,
    "plate_per_page": number
  },
  "count": number
}
```

---

## Data Aggregations

### 1. **Daily Trend** (`daily_trend`)
- **Grouped by**: Production date
- **Metrics**:
  - `total_plates`: Sum of plates consumed on that day
  - `avg_plates`: Average plates per record on that day
  - `record_count`: Number of production records on that day
  - `total_pages`: Total pages printed on that day

**Use**: Identify daily consumption patterns and anomalies

---

### 2. **By Publication** (`by_publication`)
- **Grouped by**: Publication name
- **Metrics**:
  - `total_plates`: Sum of all plates for publication
  - `avg_plates`: Average plates per record
  - `min_plates`: Minimum consumption in a single record
  - `max_plates`: Maximum consumption in a single record
  - `record_count`: Total records for publication
  - `total_pages`: Total pages printed

**Use**: Compare plate efficiency across publications

---

### 3. **By Machine** (`by_machine`)
- **Grouped by**: Machine name
- **Metrics**:
  - `total_plates`: Sum of all plates used by machine
  - `avg_plates`: Average plates per run
  - `min_plates` / `max_plates`: Range of consumption
  - `record_count`: Number of production runs
  - `total_pages`: Total pages printed on machine

**Use**: Identify machines with high/low plate efficiency, maintenance patterns

---

### 4. **By Operator** (`by_operator`)
- **Grouped by**: User/Operator name and location
- **Metrics**:
  - `operator_name`: Name of the printing operator
  - `location`: Operator's location/facility
  - `total_plates`: Total plates used by operator
  - `avg_plates`: Average per production record
  - `min_plates` / `max_plates`: Efficiency range
  - `record_count`: Number of production records
  - `total_pages`: Total pages printed

**Use**: Evaluate operator performance and skill level, identify training needs

---

### 5. **Plate Per Page Trend** (`plate_per_page_trend`)
- **Grouped by**: Production date
- **Metrics**:
  - `plate_per_page`: Calculated as: `total_plates / total_pages`
  - `record_count`: Records on that day

**Use**: Track printing efficiency improvements/degradation, identify operational issues

---

### 6. **Overall Statistics** (`statistics`)

| Metric | Formula | Use |
|--------|---------|-----|
| **total_plates** | SUM(plate_consumption) | Total resource used |
| **avg_plates_per_record** | AVG(plate_consumption) | Average per production run |
| **avg_plates_per_day** | total_plates / days_with_records | Daily benchmark |
| **min_plates** | MIN(plate_consumption) | Best case scenario |
| **max_plates** | MAX(plate_consumption) | Worst case scenario |
| **total_records** | COUNT(records) | Data completeness |
| **total_days** | COUNT(DISTINCT dates) | Days with production |
| **total_pages** | SUM(total_pages) | Pages printed |
| **plate_per_page** | total_plates / total_pages | Efficiency ratio |

---

## Frontend Visualization

### Statistics Cards (6 Cards)
Color-coded display of key metrics:

| Card | Value | Color | Purpose |
|------|-------|-------|---------|
| 🟠 TOTAL PLATES | total_plates | Orange | Total consumption |
| 🔵 AVG PER DAY | avg_plates_per_day | Blue | Daily average |
| 🟣 AVG PER RECORD | avg_plates_per_record | Purple | Per-job efficiency |
| 🟢 PLATE/PAGE | plate_per_page | Green | Efficiency ratio |
| 🔴 MAX PLATES | max_plates | Red | Highest single use |
| 🌺 MIN PLATES | min_plates | Pink | Lowest single use |

---

### Charts & Tables

#### 1. **Daily Plate Consumption Trend** (Dual-axis Line Chart)
- **Left Axis**: Total Plates (Orange line)
- **Right Axis**: Total Pages (Blue line)
- **Purpose**: Visualize consumption vs. output
- **Insight**: Identify correlation/anomalies between plates used and pages printed

#### 2. **Consumption by Publication** (Bar Chart)
- **Bars**: 
  - Orange = Total Plates per publication
  - Blue = Average Plates per record
- **Purpose**: Compare plate efficiency across publications
- **Insight**: Identify which publications are consuming most plates

#### 3. **Consumption by Machine** (Bar Chart)
- **Bars**:
  - Purple = Total Plates per machine
  - Dark Purple = Average Plates per run
- **Purpose**: Evaluate machine efficiency
- **Insight**: Identify machines needing maintenance or optimization

#### 4. **Consumption by Operator** (Detailed Table)
- **Columns**:
  - Operator Name
  - Location
  - Total Plates (Orange, bold)
  - Avg Plates (Blue)
  - Min/Max range (Gray)
  - Record Count
  - Total Pages (Green)
- **Purpose**: Operator performance evaluation
- **Insight**: Compare skills, identify training opportunities

#### 5. **Plate Efficiency Trend** (Line Chart)
- **Line**: Plates per Page (Red)
- **Purpose**: Track efficiency over time
- **Insight**: Identify improvement/degradation trends

---

## Key Metrics Explained

### Total Plates
Sum of all plate_consumption values.
- **Database**: `SUM(pr.plate_consumption)`
- **Use**: Total resource consumption
- **Unit**: Number of plates

### Avg Plates Per Record
Average plates used per production record.
- **Formula**: `SUM(plates) / COUNT(records)`
- **Use**: Baseline efficiency metric
- **Benchmark**: Lower is better

### Avg Plates Per Day
Average plates consumed on days with production.
- **Formula**: `SUM(plates) / COUNT(DISTINCT dates with records)`
- **Use**: Daily planning & resource allocation
- **Insight**: Only counts days with actual production

### Plate Per Page Ratio
Efficiency metric comparing plates used to pages printed.
- **Formula**: `total_plates / total_pages`
- **Typical Range**: 0.01 - 0.05 (varies by publication type)
- **Use**: Quality control, identify printing issues
- **Insight**: High ratio = potential quality/setup issues

### Min/Max Plates
Range of plate consumption in a single record.
- **Use**: Identify outliers
- **Insight**: Large gap indicates inconsistent processes

---

## Analysis Insights & Use Cases

### 1. **Cost Optimization**
- Review total plates consumed
- Identify high-consumption publications/machines
- Optimize plate manufacturing processes
- Negotiate better supplier rates

### 2. **Quality Control**
- Monitor plate_per_page trend
- Increasing ratio = potential setup issues
- Decreasing ratio = process improvement
- Compare across operators to identify best practices

### 3. **Operator Performance**
- Compare by_operator statistics
- High plate_per_page = quality issues or inefficiency
- Low plate_per_page = skilled operator
- Use for performance reviews and training

### 4. **Machine Maintenance**
- Track by_machine consumption trends
- Increasing consumption = maintenance needed
- Compare machines side-by-side
- Predict maintenance schedules

### 5. **Process Improvement**
- Analyze daily trends for patterns
- Identify day-of-week variations
- Compare pre/post-process changes
- Measure impact of training/upgrades

### 6. **Production Planning**
- Use avg_plates_per_day for inventory planning
- Allocate machines based on efficiency
- Schedule high-efficiency operators for priority jobs
- Plan maintenance during low-consumption periods

---

## Filtering & Dynamic Updates

All metrics automatically recalculate based on:
- ✅ **Date Range**: start_date → end_date
- ✅ **Publications**: VK, OSP, or specific publication
- ✅ **Location**: Specific facility (auto-filters publications)

### Example Filters

**Filter 1: Single Publication Analysis**
```
Publication: Times of India
Date Range: Feb 1-10, 2026
Location: All

Shows: Only ToI plate consumption metrics
Reveals: ToI-specific efficiency patterns
```

**Filter 2: Location-based Operator Comparison**
```
Location: Mumbai
Date Range: Feb 1-10, 2026
Publications: All

Shows: All Mumbai operators' performance
Reveals: Best operators at Mumbai facility
```

**Filter 3: Machine Efficiency**
```
Publication: Specific (e.g., Deccan)
Date Range: Entire month
Location: All

Shows: How different machines handle same publication
Reveals: Machine efficiency patterns
```

---

## Technical Details

### Database Queries
- **Daily Trend**: Groups by DATE(record_date)
- **By Publication**: JOINs publications table
- **By Machine**: JOINs machines table
- **By Operator**: JOINs users table with location
- **Efficiency**: Calculates plate/page ratio
- **Statistics**: Aggregate functions across filtered data

### Performance Optimization
- Connection pooling: 10 concurrent connections
- Indexed queries on: record_date, publication_id, user_id, machine_id
- Parallel query execution: 6 queries run concurrently
- Response time: <1 second for typical date ranges

### Data Accuracy
- Uses SUM() for totals, AVG() for averages
- Handles NULL plate_consumption values (treats as 0)
- DISTINCT DATE() prevents duplicate daily records
- Total_pages includes color_pages + bw_pages

---

## Typical Metrics by Publication Type

| Metric | Newspaper | Magazine | Special | Notes |
|--------|-----------|----------|---------|-------|
| **plate_per_page** | 0.015-0.025 | 0.020-0.035 | 0.010-0.040 | Varies by design |
| **avg_plates_per_record** | 20-40 | 30-60 | 15-50 | Depends on pages |
| **expected_variance** | ±10% | ±15% | ±20% | Special issues more variable |

---

## Alerts & Anomalies

### Watch for These Patterns:

**🔴 High Plate Per Page**
- Indicates: Quality issues, improper setup, or waste
- Action: Investigate equipment calibration, operator training

**🟠 Increasing Trend**
- Indicates: Process degradation or machine wear
- Action: Schedule maintenance, review procedures

**🟡 High Variance** (Max - Min)
- Indicates: Inconsistent processes
- Action: Standardize procedures, provide training

**🟢 Decreasing Trend**
- Indicates: Process improvement
- Action: Document best practices, standardize across facility

---

## API Response Example

```json
{
  "daily_trend": [
    {
      "date": "2026-02-08",
      "total_plates": 450,
      "avg_plates": 18,
      "record_count": 25,
      "total_pages": 15000
    }
  ],
  "by_publication": [
    {
      "publication_name": "Times of India",
      "total_plates": 5000,
      "avg_plates": 22,
      "min_plates": 10,
      "max_plates": 45,
      "record_count": 227,
      "total_pages": 250000
    }
  ],
  "by_operator": [
    {
      "operator_name": "John Smith",
      "location": "Mumbai",
      "total_plates": 1200,
      "avg_plates": 20,
      "min_plates": 12,
      "max_plates": 38,
      "record_count": 60,
      "total_pages": 65000
    }
  ],
  "statistics": {
    "total_plates": 15000,
    "avg_plates_per_record": 21,
    "avg_plates_per_day": 1500,
    "min_plates": 8,
    "max_plates": 52,
    "total_records": 714,
    "total_days": 10,
    "total_pages": 700000,
    "plate_per_page": 0.0214
  }
}
```
