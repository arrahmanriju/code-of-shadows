export type Project = {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  githubUrl: string | null;
  liveUrl: string | null;
  type: 'software' | 'research';
  details: string[];
};

// Links verified against public GitHub metadata and READMEs. Missing verified
// URLs stay null; never substitute a profile URL for a project repository.
export const projects: Project[] = [
  {
    id: 'dhaka-tesla-pool', title: 'Dhaka Tesla Pool', type: 'software',
    description: 'A ride-pooling app for battery rickshaws in Dhaka, matching passengers heading the same way and splitting fares.',
    technologies: ['Next.js', 'Express', 'SQLite', 'Docker'],
    githubUrl: 'https://github.com/arrahmanriju/Dhaka_Tesla_pool',
    liveUrl: 'https://dhaka-tesla-pool-psi.vercel.app',
    details: ['Passenger and driver workflows with ride requests, status updates, and ride history.', 'Direction-aware pooling, checkpoint-based fare splitting, concurrency-safe seat allocation, and an offline QR-code ride mode.'],
  },
  {
    id: 'seu-question-bank', title: 'SEU Question Bank', type: 'software',
    description: 'A shared question-paper library where Southeast University students can upload, browse, and search past exam papers.',
    technologies: ['Python', 'Streamlit', 'Supabase'],
    githubUrl: 'https://github.com/arrahmanriju/SEU_Question_Bank',
    liveUrl: 'https://seuquestionbank-5jp88dl7ukwxlgp7juw7v9.streamlit.app/',
    details: ['Filter papers by department, course, semester, and question type.', 'Image and PDF uploads go through admin approval before becoming public.'],
  },
  {
    id: 'expense-tracker', title: 'Expense Tracker', type: 'software',
    description: 'A personal finance app for tracking income, expenses, monthly budgets, and reports.',
    technologies: ['ASP.NET Core MVC', 'C#', 'MySQL', 'Entity Framework Core'],
    githubUrl: 'https://github.com/arrahmanriju/Hishaber-khata-expense-tracker-',
    liveUrl: null,
    details: ['Dashboard with category totals and income-versus-expense charts.', 'Monthly transaction views, recurring expense tracking, and Excel report export.'],
  },
  {
    id: 'mental-health-prediction', title: 'Mental Health Prediction', type: 'research',
    description: 'An exploration of machine learning for mental health prediction.',
    technologies: ['Machine Learning'], githubUrl: null, liveUrl: null,
    details: ['AI/ML project. Further implementation details and public documentation are not available yet.'],
  },
  {
    id: 'student-placement-prediction', title: 'Student Placement Prediction', type: 'research',
    description: 'A supervised machine-learning workflow exploring placement outcomes from student profile and academic data.',
    technologies: ['Python', 'Pandas', 'NumPy', 'Scikit-learn', 'Jupyter Notebook'],
    githubUrl: 'https://github.com/arrahmanriju/placement_prediction_ML_project',
    liveUrl: null,
    details: ['Notebook covering data loading, exploratory analysis, and preprocessing.', 'Classification model training and evaluation for student placement prediction.'],
  },
  {
    id: 'tiredness-alertness', title: 'Tiredness and Alertness Dataset', type: 'research',
    description: 'A research project focused on a tiredness and alertness dataset.',
    technologies: ['Research', 'Dataset'], githubUrl: null, liveUrl: null,
    details: ['Five image categories: very_alert, alert, slightly_tired, tired, very_tired. Images were collected from participants at different times of the day.', 'Dataset size, model results, further documentation, and public code are not available yet.'],
  },
];
