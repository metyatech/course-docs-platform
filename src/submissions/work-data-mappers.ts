export type WorkIntroRow = {
  student_id: string;
  intro: string | null;
};

export type WorkComment = {
  id: string;
  student_id: string;
  author_name: string | null;
  message: string;
  created_at: string;
};

export type WorkIntroMap = Record<string, string>;
export type WorkCommentMap = Record<string, WorkComment[]>;

export const mapWorkIntros = (rows: WorkIntroRow[]) =>
  rows.reduce<WorkIntroMap>((acc, row) => {
    if (row.student_id && row.intro) {
      acc[row.student_id] = row.intro;
    }
    return acc;
  }, {});

export const mapWorkComments = (rows: WorkComment[]) =>
  rows.reduce<WorkCommentMap>((acc, row) => {
    if (!row.student_id) {
      return acc;
    }
    const bucket = acc[row.student_id] ?? [];
    bucket.push(row);
    acc[row.student_id] = bucket;
    return acc;
  }, {});

