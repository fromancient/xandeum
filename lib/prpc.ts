import { pNode, pNodeMetrics, NetworkStats } from '@/types';
import { prisma } from './db';

// Configuration for pRPC endpoint
// This should be configured via environment variables
const PRPC_ENDPOINT = process.env.NEXT_PUBLIC_PRPC_ENDPOINT || 'http://localhost:8080';
const PRPC_API_KEY = process.env.NEXT_PUBLIC_PRPC_API_KEY;
const PRPC_API_MODE = process.env.NEXT_PUBLIC_PRPC_API_MODE || 'auto'; // 'auto', 'jsonrpc', 'rest'
// Only use mock data if explicitly enabled - don't auto-enable based on endpoint
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

/**
 * Build Alchemy-compatible endpoint URL
 * Alchemy format: https://solana-mainnet.g.alchemy.com/v2/{apiKey}
 */
function buildAlchemyEndpoint(baseUrl: string, apiKey?: string): string {
  if (apiKey && baseUrl.includes('alchemy.com')) {
    // Remove trailing slash
    baseUrl = baseUrl.replace(/\/$/, '');
    
    // If base URL already contains /v2/{apiKey}, use as-is
    if (baseUrl.includes(`/v2/${apiKey}`)) {
      return baseUrl;
    }
    
    // If base URL ends with /v2 (with or without trailing slash), append API key
    if (baseUrl.endsWith('/v2') || baseUrl.match(/\/v2$/)) {
      return `${baseUrl}/${apiKey}`;
    }
    
    // If base URL contains /v2/ but doesn't end with API key, replace or append
    if (baseUrl.includes('/v2/')) {
      // Check if there's already something after /v2/
      const v2Match = baseUrl.match(/\/v2\/([^\/]+)/);
      if (v2Match && v2Match[1] !== apiKey) {
        // Replace existing value with API key
        return baseUrl.replace(/\/v2\/[^\/]+/, `/v2/${apiKey}`);
      }
      return baseUrl;
    }
    
    // If base URL doesn't contain /v2, add /v2/{apiKey}
    return `${baseUrl}/v2/${apiKey}`;
  }
  return baseUrl;
}

/**
 * Normalize endpoint URL to handle version paths correctly
 */
function normalizeBaseUrl(url: string): { base: string; version: string | null } {
  // Remove trailing slash
  url = url.replace(/\/$/, '');
  
  // Check if URL contains a version pattern like /v1, /v2, /v2.0
  const versionMatch = url.match(/(\/v\d+(?:\.\d+)?)$/i);
  if (versionMatch) {
    const version = versionMatch[1];
    const base = url.replace(versionMatch[0], '');
    return { base, version };
  }
  
  return { base: url, version: null };
}

/**
 * Make a REST API request (Solscan-style)
 */
