'use client';

import { PortOneCheckout } from './PortOneCheckout';

interface PaywallProps {
    isOpen: boolean;
    onClose: () => void;
    message?: string;
}

export function Paywall({ isOpen, onClose, message = "You've reached your daily free limit!" }: PaywallProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative overflow-hidden">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label="Close"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 mb-4">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">Unlock VocaFit Pro</h2>
                    <p className="text-slate-600 font-medium">
                        {message} Get unlimited AI sentence coaching and boost your English skills.
                    </p>
                </div>

                <div className="space-y-4">
                    <PortOneCheckout planId="premium_monthly" amount={4900} planName="Pro Monthly" />
                </div>
            </div>
        </div>
    );
}
