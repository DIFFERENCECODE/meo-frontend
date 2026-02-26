'use client';

import { AuthProvider as OIDCAuthProvider } from 'react-oidc-context';
import { ReactNode } from 'react';

const cognitoAuthConfig = {
    authority: 'https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_9Zg2hxLTI',
    client_id: '4qsgmdorsa5dj0b974quqg47ep',
    redirect_uri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    response_type: 'code',
    scope: 'phone openid email',
    onSigninCallback: () => {
        // Remove the auth code from the URL after login
        window.history.replaceState({}, document.title, window.location.pathname);
    },
};

export default function AuthProvider({ children }: { children: ReactNode }) {
    return (
        <OIDCAuthProvider {...cognitoAuthConfig}>
            {children}
        </OIDCAuthProvider>
    );
}
