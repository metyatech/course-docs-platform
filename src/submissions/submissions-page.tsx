import SubmissionsClient from './submissions-client.js';
import { getStudentWorksData } from './work-data.js';

export default function SubmissionsPage() {
  const studentWorks = getStudentWorksData();
  return <SubmissionsClient studentWorks={studentWorks} />;
}

