import { BetaAnalyticsDataClient } from '@google-analytics/data';

/**
 * SECURE GA4 CLIENT CONFIGURATION
 * This file runs ONLY on the server.
 */

function getGa4Credentials() {
    const propertyId = process.env.GA_PROPERTY_ID || process.env.GOOGLE_GA4_PROPERTY_ID;
    const clientEmail = process.env.GA_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
    const rawKey = process.env.GA_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;
    const privateKey = rawKey ? rawKey.replace(/\\n/g, '\n') : undefined;

    return { propertyId, clientEmail, privateKey };
}

function getAnalyticsClient() {
    const { propertyId, clientEmail, privateKey } = getGa4Credentials();

    if (!propertyId || !clientEmail || !privateKey) {
        const missing = [];
        if (!propertyId) missing.push('GA_PROPERTY_ID / GOOGLE_GA4_PROPERTY_ID');
        if (!clientEmail) missing.push('GA_CLIENT_EMAIL / GOOGLE_CLIENT_EMAIL');
        if (!privateKey) missing.push('GA_PRIVATE_KEY / GOOGLE_PRIVATE_KEY');

        throw new Error(`GA4 credentials missing: ${missing.join(', ')}`);
    }

    return {
        client: new BetaAnalyticsDataClient({
            credentials: {
                client_email: clientEmail,
                private_key: privateKey,
            },
        }),
        propertyId,
    };
}

export async function runGa4Report(options: {
    dateRange: string;
    metrics: string[];
    dimensions?: string[];
}) {
    const { client, propertyId } = getAnalyticsClient();
    const [response] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: options.dateRange, endDate: 'today' }],
        dimensions: options.dimensions?.map(name => ({ name })),
        metrics: options.metrics.map(name => ({ name })),
    });
    return response;
}

/**
 * Normalizes GA4 response into a simpler structure
 */
export function normalizeRows(response: any) {
    if (!response) return [];
    const headers = response.dimensionHeaders?.map((h: any) => h.name) || [];
    const metrics = response.metricHeaders?.map((h: any) => h.name) || [];

    return response.rows?.map((row: any) => {
        const obj: any = {};
        row.dimensionValues?.forEach((v: any, i: number) => {
            obj[headers[i]] = v.value;
        });
        row.metricValues?.forEach((v: any, i: number) => {
            obj[metrics[i]] = isNaN(Number(v.value)) ? v.value : Number(v.value);
        });
        return obj;
    }) || [];
}
