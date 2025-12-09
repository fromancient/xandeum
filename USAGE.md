# XPIC User Guide

A comprehensive guide to using the Xandeum pNode Intelligence Center (XPIC) analytics platform.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Navigation](#navigation)
3. [Dashboard](#dashboard)
4. [Node Explorer](#node-explorer)
5. [Analytics](#analytics)
6. [Trends](#trends)
7. [Network Map](#network-map)
8. [Node Comparison](#node-comparison)
9. [Alerts](#alerts)
10. [Tips & Best Practices](#tips--best-practices)

---

## Getting Started

### First Visit

When you first open XPIC, you'll see the **Dashboard** page with an overview of the entire network. The platform automatically:

- Fetches all pNodes from the configured pRPC endpoint
- Refreshes data every 30 seconds
- Calculates health scores and detects anomalies
- Stores historical data in your browser

### Theme Toggle

Click the theme toggle button in the top-right corner to switch between:
- **Light Mode**: Clean, bright interface
- **Dark Mode**: Dark theme with neon accents

The theme preference is saved in your browser.

---

## Navigation

The main navigation bar at the top provides quick access to all sections:

| Page | Icon | Description |
|------|------|-------------|
| **Dashboard** | 📊 | Network overview and KPIs |
| **Nodes** | 🌐 | Complete node explorer table |
| **Trends** | 📈 | Historical trends and time-series data |
| **Analytics** | 📉 | Advanced analytics and correlations |
| **Compare** | 🔄 | Side-by-side node comparison |
| **Map** | 🗺️ | Geographic node distribution |
| **Alerts** | 🔔 | Active alerts and anomalies |

---

## Dashboard

The Dashboard provides a high-level overview of the entire network.

### Key Metrics Cards

- **Total Nodes**: Complete count of all pNodes in the network
- **Validators**: Number of nodes with vote accounts
- **Online Status**: Percentage and count of online nodes
- **Storage Used**: Total storage utilization across the network
- **Healthy Nodes**: Count of nodes with health scores ≥80
- **Avg Peer Count**: Average number of peer connections

### Distribution Charts

Three pie/bar charts show:
1. **Health Distribution**: Healthy (80-100), Warning (50-79), Critical (0-49)
2. **Version Distribution**: Software versions across the network
3. **Regional Distribution**: Geographic distribution of nodes

### Trend Charts

At the bottom, you'll see trend charts showing:
- **Node Count Over Time**: Total, online, and offline nodes
- **Health Distribution Trends**: How health scores change over time
- **Storage Usage**: Network-wide storage trends
- **Average Peer Count**: Connectivity trends

*Note: Trend data builds up over time as you use the platform. Historical data is stored in your browser.*

### Quick Actions

Three quick action cards link to:
- **Explore Nodes**: Jump to the full node table
- **Compare Nodes**: Compare multiple nodes side-by-side
- **Network Map**: View geographic distribution

---

## Node Explorer

The Node Explorer is your primary tool for browsing and analyzing individual nodes.

### Search & Filters

**Search Bar**: Type to search by:
- Node ID
- IP Address
- Location (country/region)

**Saved Filters**: 
- Click "Saved filters..." dropdown to load previously saved filter sets
- Click "Save" to save your current filter configuration
- Filters are stored in your browser

**Show Anomalies Only**: Check this box to filter to nodes with detected anomalies

### Table Columns

| Column | Description | Sortable |
|--------|-------------|----------|
| **Node ID** | Unique identifier (click to view details) | ✅ |
| **Status** | Online, Offline, or Unknown | ✅ |
| **Health** | Health score (0-100) | ✅ |
| **Risk** | AI-calculated risk score | ✅ |
| **Peers** | Number of peer connections | ✅ |
| **Storage** | Used vs. total capacity | ❌ |
| **Latency** | Response time in milliseconds | ✅ |
| **Anomalies** | Detected issues (if any) | ❌ |
| **Version** | Software version | ❌ |
| **Location** | Geographic location | ❌ |

### Sorting

Click any column header to sort:
- First click: Ascending
- Second click: Descending
- Third click: Reset to default

### Health Score

The health score (0-100) combines:
- **Uptime** (30%): How long the node has been running
- **Latency** (20%): Response time performance
- **Peer Count** (20%): Network connectivity
- **Last Seen** (15%): Recency of activity
- **Storage Usage** (15%): Storage capacity utilization

**Color Coding**:
- 🟢 **Green (80-100)**: Healthy
- 🟡 **Yellow (50-79)**: Warning
- 🔴 **Red (0-49)**: Critical

### Risk Score

The AI-powered risk score predicts the likelihood of node issues:
- **Low Risk (70-100)**: Stable, reliable node
- **Medium Risk (40-69)**: Some concerns, monitor closely
- **High Risk (0-39)**: High probability of issues

### Anomalies

Nodes with detected anomalies show:
- **Latency Spike**: Unusually high latency compared to history
- **Peer Drop**: Significant decrease in peer connections
- **Storage Anomaly**: Storage nearly full or unusual growth
- **Offline**: Node is currently offline

Click on a node ID to see detailed anomaly information.

### Pagination

- Use **Prev/Next** buttons to navigate pages
- Change **page size** (50, 100, 200, 500) from the dropdown
- Server-side pagination ensures fast loading

### Export Data

Export buttons in the top-right:
- **Export CSV**: Download current view as CSV
- **Export JSON**: Download current view as JSON

---

## Analytics

The Analytics page provides deep insights into network patterns and correlations.

### Network Overview

Four key metric cards:
- **Total Nodes**: Complete network size
- **Network Health**: Average health score
- **Avg Latency**: Average response time with P95 percentile
- **Storage Used**: Total storage utilization

### Performance Metrics

Detailed statistics including:
- **Latency**: Average, Median, P95, P99 percentiles
- **Peer Count**: Average, Median, P95 percentiles
- **Health Score**: Average, Median, Min/Max range
- **Health Distribution**: Healthy/Warning/Critical breakdown

### Distribution Histograms

Visual distributions for:
- **Latency**: How latency values are distributed across nodes
- **Peer Count**: Distribution of peer connections
- **Storage Usage**: Storage utilization patterns
- **Health Score**: Health score distribution

### Regional & Version Analysis

**Regional Distribution**:
- Top 10 regions by node count
- Visual progress bars showing percentages
- Helps identify geographic concentration

**Version Distribution**:
- Software versions in use
- Adoption rates for each version
- Useful for identifying version fragmentation

### Correlation Charts

Six scatter plots showing relationships between metrics:

1. **Health vs Latency**: Do high-latency nodes have lower health?
2. **Health vs Peer Count**: Is connectivity correlated with health?
3. **Health vs Storage Usage**: Does storage pressure affect health?
4. **Health vs Uptime**: Do longer-running nodes score better?
5. **Peer Count vs Latency**: Network connectivity vs. performance
6. **Latency vs Storage Usage**: Storage pressure vs. response time

**Reading Correlation Charts**:
- Each point represents a node
- **Green points**: Healthy nodes (score ≥80)
- **Yellow points**: Warning nodes (50-79)
- **Red points**: Critical nodes (<50)
- Clusters indicate common patterns
- Outliers may need attention

### Data Availability

Shows how many nodes have data for each metric:
- Latency data coverage
- Peer count coverage
- Storage data coverage
- Uptime data coverage

---

## Trends

The Trends page shows historical network evolution.

### Time Range Selector

Choose your analysis window:
- **24 hours**: Recent trends
- **7 days**: Weekly patterns
- **30 days**: Monthly evolution

### Trend Summary Cards

Three cards showing:
- **Node Count**: Current count with change from selected period
- **Online Nodes**: Current online count with trend
- **Storage Used**: Current usage with percentage

### Trend Charts

Multiple time-series charts:
- **Node Count Over Time**: Total, online, offline nodes
- **Health Distribution Over Time**: Healthy/warning/critical trends
- **Average Peer Count**: Connectivity trends
- **Storage Usage**: Capacity utilization trends

### Key Insights Panel

AI-generated insights highlighting:
- **Growth Trends**: Network expansion patterns
- **Decline Warnings**: Decreasing metrics
- **Stable Metrics**: Consistent performance
- **Critical Alerts**: Issues requiring attention

---

## Network Map

Visualize the geographic distribution of nodes.

### Interactive Map

- **Zoom**: Use mouse wheel or +/- buttons
- **Pan**: Click and drag to move around
- **Node Markers**: 
  - 🟢 Green: Healthy nodes (health ≥80)
  - 🟡 Yellow: Warning nodes (50-79)
  - 🔴 Red: Critical nodes (<50)
  - ⚫ Gray: Offline nodes

### Map Legend

The legend explains marker colors and meanings.

### Regional Breakdown Cards

Cards for each region showing:
- Total node count
- Online/offline breakdown
- Health distribution (healthy/warning/critical)
- Average peer count
- Average latency
- Total storage usage

*Note: Geographic data requires location information from the pRPC endpoint. If unavailable, the map may be empty.*

---

## Node Comparison

Compare up to 5 nodes side-by-side.

### Adding Nodes

1. Type a node ID in the search box
2. Select from the dropdown
3. Click "Add to Comparison"
4. Repeat for up to 5 nodes

### Comparison View

Each node shows:
- **Basic Info**: ID, Status, Version, Location
- **Health Score**: With breakdown of factors
- **Performance Metrics**: Latency, Peer Count, Uptime
- **Storage**: Used vs. Capacity
- **Anomalies**: Any detected issues

### Removing Nodes

Click the **X** button on any node card to remove it from comparison.

### Use Cases

- Compare validator nodes
- Analyze nodes in the same region
- Investigate performance differences
- Review nodes with similar issues

---

## Alerts

Monitor active alerts and anomalies across the network.

### Alert Severity

Alerts are color-coded by severity:
- 🔴 **Critical**: Immediate attention required
- 🟠 **High**: Significant issues
- 🟡 **Medium**: Moderate concerns
- 🔵 **Low**: Minor issues

### Alert Types

- **Offline**: Node is not responding
- **Latency Spike**: Unusually high response time
- **Peer Drop**: Significant connectivity loss
- **Storage Anomaly**: Storage issues detected
- **Version Mismatch**: Outdated software version

### Filtering

- **Severity Filter**: Show only specific severity levels
- **Compact View**: Condensed alert list
- **Full View**: Detailed alert information

### Alert Actions

- **Mark as Resolved**: Click the checkmark to dismiss
- **Clear All**: Remove all active alerts (with confirmation)
- **View Node**: Click node link to see details

### Alert Details

Each alert shows:
- Node ID and location
- Alert message
- Timestamp
- Additional context (if available)

---

## Tips & Best Practices

### For Network Operators

1. **Start with Dashboard**: Get the big picture first
2. **Monitor Alerts**: Check alerts regularly for issues
3. **Use Analytics**: Identify patterns and correlations
4. **Track Trends**: Watch for gradual degradation
5. **Compare Nodes**: Understand performance variations

### For Developers

1. **Export Data**: Use CSV/JSON export for analysis
2. **Check Raw Data**: View full JSON for debugging
3. **Monitor Versions**: Track version adoption
4. **Analyze Correlations**: Find performance relationships
5. **Review Anomalies**: Understand failure patterns

### For Analysts

1. **Use Analytics Page**: Deep dive into metrics
2. **Correlation Charts**: Find relationships between metrics
3. **Distribution Histograms**: Understand metric distributions
4. **Regional Analysis**: Identify geographic patterns
5. **Trend Analysis**: Track changes over time

### Performance Tips

1. **Use Filters**: Narrow down large node lists
2. **Save Filters**: Reuse common filter sets
3. **Sort Efficiently**: Sort by health/risk to find issues
4. **Export for Analysis**: Download data for external tools
5. **Check Data Availability**: Understand metric coverage

### Troubleshooting

**No Data Showing**:
- Check pRPC endpoint configuration
- Verify network connectivity
- Check browser console for errors
- Try refreshing the page

**Charts Empty**:
- Some metrics may not be available from pRPC
- Check "Data Availability" section in Analytics
- Historical data builds over time

**Map Not Loading**:
- Geographic data may not be available
- Check if nodes have location information
- Try refreshing the page

**Slow Performance**:
- Reduce page size in node table
- Use filters to narrow results
- Close unused browser tabs

---

## Keyboard Shortcuts

- **Ctrl/Cmd + K**: Focus search (on Nodes page)
- **Esc**: Close modals/dialogs
- **Tab**: Navigate between elements

---

## Data Refresh

- **Automatic**: Data refreshes every 30 seconds
- **Manual**: Refresh the page to force update
- **Historical**: Trend data accumulates over time

---

## Browser Storage

XPIC stores the following in your browser:
- **Theme preference**: Light/dark mode
- **Saved filters**: Your custom filter sets
- **Historical snapshots**: Network trend data (last 30 days)
- **Node history**: Individual node metric history

To clear all data: Clear your browser's localStorage for this site.

---

## Support

For issues or questions:
- Check the [README.md](./README.md) for technical details
- Review the [Xandeum Discord](https://discord.gg/uqRSmmM5m)
- Check pRPC documentation at [xandeum.network](https://xandeum.network)

---

## Feature Summary

| Feature | Description | Location |
|---------|-------------|----------|
| **Node Explorer** | Browse all nodes with search/filter | Nodes page |
| **Health Scoring** | AI-powered health assessment | All pages |
| **Risk Analysis** | Predictive risk scoring | Nodes page |
| **Anomaly Detection** | Automatic issue detection | Nodes, Alerts |
| **Trend Analysis** | Historical patterns | Trends page |
| **Correlation Analysis** | Metric relationships | Analytics page |
| **Geographic Map** | Visual node distribution | Map page |
| **Node Comparison** | Side-by-side analysis | Compare page |
| **Data Export** | CSV/JSON download | Nodes page |
| **Saved Filters** | Reusable filter sets | Nodes page |
| **Real-time Updates** | Auto-refresh every 30s | All pages |
| **Dark Mode** | Theme toggle | Top-right |

---

**Last Updated**: 2025

For the latest features and updates, check the repository or visit the live deployment.

