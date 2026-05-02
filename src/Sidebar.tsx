import React, { useRef } from 'react';
import type { AppState } from './types';
import { OVERLAYS } from './types';

interface SidebarProps {
  state: AppState;
  onImageUpload: (file: File) => void;
  onDetectSilhouette: () => void;
  onComplexityChange: (value: number) => void;
  onPrismScaleChange: (value: number) => void;
  onRegeneratePolygon: () => void;
  onToggleOverlay: (id: string) => void;
  onExport: () => void;
}

const s: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '300px',
    minWidth: '300px',
    height: '100vh',
    background: '#111111',
    borderRight: '0.5px solid #222222',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '"IBM Plex Mono", monospace',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 16px',
    height: '48px',
    minHeight: '48px',
    borderBottom: '0.5px solid #222222',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: '11px',
    color: '#CCCCCC',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  headerStatus: {
    fontSize: '9px',
    color: '#555555',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  section: {
    borderBottom: '0.5px solid #222222',
    padding: '14px 16px',
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: '8px',
    color: '#555555',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    marginBottom: '12px',
  },
  label: {
    fontSize: '8px',
    color: '#555555',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: '6px',
  },
  value: {
    fontSize: '9px',
    color: '#CCCCCC',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  btn: {
    display: 'block',
    width: '100%',
    background: 'transparent',
    border: '0.5px solid #333333',
    color: '#CCCCCC',
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: '9px',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    padding: '9px 12px',
    cursor: 'pointer',
    textAlign: 'left',
    marginBottom: '8px',
    borderRadius: 0,
    transition: 'border-color 0.15s, color 0.15s',
  },
  btnDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
  },
  btnPrimary: {
    borderColor: '#EEFF00',
    color: '#EEFF00',
  },
  row: {
    marginBottom: '12px',
  },
  slider: {
    width: '100%',
    marginTop: '6px',
    marginBottom: '4px',
    accentColor: '#EEFF00',
    cursor: 'pointer',
  },
  filename: {
    fontSize: '9px',
    color: '#CCCCCC',
    letterSpacing: '0.04em',
    marginTop: '6px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  info: {
    fontSize: '9px',
    color: '#EEFF00',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    marginTop: '8px',
  },
};

function ButtonEl({
  children,
  onClick,
  disabled,
  primary,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      style={{
        ...s.btn,
        ...(disabled ? s.btnDisabled : {}),
        ...(primary && !disabled ? s.btnPrimary : {}),
      }}
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function Sidebar({
  state,
  onImageUpload,
  onDetectSilhouette,
  onComplexityChange,
  onPrismScaleChange,
  onRegeneratePolygon,
  onToggleOverlay,
  onExport,
}: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImageUpload(file);
    e.target.value = '';
  };

  const isDetecting = state.status === 'DETECTING...';
  const hasImage = !!state.imageDataUrl;
  const hasPolygon = !!state.polygonPoints;

  const vertexCount = state.polygonPoints?.length ?? 0;

  return (
    <div style={s.sidebar}>
      {/* HEADER */}
      <div style={s.header}>
        <span style={s.headerTitle}>Prismatic — V1</span>
        <span style={s.headerStatus}>{state.status}</span>
      </div>

      {/* § 00 — IMAGE */}
      <div style={s.section}>
        <div style={s.sectionTitle}>§ 00 — Image</div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <ButtonEl onClick={() => fileInputRef.current?.click()}>
          {hasImage ? 'Replace Image' : 'Upload Image'}
        </ButtonEl>

        {state.imageFile && (
          <div style={s.filename}>{state.imageFile.name}</div>
        )}

        <div style={{ marginTop: '12px' }}>
          <ButtonEl
            onClick={onDetectSilhouette}
            disabled={!hasImage || isDetecting}
            primary={hasImage && !isDetecting}
          >
            {isDetecting ? 'Detecting — Please Wait' : 'Detect Silhouette'}
          </ButtonEl>
        </div>

        {state.rawHullPoints && (
          <div style={s.info}>Nodes — {vertexCount} Vertices Detected</div>
        )}
      </div>

      {/* § 01 — PRISMATIC SHAPE */}
      <div style={s.section}>
        <div style={s.sectionTitle}>§ 01 — Prismatic Shape</div>

        <div style={s.row}>
          <label style={s.label}>Polygon Complexity</label>
          <input
            type="range"
            min={6}
            max={13}
            step={1}
            value={state.polygonComplexity}
            style={s.slider as React.CSSProperties}
            onChange={e => onComplexityChange(Number(e.target.value))}
            disabled={!hasPolygon}
          />
          <div style={{ ...s.value, opacity: hasPolygon ? 1 : 0.3 }}>
            {vertexCount} vertices
          </div>
        </div>

        <div style={s.row}>
          <label style={s.label}>Prism Scale</label>
          <input
            type="range"
            min={2.0}
            max={6.0}
            step={0.1}
            value={state.prismScale}
            style={s.slider as React.CSSProperties}
            onChange={e => onPrismScaleChange(Number(e.target.value))}
            disabled={!hasPolygon}
          />
          <div style={{ ...s.value, opacity: hasPolygon ? 1 : 0.3 }}>
            {state.prismScale.toFixed(2)}×
          </div>
        </div>

        <ButtonEl
          onClick={onRegeneratePolygon}
          disabled={!hasPolygon || isDetecting}
        >
          Regenerate Polygon
        </ButtonEl>
      </div>

      {/* § 02 — OVERLAYS */}
      <div style={s.section}>
        <div style={s.sectionTitle}>§ 02 — Overlays</div>
        {OVERLAYS.map(overlay => {
          const isOn = state.activeOverlays.includes(overlay.id);
          return (
            <div
              key={overlay.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <span style={{ ...s.value, opacity: isOn ? 1 : 0.45 }}>
                {overlay.label}
              </span>
              <button
                onClick={() => onToggleOverlay(overlay.id)}
                style={{
                  background: 'transparent',
                  border: `0.5px solid ${isOn ? '#EEFF00' : '#333333'}`,
                  color: isOn ? '#EEFF00' : '#555555',
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: '8px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  cursor: 'pointer',
                  borderRadius: 0,
                  minWidth: '36px',
                  textAlign: 'center',
                }}
              >
                {isOn ? 'ON' : 'OFF'}
              </button>
            </div>
          );
        })}
      </div>

      {/* § 03 — EXPORT */}
      <div style={s.section}>
        <div style={s.sectionTitle}>§ 03 — Export</div>
        <ButtonEl
          onClick={onExport}
          disabled={!hasImage}
          primary={hasImage}
        >
          Export PNG
        </ButtonEl>
        <div style={{ fontSize: '8px', color: '#555', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          1080 × 1350px — Full Resolution
        </div>
      </div>
    </div>
  );
}
