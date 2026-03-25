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
      'B.Com (Computer Application) - BCCA',
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

export const ALL_COURSES = COURSE_GROUPS.flatMap((g) => g.options);

export const DEFAULT_COURSE = COURSE_GROUPS[0].options[0];
