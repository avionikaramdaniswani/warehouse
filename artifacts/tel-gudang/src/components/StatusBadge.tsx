import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  let colorClass = '';

  switch (status) {
    case 'Normal':
    case 'Aktif':
      colorClass = 'bg-green-500 hover:bg-green-600 text-white';
      break;
    case 'Menipis':
      colorClass = 'bg-amber-500 hover:bg-amber-600 text-white';
      break;
    case 'Habis':
    case 'Admin':
      colorClass = 'bg-red-500 hover:bg-red-600 text-white';
      break;
    case 'Nonaktif':
      colorClass = 'bg-gray-400 hover:bg-gray-500 text-white';
      break;
    case 'Staff Gudang':
      colorClass = 'bg-blue-500 hover:bg-blue-600 text-white';
      break;
    default:
      colorClass = 'bg-gray-200 text-gray-800';
  }

  return (
    <Badge className={`${colorClass} border-none font-medium`}>
      {status}
    </Badge>
  );
}