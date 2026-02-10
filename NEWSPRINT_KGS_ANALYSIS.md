# Newsprint KGs Analysis - Enhanced Dashboard

## Overview
The Newsprint KGs analysis has been significantly enhanced with comprehensive data visualization and detailed statistics. The dashboard now provides multi-dimensional insights into newsprint consumption patterns.

## Backend Enhancement (`/analytics/newsprint-kgs`)

### New Data Structure
The endpoint now returns 4 different data sets instead of just daily trend:

```json
{
  "daily_trend": [...],           // Daily consumption data
  "by_publication": [...],        // Aggregated by publication
  "by_newsprint_type": [...],     // Aggregated by newsprint type
  "statistics": {
    "total_kgs": number,
    "avg_kgs_per_record": number,
    "avg_kgs_per_day": number,
    "min_kgs": number,
    "max_kgs": number,
    "total_records": number,
    "total_days": number
  },
  "count": number
}
```

### Data Aggregations

#### 1. **Daily Trend** (`daily_trend`)
- **Grouped by**: Production date
- **Metrics**:
  - `total_kgs`: Sum of newsprint consumed on that day
  - `avg_kgs`: Average newsprint per record on that day
  - `record_count`: Number of production records on that day

#### 2. **By Publication** (`by_publication`)
- **Grouped by**: Publication name
- **Metrics**:
  - `total_kgs`: Sum across all records for publication
  - `avg_kgs`: Average newsprint per record
  - `min_kgs`: Minimum consumption in a single record
  - `max_kgs`: Maximum consumption in a single record
  - `record_count`: Total records for publication

#### 3. **By Newsprint Type** (`by_newsprint_type`)
- **Grouped by**: Newsprint type (e.g., "Standard", "Premium")
- **Metrics**: Same as by_publication aggregation

#### 4. **Overall Statistics** (`statistics`)
- **total_kgs**: Total newsprint consumed across entire date range
- **avg_kgs_per_record**: Average across all individual records
- **avg_kgs_per_day**: Average across days with actual records
- **min_kgs**: Minimum consumption in any single record
- **max_kgs**: Maximum consumption in any single record
- **total_records**: Count of production records
- **total_days**: Count of unique days with records

---

## Frontend Enhancements

### Statistics Cards (Top Section)
6 color-coded cards displaying key metrics:
- 🟠 **Total KGs**: Orange card - Total newsprint used
- 🔵 **Avg Per Day**: Blue card - Average consumption per day
- 🟣 **Avg Per Record**: Purple card - Average per production record
- 🟢 **Max KGs**: Green card - Highest consumption
- 🔴 **Min KGs**: Red card - Lowest consumption
- 🌺 **Days Tracked**: Pink card - Number of days with data

### Charts

#### 1. **Daily Consumption Trend** (Line Chart)
- **X-axis**: Date
- **Y-axis**: Newsprint KGs
- **Lines**:
  - Orange: Total KGs per day (overall consumption)
  - Blue: Average KGs per record (efficiency metric)
- **Use**: Identify consumption patterns over time

#### 2. **Consumption by Publication** (Bar Chart)
- **X-axis**: Publication name
- **Y-axis**: Newsprint KGs
- **Bars**:
  - Orange: Total KGs per publication
  - Blue: Average KGs per record
- **Use**: Compare which publications consume most newsprint

#### 3. **Distribution by Newsprint Type** (Pie Chart)
- **Segments**: Each newsprint type
- **Size**: Proportional to total KGs used
- **Colors**: Auto-assigned from color palette
- **Use**: Understand type breakdown

#### 4. **Detailed Statistics Table**
| Column | Purpose |
|--------|---------|
| Publication | Publication name |
| Total KGs | Sum of all newsprint (highlighted in orange) |
| Avg KGs | Average per record (blue) |
| Min KGs | Lowest single record (red) |
| Max KGs | Highest single record (green) |
| Records | Count of production records |

---

## Key Metrics Explained

### Total KGs
Sum of all newsprint_kgs values in the production_records table for selected period.
- **Calculation**: `SUM(pr.newsprint_kgs)`
- **Use**: Overall resource usage

### Avg KGs Per Record
Average newsprint used per individual production record.
- **Calculation**: `SUM(newsprint_kgs) / COUNT(records)`
- **Use**: Production efficiency metric

### Avg KGs Per Day
Average newsprint consumed across days with actual production.
- **Calculation**: `SUM(newsprint_kgs) / COUNT(DISTINCT dates with records)`
- **Use**: Daily consumption benchmark

### Min/Max KGs
Minimum and maximum newsprint used in a single production record.
- **Use**: Identify outliers and consumption range

### Days Tracked
Number of unique days with production records.
- **Calculation**: `COUNT(DISTINCT DATE(record_date))`
- **Use**: Data completeness indicator

---

## Filtering & Analysis

### Applied Filters
All metrics automatically recalculate based on:
- ✅ Date range (start_date → end_date)
- ✅ Publications selected (VK, OSP, or specific publication)
- ✅ Location filter (if selected)

### Filter Examples

**Example 1: Single Publication Filter**
```
Selected: Times of India (VK)
Date Range: Feb 1-10, 2026
Location: All

Result:
- Shows only ToI production records
- Metrics exclude other publications
- Charts reflect ToI consumption patterns
```

**Example 2: Location Filter**
```
Selected: Location: Mumbai
Date Range: Feb 1-10, 2026
Publications: All

Result:
- Shows only Mumbai user's records
- Statistics specific to Mumbai production
- Publications list auto-filters to Mumbai-based pubs
```

---

## Analysis Insights

### Typical Use Cases

1. **Resource Planning**
   - View total KGs over period
   - Identify peak consumption days
   - Plan newsprint orders

2. **Publication Comparison**
   - Compare consumption between publications
   - Identify efficient vs. wasteful operations
   - Optimize allocation

3. **Type Analysis**
   - Understand which newsprint type is most used
   - Adjust procurement strategy
   - Cost optimization

4. **Trend Detection**
   - Monitor daily trend line for anomalies
   - Identify growth/decline patterns
   - Seasonal variations

---

## Technical Details

### Database Queries
- **Daily Trend**: Groups by DATE(record_date)
- **By Publication**: Joins with publications table
- **By Type**: Joins with newsprint_types table
- **Statistics**: Aggregate functions across all rows

### Response Time
Multiple concurrent queries optimized with:
- Connection pooling (10 connections)
- Indexed date and foreign key lookups
- Parallel query execution

### Data Accuracy
- All calculations use SUM() and AVG() for precision
- Handles NULL values in newsprint_id field
- Uses DISTINCT DATE() to avoid duplicates
