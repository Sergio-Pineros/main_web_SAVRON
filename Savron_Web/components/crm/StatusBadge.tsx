import { cn } from '@/lib/utils';

interface StatusBadgeProps {
    status: string;
    className?: string;
}

const statusStyles: Record<string, string> = {
    pending: 'badge-pending',
    approved: 'badge-approved',
    rejected: 'badge-rejected',
    interview: 'badge-interview',
    confirmed: 'badge-approved',
    completed: 'bg-white/10 text-white border border-white/10',
    cancelled: 'badge-rejected',
    no_show: 'bg-orange-900/30 text-orange-400 border border-orange-500/20',
    standard: 'bg-white/10 text-savron-silver border border-white/10',
    inner_circle: 'badge-approved',
    vip: 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/20',
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
    return (
        <span className={cn(
            "badge",
            statusStyles[status] || 'bg-white/10 text-savron-silver border border-white/10',
            className
        )}>
            {status.replace('_', ' ')}
        </span>
    );
}
