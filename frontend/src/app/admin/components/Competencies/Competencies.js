// this is for CRUD in Competencies

'use client';
import { useGetAllCompetenciesQuery } from '@/rtk/admin/competenciesApi';

export default function Competencies() {
  const { data, error, isLoading } = useGetAllCompetenciesQuery();

  if (isLoading) return <p>Loading competencies...</p>;
  if (error) return <p>Error loading competencies.</p>;

  return (
    <div>
      <h2>All Competencies</h2>
      <ul>
        {data?.map((item) => (
          <li key={item.id}>
            Org ID: {item.organization_id} — {item.competency}
          </li>
        ))}
      </ul>
    </div>
  );
}