async function makeRestRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
  const { base, version } = normalizeBaseUrl(PRPC_ENDPOINT);
  
  // If endpoint starts with /v1 or /v2, use it directly
  // Otherwise, prepend version if it exists in base URL
  let fullEndpoint = endpoint;
  if (version && !endpoint.match(/^\/v\d+/i)) {
    // If base URL has version, endpoint should already include version or be version-agnostic
    // For Solscan-style, we might want to keep version in base
    fullEndpoint = `${version}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  } else if (!endpoint.startsWith('/')) {
    fullEndpoint = `/${endpoint}`;
  }
  
  const url = `${base}${fullEndpoint}${Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : ''}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'accept': 'application/json',
  };

  // Solscan-style token authentication (token header)
  if (PRPC_API_KEY) {
    headers['token'] = PRPC_API_KEY;
    // Also support Bearer token for compatibility
    headers['Authorization'] = `Bearer ${PRPC_API_KEY}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    // Don't throw for 404 - let caller handle it (might want to try other endpoints)
    if (response.status === 404) {
      const error = new Error(`REST API endpoint not found: ${url}`);
      (error as any).status = 404;
      throw error;
    }
    const errorText = await response.text().catch(() => '');
    throw new Error(`REST API request failed: ${response.status} ${response.statusText}. ${errorText}`);
  }

  const data = await response.json();

  // Handle Solscan-style error responses
  if (data.err || data.error) {
    throw new Error(`API error: ${data.err || data.error}`);
  }

  return data;
}

/**
 * Make a JSON-RPC request to pRPC endpoint
 * Supports Alchemy, Solana RPC, and generic JSON-RPC endpoints
 */
async function makeRpcRequest(method: string, params: any[] = []): Promise<any> {
  let url = PRPC_ENDPOINT.startsWith('http') ? PRPC_ENDPOINT : `http://${PRPC_ENDPOINT}`;
  
  // Build Alchemy-compatible URL if using Alchemy
  if (url.includes('alchemy.com')) {
    const originalUrl = url;
    url = buildAlchemyEndpoint(url, PRPC_API_KEY);
    if (url !== originalUrl) {
      console.log(`🔑 Built Alchemy URL: ${url.replace(PRPC_API_KEY || '', '[API_KEY]')}`);
    } else {
      console.warn(`⚠️ Alchemy URL unchanged. Original: ${originalUrl}, API Key: ${PRPC_API_KEY ? 'present' : 'missing'}`);
    }
  }
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add authentication headers (but not for Alchemy - API key is in URL path)
  if (PRPC_API_KEY && !url.includes('alchemy.com')) {
    headers['token'] = PRPC_API_KEY; // Solscan-style
    headers['Authorization'] = `Bearer ${PRPC_API_KEY}`; // Standard Bearer
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`RPC request failed: ${response.status} ${response.statusText}. ${errorText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`RPC error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  return data.result;
}

/**
 * Fetch chain-level metrics (TPS, block time, slot, epoch)
 * Uses Solana RPC methods:
 * - getRecentPerformanceSamples
 * - getEpochInfo
 */
export async function fetchChainMetrics(): Promise<{
  tps?: number;
  blockTimeMs?: number;
  slot?: number;
  epoch?: number;
}> {
  try {
    // getRecentPerformanceSamples returns an array; take first sample
    const perfSamples = await makeRpcRequest('getRecentPerformanceSamples', [1]);
    let tps: number | undefined;
    let blockTimeMs: number | undefined;
    if (Array.isArray(perfSamples) && perfSamples.length > 0) {
      const sample = perfSamples[0];
      if (sample.numTransactions && sample.samplePeriodSecs) {
        tps = sample.numTransactions / sample.samplePeriodSecs;
      }
      if (sample.numSlots && sample.samplePeriodSecs) {
        const slotsPerSecond = sample.numSlots / sample.samplePeriodSecs;
        if (slotsPerSecond > 0) {
          blockTimeMs = (1 / slotsPerSecond) * 1000;
        }
      }
    }

    const epochInfo = await makeRpcRequest('getEpochInfo', []);
    const slot = epochInfo?.absoluteSlot ?? epochInfo?.slot;
    const epoch = epochInfo?.epoch;

    return { tps, blockTimeMs, slot, epoch };
  } catch (error) {
    console.warn('Failed to fetch chain metrics:', error);
    return {};
  }
}

/**
 * Map RPC response to pNode format
 * Handles various possible response formats including Solana's getClusterNodes
 * 
 * Solana getClusterNodes returns:
 * - pubkey: string (node public key)
 * - gossip: string (IP:port)
 * - tpu: string (IP:port)
 * - rpc: string | null (IP:port or null)
 * - version: string | null (e.g., "1.18.0")
 * - featureSet: number | null
 * - shredVersion: number | null
 */
function mapRpcNodeToPNode(nodeData: any, index: number): pNode {
  // Try different possible field names (pubkey, id, nodeId, etc.)
  const nodeId = nodeData.pubkey || nodeData.id || nodeData.nodeId || nodeData.identity || `node-${String(index + 1).padStart(3, '0')}`;
  
  // Extract addresses (Solana format: "IP:port" strings)
  const gossip = nodeData.gossip || nodeData.gossipAddress || nodeData.address;
  const rpc = nodeData.rpc || nodeData.rpcAddress || nodeData.endpoint;
  const tpu = nodeData.tpu || nodeData.tpuAddress;
  
  // Extract IP address from gossip address (format: "IP:port")
  let ipAddress: string | undefined;
  if (gossip && typeof gossip === 'string') {
    ipAddress = gossip.split(':')[0];
  } else if (nodeData.ipAddress) {
    ipAddress = nodeData.ipAddress;
  }
  
  // Determine status - if node has gossip address, consider it online
  // Solana nodes in getClusterNodes are typically active/online
  const status: 'online' | 'offline' | 'unknown' = 
    nodeData.status || 
    (gossip ? 'online' : 'unknown');

  // Extract version info
  // Solana getClusterNodes returns version string like "1.18.0" or null
  const softwareVersion = nodeData.version || nodeData.softwareVersion || nodeData.coreVersion || undefined;
  
  // Extract storage info (not available in Solana getClusterNodes, but check anyway)
  const storageCapacity = nodeData.storageCapacity || nodeData.capacity || nodeData.totalStorage;
  const storageUsed = nodeData.storageUsed || nodeData.used || nodeData.storageUsage;
  
  // Extract network info (not directly available in Solana getClusterNodes)
  // These would need additional RPC calls like getVoteAccounts for validators
  const peerCount = nodeData.peerCount || nodeData.peers || nodeData.connectionCount || 0;
  const latency = nodeData.latency || nodeData.responseTime;
  const uptime = nodeData.uptime || nodeData.upTime;
  
  // Extract location (not in Solana response, would need geoIP lookup)
  const location = nodeData.location || (nodeData.geo ? {
    country: nodeData.geo.country,
    region: nodeData.geo.region,
    city: nodeData.geo.city,
    latitude: nodeData.geo.lat || nodeData.geo.latitude,
    longitude: nodeData.geo.lon || nodeData.geo.longitude,
  } : undefined);

  return {
    id: String(nodeId),
    publicKey: nodeData.pubkey || nodeData.publicKey || nodeId,
    ipAddress,
    endpoint: rpc || gossip || tpu,
    status,
    lastSeen: nodeData.lastSeen ? new Date(nodeData.lastSeen) : new Date(),
    peerCount: typeof peerCount === 'number' ? peerCount : 0,
    storageCapacity,
    storageUsed,
    storageFree: storageCapacity && storageUsed ? storageCapacity - storageUsed : undefined,
    softwareVersion,
    protocolVersion: nodeData.protocolVersion || nodeData.protocol || nodeData.shredVersion?.toString(),
    buildInfo: nodeData.buildInfo || nodeData.build || nodeData.featureSet?.toString(),
    latency,
    uptime,
    availability: nodeData.availability || (status === 'online' ? 95 : 0),
    location,
    peers: nodeData.peers ? (Array.isArray(nodeData.peers) ? nodeData.peers : []) : undefined,
    metadata: {
      gossip,
      rpc,
      tpu,
      featureSet: nodeData.featureSet,
      shredVersion: nodeData.shredVersion,
      ...nodeData,
    },
    rawData: nodeData,
  };
}

/**
 * Enrich Solana nodes with additional data from other RPC methods
 * This fetches validator information, vote accounts, etc.
 */
async function enrichSolanaNodes(nodes: pNode[]): Promise<void> {
  try {
    // Get vote accounts to identify validators and get more info
    const voteAccounts = await makeRpcRequest('getVoteAccounts', []);
    
    if (voteAccounts && voteAccounts.current && Array.isArray(voteAccounts.current)) {
      // Create a map of pubkey -> vote account info
      const voteAccountMap = new Map<string, any>();
      voteAccounts.current.forEach((va: any) => {
        if (va.nodePubkey) {
          voteAccountMap.set(va.nodePubkey, va);
        }
      });
      
      // Enrich nodes with vote account data
      let enrichedCount = 0;
      nodes.forEach(node => {
        const voteAccount = node.publicKey ? voteAccountMap.get(node.publicKey) : null;
        if (voteAccount) {
          // Validators typically have more peers and are more active
          if (node.peerCount === 0) {
            node.peerCount = 50; // Estimate for validators
          }
          node.metadata = {
            ...node.metadata,
            isValidator: true,
            voteAccount: voteAccount.votePubkey,
            commission: voteAccount.commission,
            rootSlot: voteAccount.rootSlot,
            epochVoteAccount: voteAccount.epochVoteAccount,
            epochCredits: voteAccount.epochCredits,
          };
          enrichedCount++;
        }
      });
      
      console.log(`📊 Enriched ${enrichedCount} validator nodes with vote account data`);
    }
  } catch (error) {
    // Silently fail - enrichment is optional
    console.debug('Could not enrich nodes with vote accounts:', error);
  }
}

/**
 * Get approximate coordinates for a region
 * Returns center coordinates for major regions
 */
function getRegionCoordinates(region: string): { latitude: number; longitude: number } | undefined {
  const regionCoords: Record<string, { latitude: number; longitude: number }> = {
    'USA': { latitude: 39.8283, longitude: -98.5795 },      // Geographic center of USA
    'Europe': { latitude: 54.5260, longitude: 15.2551 },    // Center of Europe
    'Asia': { latitude: 34.0479, longitude: 100.6197 },     // Center of Asia
    'South America': { latitude: -14.2350, longitude: -51.9253 }, // Center of South America
    'Africa': { latitude: 8.7832, longitude: 34.5085 },     // Center of Africa
    'Australia': { latitude: -25.2744, longitude: 133.7751 }, // Center of Australia
  };
  
  return regionCoords[region];
}

/**
 * Detect region/country from IP address using simple heuristics
 * For production, use a proper geoIP service
 */
function detectRegionFromIP(ip: string): string | undefined {
  // Simple IP range detection (basic heuristic)
  // For production, use a service like ipapi.co, ip-api.com, or MaxMind GeoIP2
  
  // Private/local IPs
  if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return undefined; // Can't determine location for private IPs
  }
  
  // Extract first octet for basic region estimation
  const parts = ip.split('.');
  if (parts.length === 4) {
    const firstOctet = parseInt(parts[0], 10);
    
    // Very basic IP range to region mapping (rough estimates)
    // This is a simplified heuristic - for accurate results, use a geoIP service
    if (firstOctet >= 1 && firstOctet <= 126) {
      // Class A - mostly North America, some Asia
      return 'USA';
    } else if (firstOctet >= 128 && firstOctet <= 191) {
      // Class B - mixed regions (simplified to most common)
      if (firstOctet >= 128 && firstOctet <= 143) return 'Europe';
      if (firstOctet >= 144 && firstOctet <= 159) return 'USA';
      if (firstOctet >= 160 && firstOctet <= 175) return 'Asia';
      if (firstOctet >= 176 && firstOctet <= 191) return 'Europe';
    } else if (firstOctet >= 192 && firstOctet <= 223) {
      // Class C - mixed regions
      if (firstOctet >= 192 && firstOctet <= 207) return 'Europe';
      if (firstOctet >= 208 && firstOctet <= 223) return 'USA';
    }
  }
  
  return undefined;
}

