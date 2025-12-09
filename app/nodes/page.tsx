'use client';

import { useNodes } from '@/hooks/useNodes';
import { NodeTable } from '@/components/NodeTable';
import { Download } from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Skeleton } from '@/components/Skeleton';
import { useState } from 'react';

export default function NodesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(200);
  const { data, isLoading, error } = useNodes({ page, pageSize });
  const nodes = data?.nodes || [];
  const total = data?.total || nodes.length;

  const handleExport = () => {
    const dataStr = JSON.stringify(nodes, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `xandeum-nodes-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Status', 'Peer Count', 'Storage Used', 'Storage Capacity', 'Latency', 'Version', 'Location'];
    const rows = nodes.map(node => [
      node.id,
      node.status,
      node.peerCount,
      node.storageUsed || 0,
      node.storageCapacity || 0,
      node.latency || 'N/A',
      node.softwareVersion || 'N/A',
      node.location?.country || 'Unknown',
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const dataBlob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `xandeum-nodes-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card>
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400 mb-4">Error loading nodes</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">{String(error)}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Node Explorer
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Explore and monitor all Xandeum pNodes ({total} nodes)
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      <NodeTable
        nodes={nodes}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}

