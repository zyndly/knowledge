import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import './Auth.css'

function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const navigate = useNavigate()
    const setAuth = useAuthStore((state) => state.setAuth)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            const { user, accessToken } = await authApi.login(email, password)
            setAuth(user, accessToken)
            navigate('/dashboard')
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Login failed')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <div className="auth-logo">
                        <span className="logo-icon">📸</span>
                        <span className="logo-text">Cirqapture</span>
                    </div>
                    <h1>Welcome back</h1>
                    <p>Sign in to your account to continue</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {error && <div className="auth-error">{error}</div>}

                    <div className="form-group">
                        <label htmlFor="email" className="form-label">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            className="form-input"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password" className="form-label">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg auth-submit"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <p className="auth-footer">
                    Don't have an account?{' '}
                    <Link to="/register">Create one</Link>
                </p>
            </div>

            <div className="auth-decoration">
                <div className="decoration-content">
                    <h2>Create beautiful step-by-step guides</h2>
                    <p>
                        Record your screen, annotate screenshots, and share interactive
                        guides with your team.
                    </p>
                    <div className="decoration-features">
                        <div className="feature">
                            <span className="feature-icon">🎯</span>
                            <span>Click-based recording</span>
                        </div>
                        <div className="feature">
                            <span className="feature-icon">✏️</span>
                            <span>Rich annotations</span>
                        </div>
                        <div className="feature">
                            <span className="feature-icon">🔗</span>
                            <span>Easy sharing</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Login
