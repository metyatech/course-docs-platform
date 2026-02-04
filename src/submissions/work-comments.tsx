"use client";

import { ShowMore } from '@re-dev/react-truncate';
import { Info, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import styles from './submissions.module.css';
import type { WorkComment } from './work-data-mappers.js';

type WorkCommentsProps = {
  comments: WorkComment[];
  isDisabled: boolean;
  isAdmin: boolean;
  onSubmit: (name: string, message: string) => Promise<void> | void;
  onDelete: (commentId: string) => Promise<void> | void;
};

const MAX_PREVIEW_LINES = 4;

export default function WorkComments({
  comments,
  isDisabled,
  isAdmin,
  onSubmit,
  onDelete,
}: WorkCommentsProps) {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [nameVisible, setNameVisible] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem('comment-display-name');
    if (stored) {
      setName(stored);
    }
  }, []);

  const handleSubmit = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return;
    }

    const trimmedName = name.trim();
    window.localStorage.setItem('comment-display-name', trimmedName);
    await onSubmit(trimmedName, trimmedMessage);
    setMessage('');
  };

  return (
    <div className={styles.commentsRoot}>
      <div className={styles.commentForm}>
        <label className={styles.commentLabel}>
          表示名（任意）
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={styles.commentInput}
            placeholder="例: 山田"
            disabled={isDisabled}
            data-testid="comment-name"
          />
        </label>
        <label className={styles.commentLabel}>
          コメント
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className={styles.commentTextarea}
            placeholder="作品へのコメントを入力"
            disabled={isDisabled}
            rows={4}
            data-testid="comment-message"
          />
        </label>
        <button
          type="button"
          className={styles.commentSubmit}
          onClick={handleSubmit}
          disabled={isDisabled}
          data-testid="comment-submit"
        >
          送信
        </button>
      </div>

      <div className={styles.commentList}>
        {comments.length === 0 ? (
          <p className={styles.commentEmpty}>コメントはまだありません。</p>
        ) : (
          comments.map((comment) => {
            const authorName = comment.author_name?.trim() ?? '';
            const body = comment.message ?? '';
            const createdAt = comment.created_at
              ? new Date(comment.created_at).toLocaleString()
              : '';
            return (
              <div key={comment.id} className={styles.commentItem}>
                <div className={styles.commentHeader}>
                  <div className={styles.commentMeta}>
                    <button
                      type="button"
                      className={styles.authorToggle}
                      aria-label="表示名を表示"
                      onMouseEnter={() => setNameVisible(true)}
                      onMouseLeave={() => setNameVisible(false)}
                      data-testid="comment-author-toggle"
                    >
                      <Info size={16} />
                    </button>
                    <span
                      className={`${styles.commentAuthor} ${
                        nameVisible ? styles.commentAuthorVisible : ''
                      }`}
                      data-testid="comment-author"
                    >
                      {authorName || '（未設定）'}
                    </span>
                    <span className={styles.commentDate}>{createdAt}</span>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      className={styles.commentDelete}
                      onClick={() => onDelete(comment.id)}
                      aria-label="コメントを削除"
                      data-testid="comment-delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <div className={styles.commentBody} data-testid="comment-body">
                  <ShowMore
                    lines={MAX_PREVIEW_LINES}
                    more={<span data-testid="more-button">続きを読む</span>}
                    less={<span data-testid="less-button">閉じる</span>}
                  >
                    {body}
                  </ShowMore>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

