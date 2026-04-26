export default function AskPanditLayout({ children }: { children: React.ReactNode }) {
 return (
 <div className="fixed inset-0 top-14 z-10 bg-surface-50 overflow-hidden">
 {children}
 </div>
 );
}
