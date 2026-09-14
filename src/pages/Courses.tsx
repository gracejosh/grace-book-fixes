import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Video,
  X,
  Youtube,
} from 'lucide-react';

type Course = {
  id: string;
  title?: string | null;
  description?: string | null;
  thumbnail_url?: string | null;
  youtube_url?: string | null;
  youtube_video_id?: string | null;
  category?: string | null;
  level?: string | null;
  duration?: string | null;
  instructor?: string | null;
  lesson_count?: number | null;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }
  return 'We could not load the courses. Please try again.';
};

const getYouTubeId = (value?: string | null) => {
  if (!value || typeof value !== 'string') return null;

  const normalize = (candidate: string | null | undefined) => {
    if (!candidate) return null;
    return /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
  };

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');

    if (host === 'youtu.be') {
      return normalize(url.pathname.split('/').filter(Boolean)[0]);
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      return normalize(
        url.searchParams.get('v') ||
        (url.pathname.match(/^\/(?:embed|shorts|v)\/([^/?]+)/) || [])[1],
      );
    }
  } catch {
    // Fall through to the plain-text URL pattern below.
  }

  return normalize(
    (value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([A-Za-z0-9_-]{11})/) || [])[1],
  );
};

const getCourseThumbnail = (course: Course) => {
  if (course.thumbnail_url) return course.thumbnail_url;
  const videoId = getYouTubeId(course.youtube_video_id || course.youtube_url);
  return videoId ? 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg' : null;
};

