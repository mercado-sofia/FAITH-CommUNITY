"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

// Example mock data – replace with backend fetch later
const mockNews = [
  {
    id: 1,
    org: "FACTS",
    date: "June 25, 2025",
    title: "Barangay Computer Literacy Program Recognized by City Mayor",
    description:
      "Our recent Computer Literacy Program in Barangay Malvar was recognized by the City Mayor for its impact on senior citizens learning basic computer use for daily life tasks.",
  },
  {
    id: 2,
    org: "FACTS",
    date: "June 26, 2025",
    title: "Reminders: Volunteer Orientation This Friday",
    description:
      "All registered volunteers for the upcoming E-Skills Training must attend the orientation this Friday at 4PM in Tech Building Room 102. Attendance is required before deployment.",
  },
  // add more items here...
];

export default function AllNewsPage() {
  const searchParams = useSearchParams();
  const orgFilter = searchParams.get("news_org");

  const filteredNews = orgFilter
    ? mockNews.filter((news) => news.org === orgFilter)
    : mockNews;

  return (
    <main style={{ maxWidth: "900px", margin: "2rem auto", padding: "0 1rem" }}>
      <h1>All News</h1>

      {filteredNews.length === 0 ? (
        <p>No announcements found{orgFilter && ` for ${orgFilter}`}.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {filteredNews.map((news) => (
            <li key={news.id} style={{ marginBottom: "2rem" }}>
              <p style={{ fontSize: "0.9rem", color: "#555" }}>
                {news.date} / By {news.org}
              </p>
              <Link
                href={`/news/${news.id}`}
                style={{
                  fontWeight: "bold",
                  fontSize: "1.1rem",
                  color: "#167c59",
                  textDecoration: "none",
                }}
              >
                {news.title}
              </Link>
              <p style={{ marginTop: "0.5rem" }}>
                {news.description.length > 150
                  ? `${news.description.substring(0, 150)}...`
                  : news.description}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}