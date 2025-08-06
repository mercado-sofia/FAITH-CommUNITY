'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export default function ProgramDetailsPage() {
  const { programID } = useParams();
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProgram = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/programs`);
        const data = await response.json();
        
        if (data.success) {
          const foundProgram = data.data.find(p => p.id === Number(programID));
          if (foundProgram) {
            setProgram(foundProgram);
          } else {
            setError('Program not found');
          }
        } else {
          setError('Failed to fetch programs');
        }
      } catch (err) {
        console.error('Error fetching program:', err);
        setError('Failed to load program data');
      } finally {
        setLoading(false);
      }
    };

    if (programID) {
      fetchProgram();
    }
  }, [programID]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading program details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Program not found.</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">{program.title}</h1>
        
        {program.image && (
          <div className="mb-6">
            <Image 
              src={program.image} 
              alt={program.title} 
              width={600} 
              height={400}
              className="rounded-lg shadow-lg"
            />
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Category</h3>
              <p className="text-gray-600">{program.category}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Status</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                program.status === 'Upcoming' ? 'bg-blue-100 text-blue-800' :
                program.status === 'Active' ? 'bg-green-100 text-green-800' :
                program.status === 'Completed' ? 'bg-gray-100 text-gray-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {program.status}
              </span>
            </div>
          </div>
          
          {program.date && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Date</h3>
              <p className="text-gray-600">{new Date(program.date).toLocaleDateString()}</p>
            </div>
          )}
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Description</h3>
            <p className="text-gray-700 leading-relaxed">{program.description}</p>
          </div>
          
          {(program.orgName || program.orgID) && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-2">Organization</h3>
              <div className="flex items-center space-x-3">
                {program.icon && (
                  <Image 
                    src={program.icon} 
                    alt={`${program.orgName || program.orgID} logo`}
                    width={40} 
                    height={40}
                    className="rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium">{program.orgName || program.orgID}</p>
                  {program.orgID && program.orgName && (
                    <p className="text-sm text-gray-600">{program.orgID}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}