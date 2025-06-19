import './globals.css';
import { Inter } from 'next/font/google';
import LoaderWrapper from '../components/LoaderWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'FAITH CommUNITY',
  description: 'A unified platform for community extension programs.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LoaderWrapper>{children}</LoaderWrapper>
      </body>
    </html>
  );
}