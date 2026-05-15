'use client';

import { ProviderTrustBadge } from './provider-trust-badge';

type MockTrustTone = 'healthy' | 'warning';

type TrustSignal = {
  id: string;
  label: string;
  detail: string;
  tone: MockTrustTone;
};

type OperatorHeadline = {
  tone: MockTrustTone;
  title: string;
  detail: string;
};

const mapTone = (tone: MockTrustTone) => (tone === 'healthy' ? 'emerald' : 'amber');

export function ProviderTrustStack({
  headline,
  signals,
  title = 'Trust signals',
  className = 'mt-4',
  columnsClassName = 'grid gap-3 md:grid-cols-2',
}: {
  headline?: OperatorHeadline | null;
  signals?: TrustSignal[] | null;
  title?: string;
  className?: string;
  columnsClassName?: string;
}) {
  if (!headline && (!signals || signals.length === 0)) return null;

  return (
    <div className={className}>
      {headline ? (
        <ProviderTrustBadge
          eyebrow="Operator headline"
          label={headline.title}
          detail={headline.detail}
          tone={mapTone(headline.tone)}
        />
      ) : null}

      {signals?.length ? (
        <div className={headline ? 'mt-3' : ''}>
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{title}</p>
          <div className={`mt-3 ${columnsClassName}`}>
            {signals.map((signal) => (
              <ProviderTrustBadge
                key={signal.id}
                label={signal.label}
                detail={signal.detail}
                tone={mapTone(signal.tone)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
