'use client';

import {
 CheckCircle2,
 CalendarCheck,
 UserCheck,
 Loader2,
 CheckCheck,
 Video,
 Package,
} from 'lucide-react';

export type BookingStatus =
 | 'booked'
 | 'priest_assigned'
 | 'in_progress'
 | 'completed'
 | 'video_uploaded'
 | 'delivered';

interface StatusStep {
 key: BookingStatus;
 label: string;
 icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StatusStep[] = [
 { key: 'booked', label: 'Booked', icon: CalendarCheck },
 { key: 'priest_assigned', label: 'Priest Assigned', icon: UserCheck },
 { key: 'in_progress', label: 'In Progress', icon: Loader2 },
 { key: 'completed', label: 'Completed', icon: CheckCheck },
 { key: 'video_uploaded', label: 'Video Proof', icon: Video },
 { key: 'delivered', label: 'Delivered', icon: Package },
];

interface BookingStatusTrackerProps {
 currentStatus: BookingStatus;
 timestamps?: Partial<Record<BookingStatus, string>>;
}

export default function BookingStatusTracker({
 currentStatus,
 timestamps = {},
}: BookingStatusTrackerProps) {
 const currentIndex = STEPS.findIndex((s) => s.key === currentStatus);

 function formatTimestamp(dateStr: string): string {
 const d = new Date(dateStr);
 return d.toLocaleDateString('en-IN', {
 day: 'numeric',
 month: 'short',
 hour: '2-digit',
 minute: '2-digit',
 });
 }

 return (
 <>
 {/* Desktop: horizontal */}
 <div className="hidden md:block">
 <div className="relative flex items-start justify-between">
 {/* Background connector line */}
 <div className="absolute left-0 right-0 top-5 h-0.5 bg-surface-200" />
 <div
 className="absolute left-0 top-5 h-0.5 bg-gradient-to-r from-tulsi-green to-saffron-500 transition-all duration-700"
 style={{
 width:
 currentIndex <= 0
 ? '0%'
 : `${(currentIndex / (STEPS.length - 1)) * 100}%`,
 }}
 />

 {STEPS.map((step, i) => {
 const Icon = step.icon;
 const isCompleted = i < currentIndex;
 const isCurrent = i === currentIndex;
 const isFuture = i > currentIndex;

 return (
 <div
 key={step.key}
 className="relative z-10 flex flex-col items-center"
 style={{ width: `${100 / STEPS.length}%` }}
 >
 <div
 className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
 isCompleted
 ? 'border-tulsi-green bg-tulsi-green-dark text-white'
 : isCurrent
 ? 'border-saffron-600 bg-saffron-600 text-white shadow-lg shadow-saffron-200 animate-pulse'
 : 'border-surface-200 bg-white text-surface-400'
 }`}
 >
 {isCompleted ? (
 <CheckCircle2 className="h-5 w-5" />
 ) : (
 <Icon className="h-5 w-5" />
 )}
 </div>
 <span
 className={`mt-2 text-xs font-medium text-center ${
 isCompleted
 ? 'text-tulsi-green'
 : isCurrent
 ? 'text-saffron-600 font-semibold'
 : 'text-surface-400'
 }`}
 >
 {step.label}
 </span>
 {timestamps[step.key] && (
 <span className="mt-0.5 text-xs text-surface-400">
 {formatTimestamp(timestamps[step.key]!)}
 </span>
 )}
 </div>
 );
 })}
 </div>
 </div>

 {/* Mobile: vertical */}
 <div className="md:hidden">
 <div className="relative ml-5 space-y-0">
 {STEPS.map((step, i) => {
 const Icon = step.icon;
 const isCompleted = i < currentIndex;
 const isCurrent = i === currentIndex;
 const isLast = i === STEPS.length - 1;

 return (
 <div key={step.key} className="relative flex items-start gap-3 pb-6">
 {/* Vertical connector */}
 {!isLast && (
 <div
 className={`absolute left-[15px] top-8 h-full w-0.5 ${
 isCompleted ? 'bg-tulsi-green' : 'bg-surface-200'
 }`}
 />
 )}

 <div
 className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
 isCompleted
 ? 'border-tulsi-green bg-tulsi-green-dark text-white'
 : isCurrent
 ? 'border-saffron-600 bg-saffron-600 text-white animate-pulse'
 : 'border-surface-200 bg-white text-surface-400'
 }`}
 >
 {isCompleted ? (
 <CheckCircle2 className="h-4 w-4" />
 ) : (
 <Icon className="h-4 w-4" />
 )}
 </div>

 <div className="pt-0.5">
 <span
 className={`text-sm font-medium ${
 isCompleted
 ? 'text-tulsi-green'
 : isCurrent
 ? 'text-saffron-600 font-semibold'
 : 'text-surface-400'
 }`}
 >
 {step.label}
 </span>
 {timestamps[step.key] && (
 <p className="text-xs text-surface-400">
 {formatTimestamp(timestamps[step.key]!)}
 </p>
 )}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </>
 );
}
