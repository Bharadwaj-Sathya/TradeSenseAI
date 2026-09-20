/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, type JSX } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Loader2 
} from 'lucide-react';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface Column<T> {
  accessorKey: keyof T;
  header: string;
  size?: string;
  cell?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  enableSearch?: boolean;
  enablePagination?: boolean;
  enableSorting?: boolean;
  pageSize?: number;
  searchPlaceholder?: string;
  isSSEActive?: boolean;
  isLoading?: boolean;
}

interface SortingState {
  column: string | null;
  direction: 'asc' | 'desc' | null;
}

// ============================================
// REUSABLE DataTable COMPONENT
// ============================================

function DataTable<T extends Record<string, any>>({ 
  data, 
  columns, 
  enableSearch = true,
  enablePagination = true,
  enableSorting = true,
  pageSize = 10,
  searchPlaceholder = 'Search...',
  isSSEActive = false,
  isLoading = false,
}: DataTableProps<T>): JSX.Element {
  const [sorting, setSorting] = useState<SortingState>({ column: null, direction: null });
  const [filtering, setFiltering] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(pageSize);

  // Filter data
  let filteredData = data;
  if (enableSearch && filtering) {
    filteredData = data.filter(row =>
      columns.some(col => {
        const value = row[col.accessorKey];
        return value?.toString().toLowerCase().includes(filtering.toLowerCase());
      })
    );
  }

  // Sort data
  if (enableSorting && sorting.column) {
    filteredData = [...filteredData].sort((a, b) => {
      const aVal = a[sorting.column as keyof T];
      const bVal = b[sorting.column as keyof T];
      if (aVal < bVal) return sorting.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sorting.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Paginate data
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = enablePagination
    ? filteredData.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage)
    : filteredData;

  // Create empty rows to maintain fixed height
  const emptyRowsCount = Math.max(0, rowsPerPage - paginatedData.length);
  const emptyRows = Array(emptyRowsCount).fill(null);

  const handleSort = (columnKey: string): void => {
    if (!enableSorting) return;
    setSorting(prev => ({
      column: columnKey,
      direction: prev.column === columnKey && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  useEffect(() => {
    setCurrentPage(0);
  }, [filtering, rowsPerPage]);

  return (
    <div className="w-full space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        {enableSearch && (
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={filtering}
              onChange={e => setFiltering(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
      </div>

      {/* SSE Status */}
      {isSSEActive && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
          <span className="text-sm text-blue-800 font-medium">
            SSE Active - Real-time updates enabled
          </span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
        <table className="w-full">
          <thead className="bg-linear-to-r from-gray-100 to-gray-200">
            <tr>
              {columns.map(col => (
                <th
                  key={String(col.accessorKey)}
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                  style={{ width: col.size }}
                >
                  <div
                    className={`flex items-center gap-2 ${
                      enableSorting ? 'cursor-pointer select-none hover:text-blue-600 transition-colors' : ''
                    }`}
                    onClick={() => handleSort(String(col.accessorKey))}
                  >
                    {col.header}
                    {enableSorting && (
                      <span className="text-gray-400">
                        {sorting.column === String(col.accessorKey) && sorting.direction === 'asc' ? (
                          <ArrowUp className="w-4 h-4 text-blue-600" />
                        ) : sorting.column === String(col.accessorKey) && sorting.direction === 'desc' ? (
                          <ArrowDown className="w-4 h-4 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <>
                {Array(rowsPerPage).fill(null).map((_, idx) => (
                  <tr key={`loading-${idx}`} className="h-14">
                    <td colSpan={columns.length} className="px-6 py-4 text-center">
                      {idx === Math.floor(rowsPerPage / 2) && (
                        <div className="flex flex-col items-center justify-center gap-3">
                          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                          <span className="text-gray-500">Loading data...</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </>
            ) : paginatedData.length === 0 && emptyRowsCount === rowsPerPage ? (
              <>
                {Array(rowsPerPage).fill(null).map((_, idx) => (
                  <tr key={`no-data-${idx}`} className="h-14">
                    <td colSpan={columns.length} className="px-6 py-4 text-center">
                      {idx === Math.floor(rowsPerPage / 2) && (
                        <span className="text-gray-500">No data available</span>
                      )}
                    </td>
                  </tr>
                ))}
              </>
            ) : (
              <>
                {paginatedData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    {columns.map(col => (
                      <td key={String(col.accessorKey)} className="px-6 py-4 text-sm text-gray-900">
                        {col.cell ? col.cell(row[col.accessorKey], row) : row[col.accessorKey]}
                      </td>
                    ))}
                  </tr>
                ))}
                {emptyRows.map((_, idx) => (
                  <tr key={`empty-${idx}`} className="h-14">
                    {columns.map(col => (
                      <td key={String(col.accessorKey)} className="px-6 py-4 text-sm text-gray-300">
                        &nbsp;
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {enablePagination && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Page Size:</span>
            <select
              value={rowsPerPage}
              onChange={e => setRowsPerPage(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {[5, 10, 20, 50, 100].map(size => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700 font-medium">
              {filteredData.length === 0 ? 0 : currentPage * rowsPerPage + 1} to {Math.min((currentPage + 1) * rowsPerPage, filteredData.length)} of {filteredData.length}
            </span>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(0)}
                disabled={currentPage === 0 || isLoading}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0 || isLoading}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700 font-medium px-2">
                Page {currentPage + 1} of {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1 || isLoading}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages - 1)}
                disabled={currentPage >= totalPages - 1 || isLoading}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;