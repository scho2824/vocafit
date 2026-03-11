import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export interface Variation {
    sentence: string;
    translation: string;
}

export function useVariations() {
    const [variations, setVariations] = useState<Variation[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [isComplete, setIsComplete] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const abort = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    const generateVariations = useCallback(async (target_word: string) => {
        setIsLoading(true);
        setError(null);
        setIsComplete(false);
        setVariations([]);

        abort();
        abortControllerRef.current = new AbortController();

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-variations`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify({ target_word, difficulty_level: 'beginner' }),
                    signal: abortControllerRef.current.signal,
                }
            );

            if (!response.ok) {
                let errorDetails = '';
                try {
                    const text = await response.text();
                    errorDetails = text;
                } catch (e) {
                    errorDetails = 'No response body';
                }
                throw new Error(`Failed to generate variations: Status ${response.status} - ${errorDetails}`);
            }

            if (!response.body) {
                throw new Error('ReadableStream not supported in this browser.');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let accumulatedJson = '';
            let fallbackFired = false;

            let bracketDepth = 0;
            let currentObjString = '';
            let inString = false;
            let escapeNext = false;
            const liveVariations: Variation[] = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.replace('data: ', '');

                        try {
                            const parsed = JSON.parse(dataStr);

                            if (parsed.fallback) {
                                setVariations(parsed.fallback);
                                fallbackFired = true;
                                break;
                            }

                            if (parsed.token) {
                                accumulatedJson += parsed.token;

                                for (let i = 0; i < parsed.token.length; i++) {
                                    const char = parsed.token[i];

                                    if (escapeNext) {
                                        if (bracketDepth > 0) currentObjString += char;
                                        escapeNext = false;
                                        continue;
                                    }
                                    if (char === '\\') {
                                        escapeNext = true;
                                        if (bracketDepth > 0) currentObjString += char;
                                        continue;
                                    }
                                    if (char === '"') {
                                        inString = !inString;
                                        if (bracketDepth > 0) currentObjString += char;
                                        continue;
                                    }

                                    if (!inString) {
                                        if (char === '{') {
                                            bracketDepth++;
                                            if (bracketDepth === 1) {
                                                currentObjString = char;
                                                continue;
                                            }
                                        }
                                        if (bracketDepth > 0) {
                                            currentObjString += char;
                                        }
                                        if (char === '}') {
                                            bracketDepth--;
                                            if (bracketDepth === 0) {
                                                try {
                                                    const newObj = JSON.parse(currentObjString);
                                                    if (newObj.sentence && newObj.translation) {
                                                        liveVariations.push(newObj);
                                                        setVariations([...liveVariations]);
                                                    }
                                                } catch (e) {
                                                    // Suppress partial parse errors naturally
                                                }
                                                currentObjString = '';
                                            }
                                        }
                                    } else {
                                        if (bracketDepth > 0) {
                                            currentObjString += char;
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            // Suppress stream parsing errors locally
                        }
                    }
                }

                if (fallbackFired) break;
            }

            if (!fallbackFired && liveVariations.length === 0 && accumulatedJson.length > 0) {
                const cleaned = accumulatedJson.replace(/```json/g, '').replace(/```/g, '').trim();
                try {
                    const finalArray = JSON.parse(cleaned);
                    if (Array.isArray(finalArray) && finalArray.length > 0) {
                        setVariations(finalArray);
                    }
                } catch (e) {
                    console.error("Failed to parse final JSON array, relying on progressive matches.", e);
                }
            }

        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.log('Stream aborted correctly');
                return;
            }
            if (!abortControllerRef.current?.signal.aborted) {
                setError(err);
                console.error("useVariations error:", err);
                setVariations([{
                    sentence: `It is important to remember the word ${target_word}.`,
                    translation: '단어를 기억하는 것은 중요합니다.'
                }]);
            }
        } finally {
            if (!abortControllerRef.current?.signal.aborted) {
                setIsLoading(false);
                setIsComplete(true);
            }
            abortControllerRef.current = null;
        }
    }, [abort]);

    return { generateVariations, variations, isLoading, error, isComplete, abort };
}
