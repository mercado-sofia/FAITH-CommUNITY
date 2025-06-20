// this is for CRUD in organization

'use client';
import { useGetAllOrganizationsQuery } from '@/rtk/admin/organizationApi';

export default function Organization() {
  const { data, error, isLoading } = useGetAllOrganizationsQuery();

  if (isLoading) return <p>Loading organizations...</p>;
  if (error) return <p>Error loading organizations.</p>;

  return (
    <div>
      <h2>Organizations</h2>
      <ul>
        {data?.data?.map((org) => (
          <li key={org.id}>
            <strong>{org.name}</strong> ({org.acronym})<br />
            <small>{org.email}</small><br />
            <p>{org.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
