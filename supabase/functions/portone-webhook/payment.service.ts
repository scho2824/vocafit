export interface WebhookPayload {
    imp_uid: string;
    merchant_uid: string;
    status: string;
}

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export class PaymentService {
    private portoneApiSecret: string;
    private portoneApiKey: string;

    constructor() {
        this.portoneApiKey = Deno.env.get('PORTONE_API_KEY') || '';
        this.portoneApiSecret = Deno.env.get('PORTONE_API_SECRET') || '';
    }

    /**
     * Fetches an access token from PortOne REST API
     */
    public async getAccessToken(): Promise<string> {
        if (cachedToken && Date.now() < tokenExpiresAt) {
            return cachedToken as string;
        }

        const response = await fetch('https://api.iamport.kr/users/getToken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imp_key: this.portoneApiKey,
                imp_secret: this.portoneApiSecret,
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to get PortOne token: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.code !== 0) {
            throw new Error(`PortOne Token Error: ${result.message}`);
        }

        cachedToken = result.response.access_token;
        // PortOne tokens typically expire, use response.expired_at or default to 5 minutes
        tokenExpiresAt = result.response.expired_at ? (result.response.expired_at * 1000) : (Date.now() + 5 * 60 * 1000);

        return cachedToken;
    }

    /**
     * Verifies the payment details from PortOne
     */
    public async getPaymentData(imp_uid: string, token: string): Promise<any> {
        const response = await fetch(`https://api.iamport.kr/payments/${imp_uid}`, {
            method: 'GET',
            headers: { Authorization: token },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch payment data: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.code !== 0) {
            throw new Error(`PortOne Payment Data Error: ${result.message}`);
        }

        return result.response;
    }
}