/**
 * Enrich nodes with location data from IP addresses
 * This is called after fetching nodes to add location information
 */
async function enrichNodesWithLocation(nodes: pNode[]): Promise<void> {
  // For nodes without location or without coordinates, try to detect from IP
  const nodesNeedingLocation = nodes.filter(node => {
    const hasLocation = node.location && node.location.latitude && node.location.longitude;
    return !hasLocation && node.ipAddress;
  });
  
  if (nodesNeedingLocation.length === 0) return;
  
  console.log(`🌍 Detecting location for ${nodesNeedingLocation.length} nodes from IP addresses...`);
  
  // Use simple IP-based detection (client-side, no API calls)
  // For production, you could use a geoIP service here
  nodesNeedingLocation.forEach(node => {
    let region: string | undefined;
    
    // If node already has a region but no coordinates, use that region
    if (node.location && (node.location.country || node.location.region)) {
      region = node.location.country || node.location.region;
    } else if (node.ipAddress) {
      // Otherwise, detect from IP
      region = detectRegionFromIP(node.ipAddress);
    }
    
    if (region) {
      const coords = getRegionCoordinates(region);
      if (coords) {
        // Add some random variation to spread nodes across the region
        // This prevents all nodes from appearing at the exact same point
        const latVariation = (Math.random() - 0.5) * 20; // ±10 degrees
        const lngVariation = (Math.random() - 0.5) * 40; // ±20 degrees
        
        node.location = {
          ...node.location,
          country: node.location?.country || region,
          region: node.location?.region || region,
          latitude: coords.latitude + latVariation,
          longitude: coords.longitude + lngVariation,
        };
      } else if (!node.location) {
        // If no coordinates found but no location exists, still set the region
        node.location = {
          country: region,
          region: region,
        };
      }
    }
  });
  
  const enrichedCount = nodesNeedingLocation.filter(n => n.location && n.location.latitude && n.location.longitude).length;
  if (enrichedCount > 0) {
    console.log(`✅ Enriched ${enrichedCount} nodes with location data (including coordinates)`);
  }
}

