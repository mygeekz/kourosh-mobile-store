export default function KpiDefinitionNote(_props: {
  title?: string;
  description?: string;
  items: Array<{
    label: string;
    description: string;
    role?: 'master' | 'recognized' | 'operational' | 'collection' | 'audit';
  }>;
}) {
  return null;
}