const getCourseCategory = (course: Course) => course.category?.trim() || 'Personal growth';

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All courses');

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;
      setCourses(Array.isArray(data) ? (data as Course[]) : []);
    } catch (loadError) {
      setCourses([]);
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    if (!selectedCourse) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedCourse(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCourse]);

  const categories = useMemo(() => {
    const values = courses
      .map((course) => course.category?.trim())
      .filter((category): category is string => Boolean(category));
    return ['All courses', ...Array.from(new Set(values))];
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return courses.filter((course) => {
      const matchesCategory = activeCategory === 'All courses' || getCourseCategory(course) === activeCategory;
      const searchableText = [course.title, course.description, course.category, course.instructor]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return matchesCategory && (!query || searchableText.includes(query));
    });
  }, [activeCategory, courses, search]);

  const featuredCourse = courses[0];
  const featuredVideoId = featuredCourse ? getYouTubeId(featuredCourse.youtube_url) : null;
  const coursesWithVideo = courses.filter((course) => getYouTubeId(course.youtube_video_id || course.youtube_url)).length;
  const textCourses = courses.length - coursesWithVideo;

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl space-y-3">
          <div className="h-4 w-32 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="h-10 w-3/4 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
          <div className="h-5 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="aspect-video animate-pulse bg-slate-200 dark:bg-slate-700" />
              <div className="space-y-3 p-5">
                <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="h-6 w-3/4 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div className="h-4 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div className="h-4 w-2/3 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-2xl shadow-slate-900/10 sm:px-10 sm:py-12 lg:px-14">
        <div className="absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-blue-500/30 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 -z-10 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.8fr]">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-semibold text-blue-100">
              <Sparkles className="h-4 w-4 text-blue-300" /> Learn with purpose
            </div>
            <h1 className="max-w-xl text-4xl font-bold tracking-tight sm:text-5xl">
              Practical courses for your next step.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Learn from clear, focused lessons you can return to whenever you need them. Start with a course, press play, and keep moving forward.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm font-semibold text-slate-200">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Self-paced learning</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2"><Video className="h-4 w-4 text-blue-300" /> Video-led lessons</span>
            </div>
          </div>

          <div className="relative hidden min-h-64 overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-6 lg:block">
            <div className="absolute right-6 top-6 rounded-2xl bg-white/10 p-3"><GraduationCap className="h-7 w-7 text-blue-200" /></div>
            <div className="flex h-full flex-col justify-end">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">Start learning today</p>
              <h2 className="mt-3 max-w-sm text-2xl font-semibold text-white">{featuredCourse?.title || 'Your learning library is ready'}</h2>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">{featuredCourse?.description || 'New courses and video lessons will appear here as they are published.'}</p>
              {featuredCourse && (
                <button type="button" onClick={() => setSelectedCourse(featuredCourse)} className="mt-6 inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-blue-50">
                  {featuredVideoId ? <Play className="h-4 w-4 fill-current" /> : <BookOpen className="h-4 w-4" />} Explore featured course <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Available courses</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{courses.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Video-led learning</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{coursesWithVideo}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Text-based courses</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{textCourses}</p>
        </div>
      </section>

      <section className="mt-12">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">Course library</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Find your next lesson</h2>
            <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">Browse focused courses, save your place, and learn from lessons built to be useful.</p>
          </div>
          <label className="relative block w-full lg:max-w-xs">
            <span className="sr-only">Search courses</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search courses" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </label>
        </div>

        {error && (
          <div role="alert" className="mt-6 flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Courses are temporarily unavailable.</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
            <button type="button" onClick={() => void loadCourses()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"><RefreshCw className="h-4 w-4" /> Try again</button>
          </div>
        )}

        <div className="mt-6 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Course categories">
          {categories.map((category) => (
            <button key={category} type="button" role="tab" aria-selected={activeCategory === category} onClick={() => setActiveCategory(category)} className={'whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ' + (activeCategory === category ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700')}>
              {category}
            </button>
          ))}
        </div>

        {filteredCourses.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-800/50">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"><BookOpen className="h-7 w-7" /></div>
            <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">{courses.length ? 'No courses match your search' : 'Your course library is growing'}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">{courses.length ? 'Try another search term or choose a different category.' : 'Published courses will appear here with descriptions, thumbnails, and video lessons.'}</p>
            {courses.length > 0 && <button type="button" onClick={() => { setSearch(''); setActiveCategory('All courses'); }} className="mt-5 text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400">Clear filters</button>}
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course) => {
              const videoId = getYouTubeId(course.youtube_video_id || course.youtube_url);
              const thumbnail = getCourseThumbnail(course);
              const hasThumbnail = Boolean(thumbnail) && !brokenImages[course.id];

              return (
                <article key={course.id} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-800 dark:hover:shadow-black/20">
                  <button type="button" onClick={() => setSelectedCourse(course)} className="block w-full text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-blue-500" aria-label={course.title ? 'Open course ' + course.title : 'Open course'}>
                    <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-950">
                      {hasThumbnail ? <img src={thumbnail as string} alt="" onError={() => setBrokenImages((previous) => ({ ...previous, [course.id]: true }))} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-white"><div className="rounded-2xl border border-white/20 bg-white/10 p-4"><BookOpen className="h-8 w-8" /></div><span className="text-sm font-semibold text-blue-100">Course preview</span></div>}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3"><span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">{getCourseCategory(course)}</span>{videoId ? <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-900"><Play className="h-3 w-3 fill-current" /> Video</span> : <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/50 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md"><BookOpen className="h-3 w-3" /> Guide</span>}</div>
                    </div>
                    <div className="p-5">
                      <h3 className="line-clamp-2 text-xl font-bold leading-7 text-slate-900 dark:text-white">{course.title || 'Untitled course'}</h3>
                      <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-slate-600 dark:text-slate-300">{course.description || 'A focused course to help you learn something useful and apply it with confidence.'}</p>
                      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-xs font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        {course.level && <span>{course.level}</span>}
                        {course.duration && <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {course.duration}</span>}
                        {course.lesson_count != null && <span>{course.lesson_count} lessons</span>}
                        {!course.level && !course.duration && course.lesson_count == null && <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> Learn at your pace</span>}
                      </div>
                      <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-600 transition group-hover:gap-3 dark:text-blue-400">{videoId ? 'Watch course' : 'Explore course'} <ArrowRight className="h-4 w-4" /></span>
                    </div>
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {selectedCourse && (() => {
        const selectedVideoId = getYouTubeId(selectedCourse.youtube_video_id || selectedCourse.youtube_url);
        const selectedThumbnail = getCourseThumbnail(selectedCourse);
        const hasSelectedThumbnail = Boolean(selectedThumbnail) && !brokenImages[selectedCourse.id];

        return (
          <div role="dialog" aria-modal="true" aria-label={selectedCourse.title || 'Course'} className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm sm:p-6" onClick={() => setSelectedCourse(null)}>
            <section className="my-auto w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-7">
                <div className="min-w-0 pr-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">Course preview</p><h2 className="mt-1 truncate text-xl font-bold text-slate-900 dark:text-white">{selectedCourse.title || 'Course'}</h2></div>
                <button type="button" onClick={() => setSelectedCourse(null)} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Close course"><X className="h-5 w-5" /></button>
              </div>
              <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
                {selectedVideoId ? (
                  <div className="aspect-video bg-black lg:aspect-auto lg:min-h-[27rem]"><iframe src={'https://www.youtube.com/embed/' + selectedVideoId + '?rel=0'} title={selectedCourse.title || 'Course video'} className="h-full w-full" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>
                ) : selectedCourse.description?.trim() ? (
                  <div className="min-h-64 overflow-y-auto bg-slate-50 p-6 dark:bg-slate-800/80 sm:p-10 lg:min-h-[27rem]"><div className="mx-auto max-w-2xl"><div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"><BookOpen className="h-3.5 w-3.5" /> Text course</div><h3 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">Read and learn</h3><p className="mt-5 whitespace-pre-wrap text-sm leading-8 text-slate-700 dark:text-slate-200">{selectedCourse.description}</p></div></div>
                ) : (
                  <div className="relative flex min-h-64 items-center justify-center overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-950 p-8 text-center lg:min-h-[27rem]">{hasSelectedThumbnail && <img src={selectedThumbnail as string} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" /> }<div className="relative"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur"><BookOpen className="h-8 w-8" /></div><p className="mt-5 text-lg font-bold text-white">Lesson coming soon</p><p className="mt-2 max-w-xs text-sm leading-6 text-blue-100">This course does not have written content or a video yet.</p></div></div>
                )}
                <div className="flex flex-col p-6 sm:p-8">
                  <div className="flex flex-wrap gap-2"><span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{getCourseCategory(selectedCourse)}</span>{selectedCourse.level && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{selectedCourse.level}</span>}</div>
                  <h3 className="mt-5 text-2xl font-bold leading-tight text-slate-900 dark:text-white">{selectedCourse.title || 'Course'}</h3>
                  <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{selectedCourse.description || 'A focused course to help you learn something useful and apply it with confidence.'}</p>
                  <div className="mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-300">{selectedCourse.instructor && <div className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Instructor: {selectedCourse.instructor}</div>}{selectedCourse.duration && <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-blue-600 dark:text-blue-400" /> {selectedCourse.duration}</div>}{selectedCourse.lesson_count != null && <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" /> {selectedCourse.lesson_count} lessons</div>}</div>
                  {selectedVideoId && <a href={'https://www.youtube.com/watch?v=' + selectedVideoId} target="_blank" rel="noreferrer" className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700"><Youtube className="h-4 w-4" /> Watch on YouTube <ArrowRight className="h-4 w-4" /></a>}
                </div>
              </div>
            </section>
          </div>
        );
      })()}
    </main>
  );
}
