'use client';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import '../globals.css';
import Head from 'next/head';

export default function PublicLayout({ children }) {
  return (
    <>
      <Head>
        <link
          rel="preload"
          href="/sample/sample4.jpg"
          as="image"
        />
      </Head>

      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}