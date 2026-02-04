import fs from 'node:fs';
import path from 'node:path';
import type { StudentWorkEntry, StudentWorksData } from './types.js';

const studentWorksBasePath = path.join(process.cwd(), 'public', 'student-works');
const ignoredDirectories = new Set(['.git', 'node_modules']);

const normalizePath = (value: string) => value.split(path.sep).join('/');

const findIndexHtmlPath = (studentPath: string, basePath: string): string | null => {
  if (!fs.existsSync(studentPath)) {
    return null;
  }

  let currentLevel = [studentPath];

  while (currentLevel.length > 0) {
    const matches: string[] = [];
    const nextLevel: string[] = [];

    for (const dir of currentLevel) {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch (error) {
        console.warn(`Failed to read student work directory: ${dir}`, error);
        continue;
      }

      for (const entry of entries) {
        if (entry.isFile() && entry.name.toLowerCase() === 'index.html') {
          const filePath = path.join(dir, entry.name);
          const relativePath = path.relative(basePath, filePath);
          matches.push(normalizePath(relativePath));
          continue;
        }

        if (entry.isDirectory()) {
          if (entry.name.startsWith('.') || ignoredDirectories.has(entry.name)) {
            continue;
          }
          nextLevel.push(path.join(dir, entry.name));
        }
      }
    }

    if (matches.length > 0) {
      matches.sort((a, b) => a.localeCompare(b));
      return matches[0] ?? null;
    }

    currentLevel = nextLevel;
  }

  return null;
};

export const getStudentWorksData = (basePath = studentWorksBasePath): StudentWorksData => {
  if (!fs.existsSync(basePath)) {
    return { years: {} };
  }

  const data: Record<string, StudentWorkEntry[]> = {};

  try {
    const years = fs
      .readdirSync(basePath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)
      .sort();

    for (const year of years) {
      const yearPath = path.join(basePath, year);
      const studentIds = fs
        .readdirSync(yearPath, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .sort();

      data[year] = studentIds.map((studentId) => {
        const studentPath = path.join(yearPath, studentId);
        return {
          studentId,
          workPath: findIndexHtmlPath(studentPath, basePath),
        } satisfies StudentWorkEntry;
      });
    }
  } catch (error) {
    console.error('Error reading student works data:', error);
    return { years: {} };
  }

  return { years: data };
};

