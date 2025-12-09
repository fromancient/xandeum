# Xandeum pNode Intelligence Center (XPIC)

A comprehensive web-based analytics and monitoring platform for Xandeum pNodes. XPIC provides real-time insights into node health, performance, network topology, and historical trends.

## 📖 Documentation

- **[User Guide (USAGE.md)](./USAGE.md)**: Complete guide on how to use all features of XPIC
- **This README**: Technical setup and deployment instructions

## Features

### Core Features (MVP)
- ✅ **pRPC Integration**: Fetches all pNodes via RPC calls
- ✅ **Node Explorer Table**: Interactive table with search, sort, and filter capabilities
- ✅ **Node Detail Pages**: Comprehensive view of individual node metrics, charts, and raw data
- ✅ **Dashboard**: Global KPIs, version distribution, regional statistics
- ✅ **Real-time Updates**: Automatic data refresh every 30 seconds
- ✅ **Dark/Light Mode**: Toggle between themes with system preference detection
- ✅ **Responsive Design**: Works seamlessly on desktop and mobile devices

### Advanced Features
- ✅ **Node Comparison**: Side-by-side comparison of up to 5 nodes
- ✅ **Health Scoring**: Composite health score (0-100) based on multiple factors
- ✅ **Anomaly Detection**: Automatic detection of latency spikes, peer drops, storage issues
- ✅ **Time-Series Charts**: Visualize latency, peer count, and storage usage over time
- ✅ **Data Export**: Export node data as JSON or CSV
- ✅ **Network Map**: Geographic visualization of node distribution
- ✅ **Raw Data View**: Full JSON output for transparency and auditing

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts
- **Data Fetching**: TanStack React Query
- **Icons**: Lucide React
- **State Management**: Zustand (for theme)

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Access to Xandeum pRPC endpoint (or use mock data for development)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd bounty
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and set:
```env
# Option 1: Alchemy Solana API (Recommended for Solana nodes)
NEXT_PUBLIC_PRPC_ENDPOINT=https://solana-mainnet.g.alchemy.com/v2
NEXT_PUBLIC_PRPC_API_KEY=your-alchemy-api-key
NEXT_PUBLIC_PRPC_API_MODE=jsonrpc
NEXT_PUBLIC_FALLBACK_TO_MOCK=true

# Option 2: Generic pRPC endpoint
# NEXT_PUBLIC_PRPC_ENDPOINT=http://your-prpc-endpoint:8080
# NEXT_PUBLIC_PRPC_API_KEY=your-api-key-if-needed

# Option 3: Use mock data for development
# NEXT_PUBLIC_USE_MOCK_DATA=true
```

**pRPC Endpoint Configuration:**
- `NEXT_PUBLIC_PRPC_ENDPOINT`: The full URL to your pRPC endpoint (e.g., `https://prpc.xandeum.net` or `http://localhost:8080`)
- `NEXT_PUBLIC_PRPC_API_KEY`: Optional API key if authentication is required
- `NEXT_PUBLIC_USE_MOCK_DATA`: Set to `true` to force mock data (useful for development)
- `NEXT_PUBLIC_FALLBACK_TO_MOCK`: Set to `true` to fallback to mock data if pRPC fails

**REST API Endpoints Tried (Solscan-style):**
- `/v1/nodes`, `/api/v1/nodes`, `/nodes`
- `/cluster/nodes`, `/pnodes`, `/pnodes/list`
- `/storage/nodes`, `/network/nodes`

**JSON-RPC Methods Tried (Solana-style):**
- `getClusterNodes` (prioritized - Solana standard, works with Alchemy)
- `getPNodes`, `getPnodes`, `listPNodes`, `listPnodes`
- `getNodes`, `getAllNodes`, `getStorageNodes`, `getNetworkNodes`

**Alchemy Integration:**
The application supports Alchemy's Solana API endpoints:
- Endpoint format: `https://solana-mainnet.g.alchemy.com/v2/{apiKey}`
- API key is automatically inserted into the URL path
- Uses `getClusterNodes` method to fetch Solana validator nodes

The response format is flexible and handles various structures:
- REST: `[{...}]`, `{data: [...]}`, `{nodes: [...]}`, `{result: [...]}`
- JSON-RPC: Direct array, `{nodes: []}`, `{value: []}`, etc.

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Configuration

### Environment

Create `.env.local` with:
```env
NEXT_PUBLIC_PRPC_ENDPOINT=https://solana-mainnet.g.alchemy.com/v2
NEXT_PUBLIC_PRPC_API_KEY=your-alchemy-api-key
NEXT_PUBLIC_PRPC_API_MODE=jsonrpc
NEXT_PUBLIC_FALLBACK_TO_MOCK=true
DATABASE_URL="file:./prisma/dev.db"
```

