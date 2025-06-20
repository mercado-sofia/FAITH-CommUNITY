const mockSubmissions = [
  {
    id: 1,
    section: 'Organization Info',
    proposed: { facebook: "https://fb.com/exampleorg", email: "org@email.com", description: "Updated org description" },
    status: 'pending',
    submitted_at: '2025-05-20T10:30:00',
    rejection_comment: null,
  },
  {
    id: 2,
    section: 'Advocacies',
    proposed: { advocacies: 'Tech for All' },
    status: 'rejected',
    submitted_at: '2025-05-18T14:45:00',
    rejection_comment: 'Please provide more detailed description.',
  },
  {
    id: 3,
    section: 'Projects',
    proposed: { title: 'Clean-Up Drive', description: 'Coastal cleanup' },
    status: 'approved',
    submitted_at: '2025-05-10T08:15:00',
    rejection_comment: null,
  },
];

export default mockSubmissions;