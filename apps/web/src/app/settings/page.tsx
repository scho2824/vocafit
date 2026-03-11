'use client';

import { useSubscription } from '@/hooks/useSubscription';
import { useRouter } from 'next/navigation';
import { LogOut, CreditCard } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
    const { data: subscription, isLoading } = useSubscription();
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const handleCancelSubscription = () => {
        // In a real PortOne implementation, this would call a backend API to cancel the billing key
        // and stop future recurrences.
        alert('To cancel your subscription, please contact support for now. (Mock functionality pending backend API implementation)');
    };

    if (isLoading) {
        return <div className="min-h-screen flex justify-center items-center">Loading settings...</div>;
    }

    const isPro = subscription?.status === 'active';

    return (
        <div className="max-w-2xl mx-auto px-4 py-12">
            <h1 className="text-4xl font-black text-slate-800 mb-8 tracking-tight">Settings</h1>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
                <div className="flex items-center mb-6">
                    <CreditCard className="text-indigo-500 w-8 h-8 mr-4" />
                    <h2 className="text-2xl font-bold text-slate-800">Billing & Subscription</h2>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 mb-6 flex justify-between items-center">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Current Plan</p>
                        <p className="text-xl font-bold text-slate-900">
                            {isPro ? 'VocaFit Pro' : 'Basic Learner (Free)'}
                        </p>
                    </div>
                    <div>
                        <span className={`px-4 py-2 rounded-full text-sm font-bold ${isPro ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'}`}>
                            {subscription?.status === 'past_due' ? 'Payment Failed' : isPro ? 'Active' : 'Free'}
                        </span>
                    </div>
                </div>

                {isPro ? (
                    <div className="space-y-4">
                        <p className="text-slate-600">
                            Your next billing cycle is on <strong className="text-slate-800">{new Date(subscription.current_period_end!).toLocaleDateString()}</strong>.
                        </p>
                        <button
                            onClick={handleCancelSubscription}
                            className="text-red-500 font-bold hover:text-red-600 transition-colors"
                        >
                            Cancel Subscription
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-slate-600 mb-4">You are currently using the free tier with daily limits.</p>
                        <button
                            onClick={() => router.push('/pricing')}
                            className="w-full py-4 px-6 rounded-2xl font-bold text-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                        >
                            Upgrade to Pro
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Account Actions</h2>
                <button
                    onClick={handleLogout}
                    className="flex items-center text-slate-600 font-bold hover:text-red-500 transition-colors"
                >
                    <LogOut className="w-5 h-5 mr-3" />
                    Sign Out
                </button>
            </div>
        </div>
    );
}
