import { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Search,
  MapPin,
  Phone,
  ExternalLink,
  Info,
  Church,
  Plus,
  X,
  Facebook,
  Instagram,
  Twitter,
  Globe,
  Clock,
  User,
  Filter,
  ChevronDown,
  Building2,
  CalendarDays,
} from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface ProgramTime {
  day: string;
  time: string;
  name: string;
}

interface Church {
  id: string;
  name: string;
  denomination: string | null;
  city: string | null;
  region: string | null;
  pastor_name: string | null;
  phone: string | null;
  google_maps_link: string | null;
  logo_url: string | null;
  program_times: ProgramTime[] | null;
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
  website: string | null;
  is_approved: boolean;
  created_at: string;
}

const DENOMINATIONS = [
  'All',
  'Baptist',
  'Methodist',
  'Catholic',
  'Pentecostal',
  'Lutheran',
  'Anglican',
  'Presbyterian',
  'Non-Denominational',
  'Evangelical',
  'Adventist',
  'Apostolic',
  'Other',
];

const THEME = {
  purple: '#6B21A8',
  purpleLight: '#9333EA',
  purpleDark: '#4C1D95',
  gold: '#D4AF37',
  goldLight: '#F0D77B',
  goldDark: '#A8841A',
};

function ChurchLogo({ church, size = 'md' }: { church: Church; size?: 'sm' | 'md' | 'lg' }) {
  const dimensions = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-24 h-24',
  };
  const iconSize = {
    sm: 20,
    md: 28,
    lg: 48,
  };

  if (church.logo_url) {
    return (
      <img
        src={church.logo_url}
        alt={church.name}
        className={`${dimensions[size]} rounded-xl object-cover border-2`}
        style={{ borderColor: THEME.gold }}
      />
    );
  }

  return (
    <div
      className={`${dimensions[size]} rounded-xl flex items-center justify-center border-2`}
      style={{
        borderColor: THEME.gold,
        background: `linear-gradient(135deg, ${THEME.purpleDark}, ${THEME.purple})`,
      }}
    >
      <Church size={iconSize[size]} color={THEME.goldLight} />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden animate-pulse">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-3 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-200 rounded w-3/4" />
        </div>
        <div className="mt-4 flex gap-2">
          <div className="h-8 bg-gray-200 rounded-lg flex-1" />
          <div className="h-8 bg-gray-200 rounded-lg flex-1" />
          <div className="h-8 bg-gray-200 rounded-lg flex-1" />
        </div>
      </div>
    </div>
  );
}

