import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Course = {
  id: string;
  title?: string | null;
  description?: string | null;
  thumbnail_url?: string | null;
  youtube_url?: string | null;
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
    const host = url.hostname.toLowerCase().replace(/^www\\./, '');

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

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

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

  const selectedVideoId = selectedCourse ? getYouTubeId(selectedCourse.youtube_url) : null;

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold text-slate-900 dark:text-white">Courses</h1>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
              <div className="h-44 bg-slate-200 dark:bg-slate-700" />
              <div className="space-y-3 p-5">
                <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Courses</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">Choose a course to start learning.</p>
      </div>

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <p>{error}</p>
          <button type="button" onClick={() => void loadCourses()} className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
            Try again
          </button>
        </div>
      )}

      {!error && courses.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-600 dark:bg-slate-800">
          <p className="text-lg font-medium text-slate-700 dark:text-slate-200">No courses available yet.</p>
        </div>
      )}

      {courses.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const hasImage = Boolean(course.thumbnail_url) && !brokenImages[course.id];

            return (
              <button
                key={course.id}
                type="button"
                onClick={() => setSelectedCourse(course)}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
                aria-label={
                  course.title ? 'Open course ' + course.title : 'Open course'
                }
              >
                <div className="flex h-44 items-center justify-center bg-slate-100 dark:bg-slate-700">
                  {hasImage ? (
                    <img
                      src={course.thumbnail_url as string}
                      alt=""
                      onError={() => setBrokenImages((previous) => ({ ...previous, [course.id]: true }))}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-300">Course</span>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {course.title || 'Untitled course'}
                  </h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {course.description || 'Start this course to begin learning.'}
                  </p>
                  <span className="mt-4 inline-block text-sm font-semibold text-blue-600 dark:text-blue-400">Open course →</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedCourse && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selectedCourse.title || 'Course'}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelectedCourse(null)}
        >
          <section
            className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {selectedCourse.title || 'Course'}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedCourse(null)}
                className="rounded-lg px-3 py-1 text-2xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label="Close course"
              >
                ×
              </button>
            </div>

            {selectedVideoId ? (
              <div className="aspect-video bg-black">
                <iframe
                  src={'https://www.youtube.com/embed/' + selectedVideoId}
                  title={selectedCourse.title || 'Course video'}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="flex min-h-64 items-center justify-center bg-slate-100 p-8 text-center dark:bg-slate-800">
                <p className="text-slate-600 dark:text-slate-300">This course does not have a valid video yet.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
