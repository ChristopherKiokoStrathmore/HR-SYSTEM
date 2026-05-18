import { LoginForm } from '@/components/modules/auth/login-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sign In — Sheer Logic HR' }

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* LEFT — brand panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1A2E5A 0%, #0D1B3E 100%)' }}
      >
        {/* Geometric decoration — top right */}
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-5"
          style={{
            background: 'radial-gradient(circle, #FFFFFF 0%, transparent 70%)',
            transform: 'translate(30%, -30%)',
          }}
        />
        {/* Geometric decoration — bottom left */}
        <div
          className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-5"
          style={{
            background: 'radial-gradient(circle, #F47920 0%, transparent 70%)',
            transform: 'translate(-30%, 30%)',
          }}
        />

        <div className="relative z-10 text-center max-w-sm">
          {/* Brand badge */}
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-8"
            style={{
              background: 'linear-gradient(135deg, #F47920, #E8650A)',
              boxShadow: '0 0 40px rgba(244,121,32,0.4)',
            }}
          >
            <span className="text-white font-black text-3xl">SL</span>
          </div>

          <h1 className="text-4xl font-black text-white tracking-tight">Sheer Logic HR</h1>
          <p className="text-white/50 mt-3 text-lg leading-relaxed">
            Your complete workforce management platform.
          </p>

          {/* Feature dots */}
          <div className="flex items-center justify-center gap-6 mt-10">
            {['Employees', 'Payroll', 'Leave', 'Analytics'].map((f) => (
              <div key={f} className="text-center">
                <div className="w-1.5 h-1.5 rounded-full bg-accent mx-auto mb-1" />
                <span className="text-white/40 text-xs">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT — form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo — hidden on lg */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #F47920, #E8650A)' }}
            >
              <span className="text-white font-black text-base">SL</span>
            </div>
            <div>
              <p className="font-bold text-text-primary">Sheer Logic HR</p>
              <p className="text-xs text-text-muted">Admin Dashboard</p>
            </div>
          </div>

          <h2 className="text-2xl font-black text-text-primary mb-1">Welcome back</h2>
          <p className="text-text-muted text-sm mb-8">Sign in to your dashboard</p>

          <div className="card">
            <LoginForm />
          </div>

          <p className="text-center text-text-muted text-xs mt-8">
            &copy; {new Date().getFullYear()} Sheer Logic Management Consultants Ltd.
          </p>
        </div>
      </div>
    </div>
  )
}
