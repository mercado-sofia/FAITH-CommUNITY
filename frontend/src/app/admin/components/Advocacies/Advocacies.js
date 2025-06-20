// this is for CRUD in Advocacies

'use client';
import { useGetAllAdvocaciesQuery } from '@/rtk/admin/advocaciesApi';

export default function Advocacies() {
  const { data, error, isLoading } = useGetAllAdvocaciesQuery();

  if (isLoading) return <p>Loading advocacies...</p>;
  if (error) return <p>Error loading advocacies.</p>;

  return (
    <div>
      <h2>All Advocacies</h2>
      <ul>
        {data?.map((item) => (
          <li key={item.id}>
            Org ID: {item.organization_id} — {item.advocacy}
          </li>
        ))}
      </ul>
    </div>
  );
}
