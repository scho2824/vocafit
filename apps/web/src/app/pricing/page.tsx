'use client';

import { PortOneCheckout } from '@/components/payment/PortOneCheckout';
import { useSubscription } from '@/hooks/useSubscription';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
    const { data: subscription, isLoading } = useSubscription();
    const router = useRouter();

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center">Loading plans...</div>;
    }

    const isPro = subscription?.status === 'active';

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-16">
                <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl">
                    Accelerate your English journey.
                </h1>
                <p className="mt-4 text-xl text-slate-600">
                    Choose the plan that fits your pace. Upgrade to Pro for unlimited AI-powered learning.
                </p>
            </div>

            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">

                {/* Basic Tier */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Basic Learner</h2>
                    <p className="text-slate-500 mb-6">Perfect for maintaining a steady daily habit.</p>
                    <div className="text-4xl font-black text-slate-900 mb-8">
                        Free forever
                    </div>

                    <ul className="space-y-4 mb-8">
                        <li className="flex items-center text-slate-700">
                            <span className="text-green-500 mr-2">✓</span> 3 new vocabulary words per day
                        </li>
                        <li className="flex items-center text-slate-700">
                            <span className="text-green-500 mr-2">✓</span> 3 AI sentence evaluations per day
                        </li>
                        <li className="flex items-center text-slate-700">
                            <span className="text-green-500 mr-2">✓</span> View previously learned vocabulary
                        </li>
                    </ul>

                    <button
                        onClick={() => router.push('/training')}
                        className="w-full py-4 px-6 rounded-2xl font-bold text-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                    >
                        Start Learning
                    </button>
                </div>

                {/* Pro Tier */}
                <div className="bg-indigo-600 rounded-3xl p-8 shadow-xl relative overflow-hidden text-white">
                    <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 font-bold px-4 py-1 rounded-bl-xl text-sm">
                        Most Popular
                    </div>
                    <h2 className="text-2xl font-bold mb-2">VocaFit Pro</h2>
                    <p className="text-indigo-200 mb-6">Unlimited access to our AI coaching engine.</p>
                    <div className="text-4xl font-black mb-8 flex items-baseline">
                        ₩4,900
                        <span className="text-lg text-indigo-200 ml-2 font-medium">/ month</span>
                    </div>

                    <ul className="space-y-4 mb-8">
                        <li className="flex items-center">
                            <span className="text-green-300 mr-2">✓</span> Unlimited daily vocabulary missions
                        </li>
                        <li className="flex items-center">
                            <span className="text-green-300 mr-2">✓</span> Unlimited AI sentence evaluations and retries
                        </li>
                        <li className="flex items-center">
                            <span className="text-green-300 mr-2">✓</span> Unlimited AI-generated contextual variations
                        </li>
                        <li className="flex items-center">
                            <span className="text-green-300 mr-2">✓</span> Advanced spaced repetition tracking
                        </li>
                    </ul>

                    {isPro ? (
                        <button className="w-full py-4 px-6 rounded-2xl font-bold text-lg text-white bg-indigo-800 cursor-default opacity-80">
                            Current Plan
                        </button>
                    ) : (
                        <PortOneCheckout planId="premium_monthly" amount={4900} planName="Pro Monthly" />
                    )}
                </div>

            </div>
        </div>
    );
}
