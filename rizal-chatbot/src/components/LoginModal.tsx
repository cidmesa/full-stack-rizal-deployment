"use client";
import { useState } from "react";
import API from "@/lib/api";
import ActionButton, { ButtonVariant } from "./ActionButton";
import TextField from "./TextField";

export default function LoginModal({ onSignUp, onLogin }: any) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  const login = async () => {
    try {
      const res = await API.post("token/", form);
      localStorage.setItem("access_token", res.data.access);
      localStorage.setItem("refresh_token", res.data.refresh);
      onLogin(); // proceed to chat page or dashboard
    } catch (err: any) {
      setError("Invalid credentials");
    }
  };

  return (
    <div
      className="
        flex flex-col
        w-full
        p-5
        gap-5
      "
    >
      <br />

      <form
        onSubmit={login}
        className="
          flex flex-col
          gap-5
        "
      >
        <h2
          className="
            text-blue text-2xl font-maragsa
          "
        >
          Sign In
        </h2>

        {error && (
          <p
            className="
              text-center font-pica text-lg text-red
            "
          >
            {error}
          </p>
        )}

        <TextField
          placeholder="Username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              login();
            }
          }}
        />

        <TextField
          placeholder="Password"
          value={form.password}
          type="password"
          onChange={(e) => setForm({ ...form, password: e })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              login();
            }
          }}
        />
      </form>

      <ActionButton label="Sign In" onClick={login} />

      <br />

      <div
        className="
          flex
          items-center gap-4
        "
      >
        <hr
          className="
            flex-1
            border-1 border-blue
          "
        />
        <p
          className="
            text-center font-pica text-lg text-blue
          "
        >
          New to RizalGPT?
        </p>
        <hr
          className="
            flex-1
            border-1 border-blue
          "
        />
      </div>
      <ActionButton
        label="Sign Up"
        variant={ButtonVariant.Outlined}
        onClick={onSignUp}
      />
    </div>
  );
}