Then:
```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### pRPC Integration

The application supports real pRPC JSON-RPC calls (similar to Solana's `getClusterNodes`). 

**To connect to a real pRPC endpoint:**

1. Set `NEXT_PUBLIC_PRPC_ENDPOINT` in your `.env.local` file
2. The app will automatically try multiple method names (see configuration above)
3. The response is mapped to the `pNode` interface automatically

**Expected Response Format:**

The application handles various response formats:
- Direct array: `[{pubkey: "...", gossip: "...", version: "..."}, ...]`
- Wrapped: `{nodes: [...]}` or `{value: [...]}`
- Single node: `{pubkey: "...", ...}`

**Supported Fields (mapped automatically):**

- Node ID: `pubkey`, `id`, `nodeId`, `identity`
- Addresses: `gossip`, `rpc`, `tpu`, `gossipAddress`, `rpcAddress`
- Version: `version`, `softwareVersion`, `coreVersion`
- Storage: `storageCapacity`, `storageUsed`, `capacity`, `used`
- Network: `peerCount`, `peers`, `latency`, `uptime`
- Location: `location`, `geo` (with `country`, `region`, `city`, `lat`/`lon`)

If a field is missing, it will show as "N/A" or use a default value.

**JSON-RPC Method Names Tried:**
The application automatically tries these method names (in order):
1. `getPNodes`
2. `getPnodes`
3. `getClusterNodes` (Solana-style)
4. `listPNodes`
5. `listPnodes`
6. `getNodes`
7. `getAllNodes`
8. `getStorageNodes`
9. `getNetworkNodes`

### Ingestion & APIs

- `GET /api/ingest` — fetches live nodes (getClusterNodes) and chain metrics (TPS/block time/epoch info) and stores snapshots in SQLite.
- `GET /api/nodes?page=1&pageSize=200` — paged nodes from the DB (falls back to live if the DB is empty).
- `GET /api/metrics?hours=24` — chain metrics snapshots for the last N hours (default 24).

To run ingestion locally:
```bash
curl http://localhost:3000/api/ingest
```
Schedule this via cron/GitHub Actions to keep data fresh.

### Mock Data

For development and testing, the application includes mock data generation. Mock data is used:
- When `NEXT_PUBLIC_PRPC_ENDPOINT` is not set
- When `NEXT_PUBLIC_USE_MOCK_DATA=true`
- As fallback when `NEXT_PUBLIC_FALLBACK_TO_MOCK=true` and pRPC fails

This allows you to:
- Test all features without a live pRPC endpoint
- Develop and iterate quickly
- Demonstrate functionality

## Project Structure

```
bounty/
├── app/                    # Next.js app router pages
│   ├── page.tsx           # Dashboard (home page)
│   ├── nodes/             # Node-related pages
│   │   ├── page.tsx       # Node explorer table
│   │   └── [nodeId]/      # Individual node detail pages
│   ├── compare/           # Node comparison page
│   ├── map/               # Network map visualization
│   └── layout.tsx         # Root layout with navigation
├── components/            # React components
│   ├── Card.tsx           # Reusable card component
│   ├── StatCard.tsx       # Statistics display card
│   ├── NodeTable.tsx      # Node explorer table
│   ├── TimeSeriesChart.tsx # Time-series chart component
│   ├── DistributionChart.tsx # Distribution chart component
│   ├── Navigation.tsx     # Main navigation bar
│   └── ThemeToggle.tsx    # Dark/light mode toggle
├── lib/                   # Utility functions and logic
│   ├── prpc.ts            # pRPC integration layer
│   ├── health.ts          # Health scoring and anomaly detection
│   ├── theme.ts           # Theme management
│   └── utils.ts           # General utilities
├── hooks/                 # Custom React hooks
│   ├── useNodes.ts        # Node data fetching hooks
│   └── useTheme.ts        # Theme management hook
└── types/                 # TypeScript type definitions
    └── index.ts           # Core type definitions
