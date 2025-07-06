import { notFound } from "next/navigation";

// Example mock data – later replace with DB or API call
const mockNews = [
  {
    id: 1,
    org: "FACTS",
    date: "June 25, 2025",
    title: "Barangay Computer Literacy Program Recognized by City Mayor",
    description:
      "Our recent Computer Literacy Program in Barangay Malvar was recognized by the City Mayor for its impact on senior citizens learning basic computer use for daily life tasks. Full details here...",
  },
  {
    id: 2,
    org: "FACTS",
    date: "June 26, 2025",
    title: "Reminders: Volunteer Orientation This Friday",
    description:
      "All registered volunteers for the upcoming E-Skills Training must attend the orientation this Friday at 4PM in Tech Building Room 102. Attendance is required before deployment. Full orientation guidelines...",
  },
  // add more items here...
];

export default function NewsDetailPage({ params }) {
  const { id } = params;
  const newsId = parseInt(id);

  const news = mockNews.find((n) => n.id === newsId);

  if (!news) {
    notFound();
  }

  return (
    <main style={{ maxWidth: "800px", margin: "2rem auto", padding: "0 1rem" }}>
      <h1>{news.title}</h1>
      <p style={{ color: "#555" }}>
        {news.date} / By {news.org}
      </p>
      <p style={{ marginTop: "1rem", lineHeight: "1.6" }}>{news.description}</p>
    </main>
  );
}