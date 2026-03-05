import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import './Layout.css'

function Layout() {
    const { user, logout } = useAuthStore()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <div className="layout">
            <header className="layout-header">
                <div className="header-left">
                    <NavLink to="/dashboard" className="logo">
                        <span className="logo-icon">📸</span>
                        <span className="logo-text">Cirqapture</span>
                    </NavLink>
                </div>

                <nav className="header-nav">
                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) =>
                            `nav-link ${isActive ? 'active' : ''}`
                        }
                    >
                        My Guides
                    </NavLink>
                </nav>

                <div className="header-right">
                    <div className="user-menu">
                        <div className="user-avatar">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <span className="user-name">{user?.name}</span>
                        <button onClick={handleLogout} className="btn btn-ghost btn-sm">
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            <main className="layout-content">
                <Outlet />
            </main>
        </div>
    )
}

export default Layout
