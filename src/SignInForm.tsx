"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");

  return (
    <div className="flex justify-center items-center min-h-[60vh] w-full">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 border border-gray-100">
        <div className="flex mb-4 gap-2 justify-center">
          <button
            className={`px-4 py-2 rounded ${mode === 'signIn' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setMode('signIn')}
          >
            Sign In
          </button>
          <button
            className={`px-4 py-2 rounded ${mode === 'signUp' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setMode('signUp')}
          >
            Sign Up
          </button>
        </div>
        <form
          className="flex flex-col gap-form-field"
          onSubmit={async (e) => {
            e.preventDefault();
            if (mode === "signUp" && password !== confirmPassword) {
              toast.error("Passwords do not match.");
              return;
            }
            let formattedName = name;
            if (mode === "signUp") {
              formattedName = name
                .split(' ')
                .filter(Boolean)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
            }
            setSubmitting(true);
            const formData = new FormData(e.target as HTMLFormElement);
            if (mode === "signUp") {
              formData.set("name", formattedName);
            }
            void signIn("password", formData)
              .then((session: any) => {
                if (mode === 'signUp') {
                  toast.success("Account created! You can now sign in.");
                  setMode('signIn');
                  setPassword("");
                  setConfirmPassword("");
                }
                setSubmitting(false);
              })
              .catch((error: any) => {
                toast.error(mode === 'signUp' ? "Could not sign up. Maybe the account already exists?" : "Invalid email or password.");
                setSubmitting(false);
              });
          }}
        >
          <input
            className="auth-input-field"
            type="email"
            name="email"
            placeholder="Email"
            required
          />
          <input
            className="auth-input-field"
            type="password"
            name="password"
            placeholder="Password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {mode === 'signUp' && (
            <input
              className="auth-input-field"
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          )}
          {mode === 'signUp' && (
            <input
              className="auth-input-field"
              type="text"
              name="name"
              placeholder="Adınız"
              required
              value={name}
              onChange={e => setName(e.target.value)}
            />
          )}
          <input type="hidden" name="flow" value={mode === 'signUp' ? 'signUp' : 'signIn'} />
          <button className="auth-button mt-2" type="submit" disabled={submitting}>
            {mode === 'signIn' ? 'Sign in' : 'Sign up'}
          </button>
        </form>
      </div>
    </div>
  );
}
