"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RegisterModal from "@/src/components/RegisterModal";
import LoginModal from "@/src/components/LoginModal";
import { clearTokens } from "@/lib/axios";

// Initial commit are:
// 1. Authentication(Django REST Framework + JWT)
// 2. Protect API endpoints on Django side
// 3. Build the Chatbot UI
// 4. Backend Setup(Django endpoint /api/chat/)
// 5. Real LLM Integration

export default function Home() {
  const [showLogin, setShowLogin] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("access_token");
    clearTokens();
    setIsLoggedIn(false);
    router.push("/");
  };

  return (
    <main
      className="
        grid grid-cols-[1fr]
        w-screen h-screen
        lg:grid-cols-[2fr_1fr]
      "
    >
      <img
        src="/images/cover.png"
        className="
          object-cover hidden
          h-full w-full
          lg:block
        "
      ></img>

      <div
        className="
          flex flex-col
          py-10
          bg-gradient-to-b from-yellow to-beige
          items-center justify-start
        "
      >
        <h1
          className="
            text-blue text-6xl font-maragsa
          "
        >
          Rizal
          <span
            className="
              text-red
            "
          >
            GPT
          </span>
        </h1>

        <h2
          className="
            w-full
            p-2
            text-beige text-2xl font-maragsa text-center
            bg-blue
          "
        >
          The Patriotic AI - Converse with Rizal
        </h2>

        {showLogin ? (
          <LoginModal
            onSignUp={() => setShowLogin(false)}
            onLogin={() => {
              setIsLoggedIn(true);
              router.push("/chat");
            }}
          />
        ) : (
          <RegisterModal
            onSignIn={() => setShowLogin(true)}
            onSuccess={() => {
              setShowLogin(true);
            }}
          />
        )}
      </div>
    </main>
  );
}
