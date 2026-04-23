import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import MethodologyModal from './MethodologyModal.jsx'

const DESKTOP_NOTICE_KEY = 'firmish-desktop-notice-dismissed'

export default function Header({ onExport, exporting = false }) {
  const [methodologyOpen, setMethodologyOpen] = useState(false)
  const [desktopNoticeOpen, setDesktopNoticeOpen] = useState(false)

  // On first visit from a narrow viewport, show a one-time "designed for
  // desktop" notice. Dismissed state is persisted per-device via localStorage.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const isNarrow = window.matchMedia('(max-width: 600px)').matches
    const dismissed = localStorage.getItem(DESKTOP_NOTICE_KEY) === '1'
    if (isNarrow && !dismissed) setDesktopNoticeOpen(true)
  }, [])

  const dismissDesktopNotice = () => {
    setDesktopNoticeOpen(false)
    try { localStorage.setItem(DESKTOP_NOTICE_KEY, '1') } catch (_) {}
  }

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
        <div className="app-header-textblock">
          <h1 className="app-header-title">
            Firm(ish) — How Close Can Solar + Storage Get to Firm?
          </h1>
          <p className="app-header-subtitle">
            Solve for the cheapest solar + battery build that holds a 24/7 capacity target at your chosen reliability threshold — across 19 years of hourly insolation data.
          </p>
        </div>
      </div>
      <div className="app-header-actions">
        {onExport && (
          <button
            className="app-header-action-btn"
            onClick={onExport}
            disabled={exporting}
            aria-label={exporting ? 'Generating PDF' : 'Export scenario'}
            title={exporting ? 'Generating PDF…' : 'Export scenario to PDF'}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>{exporting ? '⏳' : '⬇'}</span>
            <span className="app-header-action-label">
              {exporting ? 'Generating…' : 'Export'}
            </span>
          </button>
        )}
        <button
          className="app-header-action-btn"
          onClick={() => setMethodologyOpen(true)}
          aria-label="Methodology"
          title="Methodology"
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>ⓘ</span>
          <span className="app-header-action-label">Methodology</span>
        </button>
      </div>

      <MethodologyModal open={methodologyOpen} onClose={() => setMethodologyOpen(false)} />
      {desktopNoticeOpen && <DesktopNoticeModal onClose={dismissDesktopNotice} />}

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
          flex: 1;
        }
        .app-header-logo {
          flex-shrink: 0;
          display: block;
        }
        .app-header-textblock {
          min-width: 0;
          flex: 1;
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
        .app-header-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .app-header-action-btn {
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
        .app-header-action-btn:hover:not(:disabled) {
          background: rgba(255,255,255,0.07);
          color: #e2e8f0;
        }
        .app-header-action-btn:disabled {
          opacity: 0.6;
          cursor: progress;
        }

        @media (max-width: 600px) {
          .app-header { padding: 10px 14px; gap: 8px; }
          .app-header-left { gap: 10px; }
          .app-header-logo { width: 32px; height: 32px; align-self: flex-start; }
          .app-header-title { font-size: 15px; line-height: 1.2; }
          .app-header-subtitle { display: none; }
          .app-header-action-btn { padding: 6px 8px; gap: 0; align-self: flex-start; }
          .app-header-action-label { display: none; }
        }
      `}</style>
    </header>
  )
}

function DesktopNoticeModal({ onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return createPortal((
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Desktop recommended"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 8, 20, 0.7)',
        backdropFilter: 'blur(6px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0b1628',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10,
          maxWidth: 420,
          width: '100%',
          padding: '24px 22px 20px',
          color: '#e2e8f0',
          fontFamily: '"DM Sans", sans-serif',
        }}
      >
        <div style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontSize: 16,
          fontWeight: 700,
          color: '#e2e8f0',
          marginBottom: 8,
          letterSpacing: '-0.01em',
        }}>
          Heads up — desktop works best
        </div>
        <p style={{
          fontSize: 13,
          lineHeight: 1.5,
          color: '#94a3b8',
          margin: '0 0 18px',
        }}>
          Firm(ish) is designed for desktop use. The charts, input panel, and
          methodology notes are easier to read (and the solver runs without
          breaking a sweat) on a larger screen. Continue on mobile if you like;
          just know you're getting the pocket version.
        </p>
        <button
          onClick={onClose}
          style={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: 13,
            color: '#0b1628',
            background: '#fbbf24',
            border: 'none',
            borderRadius: 6,
            padding: '8px 16px',
            cursor: 'pointer',
            fontWeight: 600,
            width: '100%',
          }}
        >
          Got it
        </button>
      </div>
    </div>
  ), document.body)
}
