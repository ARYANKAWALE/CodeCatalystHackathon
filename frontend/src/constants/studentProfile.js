/** Department (school / faculty) and program (course) options for student profiles. */

export const DEPARTMENTS = [
  'Applied Science and Humanities',
  'Artificial Intelligence',
  'Civil Engineering',
  'Commerce and Management',
  'Computer Science & Engineering (Cyber Security)',
  'Computer Science and Engineering',
  'Data Science',
  'Data Science, IoT, and Cyber Security (DIC)',
  'Electrical Engineering',
  'Electronics and Telecommunication Engineering',
  'Electronics Engineering',
  'Information Technology',
  'Management Studies (MBA)',
  'Mechanical Engineering',
  'Science and Technology',
];

export const COURSE_GROUPS = [
  {
    label: 'Engineering (B.Tech / M.Tech / PhD)',
    options: [
      'Computer Science and Engineering (CSE)',
      'Artificial Intelligence & Machine Learning (AI-ML)',
      'Information Technology (IT)',
      'Data Science, IoT, and Cyber Security (DIC)',
      'Electronics and Telecommunication Engineering (ETC)',
      'Electrical Engineering',
      'Mechanical Engineering',
      'Civil Engineering',
      'Structural Engineering',
      'Transportation Engineering',
      'VLSI Design & Embedded Systems',
      'CAD/CAM Engineering',
      'Mining Engineering',
      'Aerospace Engineering',
      'Mechatronics',
    ],
  },
  {
    label: 'Computer Applications',
    options: [
      'Bachelor of Computer Application (BCA)',
      'Master of Computer Application (MCA)',
    ],
  },
  {
    label: 'Pharmacy',
    options: ['Bachelor of Pharmacy (B.Pharm)', 'Diploma in Pharmacy (D.Pharm)'],
  },
  {
    label: 'Polytechnic (Diplomas)',
    options: ['Diploma in Fire Service Engineering', 'Diploma in Mining Engineering'],
  },
  {
    label: 'Management & Business',
    options: [
      'Master of Business Administration (MBA)',
      'Bachelor of Business Administration (BBA)',
      'BBA (Finance, Marketing, HR, Digital Marketing, International Business)',
      'Master of Computer Management (MCM)',
    ],
  },
  {
    label: 'Commerce',
    options: [
      'Bachelor of Commerce (B.Com / B.Com Honors)',
      'Bachelor of Commerce in Computer Application - BCCA',
      'Master of Commerce (M.Com)',
    ],
  },
  {
    label: 'Law',
    options: ['LLB (3-year and 5-year)', 'BA LLB', 'LLM'],
  },
  {
    label: 'Health & Applied Sciences',
    options: [
      'B.Sc. in Forensic Science',
      'B.Sc. in Food Science and Nutrition',
      'B.Sc. in Hospitality Studies',
      'Bachelor of Physiotherapy',
      'Bachelor of Optometry',
      'B.Sc. in Medical Laboratory Technology (MLT)',
    ],
  },
  {
    label: 'Arts & Humanities',
    options: [
      'BA Honors (Economics, Film & Television, Mass Communication)',
      'Bachelor of Social Work (BSW)',
    ],
  },
];

const ENG = COURSE_GROUPS[0].options;
const pickEng = (...titles) => titles.map((t) => ENG.find((x) => x === t)).filter(Boolean);

/** Courses allowed per department (faculty/school). Unknown / legacy departments fall back to all courses. */
export const DEPARTMENT_COURSES = {
  'Applied Science and Humanities': [
    ...COURSE_GROUPS[8].options,
    ...COURSE_GROUPS[7].options,
  ],
  'Artificial Intelligence': pickEng(
    'Artificial Intelligence & Machine Learning (AI-ML)',
    'Computer Science and Engineering (CSE)',
    'Information Technology (IT)',
  ),
  'Civil Engineering': pickEng(
    'Civil Engineering',
    'Structural Engineering',
    'Transportation Engineering',
  ),
  'Commerce and Management': [...COURSE_GROUPS[4].options, ...COURSE_GROUPS[5].options],
  'Computer Science & Engineering (Cyber Security)': pickEng(
    'Computer Science and Engineering (CSE)',
    'Data Science, IoT, and Cyber Security (DIC)',
    'Information Technology (IT)',
    'Artificial Intelligence & Machine Learning (AI-ML)',
  ),
  'Computer Science and Engineering': pickEng(
    'Computer Science and Engineering (CSE)',
    'Information Technology (IT)',
    'Artificial Intelligence & Machine Learning (AI-ML)',
    'Data Science, IoT, and Cyber Security (DIC)',
    'VLSI Design & Embedded Systems',
  ),
  'Data Science': [
    ...pickEng(
      'Artificial Intelligence & Machine Learning (AI-ML)',
      'Data Science, IoT, and Cyber Security (DIC)',
    ),
    ...COURSE_GROUPS[1].options,
  ],
  'Data Science, IoT, and Cyber Security (DIC)': pickEng(
    'Data Science, IoT, and Cyber Security (DIC)',
    'Artificial Intelligence & Machine Learning (AI-ML)',
    'Computer Science and Engineering (CSE)',
    'Information Technology (IT)',
  ),
  'Electrical Engineering': pickEng('Electrical Engineering', 'VLSI Design & Embedded Systems'),
  'Electronics and Telecommunication Engineering': pickEng(
    'Electronics and Telecommunication Engineering (ETC)',
    'VLSI Design & Embedded Systems',
  ),
  'Electronics Engineering': pickEng(
    'Electronics and Telecommunication Engineering (ETC)',
    'VLSI Design & Embedded Systems',
    'Electrical Engineering',
  ),
  'Information Technology': [...pickEng('Information Technology (IT)'), ...COURSE_GROUPS[1].options],
  'Management Studies (MBA)': [...COURSE_GROUPS[4].options],
  'Mechanical Engineering': pickEng(
    'Mechanical Engineering',
    'CAD/CAM Engineering',
    'Mechatronics',
    'Aerospace Engineering',
  ),
  'Science and Technology': [...COURSE_GROUPS[0].options, ...COURSE_GROUPS[1].options],
};

export const ALL_COURSES = COURSE_GROUPS.flatMap((g) => g.options);

export const DEFAULT_COURSE = COURSE_GROUPS[0].options[0];

export function getCoursesForDepartment(department) {
  const list = DEPARTMENT_COURSES[department];
  if (list && list.length) return list;
  return ALL_COURSES;
}

export function getCourseGroupsForDepartment(department) {
  const allowed = new Set(getCoursesForDepartment(department));
  if (allowed.size === ALL_COURSES.length) return COURSE_GROUPS;
  return COURSE_GROUPS.map((g) => ({
    label: g.label,
    options: g.options.filter((c) => allowed.has(c)),
  })).filter((g) => g.options.length > 0);
}

export function getDefaultCourseForDepartment(department) {
  const courses = getCoursesForDepartment(department);
  return courses[0] ?? DEFAULT_COURSE;
}
