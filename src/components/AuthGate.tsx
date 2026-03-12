'use client';

import { useAuth } from 'react-oidc-context';
import Chatbot from './Chatbot';
import styles from './AuthGate.module.css';

export default function AuthGate() {
    const auth = useAuth();

    if (auth.isLoading) {
        return (
            <div className={styles.centerScreen}>
                <div className={styles.spinner} />
                <p className={styles.loadingText}>Connecting to MeO…</p>
            </div>
        );
    }

    if (auth.error) {
        return (
            <div className={styles.centerScreen}>
                <p className={styles.errorText}>⚠️ Authentication error: {auth.error.message}</p>
                <button className={styles.primaryBtn} onClick={() => auth.signinRedirect()}>
                    Try again
                </button>
            </div>
        );
    }

    if (auth.isAuthenticated) {
        return <Chatbot />;
    }

    // ── Not authenticated → show branded login page ──
    return (
        <div className={styles.loginPage}>
            <div className={styles.loginCard}>
                {/* Logo */}
                <div className={styles.logoRing}>
                    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.logoSvg}>
                        <circle cx="24" cy="24" r="22" stroke="#10a37f" strokeWidth="2.5" />
                        <path d="M14 30 L19 18 L24 26 L29 18 L34 30" stroke="#10a37f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                </div>

                <h1 className={styles.title}>Welcome to MeO</h1>
                <p className={styles.subtitle}>Your personal metabolic health AI assistant.<br />Sign in to continue.</p>

                <button
                    id="sign-in-btn"
                    className={styles.primaryBtn}
                    onClick={() => auth.signinRedirect()}
                >
                    Sign in with MeO Account
                </button>
            </div>

            <p className={styles.footer}>
                MeO uses secure AWS Cognito authentication to protect your data.
            </p>
        </div>
    );
}
