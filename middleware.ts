import { next } from '@vercel/edge';

export const config = {
    matcher: '/',
};

export default function middleware(request: Request) {
    const authorizationHeader = request.headers.get('authorization');

    if (authorizationHeader) {
        const basicAuth = authorizationHeader.split(' ')[1];
        const [user, pwd] = atob(basicAuth).split(':');

        if (pwd === process.env.BASIC_AUTH_PASSWORD) {
            return next();
        }
    }

    return new Response('Basic Auth required', {
        status: 401,
        headers: {
            'WWW-Authenticate': 'Basic realm="Secure Area"',
        },
    });
}
