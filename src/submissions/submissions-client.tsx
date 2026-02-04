"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './submissions.module.css';
import type { StudentWorksData } from './types.js';
import WorkComments from './work-comments.js';
import { getBrowserSupabaseClient } from './supabase-client.js';
import {
  mapWorkComments,
  mapWorkIntros,
  type WorkCommentMap,
  type WorkIntroMap,
} from './work-data-mappers.js';
import WorkIntroEditor from './work-intro-editor.js';

type SubmissionsClientProps = {
  studentWorks: StudentWorksData;
};

const formatSupabaseError = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return '保存に失敗しました。';
  }

  const maybeError = error as {
    message?: string;
    details?: string | null;
    hint?: string | null;
    code?: string | null;
  };
  const parts = [
    maybeError.message,
    maybeError.details,
    maybeError.hint,
    maybeError.code ? `code=${maybeError.code}` : null,
  ].filter((value): value is string => Boolean(value));

  if (parts.length === 0) {
    return '保存に失敗しました。';
  }

  return parts.join(' / ');
};

const buildWorkUrl = (baseUrl: string, workPath: string | null) => {
  if (!workPath) {
    return null;
  }

  if (!baseUrl) {
    return `/student-works/${workPath}`;
  }

  const trimmedBase = baseUrl.replace(/\/+$/, '');
  return `${trimmedBase}/${workPath}`;
};