```

## Features in Detail

### Health Scoring

Each node receives a health score (0-100) calculated from:
- **Uptime** (30%): Based on node uptime duration
- **Latency** (20%): Response time performance
- **Peer Count** (20%): Network connectivity
- **Last Seen** (15%): Recency of node activity
- **Storage Usage** (15%): Storage capacity utilization

Status levels:
- **Healthy** (80-100): Node operating optimally
- **Warning** (50-79): Node has some issues
- **Critical** (0-49): Node requires attention

### Anomaly Detection

The system automatically detects:
- **Latency Spikes**: Unusually high response times
- **Peer Drops**: Significant decrease in peer connections
- **Storage Anomalies**: Storage nearing capacity limits
- **Offline Status**: Nodes that haven't been seen recently

### Data Export

Users can export:
- **JSON**: Full node data in JSON format
- **CSV**: Tabular data for spreadsheet analysis

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Other Platforms

The application can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Railway
- Self-hosted with Node.js

Build command:
```bash
npm run build
```

Start command:
```bash
npm start
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_PRPC_ENDPOINT` | pRPC API endpoint URL | No | `http://localhost:8080` |
| `NEXT_PUBLIC_PRPC_API_KEY` | API key for pRPC (if required) | No | - |
| `NEXT_PUBLIC_PRPC_API_MODE` | API mode: `auto`, `rest`, or `jsonrpc` | No | `auto` |
| `NEXT_PUBLIC_USE_MOCK_DATA` | Force use of mock data | No | `false` (auto-detected) |
| `NEXT_PUBLIC_FALLBACK_TO_MOCK` | Fallback to mock data on error | No | `false` |

**API Modes:**
- `auto` (default): Tries REST API first, falls back to JSON-RPC
- `rest`: Uses REST API only (Solscan-style with `token` header)
- `jsonrpc`: Uses JSON-RPC only (Solana-style)

**Authentication:**
- REST API: Uses `token` header (Solscan-style) and `Authorization: Bearer` header
- JSON-RPC: Uses `token` and `Authorization: Bearer` headers

**⚠️ Important Notes:**

1. **Solscan API Limitation**: 
   - Solscan API (`pro-api.solscan.io`) is a **blockchain explorer API** for Solana
   - It provides endpoints for: Accounts, Tokens, NFTs, Transactions, Blocks, Markets, Programs
   - **Solscan does NOT provide node/cluster monitoring endpoints**
   - This application is designed for **Xandeum pRPC endpoints** or similar node monitoring APIs

2. **For Node Monitoring**:
   - Use Xandeum's pRPC endpoint (when available)
   - OR use Solana's native JSON-RPC method `getClusterNodes` (if applicable)
   - OR enable mock data for development/demo purposes

3. **Fallback Behavior**:
   - If `NEXT_PUBLIC_PRPC_ENDPOINT` is not set → Uses mock data automatically
   - If all endpoints fail + `NEXT_PUBLIC_FALLBACK_TO_MOCK=true` → Falls back to mock data
   - The application will detect Solscan API and show a helpful error message

4. **URL Normalization**: 
   - Handles versioned base URLs correctly (e.g., `/v2.0`)
   - Supports both REST and JSON-RPC API structures

## Development

### Adding New Features

1. **New Metrics**: Add fields to `types/index.ts` and update `lib/prpc.ts`
2. **New Charts**: Create components in `components/` using Recharts
3. **New Pages**: Add routes in `app/` directory
4. **New Visualizations**: Extend existing chart components or create new ones

### Code Style

- Use TypeScript for type safety
- Follow React best practices (hooks, functional components)
- Use Tailwind CSS for styling
- Maintain component modularity

## Troubleshooting

### Data Not Loading

- **Check pRPC endpoint configuration**: Verify `NEXT_PUBLIC_PRPC_ENDPOINT` is correct
- **Verify network connectivity**: Test the endpoint with `curl` or Postman
- **Check browser console**: Look for RPC method attempts and errors
- **CORS configuration**: Ensure your pRPC endpoint allows requests from your domain
- **Method name**: The app tries multiple method names automatically. Check console logs to see which methods were tried
- **Response format**: Ensure your pRPC returns data in a supported format (see pRPC Integration section)
- **Fallback**: Set `NEXT_PUBLIC_FALLBACK_TO_MOCK=true` to use mock data if pRPC fails

**Testing pRPC endpoint manually:**

```bash
curl -X POST http://your-prpc-endpoint \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getPNodes",
    "params": []
  }'
```

### Theme Not Persisting

- Clear browser localStorage
- Check browser console for errors
- Verify theme initialization in `app/layout.tsx`

### Charts Not Rendering

- Ensure Recharts is properly installed
- Check that data is in the correct format
- Verify responsive container dimensions

## Future Enhancements

Potential features for future development:
- Network topology graph visualization
- WebSocket support for real-time updates
- User authentication and role-based access
- Customizable dashboard layouts
- Alert notifications (email, webhook, Discord)
- Historical data persistence with database
- Predictive analytics using ML
- API endpoints for programmatic access

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Specify your license here]

## Support

For issues, questions, or contributions, please open an issue on GitHub or contact the development team.

## Acknowledgments

Built for the Xandeum community to provide transparency and insights into the pNode network.
