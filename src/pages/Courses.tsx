import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Play, X, RefreshCw } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  youtube_url: string;
  created_at: string;
}

const Courses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'message' in err
          ? String(err.message)
          : 'Failed to fetch courses';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const getYouTubeId = (url?: string | null) => {
    if (!url || typeof url !== 'string') return null;

    try {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      return match?.[2]?.length === 11 ? match[2] : null;
    } catch {
      return null;
    }
  };

  const handleCourseClick = (course: Course) => {
    try {
      if (!course?.id) throw new Error('This course cannot be opened.');
      setModalError(null);
      setSelectedCourse(course);
    } catch (err) {
      setSelectedCourse(null);
      setModalError(err instanceof Error ? err.message : 'Unable to open this course.');
    }
  };

  const videoId = selectedCourse ? videoId : null;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-48 mb-4"></div>
              <div className="bg-gray-200 rounded h-4 w-3/4 mb-2"></div>
              <div className="bg-gray-200 rounded h-4 w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchCourses}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Courses</h1>

      {modalError && (
        <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {modalError}
        </div>
      )}

      {courses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No courses available yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="group rounded-xl border border-slate-200 bg-white text-slate-900 shadow-md overflow-hidden transition-shadow hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-white">
              <div
                className="relative h-48 cursor-pointer bg-slate-100 dark:bg-slate-700"
                onClick={() => handleCourseClick(course)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') handleCourseClick(course);
                }}
                aria-label="Open course"
              >
                <img
                  src={course.thumbnail_url || '/placeholder-course.jpg'}
                  alt={course.title || 'Course thumbnail'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                  <Play className="w-16 h-16 text-white" />
                </div>
              </div>
              <div className="p-4">
                <h3 className="mb-2 text-lg font-semibold">{course.title || 'Untitled course'}</h3>
                <p className="line-clamp-3 text-sm text-slate-600 dark:text-slate-300">{course.description || 'No description available.'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-xl font-semibold">{selectedCourse.title}</h3>
              <button
                onClick={() => setSelectedCourse(null)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="aspect-video bg-slate-100 dark:bg-slate-700">
              {getYouTubeId(selectedCourse.youtube_url) ? (
                <iframe
                  src={`https://www.youtube.com/embed/${getYouTubeId(selectedCourse.youtube_url)}`}
                  title={selectedCourse.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-slate-700">
                  <p className="text-slate-500 dark:text-slate-300">This course does not have a valid video URL.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;
