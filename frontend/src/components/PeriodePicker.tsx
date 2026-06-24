import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PeriodePickerProps {
  dateFrom: string;
  dateTo: string;
  onChange: (from: string, to: string) => void;
  className?: string;
}

const toISO = (d: Date) => d.toISOString().slice(0, 10);

const presets = [
  {
    label: 'Hari Ini',
    apply: (): { from: Date; to: Date } => {
      const t = new Date(); t.setHours(0, 0, 0, 0);
      return { from: t, to: t };
    },
  },
  {
    label: 'Kemarin',
    apply: (): { from: Date; to: Date } => {
      const t = new Date(); t.setDate(t.getDate() - 1); t.setHours(0, 0, 0, 0);
      return { from: t, to: t };
    },
  },
  {
    label: '7 Hari Terakhir',
    apply: (): { from: Date; to: Date } => {
      const to = new Date(); to.setHours(0, 0, 0, 0);
      const from = new Date(to); from.setDate(from.getDate() - 6);
      return { from, to };
    },
  },
  {
    label: 'Bulan Ini',
    apply: (): { from: Date; to: Date } => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(); to.setHours(0, 0, 0, 0);
      return { from, to };
    },
  },
  {
    label: 'Bulan Lalu',
    apply: (): { from: Date; to: Date } => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      to.setHours(0, 0, 0, 0);
      return { from, to };
    },
  },
  {
    label: '3 Bulan Terakhir',
    apply: (): { from: Date; to: Date } => {
      const to = new Date(); to.setHours(0, 0, 0, 0);
      const from = new Date(to);
      from.setMonth(from.getMonth() - 3); from.setDate(from.getDate() + 1);
      return { from, to };
    },
  },
  {
    label: 'Tahun Ini',
    apply: (): { from: Date; to: Date } => {
      const from = new Date(new Date().getFullYear(), 0, 1);
      const to = new Date(); to.setHours(0, 0, 0, 0);
      return { from, to };
    },
  },
];

const fmtLabel = (from: string, to: string) => {
  if (!from || !to) return 'Pilih Periode';
  const fd = new Date(from + 'T00:00:00');
  const td = new Date(to + 'T00:00:00');
  const optsFull: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  const optsShortDay: Intl.DateTimeFormatOptions = { day: 'numeric' };
  const optsMonthYear: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };
  if (from === to) return fd.toLocaleDateString('id-ID', optsFull);
  if (fd.getFullYear() === td.getFullYear() && fd.getMonth() === td.getMonth()) {
    return `${fd.toLocaleDateString('id-ID', optsShortDay)} – ${td.toLocaleDateString('id-ID', optsFull)}`;
  }
  if (fd.getFullYear() === td.getFullYear()) {
    return `${fd.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${td.toLocaleDateString('id-ID', optsFull)}`;
  }
  return `${fd.toLocaleDateString('id-ID', optsFull)} – ${td.toLocaleDateString('id-ID', optsFull)}`;
};

const matchesPreset = (from: string, to: string, preset: typeof presets[number]) => {
  try {
    const p = preset.apply();
    return toISO(p.from) === from && toISO(p.to) === to;
  } catch { return false; }
};

export function PeriodePicker({ dateFrom, dateTo, onChange, className }: PeriodePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(
    dateFrom && dateTo
      ? { from: new Date(dateFrom + 'T00:00:00'), to: new Date(dateTo + 'T00:00:00') }
      : undefined
  );

  const applyPreset = (preset: typeof presets[number]) => {
    const { from, to } = preset.apply();
    onChange(toISO(from), toISO(to));
    setDraft({ from, to });
    setOpen(false);
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    setDraft(range);
    if (range?.from && range?.to) {
      onChange(toISO(range.from), toISO(range.to));
      setOpen(false);
    }
  };

  const handleApply = () => {
    if (draft?.from) {
      const from = toISO(draft.from);
      const to = draft.to ? toISO(draft.to) : from;
      onChange(from, to);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'bg-white justify-between font-normal gap-2 min-w-[220px]',
            !dateFrom && 'text-muted-foreground',
            className
          )}
        >
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm">{fmtLabel(dateFrom, dateTo)}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-auto p-0 shadow-lg border"
        align="start"
        sideOffset={6}
      >
        <div className="flex flex-col sm:flex-row">
          {/* Presets sidebar */}
          <div className="border-b sm:border-b-0 sm:border-r p-3 sm:w-40 flex flex-row sm:flex-col gap-1.5 overflow-x-auto sm:overflow-x-visible">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold px-2 hidden sm:block mb-1">
              Periode Cepat
            </p>
            {presets.map((preset) => {
              const active = matchesPreset(dateFrom, dateTo, preset);
              return (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className={cn(
                    'text-sm whitespace-nowrap rounded-md px-3 py-1.5 text-left transition-colors w-full',
                    active
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'hover:bg-accent text-foreground'
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Calendar */}
          <div className="p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold px-1 mb-2">
              Pilih Rentang Tanggal
            </p>
            <Calendar
              mode="range"
              selected={draft}
              onSelect={handleCalendarSelect}
              numberOfMonths={1}
              disabled={{ after: new Date() }}
              toDate={new Date()}
              captionLayout="label"
            />
            {/* Draft info + apply */}
            <div className="mt-2 pt-2 border-t flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {draft?.from && draft?.to
                  ? fmtLabel(toISO(draft.from), toISO(draft.to))
                  : draft?.from
                  ? `Mulai: ${draft.from.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                  : 'Klik mulai, lalu akhir periode'}
              </p>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={!draft?.from}
                className="h-7 text-xs px-3"
              >
                Terapkan
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
