import axios from 'axios';

function buildCalendarBaseUrl(): string {
    const baseUrl = process.env.CALENDAR_API_BASE_URL ?? process.env.CALENDAR_API_URL ?? 'http://localhost:3000';
    const port = process.env.CALENDAR_API_PORT;

    if (!port || /^https?:\/\//.test(baseUrl) && /:\d+(\/|$)/.test(baseUrl)) {
        return baseUrl;
    }

    const normalized = /^https?:\/\//.test(baseUrl) ? baseUrl : `http://${baseUrl}`;
    return `${normalized}:${port}`;
}

const calendarClient = axios.create({
    baseURL: buildCalendarBaseUrl(),
    timeout: 5000,
});

export default calendarClient;