export default function SubmissionsClient({ studentWorks }: SubmissionsClientProps) {
  const studentWorksData = studentWorks.years;
  const availableYears = useMemo(
    () => Object.keys(studentWorksData).sort().reverse(),
    [studentWorksData]
  );
  const [selectedYear, setSelectedYear] = useState<string>(availableYears[0] ?? '');

  useEffect(() => {
    if (typeof window === 'undefined' || availableYears.length === 0) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const yearFromUrl = params.get('year');

    if (yearFromUrl && studentWorksData[yearFromUrl]) {
      setSelectedYear(yearFromUrl);
    } else {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, studentWorksData]);

  const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const year = event.target.value;
    setSelectedYear(year);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('year', year);
      window.history.pushState({}, '', url.toString());
    }
  };

  const studentWorksInYear = selectedYear ? studentWorksData[selectedYear] || [] : [];
  const worksBaseUrl = process.env.NEXT_PUBLIC_WORKS_BASE_URL ?? '';
  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const [introMap, setIntroMap] = useState<WorkIntroMap>({});
  const [commentMap, setCommentMap] = useState<WorkCommentMap>({});
  const [dataError, setDataError] = useState<string | null>(null);
  const supabaseMissing = !supabase;
  const [adminToken, setAdminToken] = useState('');
  const [activeCommentStudentId, setActiveCommentStudentId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTheme, setDrawerTheme] = useState<'light' | 'dark'>('light');
  const studentIds = useMemo(
    () => studentWorksInYear.map((work) => work.studentId),
    [studentWorksInYear]
  );

  const fetchIntros = useCallback(async () => {
    if (!supabase || !selectedYear || studentIds.length === 0) {
      setIntroMap({});
      return;
    }

    const { data, error } = await supabase
      .from('work_intros')
      .select('student_id,intro,updated_at')
      .eq('year', selectedYear)
      .in('student_id', studentIds);

    if (error) {
      setDataError('紹介文の読み込みに失敗しました。');
      return;
    }

    setIntroMap(mapWorkIntros(data ?? []));
  }, [selectedYear, studentIds, supabase]);

  const fetchComments = useCallback(async () => {
    if (!supabase || !selectedYear || studentIds.length === 0) {
      setCommentMap({});
      return;
    }

    const { data, error } = await supabase
      .from('work_comments')
      .select('id,student_id,author_name,message,created_at')
      .eq('year', selectedYear)
      .in('student_id', studentIds)
      .order('created_at', { ascending: false });

    if (error) {
      setDataError('コメントの読み込みに失敗しました。');
      return;
    }

    setCommentMap(mapWorkComments(data ?? []));
  }, [selectedYear, studentIds, supabase]);

  const refreshAll = useCallback(async () => {
    setDataError(null);
    await Promise.all([fetchIntros(), fetchComments()]);
  }, [fetchComments, fetchIntros]);

  useEffect(() => {
    setIsMounted(true);
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handler = (event: Event) => {
      if (!(event instanceof CustomEvent)) {
        return;
      }
      const next = (event.detail as { token?: string } | null)?.token ?? '';
      setAdminToken(next);
    };

    window.addEventListener('admin-token', handler as EventListener);
    return () => {
      window.removeEventListener('admin-token', handler as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const updateTheme = () => {
      const root = document.documentElement;
      const dataTheme = root.getAttribute('data-theme');
      setDrawerTheme(dataTheme === 'dark' ? 'dark' : 'light');
    };

    updateTheme();
    const observer = new MutationObserver(() => updateTheme());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleVisibility = () => {
      refreshAll();
    };
    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshAll]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      refreshAll();
    }, 15000);
    return () => window.clearInterval(interval);
  }, [refreshAll]);

  useEffect(() => {
    if (!activeCommentStudentId) {
      setIsDrawerOpen(false);
      return;
    }

    setIsDrawerOpen(false);
    const timer = window.setTimeout(() => setIsDrawerOpen(true), 30);
    return () => window.clearTimeout(timer);
  }, [activeCommentStudentId]);

  const saveIntro = useCallback(
    async (studentId: string, intro: string | null) => {
      if (!supabase || !selectedYear) {
        return;
      }

      const { error } = await supabase.from('work_intros').upsert({
        year: selectedYear,
        student_id: studentId,
        intro,
      });

      if (error) {
        setDataError(formatSupabaseError(error));
        return;
      }

      await fetchIntros();
    },
    [fetchIntros, selectedYear, supabase]
  );

  const submitComment = useCallback(
    async (studentId: string, authorName: string, message: string) => {
      if (!supabase || !selectedYear) {
        return;
      }

      const { error } = await supabase.from('work_comments').insert({
        year: selectedYear,
        student_id: studentId,
        author_name: authorName || null,
        message,
      });

      if (error) {
        setDataError(formatSupabaseError(error));
        return;
      }

      await fetchComments();
    },
    [fetchComments, selectedYear, supabase]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      const trimmed = adminToken.trim();
      if (!trimmed) {
        return;
      }

      const res = await fetch(`/api/admin/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-token': trimmed,
        },
      });

      if (!res.ok) {
        setDataError('削除に失敗しました。');
        return;
      }

      await fetchComments();
    },
    [adminToken, fetchComments]
  );

  const activeCommentWork = activeCommentStudentId
    ? studentWorksInYear.find((work) => work.studentId === activeCommentStudentId) ?? null
    : null;
  const activeComments = activeCommentWork ? commentMap[activeCommentWork.studentId] ?? [] : [];

  return (
    <main className={styles.submissionsRoot}>
      <div className={styles.submissionsHeader}>
        <h1 className={styles.submissionsTitle}>作品一覧</h1>
        <div className={styles.yearSelector}>
          <label className={styles.yearLabel}>
            年度
            <select value={selectedYear} onChange={handleYearChange} className={styles.yearSelect}>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className={styles.submissionsContent}>
        {studentWorksInYear.length === 0 ? (
          <p className={styles.emptyMessage}>作品がありません。</p>
        ) : (
          <div className={styles.cardsGrid}>
            {studentWorksInYear.map((work) => {
              const intro = introMap[work.studentId] ?? null;
              const comments = commentMap[work.studentId] ?? [];
              const workUrl = buildWorkUrl(worksBaseUrl, work.workPath);
              return (
                <div
                  key={work.studentId}
                  className={styles.card}
                  data-testid={`work-card-${work.studentId}`}
                >
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{work.studentId}</h3>
                  </div>
                  <div className={styles.cardPreview}>
                    {workUrl ? (
                      <iframe
                        loading="lazy"
                        title={`${work.studentId}の提出作品`}
                        className={styles.iframe}
                        src={workUrl}
                        sandbox="allow-scripts allow-same-origin"
                      />
                    ) : (
                      <div className={styles.iframePlaceholder}>
                        <p>index.html が見つかりません。</p>
                        <p>フォルダ内に配置してください。</p>
                      </div>
                    )}
                  </div>
                  <div className={styles.cardBody}>
                    <section className={styles.introSection}>
                      <h4 className={styles.sectionTitle}>作者からの紹介</h4>
                      <div className={styles.contentBlock}>
                        {supabaseMissing ? (
                          <p className={styles.placeholder}>
                            Supabaseのanon keyが未設定のため表示できません。
                          </p>
                        ) : intro ? (
                          <p className={styles.introText} data-testid="work-intro-text">
                            {intro}
                          </p>
                        ) : (
                          <p className={styles.placeholder} data-testid="work-intro-empty">
                            作者からの紹介文はまだありません。
                          </p>
                        )}
                      </div>
                      <WorkIntroEditor
                        intro={intro}
                        isDisabled={supabaseMissing}
                        onSave={(nextIntro) => saveIntro(work.studentId, nextIntro)}
                      />
                    </section>
                    <div className={styles.commentEntry}>
                      <button
                        type="button"
                        className={styles.commentToggleButton}
                        onClick={() => setActiveCommentStudentId(work.studentId)}
                        data-testid="comment-open"
                      >
                        コメントを見る ({comments.length})
                      </button>
                    </div>
                    {dataError && <p className={styles.dataError}>{dataError}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {activeCommentWork && isMounted
        ? createPortal(
            <div
              className={`${styles.commentDrawerRoot} ${
                isDrawerOpen ? styles.commentDrawerOpen : ''
              }`}
              data-theme={drawerTheme}
              data-testid="comment-drawer"
            >
              <button
                type="button"
                className={styles.commentDrawerOverlay}
                aria-label="コメントパネルを閉じる"
                onClick={() => setActiveCommentStudentId(null)}
              />
              <aside
                className={styles.commentDrawer}
                role="dialog"
                aria-modal="true"
                aria-label="コメント"
                data-testid="comment-panel"
              >
                <div className={styles.commentDrawerHeader}>
                  <div>
                    <p className={styles.commentDrawerTitle}>コメント</p>
                    <p className={styles.commentDrawerMeta}>
                      作品番号: {activeCommentWork.studentId}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.commentDrawerClose}
                    onClick={() => setActiveCommentStudentId(null)}
                    data-testid="comment-close"
                  >
                    閉じる
                  </button>
                </div>
                <WorkComments
                  comments={activeComments}
                  isDisabled={supabaseMissing}
                  isAdmin={adminToken.trim().length > 0}
                  onSubmit={(name, message) =>
                    submitComment(activeCommentWork.studentId, name, message)
                  }
                  onDelete={deleteComment}
                />
              </aside>
            </div>,
            document.body
          )
        : null}
    </main>
  );
}

