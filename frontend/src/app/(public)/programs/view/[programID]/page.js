'use client';

import { useParams } from 'next/navigation';
import { mockProjects } from '../../mockProjects';

export default function ProgramDetailsPage() {
  const { programID } = useParams();
  const program = mockProjects.find(p => p.id === Number(programID));

  if (!program) return <p>Program not found.</p>;

  return (
    <div>
      <h1>{program.title}</h1>
      <img src={program.image} alt={program.title} width={600} />
      <h2>Coming soon</h2>
    </div>
  );
}