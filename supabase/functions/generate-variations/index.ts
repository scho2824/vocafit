import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const API_KEY = Deno.env.get('OPENAI_API_KEY')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { target_word, difficulty_level = 'beginner' } = await req.json()

        if (!target_word || typeof target_word !== 'string') {
            return new Response(JSON.stringify({ error: 'target_word is required and must be a string' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Sanitize: Allow only alphabetic characters and spaces, max 50 chars
        const sanitizedWord = target_word.trim();
        if (!/^[a-zA-Z\s]+$/.test(sanitizedWord) || sanitizedWord.length > 50) {
            return new Response(JSON.stringify({ error: 'Invalid target_word format' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        if (!API_KEY) {
            throw new Error('OPENAI_API_KEY is not set')
        }

        const systemPrompt = `You are a helpful, expert English teacher for Korean children (ages 7-12).
The user will provide a target vocabulary word.
You must generate 3 unique, engaging, and kid-friendly example sentences using that word.
The sentences must have a Lexile measure appropriate for 7-12 year old beginners.
Return the output ONLY as a JSON array of objects, with each object having "sentence" (English) and "translation" (Korean).
Do NOT include any markdown formatting like \`\`\`json. Just the raw JSON array.
Format: [{"sentence": "...", "translation": "..."}, ...]`

        const userPrompt = `Target Word: <target_word>${sanitizedWord}</target_word>`

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                stream: true,
                temperature: 0.7,
            }),
        })

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
        }

        // Set up SSE streaming response
        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body?.getReader()
                if (!reader) {
                    controller.close()
                    return
                }

                const decoder = new TextDecoder()
                const encoder = new TextEncoder()

                let buffer = '';

                try {
                    while (true) {
                        const { done, value } = await reader.read()
                        if (done) break

                        const chunk = decoder.decode(value, { stream: true })
                        const lines = chunk.split('\n').filter(line => line.trim() !== '')

                        for (const line of lines) {
                            if (line === 'data: [DONE]') {
                                controller.close()
                                return
                            }

                            if (line.startsWith('data: ')) {
                                const dataStr = line.replace('data: ', '')
                                try {
                                    const data = JSON.parse(dataStr)
                                    const content = data.choices[0]?.delta?.content || ''
                                    if (content) {
                                        // Send the raw token to the client. The client will accumulate and parse it.
                                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: content })}\n\n`))
                                    }
                                } catch (e) {
                                    console.error('Error parsing stream chunk:', e, 'Raw string:', dataStr)
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Stream processing error:', error)
                    // Emitting a final error chunk if the stream breaks midway
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`))
                    controller.close()
                }
            }
        })

        return new Response(stream, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        })

    } catch (error: any) {
        console.error('Edge Function Error:', error.message)

        // Fallback: Safe Default Sentences
        // If the entire function crashes or OpenAI is down, returning a safe default allows the UI to not crash entirely.
        const fallbackResponse = [
            {
                sentence: "This is a sentence to practice the new word.",
                translation: "이것은 새로운 단어를 연습하기 위한 문장입니다."
            }
        ]

        // Returning fallback as a static SSE piece just to not break the client's SSE parser
        return new Response(`data: ${JSON.stringify({ error: 'Failed to generate', fallback: fallbackResponse })}\n\n`, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'text/event-stream',
            },
        })
    }
})
