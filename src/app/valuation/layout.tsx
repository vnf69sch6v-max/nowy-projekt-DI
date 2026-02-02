import { ToastProvider } from '@/components/ui/Toast';
import Sidebar from '@/components/valuation/Sidebar';

export default function ValuationLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ToastProvider>
            <div style={{ display: 'flex', minHeight: '100vh' }}>
                <Sidebar />
                <main style={{ flex: 1, marginLeft: '240px' }}>
                    {children}
                </main>
            </div>
        </ToastProvider>
    );
}

