"use client";

import { useEffect, useState } from 'react';
import styles from './submissions.module.css';
import { normalizeIntroInput } from './intro-utils.js';

type WorkIntroEditorProps = {
  intro: string | null;
  isDisabled: boolean;
  onSave: (intro: string | null) => void | Promise<void>;
};

export default function WorkIntroEditor({
  intro,
  isDisabled,
  onSave,
}: WorkIntroEditorProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(intro ?? '');

  useEffect(() => {
    if (!open) {
      setValue(intro ?? '');
    }
  }, [intro, open]);

  const handleSave = async () => {
    const normalized = normalizeIntroInput(value);
    await onSave(normalized);
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        className={styles.introEditButton}
        onClick={() => setOpen(true)}
        disabled={isDisabled}
        data-testid="work-intro-open"
      >
        紹介文を書く
      </button>
    );
  }

  return (
    <div className={styles.introEditor}>
      <textarea
        className={styles.introTextarea}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={isDisabled}
        rows={4}
        placeholder="作品の紹介文を入力"
        data-testid="work-intro-input"
      />
      <div className={styles.introEditorActions}>
        <button
          type="button"
          className={styles.introSaveButton}
          onClick={handleSave}
          disabled={isDisabled}
          data-testid="work-intro-save"
        >
          保存
        </button>
        <button
          type="button"
          className={styles.introCancelButton}
          onClick={() => setOpen(false)}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

