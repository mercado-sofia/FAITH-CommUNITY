// this is for CRUD OrgHeads.js

'use client';
import { useGetHeadsByOrgQuery } from '@/rtk/admin/headsApi';
import { useState } from 'react';

export default function OrgHeads() {
  const [orgId, setOrgId] = useState('');
  const { data, error, isLoading } = useGetHeadsByOrgQuery(orgId, { skip: !orgId });

  return (
    <div>
      <h2>Organization Heads</h2>

      <input
        type="number"
        placeholder="Enter Organization ID"
        value={orgId}
        onChange={(e) => setOrgId(e.target.value)}
        style={{ marginBottom: '1rem', padding: '0.5rem' }}
      />

      {isLoading && <p>Loading heads...</p>}
      {error && <p>Error loading heads.</p>}

      {data?.length > 0 ? (
        <ul>
          {data.map((head) => (
            <li key={head.id}>
              <strong>{head.name}</strong> – {head.role}<br />
              <small>{head.email}</small>
            </li>
          ))}
        </ul>
      ) : (
        orgId && !isLoading && <p>No heads found for this organization.</p>
      )}
    </div>
  );
}
