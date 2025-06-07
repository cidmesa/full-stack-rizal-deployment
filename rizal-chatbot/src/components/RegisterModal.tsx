"use client";
import { useState } from "react";
import API from "@/lib/api";
import TextField from "./TextField";
import ActionButton, { ButtonVariant } from "./ActionButton";

export default function RegisterModal({ onSignIn, onSuccess }: any) {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    general: "",
  });

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateUsername = (username: string) => {
    return username.length >= 3 && username.length <= 20;
  };

  const validatePassword = (password: string) => {
    return password.length >= 8;
  };

  const validatePasswordsMatch = (
    password: string,
    confirmPassword: string,
  ) => {
    return password === confirmPassword;
  };

  const register = async () => {
    // Reset all errors
    setErrors({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      general: "",
    });

    let hasError = false;
    const newErrors = {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      general: "",
    };

    // Validate all fields
    if (!validateUsername(form.username)) {
      newErrors.username = "Username must be between 3 and 20 characters";
      hasError = true;
    }

    if (!validateEmail(form.email)) {
      newErrors.email = "Please enter a valid email address";
      hasError = true;
    }

    if (!validatePassword(form.password)) {
      newErrors.password = "Password must be at least 8 characters long";
      hasError = true;
    }

    if (!validatePasswordsMatch(form.password, form.confirmPassword)) {
      newErrors.confirmPassword = "Passwords do not match";
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    try {
      await API.post("register/", form);
      onSuccess(); // switch to login
    } catch (err: any) {
      setErrors({
        ...newErrors,
        general: err.response?.data?.detail || "Registration failed",
      });
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
        onSubmit={register}
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
          Register
        </h2>

        {errors.general && (
          <p
            className="
              text-center font-pica text-lg text-red
            "
          >
            {errors.general}
          </p>
        )}

        <TextField
          placeholder="Username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e })}
          error={errors.username}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              register();
            }
          }}
        />

        <TextField
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e })}
          error={errors.email}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              register();
            }
          }}
        />

        <TextField
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e })}
          error={errors.password}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              register();
            }
          }}
        />

        <TextField
          placeholder="Confirm Password"
          type="password"
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e })}
          error={errors.confirmPassword}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              register();
            }
          }}
        />
      </form>

      <ActionButton label="Register" onClick={register} />
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
          Already have an account?
        </p>
        <hr
          className="
            flex-1
            border-1 border-blue
          "
        />
      </div>

      <ActionButton
        label="Sign In"
        variant={ButtonVariant.Outlined}
        onClick={onSignIn}
      />
    </div>
  );
}
