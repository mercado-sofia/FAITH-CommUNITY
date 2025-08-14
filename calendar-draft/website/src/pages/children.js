import React from "react";
import Layout from "../components/layout/layout";
import doc from "../docs/children";

export default function Children({ pageContext }) {
  const language = pageContext.language || "en";

  return <Layout language={language} doc={doc} />;
}
