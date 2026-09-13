import type {Metadata} from "next";
import {Fraunces, Manrope} from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
    subsets: ["latin"],
    variable: "--font-fraunces",
    weight: ["400", "500", "600"],
    style: ["normal", "italic"],
    display: "swap",
});

const manrope = Manrope({
    subsets: ["latin"],
    variable: "--font-manrope",
    weight: ["400", "500", "600", "700", "800"],
    display: "swap",
});

export const metadata: Metadata = {
    title: "Noria",
    description:
        "Évaluez en quelques minutes le niveau de structuration de votre entreprise et identifiez vos leviers prioritaires.",
    icons: {
        icon: "/favicon.ico",
        shortcut: "/favicon.ico",
    },
};

export default function RootLayout({children}: { children: React.ReactNode }) {
    return (
        <html lang="fr" className={`${fraunces.variable} ${manrope.variable}`}>
        <body className="bg-paper font-sans text-ink antialiased">{children}</body>
        </html>
    );
}