function ChurchCard({
  church,
  onDetails,
}: {
  church: Church;
  onDetails: (church: Church) => void;
}) {
  const location = [church.city, church.region].filter(Boolean).join(', ');

  return (
    <div
      className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
      style={{ borderTop: `3px solid ${THEME.gold}` }}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <ChurchLogo church={church} size="md" />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-base leading-tight truncate group-hover:text-[#6B21A8] transition-colors">
              {church.name}
            </h3>
            {church.denomination && (
              <p className="text-xs font-medium mt-0.5" style={{ color: THEME.purpleLight }}>
                {church.denomination}
              </p>
            )}
            {location && (
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                <MapPin size={12} />
                <span className="truncate">{location}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          {church.pastor_name && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <User size={13} className="shrink-0" style={{ color: THEME.gold }} />
              <span className="truncate">{church.pastor_name}</span>
            </div>
          )}
          {church.program_times && church.program_times.length > 0 && (
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <Clock size={13} className="shrink-0 mt-0.5" style={{ color: THEME.gold }} />
              <div className="space-y-0.5">
                {church.program_times.slice(0, 2).map((p, i) => (
                  <div key={i} className="truncate">
                    <span className="font-medium">{p.day}</span> {p.time}
                    {p.name && <span className="text-gray-400"> — {p.name}</span>}
                  </div>
                ))}
                {church.program_times.length > 2 && (
                  <div className="text-gray-400 italic">+{church.program_times.length - 2} more</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          {church.phone && (
            <a
              href={`tel:${church.phone}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
              style={{ background: THEME.purple }}
            >
              <Phone size={13} />
              Call
            </a>
          )}
          {church.google_maps_link && (
            <a
              href={church.google_maps_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all hover:bg-opacity-10"
              style={{
                color: THEME.purple,
                background: `${THEME.purple}10`,
              }}
            >
              <MapPin size={13} />
              Map
            </a>
          )}
          <button
            onClick={() => onDetails(church)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
            style={{
              color: THEME.goldDark,
              background: `${THEME.gold}15`,
            }}
          >
            <Info size={13} />
            Details
          </button>
        </div>
      </div>
    </div>
  );
}

function ChurchDetailModal({
  church,
  onClose,
}: {
  church: Church | null;
  onClose: () => void;
}) {
  if (!church) return null;

  const location = [church.city, church.region].filter(Boolean).join(', ');
  const socials = [
    { url: church.facebook, icon: Facebook, label: 'Facebook', color: '#1877F2' },
    { url: church.instagram, icon: Instagram, label: 'Instagram', color: '#E4405F' },
    { url: church.twitter, icon: Twitter, label: 'Twitter', color: '#1DA1F2' },
    { url: church.website, icon: Globe, label: 'Website', color: THEME.purple },
  ].filter((s) => s.url);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ borderTop: `4px solid ${THEME.gold}` }}
      >
        {/* Header */}
        <div
          className="relative p-6"
          style={{
            background: `linear-gradient(135deg, ${THEME.purpleDark}, ${THEME.purple})`,
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X size={20} color="white" />
          </button>
          <div className="flex items-center gap-4 pr-10">
            <div className="shrink-0">
              {church.logo_url ? (
                <img
                  src={church.logo_url}
                  alt={church.name}
                  className="w-24 h-24 rounded-2xl object-cover border-2"
                  style={{ borderColor: THEME.gold }}
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-2xl flex items-center justify-center border-2"
                  style={{ borderColor: THEME.gold, background: 'rgba(255,255,255,0.1)' }}
                >
                  <Church size={48} color={THEME.goldLight} />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white leading-tight">{church.name}</h2>
              {church.denomination && (
                <p className="text-sm mt-1" style={{ color: THEME.goldLight }}>
                  {church.denomination}
                </p>
              )}
              {location && (
                <div className="flex items-center gap-1 mt-1.5 text-sm text-white/80">
                  <MapPin size={14} />
                  {location}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Pastor */}
          {church.pastor_name && (
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${THEME.purple}12` }}
              >
                <User size={20} style={{ color: THEME.purple }} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Pastor</p>
                <p className="text-sm font-semibold text-gray-900">{church.pastor_name}</p>
              </div>
            </div>
          )}

          {/* Program Times */}
          {church.program_times && church.program_times.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays size={18} style={{ color: THEME.gold }} />
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                  Service Times
                </h3>
              </div>
              <div className="grid gap-2">
                {church.program_times.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl px-4 py-2.5 border"
                    style={{ borderColor: `${THEME.gold}30`, background: `${THEME.gold}08` }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="text-xs font-bold uppercase px-2 py-0.5 rounded-md text-white"
                        style={{ background: THEME.purple }}
                      >
                        {p.day}
                      </span>
                      <span className="text-sm font-medium text-gray-700">{p.time}</span>
                    </div>
                    {p.name && <span className="text-xs text-gray-500">{p.name}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Social Links */}
          {socials.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Globe size={18} style={{ color: THEME.gold }} />
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                  Connect
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {socials.map((s, i) => (
                  <a
                    key={i}
                    href={s.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all hover:shadow-md"
                    style={{ borderColor: `${s.color}30`, color: s.color }}
                  >
                    <s.icon size={16} />
                    {s.label}
                    <ExternalLink size={12} className="opacity-50" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Contact Buttons */}
          <div className="flex gap-3 pt-2">
            {church.phone && (
              <a
                href={`tel:${church.phone}`}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: THEME.purple }}
              >
                <Phone size={16} />
                {church.phone}
              </a>
            )}
            {church.google_maps_link && (
              <a
                href={church.google_maps_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                style={{ background: THEME.gold, color: THEME.purpleDark }}
              >
                <MapPin size={16} />
                Get Directions
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Churches() {
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [denominationFilter, setDenominationFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState('');
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchChurches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('churches')
        .select('*')
        .eq('is_approved', true)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setChurches((data as Church[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load churches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChurches();
  }, [fetchChurches]);

  const filteredChurches = useMemo(() => {
    return churches.filter((church) => {
      const matchesSearch =
        !searchQuery ||
        church.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (church.pastor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesDenomination =
        denominationFilter === 'All' ||
        church.denomination === denominationFilter;
      const matchesCity =
        !cityFilter ||
        (church.city?.toLowerCase().includes(cityFilter.toLowerCase()) ?? false);
      return matchesSearch && matchesDenomination && matchesCity;
    });
  }, [churches, searchQuery, denominationFilter, cityFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAF5FF] to-[#FDF8E8]">
      {/* Header */}
      <header
        className="sticky top-0 z-40 shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${THEME.purpleDark}, ${THEME.purple})`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${THEME.gold}20` }}
              >
                <Church size={26} color={THEME.goldLight} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Find a Church
                </h1>
                <p className="text-xs sm:text-sm text-white/70 mt-0.5">
                  Discover congregations near you
                </p>
              </div>
            </div>
            <button
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 hover:scale-105 active:scale-95 shrink-0"
              style={{ background: THEME.gold, color: THEME.purpleDark }}
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Add Your Church</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by church name or pastor..."
              className="w-full pl-11 pr-12 py-3 rounded-xl bg-white text-sm text-gray-900 placeholder-gray-400 shadow-md focus:outline-none focus:ring-2 focus:ring-[#D4AF37] transition-all"
            />
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors"
              style={{
                background: showFilters ? THEME.purple : 'transparent',
                color: showFilters ? 'white' : THEME.purple,
              }}
            >
              <Filter size={18} />
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-[fadeIn_0.2s_ease-out]">
              <div className="relative">
                <label className="text-xs font-medium text-white/80 mb-1 block">
                  Denomination
                </label>
                <div className="relative">
                  <select
                    value={denominationFilter}
                    onChange={(e) => setDenominationFilter(e.target.value)}
                    className="w-full appearance-none pl-3 pr-10 py-2.5 rounded-xl bg-white text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] transition-all cursor-pointer"
                  >
                    {DENOMINATIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-white/80 mb-1 block">City</label>
                <input
                  type="text"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  placeholder="Enter city..."
                  className="w-full px-3 py-2.5 rounded-xl bg-white text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] transition-all"
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results count */}
        {!loading && !error && (
          <p className="text-sm text-gray-500 mb-4 font-medium">
            {filteredChurches.length} {filteredChurches.length === 1 ? 'church' : 'churches'} found
          </p>
        )}

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: `${THEME.purple}10` }}
            >
              <Building2 size={32} style={{ color: THEME.purple }} />
            </div>
            <p className="text-gray-700 font-semibold mb-1">Something went wrong</p>
            <p className="text-sm text-gray-400 mb-4">{error}</p>
            <button
              onClick={fetchChurches}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: THEME.purple }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredChurches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
              style={{ background: `${THEME.purple}10` }}
            >
              <Church size={40} style={{ color: THEME.purple }} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No churches yet</h3>
            <p className="text-sm text-gray-400 mb-5 max-w-sm">
              {churches.length === 0
                ? 'Be the first to add your church to our directory.'
                : 'No churches match your search. Try adjusting your filters.'}
            </p>
            <button
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 hover:scale-105"
              style={{ background: THEME.gold, color: THEME.purpleDark }}
            >
              <Plus size={18} />
              Add Your Church
            </button>
          </div>
        )}

        {/* Church grid */}
        {!loading && !error && filteredChurches.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredChurches.map((church) => (
              <ChurchCard
                key={church.id}
                church={church}
                onDetails={setSelectedChurch}
              />
            ))}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      <ChurchDetailModal church={selectedChurch} onClose={() => setSelectedChurch(null)} />
    </div>
  );
}