/**
 * Fetch all pNodes from REST API (Solscan-style)
 * Tries multiple possible endpoint paths
 * 
 * NOTE: Solscan API does NOT provide node/cluster endpoints.
 * This function is designed for Xandeum pRPC endpoints or similar node monitoring APIs.
 */
async function fetchNodesViaREST(): Promise<pNode[]> {
  const { version, base } = normalizeBaseUrl(PRPC_ENDPOINT);
  
  // Check if this is Solscan API (which doesn't have node endpoints)
  const isSolscanAPI = base.includes('solscan.io');
  if (isSolscanAPI) {
    // Instead of throwing, return a special error that triggers fallback
    console.warn(
      '⚠️ Solscan API detected. Solscan does not provide node/cluster monitoring endpoints. ' +
      'Solscan is a blockchain explorer API for accounts, tokens, transactions, etc. ' +
      'Falling back to mock data. For node monitoring, use Xandeum pRPC endpoint or Solana JSON-RPC.'
    );
    const error = new Error('Solscan API does not provide node endpoints');
    (error as any).shouldFallback = true;
    throw error;
  }
  
  // Build endpoint list based on whether base URL has version
  const possibleEndpoints = version 
    ? [
        // For versioned APIs (like /v2.0), try version-agnostic paths
        '/cluster/nodes',
        '/nodes',
        '/pnodes',
        '/pnodes/list',
        '/storage/nodes',
        '/network/nodes',
        // Also try with explicit version prefix
        `${version}/cluster/nodes`,
        `${version}/nodes`,
        `${version}/pnodes`,
      ]
    : [
        // For non-versioned APIs, try all variations
        '/v1/nodes',
        '/v2/nodes',
        '/api/v1/nodes',
        '/api/v2/nodes',
        '/nodes',
        '/cluster/nodes',
        '/pnodes',
        '/pnodes/list',
        '/storage/nodes',
        '/network/nodes',
      ];

  let lastError: Error | null = null;

  for (const endpoint of possibleEndpoints) {
    try {
      console.log(`Trying REST endpoint: ${endpoint}`);
      const result = await makeRestRequest(endpoint);
      
      // Handle different response formats
      let nodesArray: any[] = [];
      
      if (Array.isArray(result)) {
        nodesArray = result;
      } else if (result && Array.isArray(result.data)) {
        nodesArray = result.data;
      } else if (result && Array.isArray(result.nodes)) {
        nodesArray = result.nodes;
      } else if (result && Array.isArray(result.value)) {
        nodesArray = result.value;
      } else if (result && Array.isArray(result.result)) {
        nodesArray = result.result;
      } else if (result && typeof result === 'object' && !result.err && !result.error) {
        // Single node or wrapped response
        nodesArray = [result];
      } else {
        throw new Error(`Unexpected response format from ${endpoint}`);
      }

      // Map REST nodes to pNode format
      const mappedNodes = nodesArray.map((node, index) => mapRpcNodeToPNode(node, index));
      
      console.log(`Successfully fetched ${mappedNodes.length} nodes using REST endpoint: ${endpoint}`);
      return mappedNodes;
      } catch (error) {
        const err = error as Error & { status?: number };
        // Only log warnings for 404s (expected), log errors for other failures
        if (err.status === 404) {
          console.debug(`REST endpoint ${endpoint} not found (404)`);
        } else {
          console.warn(`REST endpoint ${endpoint} failed:`, error);
        }
        lastError = error as Error;
        continue;
      }
  }

  throw new Error(
    `All REST endpoints failed. Last error: ${lastError?.message}. ` +
    `Tried endpoints: ${possibleEndpoints.join(', ')}`
  );
}

