"use client";

import { cn } from '@/lib/utils';

interface Column {
    key: string;
    label: string;
    render?: (item: any) => React.ReactNode;
}

interface DataTableProps {
    columns: Column[];
    data: any[];
    onRowClick?: (item: any) => void;
    emptyMessage?: string;
}

export default function DataTable({
    columns,
    data,
    onRowClick,
    emptyMessage = "No data found",
}: DataTableProps) {
    return (
        <div className="bg-savron-grey border border-white/5 rounded-savron overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/5">
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className="text-left px-6 py-4 text-xs uppercase tracking-widest text-savron-silver font-medium"
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-6 py-16 text-center text-savron-silver text-sm uppercase tracking-wider"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            data.map((item, idx) => (
                                <tr
                                    key={idx}
                                    onClick={() => onRowClick?.(item)}
                                    className={cn(
                                        "border-b border-white/5 last:border-0 transition-colors",
                                        onRowClick && "cursor-pointer hover:bg-white/[0.02]"
                                    )}
                                >
                                    {columns.map((col) => (
                                        <td key={col.key} className="px-6 py-4 text-sm text-white">
                                            {col.render
                                                ? col.render(item)
                                                : String(item[col.key] ?? '')}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
