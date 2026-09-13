import type {Metadata} from "next";
import {DM_Sans, Google_Sans, Urbanist} from "next/font/google";
import "./globals.css";

const googleSans = Google_Sans({
    subsets: ["latin"],
    variable: "--font-display-raw",
    style: ["normal", "italic"],
    display: "swap",
});

const dmSans = DM_Sans({
    subsets: ["latin"],
    variable: "--font-sans-raw",
    style: ["normal", "italic"],
    display: "swap",
});

const urbanist = Urbanist({
    subsets: ["latin"],
    variable: "--font-accent-raw",
    style: ["normal", "italic"],
    display: "swap",
});

export const metadata: Metadata = {
    title: "Noria",
    description:
        "Évaluez en quelques minutes le niveau de structuration de votre entreprise et identifiez vos leviers prioritaires.",
    icons: {
        icon: "/favicon.ico",
    },
};

export default function RootLayout({children}: { children: React.ReactNode }) {
    return (
        <html
            lang="fr"
            className={`${googleSans.variable} ${dmSans.variable} ${urbanist.variable}`}
        >
        <body className="bg-paper font-sans text-ink antialiased">{children}</body>
        </html>
    );
}