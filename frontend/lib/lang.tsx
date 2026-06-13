"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export type Lang = "en" | "hi"

export const translations: Record<Lang, Record<string, string>> = {
  en: {
    title: "Jyotir — AI-Powered Astrology",
    subtitle: "Discover Your Cosmic Blueprint",
    tagline: "AI-Powered Astrology",
    description: "Choose your astrological tradition. Jyotir blends ancient wisdom with AI to give you a deeply personal reading.",
    tropical: "Tropical",
    tropicalSub: "Western Astrology",
    tropicalDesc: "The psychological, season-based system used in the West. Focuses on the Sun sign, rising sign, and planetary aspects for personal growth.",
    vedic: "Vedic",
    vedicSub: "Jyotish — Science of Light",
    vedicDesc: "The ancient Indian system using sidereal positions. Reveals karmic patterns, dashas (planetary periods), and nakshatras (lunar mansions).",
    bazi: "Bazi",
    baziSub: "Four Pillars of Destiny",
    baziDesc: "The Chinese metaphysical system based on your birth year, month, day, and hour. Reveals your elemental balance and 10-year luck cycles.",
    select: "Select →",
    backToSystems: "Choose a different system",
    enterBirth: "Enter Your Birth Details",
    tropicalLabel: "Tropical (Western)",
    vedicLabel: "Vedic (Jyotish)",
    baziLabel: "Bazi (Four Pillars)",
    fullName: "Full Name",
    birthDate: "Birth Date",
    birthTime: "Birth Time",
    cityOfBirth: "City of Birth",
    country: "Country",
    timezone: "Timezone",
    coordinates: "Coordinates",
    gender: "Gender",
    optional: "optional",
    generating: "Generating Your Reading",
    readingComplete: "Reading Complete",
    cosmicBlueprint: "Cosmic Blueprint",
    analyzing: "Jyotir is analyzing your birth chart in real-time...",
    personalized: "Your personalized astrological breakdown",
    consultingStars: "Consulting the stars...",
    generateReading: "Generate My Reading",
    calculating: "Calculating...",
    askAbout: "Ask about your placements, relationships, career...",
    chartTitle: "Your Cosmic Blueprint",
    planetaryPositions: "Planetary Positions",
    detailedReading: "Detailed Reading",
    disclaimer: "Jyotir provides astrological insights for personal reflection only. Not a substitute for professional medical, legal, or financial advice.",
    welcomeMessage: "I've studied your complete birth chart. Every planet, house, and aspect — I have it all in front of me. Ask me anything about your chart. What would you like to explore first?",
    sectionOverview: "Overview",
    sectionPlanets: "Planetary Deep Dive",
    sectionHouses: "The Houses",
    sectionAspects: "Aspect Analysis",
    sectionTrajectory: "Life Trajectory",
    sectionEmbodiment: "Embodiment Advice",
    weaving: "Weaving the Cosmos",
    constellationComplete: "Constellation Complete",
    coordinatesAuto: "Coordinates are auto-filled for Bazi",
    allRequired: "All fields required unless marked optional.",
  },
  hi: {
    title: "ज्योतिर — AI-संचालित ज्योतिष",
    subtitle: "अपना ब्रह्मांडीय खाका खोजें",
    tagline: "AI-संचालित ज्योतिष",
    description: "अपनी ज्योतिष परंपरा चुनें। ज्योतिर प्राचीन ज्ञान को AI के साथ मिलाकर आपको एक गहन व्यक्तिगत पाठन प्रदान करता है।",
    tropical: "ट्रॉपिकल",
    tropicalSub: "पश्चिमी ज्योतिष",
    tropicalDesc: "पश्चिम में उपयोग की जाने वाली मनोवैज्ञानिक, ऋतु-आधारित प्रणाली। सूर्य राशि, लग्न और ग्रहों के पहलुओं पर केंद्रित।",
    vedic: "वैदिक",
    vedicSub: "ज्योतिष — प्रकाश का विज्ञान",
    vedicDesc: "नक्षत्र स्थितियों का उपयोग करने वाली प्राचीन भारतीय प्रणाली। कर्म पैटर्न, दशा और नक्षत्रों को प्रकट करती है।",
    bazi: "बाज़ी",
    baziSub: "भाग्य के चार स्तंभ",
    baziDesc: "आपके जन्म वर्ष, माह, दिन और घंटे पर आधारित चीनी तत्वमीमांसा प्रणाली। तत्व संतुलन और 10-वर्षीय भाग्य चक्र।",
    select: "चुनें →",
    backToSystems: "कोई अन्य प्रणाली चुनें",
    enterBirth: "अपना जन्म विवरण दर्ज करें",
    tropicalLabel: "ट्रॉपिकल (पश्चिमी)",
    vedicLabel: "वैदिक (ज्योतिष)",
    baziLabel: "बाज़ी (चार स्तंभ)",
    fullName: "पूरा नाम",
    birthDate: "जन्म तिथि",
    birthTime: "जन्म समय",
    cityOfBirth: "जन्म स्थान (शहर)",
    country: "देश",
    timezone: "समय क्षेत्र",
    coordinates: "निर्देशांक",
    gender: "लिंग",
    optional: "वैकल्पिक",
    generating: "आपका पाठन तैयार हो रहा है",
    readingComplete: "पाठन पूर्ण",
    cosmicBlueprint: "ब्रह्मांडीय खाका",
    analyzing: "ज्योतिर आपकी कुंडली का वास्तविक समय में विश्लेषण कर रहा है...",
    personalized: "आपका वैयक्तिकृत ज्योतिषीय विश्लेषण",
    consultingStars: "सितारों से परामर्श...",
    generateReading: "मेरा पाठन तैयार करें",
    calculating: "गणना हो रही है...",
    askAbout: "अपनी ग्रह स्थिति, संबंधों, करियर के बारे में पूछें...",
    chartTitle: "आपका ब्रह्मांडीय खाका",
    planetaryPositions: "ग्रहों की स्थिति",
    detailedReading: "विस्तृत पाठन",
    disclaimer: "ज्योतिर केवल व्यक्तिगत चिंतन के लिए ज्योतिषीय अंतर्दृष्टि प्रदान करता है। पेशेवर चिकित्सा, कानूनी या वित्तीय सलाह का विकल्प नहीं।",
    welcomeMessage: "मैंने आपकी पूरी कुंडली का अध्ययन कर लिया है। हर ग्रह, भाव और दृष्टि — सब कुछ मेरे सामने है। अपनी कुंडली के बारे में कुछ भी पूछें। आप सबसे पहले क्या जानना चाहेंगे?",
    sectionOverview: "अवलोकन",
    sectionPlanets: "ग्रह विश्लेषण",
    sectionHouses: "भाव",
    sectionAspects: "दृष्टि विश्लेषण",
    sectionTrajectory: "जीवन पथ",
    sectionEmbodiment: "उपाय और सलाह",
    weaving: "ब्रह्मांड बुन रहे हैं",
    constellationComplete: "नक्षत्र पूर्ण",
    coordinatesAuto: "बाज़ी के लिए निर्देशांक स्वतः भरे गए हैं",
    allRequired: "सभी फ़ील्ड आवश्यक हैं जब तक कि वैकल्पिक न चिह्नित हों।",
  },
}

interface LangContextType {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string) => string
}

const LangContext = createContext<LangContextType>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
})

export function useLang() {
  return useContext(LangContext)
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en")

  useEffect(() => {
    const saved = localStorage.getItem("jyotir-lang") as Lang | null
    if (saved === "en" || saved === "hi") setLang(saved)
  }, [])

  const changeLang = (l: Lang) => {
    setLang(l)
    localStorage.setItem("jyotir-lang", l)
  }

  const t = (key: string): string => {
    return translations[lang][key] || translations["en"][key] || key
  }

  return (
    <LangContext.Provider value={{ lang, setLang: changeLang, t }}>
      {children}
    </LangContext.Provider>
  )
}
