import React, { useState } from 'react'
import MethodologyModal from './MethodologyModal.jsx'

export default function Header() {
  const [methodologyOpen, setMethodologyOpen] = useState(false)

  return (
    <header className="app-header">
      <div className="app-header-left">
        <img
          className="app-header-logo"
          src="/favicon.svg"
          alt=""
          width={48}
          height={48}
        />
        <div>
          <h1 className="app-header-title">
            Firm(ish) — How Close Can Solar + Storage Get to Firm?
          </h1>
          <p className="app-header-subtitle">
            Solve for the cheapest solar + battery build that holds a 24/7 capacity target at your chosen reliability threshold — across 19 years of hourly insolation data.
          </p>
        </div>
      </div>
      <button
        className="app-header-method-btn"
        onClick={() => setMethodologyOpen(true)}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
          e.currentTarget.style.color = '#e2e8f0'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
          e.currentTarget.style.color = '#94a3b8'
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>ⓘ</span>
        <span className="app-header-method-label">Methodology</span>
      </button>

      <MethodologyModal open={methodologyOpen} onClose={() => setMethodologyOpen(false)} />

      <style>{`
        .app-header {
          border-bottom: 1px solid rgba(255,255,255,0.08);
          padding: 14px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(10,22,40,0.8);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .app-header-left {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }
        .app-header-logo {
          flex-shrink: 0;
          display: block;
        }
        .app-header-title {
          font-family: "Space Grotesk", sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: #e2e8f0;
          margin: 0;
          letter-spacing: -0.02em;
        }
        .app-header-subtitle {
          margin: 2px 0 0;
          font-size: 12px;
          color: #94a3b8;
          font-family: "DM Sans", sans-serif;
        }
        .app-header-method-btn {
          font-family: "DM Sans", sans-serif;
          font-size: 12px;
          color: #94a3b8;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          padding: 6px 12px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s;
          flex-shrink: 0;
        }

        @media (max-width: 600px) {
          .app-header { padding: 10px 14px; }
          .app-header-left { gap: 10px; }
          .app-header-logo { width: 32px; height: 32px; }
          .app-header-title { font-size: 15px; }
          .app-header-subtitle { display: none; }
          .app-header-method-btn { padding: 6px 8px; gap: 0; }
          .app-header-method-label { display: none; }
        }
      `}</style>
    </header>
  )
}
