import logo from '@/assets/logo.png';

/**
 * Paywall screen shown when a user's org subscription has expired.
 * No navigation links — intentionally a dead-end to prompt support contact.
 */
export default function Paywall() {
    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #f5f7fa 0%, #e8edf5 100%)',
                padding: '2rem',
                fontFamily:
                    "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
            }}
        >
            {/* Logo */}
            <img
                src={logo}
                alt="LCPL Logo"
                style={{ width: '80px', height: 'auto', marginBottom: '2rem', opacity: 0.9 }}
            />

            {/* Icon */}
            <div
                style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: '#fff3cd',
                    border: '2px solid #ffc107',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.5rem',
                    fontSize: '32px',
                }}
            >
                🔒
            </div>

            {/* Heading */}
            <h1
                style={{
                    fontSize: '1.75rem',
                    fontWeight: 700,
                    color: '#1a1a2e',
                    marginBottom: '1rem',
                    textAlign: 'center',
                    letterSpacing: '-0.5px',
                }}
            >
                Your subscription has expired
            </h1>

            {/* Subtext */}
            <p
                style={{
                    fontSize: '1rem',
                    color: '#555',
                    textAlign: 'center',
                    maxWidth: '420px',
                    lineHeight: 1.65,
                    margin: 0,
                }}
            >
                Please contact your administrator or reach out to{' '}
                <strong>LCPL support</strong> to renew your subscription and regain
                access.
            </p>
        </div>
    );
}
