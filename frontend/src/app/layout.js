import "./globals.css";
import { Inter, Poppins, Urbanist, Roboto } from "next/font/google";
import { LoaderWrapper, DisableTabOnButtonsLinks, SWRProvider } from "@/components";
import ReduxProvider from "./ReduxProvider";
import '../utils/devTools'; // Load development tools

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-inter",
  display: 'swap'
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
  display: 'swap'
});

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-urbanist",
  display: 'swap'
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-roboto",
  display: 'swap'
});

export const metadata = {
  title: "FAITH CommUNITY",
  description: "A unified platform for community extension programs.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable} ${urbanist.variable} ${roboto.variable}`}>
      <body className={inter.className}>
        <SWRProvider>
          <ReduxProvider>
            <DisableTabOnButtonsLinks />
            <LoaderWrapper>{children}</LoaderWrapper>
          </ReduxProvider>
        </SWRProvider>
      </body>
    </html>
  );
}