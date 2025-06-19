import './globals.css';
import { Inter, Roboto, Source_Sans_3 } from 'next/font/google';
import LoaderWrapper from '../components/LoaderWrapper';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const roboto = Roboto({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-roboto' });
const sourceSans3 = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-source-sans',
});

export const metadata = {
  title: 'FAITH CommUNITY',
  description: 'A unified platform for community extension programs.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${roboto.variable} ${sourceSans3.variable}`}>
      <body className={inter.className}>
        <LoaderWrapper>{children}</LoaderWrapper>
      </body>
    </html>
  );
}