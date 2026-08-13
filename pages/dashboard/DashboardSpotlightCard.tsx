import DashboardMetric from './DashboardMetric';
import Skeleton from '../../components/ui/Skeleton';

type SpotlightTone = 'sky' | 'emerald' | 'amber' | 'violet' | 'rose' | 'neutral';

type DashboardSpotlightCardProps = {
  title: string;
  value: string;
  caption: string;
  icon: string;
  tone?: SpotlightTone;
  loading?: boolean;
  emphasis?: 'none' | 'soft' | 'strong';
};

export default function DashboardSpotlightCard({
  title,
  value,
  caption,
  icon,
  tone = 'neutral',
  loading = false,
  emphasis = 'none',
}: DashboardSpotlightCardProps) {
  return (
    <article className="app-dashboard-spotlight-card" data-tone={tone} data-emphasis={emphasis}>
      <DashboardMetric
        label={title}
        icon={icon}
        tone={tone}
        value={loading ? <Skeleton tone="info" className="h-5 w-28" rounded="lg" /> : value}
        meta={caption}
      />
    </article>
  );
}