/**
 * Fetch all pNodes from pRPC endpoint using JSON-RPC
 * Tries multiple possible method names
 */
async function fetchNodesViaJSONRPC(): Promise<pNode[]> {
  // Prioritize getClusterNodes for Alchemy/Solana endpoints
  const isAlchemyEndpoint = PRPC_ENDPOINT.includes('alchemy.com');
  const possibleMethods = isAlchemyEndpoint
    ? [
        'getClusterNodes', // Solana standard - prioritize for Alchemy
        'getPNodes',
        'getPnodes',
        'listPNodes',
        'listPnodes',
        'getNodes',
        'getAllNodes',
        'getStorageNodes',
        'getNetworkNodes',
      ]
    : [
        'getPNodes',
        'getPnodes',
        'getClusterNodes', // Also try Solana standard
        'listPNodes',
        'listPnodes',
        'getNodes',
        'getAllNodes',
        'getStorageNodes',
        'getNetworkNodes',
      ];

  let lastError: Error | null = null;

  for (const method of possibleMethods) {
    try {
      console.log(`Trying JSON-RPC method: ${method}`);
      const result = await makeRpcRequest(method, []);
      
      // Handle different response formats
      let nodesArray: any[] = [];
      
      if (Array.isArray(result)) {
        nodesArray = result;
      } else if (result && Array.isArray(result.nodes)) {
        nodesArray = result.nodes;
      } else if (result && Array.isArray(result.value)) {
        nodesArray = result.value;
      } else if (result && typeof result === 'object') {
        nodesArray = [result];
      } else {
        throw new Error(`Unexpected response format from ${method}`);
      }

      const mappedNodes = nodesArray.map((node, index) => mapRpcNodeToPNode(node, index));
      
      console.log(`✅ Successfully fetched ${mappedNodes.length} nodes using JSON-RPC method: ${method}`);
      
      // For Solana getClusterNodes, try to enrich with additional data
      if (method === 'getClusterNodes' && mappedNodes.length > 0) {
        try {
          await enrichSolanaNodes(mappedNodes);
        } catch (error) {
          console.warn('Failed to enrich Solana nodes with additional data:', error);
        }
      }
      
      // Enrich all nodes with location data from IP addresses
      try {
        await enrichNodesWithLocation(mappedNodes);
      } catch (error) {
        console.warn('Failed to enrich nodes with location data:', error);
      }
      
      return mappedNodes;
      } catch (error) {
        const err = error as Error & { status?: number };
        // Only log warnings for 404s (expected), log errors for other failures
        if (err.status === 404) {
          console.debug(`JSON-RPC method ${method} not found (404)`);
        } else {
          console.warn(`JSON-RPC method ${method} failed:`, error);
        }
        lastError = error as Error;
        continue;
      }
  }

  throw new Error(
    `All JSON-RPC methods failed. Last error: ${lastError?.message}. ` +
    `Tried methods: ${possibleMethods.join(', ')}`
  );
}

