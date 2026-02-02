import { ToastProvider } from '@/components/ui/Toast';

export default function ValuationLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ToastProvider>
            {children}
        </ToastProvider>
    );
}