/**
 * Fetch all pNodes from pRPC endpoint
 * Supports both REST API (Solscan-style) and JSON-RPC
 */
export async function fetchAllpNodes(): Promise<pNode[]> {
  // Use mock data if explicitly enabled or if no endpoint configured
  if (USE_MOCK_DATA) {
    console.log('Using mock data (configure NEXT_PUBLIC_PRPC_ENDPOINT to use real pRPC)');
    return generateMockNodes();
  }

  // Auto-detect Alchemy endpoints and force JSON-RPC mode
  const isAlchemyEndpoint = PRPC_ENDPOINT.includes('alchemy.com');
  const effectiveMode = isAlchemyEndpoint ? 'jsonrpc' : PRPC_API_MODE;

  try {
    // Determine which API mode to use
    if (effectiveMode === 'rest') {
      // Force REST API
      return await fetchNodesViaREST();
    } else if (effectiveMode === 'jsonrpc') {
      // Force JSON-RPC (Alchemy, Solana, etc.)
      console.log(`Using JSON-RPC mode${isAlchemyEndpoint ? ' (Alchemy endpoint detected)' : ''}`);
      return await fetchNodesViaJSONRPC();
    } else {
      // Auto-detect: try REST first (Solscan-style), then JSON-RPC
      try {
        return await fetchNodesViaREST();
      } catch (restError) {
        // Check if this is a Solscan API error that should trigger fallback
        const shouldFallback = (restError as any)?.shouldFallback === true;
        if (shouldFallback) {
          // Solscan API detected - fall back to mock data
          console.warn('⚠️ Falling back to mock data (Solscan API detected).');
          return generateMockNodes();
        }
        console.log('REST API failed, trying JSON-RPC...');
        try {
          return await fetchNodesViaJSONRPC();
        } catch (jsonRpcError) {
          // Both REST and JSON-RPC failed
          throw restError; // Throw the original error
        }
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const shouldFallback = (error as any)?.shouldFallback === true;
    
    // Auto-fallback if Solscan API detected or if fallback is explicitly enabled
    if (shouldFallback || process.env.NEXT_PUBLIC_FALLBACK_TO_MOCK === 'true') {
      console.warn('⚠️ Falling back to mock data.');
      if (shouldFallback) {
        console.warn('💡 Solscan API does not provide node monitoring endpoints.');
      } else {
        console.warn('💡 All API endpoints failed.');
        console.warn(`💡 Endpoint: ${PRPC_ENDPOINT}`);
        console.warn(`💡 Mode: ${effectiveMode}`);
        console.warn(`💡 Error: ${errorMessage}`);
      }
      console.warn('💡 For Xandeum pNodes, configure the correct pRPC endpoint URL.');
      return generateMockNodes();
    }
    
    console.error('Error fetching pNodes:', errorMessage);
    console.error(`Endpoint: ${PRPC_ENDPOINT}, Mode: ${effectiveMode}`);
    throw error;
  }
}

/**
 * Fetch a single pNode by ID
 * Supports both REST API and JSON-RPC
 */
export async function fetchpNodeById(nodeId: string): Promise<pNode | null> {
  try {
    if (USE_MOCK_DATA) {
      // Fallback to fetch all and find
      const nodes = await fetchAllpNodes();
      return nodes.find(n => n.id === nodeId || n.publicKey === nodeId) || null;
    }

    // Try REST API endpoints first (Solscan-style)
    if (PRPC_API_MODE === 'rest' || PRPC_API_MODE === 'auto') {
      const restEndpoints = [
        `/v1/node/${nodeId}`,
        `/api/v1/node/${nodeId}`,
        `/nodes/${nodeId}`,
        `/node/${nodeId}`,
        `/pnodes/${nodeId}`,
      ];

      for (const endpoint of restEndpoints) {
        try {
          const result = await makeRestRequest(endpoint);
          if (result && !result.err && !result.error) {
            return mapRpcNodeToPNode(result.data || result, 0);
          }
        } catch (error) {
          continue;
        }
      }
    }

    // Try JSON-RPC methods
    if (PRPC_API_MODE === 'jsonrpc' || PRPC_API_MODE === 'auto') {
      const possibleMethods = [
        'getPNode',
        'getNode',
        'getNodeById',
        'getNodeInfo',
      ];

      for (const method of possibleMethods) {
        try {
          const result = await makeRpcRequest(method, [nodeId]);
          if (result) {
            return mapRpcNodeToPNode(result, 0);
          }
        } catch (error) {
          continue;
        }
      }
    }

    // Fallback: fetch all nodes and find by ID
    const nodes = await fetchAllpNodes();
    return nodes.find(n => n.id === nodeId || n.publicKey === nodeId) || null;
  } catch (error) {
    console.error(`Error fetching pNode ${nodeId}:`, error);
    return null;
  }
}

/**
 * Fetch metrics history for a node
 */
export async function fetchNodeMetrics(nodeId: string, hours: number = 24): Promise<pNodeMetrics[]> {
  try {
    // TODO: Replace with actual pRPC call for historical data
    // For now, generate mock time-series data
    return generateMockMetrics(nodeId, hours);
  } catch (error) {
    console.error(`Error fetching metrics for ${nodeId}:`, error);
    return [];
  }
}

/**
 * Calculate network statistics from node list
 */
export function calculateNetworkStats(nodes: pNode[]): NetworkStats {
  const onlineNodes = nodes.filter(n => n.status === 'online').length;
  const offlineNodes = nodes.filter(n => n.status === 'offline').length;
  const validatorCount = nodes.filter(n => n.metadata?.isValidator).length;
  
  const totalStorageCapacity = nodes.reduce((sum, n) => sum + (n.storageCapacity || 0), 0);
  const totalStorageUsed = nodes.reduce((sum, n) => sum + (n.storageUsed || 0), 0);
  
  const nodesWithPeers = nodes.filter(n => n.peerCount > 0);
  const averagePeerCount = nodesWithPeers.length > 0
    ? nodesWithPeers.reduce((sum, n) => sum + n.peerCount, 0) / nodesWithPeers.length
    : 0;
  
  const nodesWithLatency = nodes.filter(n => n.latency !== undefined);
  const averageLatency = nodesWithLatency.length > 0
    ? nodesWithLatency.reduce((sum, n) => sum + (n.latency || 0), 0) / nodesWithLatency.length
    : 0;
  
  // Group versions into ranges (e.g., "3.0.x" instead of "3.0.0", "3.0.1", etc.)
  const versionDistribution: Record<string, number> = {};
  nodes.forEach(node => {
    const version = node.softwareVersion || 'unknown';
    if (version === 'unknown') {
      versionDistribution[version] = (versionDistribution[version] || 0) + 1;
    } else {
      // Group by major.minor (e.g., "3.0.x" for "3.0.0", "3.0.1", "3.0.12")
      const versionMatch = version.match(/^(\d+)\.(\d+)(?:\.\d+)?/);
      if (versionMatch) {
        const major = versionMatch[1];
        const minor = versionMatch[2];
        const versionRange = `${major}.${minor}.x`;
        versionDistribution[versionRange] = (versionDistribution[versionRange] || 0) + 1;
      } else {
        // If version doesn't match standard format, use as-is
        versionDistribution[version] = (versionDistribution[version] || 0) + 1;
      }
    }
  });
  
  const regionDistribution: Record<string, number> = {};
  nodes.forEach(node => {
    // Try to get location from node, or use IP-based detection
    let region = node.location?.country || node.location?.region;
    
    // If no location, try to detect from IP address
    if (!region && node.ipAddress) {
      region = detectRegionFromIP(node.ipAddress);
    }
    
    region = region || 'unknown';
    regionDistribution[region] = (regionDistribution[region] || 0) + 1;
  });
  
  return {
    totalNodes: nodes.length,
    onlineNodes,
    offlineNodes,
    totalStorageCapacity,
    totalStorageUsed,
    averagePeerCount: Math.round(averagePeerCount * 100) / 100,
    averageLatency: Math.round(averageLatency * 100) / 100,
    versionDistribution,
    regionDistribution,
    validatorCount,
  };
}

/**
 * Generate mock pNodes for development/demo
 * Remove this when real pRPC integration is ready
 */
function generateMockNodes(): pNode[] {
  const regions = ['USA', 'Europe', 'Asia', 'South America', 'Africa', 'Australia'];
  const versions = ['1.0.0', '1.1.0', '1.2.0', '2.0.0-beta'];
  const statuses: ('online' | 'offline' | 'unknown')[] = ['online', 'online', 'online', 'offline', 'unknown'];
  
  // Realistic coordinates for different regions (latitude, longitude ranges)
  const regionCoordinates: Record<string, { lat: [number, number], lng: [number, number] }> = {
    'USA': { lat: [25, 50], lng: [-125, -65] },      // Continental USA
    'Europe': { lat: [35, 70], lng: [-10, 40] },     // Europe
    'Asia': { lat: [10, 50], lng: [60, 150] },       // Asia
    'South America': { lat: [-35, 15], lng: [-80, -35] }, // South America
    'Africa': { lat: [-35, 37], lng: [-20, 55] },    // Africa
    'Australia': { lat: [-44, -10], lng: [113, 154] }, // Australia/Oceania
  };

  const nodes: pNode[] = [];
  const baseTime = Date.now();
  
  for (let i = 0; i < 50; i++) {
    const region = regions[Math.floor(Math.random() * regions.length)];
    const version = versions[Math.floor(Math.random() * versions.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const storageCapacity = Math.random() * 10 * 1024 * 1024 * 1024 * 1024; // 0-10 TB
    const storageUsed = storageCapacity * (0.3 + Math.random() * 0.6);
    const peerCount = Math.floor(Math.random() * 50) + 5;
    const latency = status === 'online' ? Math.random() * 500 + 50 : undefined;
    const uptime = status === 'online' ? Math.random() * 30 * 24 * 3600 : 0;
    
    // Generate realistic coordinates for the selected region
    const regionCoords = regionCoordinates[region] || { lat: [-90, 90], lng: [-180, 180] };
    const latitude = regionCoords.lat[0] + Math.random() * (regionCoords.lat[1] - regionCoords.lat[0]);
    const longitude = regionCoords.lng[0] + Math.random() * (regionCoords.lng[1] - regionCoords.lng[0]);
    
    nodes.push({
      id: `node-${String(i + 1).padStart(3, '0')}`,
      publicKey: `0x${Math.random().toString(16).substring(2, 66)}`,
      ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      endpoint: `https://node-${i + 1}.xandeum.net`,
      status,
      lastSeen: new Date(baseTime - Math.random() * 3600000),
      peerCount,
      storageCapacity,
      storageUsed,
      storageFree: storageCapacity - storageUsed,
      softwareVersion: version,
      protocolVersion: '1.0',
      buildInfo: `build-${Math.floor(Math.random() * 1000)}`,
      latency,
      uptime,
      availability: status === 'online' ? 95 + Math.random() * 5 : 0,
      location: {
        country: region,
        region: `${region}-${Math.floor(Math.random() * 5) + 1}`,
        latitude,
        longitude,
      },
      peers: Array.from({ length: peerCount }, (_, j) => `node-${String((i + j + 1) % 50 + 1).padStart(3, '0')}`),
      rawData: {
        nodeId: `node-${String(i + 1).padStart(3, '0')}`,
        status,
        metrics: { peerCount, latency, uptime },
      },
    });
  }
  
  return nodes;
}

/**
 * Generate mock metrics for time-series charts
 */
function generateMockMetrics(nodeId: string, hours: number): pNodeMetrics[] {
  const metrics: pNodeMetrics[] = [];
  const now = Date.now();
  const interval = hours * 3600000 / 24; // 24 data points
  
  for (let i = 23; i >= 0; i--) {
    const timestamp = new Date(now - i * interval);
    metrics.push({
      nodeId,
      timestamp,
      latency: 50 + Math.random() * 200,
      peerCount: Math.floor(10 + Math.random() * 40),
      storageUsed: (5 + Math.random() * 5) * 1024 * 1024 * 1024 * 1024,
      storageCapacity: 10 * 1024 * 1024 * 1024 * 1024,
      uptime: (20 + Math.random() * 10) * 24 * 3600,
    });
  }
  
  return metrics;
}

