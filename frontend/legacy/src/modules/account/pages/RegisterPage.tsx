import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import {
  completeRegistration,
  startRegistration,
  verifyRegistrationEmail,
  verifyRegistrationPhone
} from "../api/account-api";
import type { RegistrationStartResponse } from "../api/account-api";

type Step = "details" | "verify-email" | "verify-phone" | "password";

export function RegisterPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("details");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [registration, setRegistration] = useState<RegistrationStartResponse | null>(null);
  const [emailCode, setEmailCode] = useState("");
  const [phoneCode, setPhoneCode] = useState("");

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  function handleError(err: unknown) {
    setError(err instanceof Error ? err.message : "Something went wrong");
  }

  async function submitDetails(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await startRegistration({
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate,
        email,
        phone: phone || null
      });
      setRegistration(res);
      setStep(res.email_verification_required ? "verify-email" : "password");
    } catch (err) {
      handleError(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitEmailCode(event: FormEvent) {
    event.preventDefault();
    if (!registration) return;
    setError(null);
    setSubmitting(true);
    try {
      await verifyRegistrationEmail(registration.registration_id, emailCode);
      setStep(registration.phone_verification_required ? "verify-phone" : "password");
    } catch (err) {
      handleError(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitPhoneCode(event: FormEvent) {
    event.preventDefault();
    if (!registration) return;
    setError(null);
    setSubmitting(true);
    try {
      await verifyRegistrationPhone(registration.registration_id, phoneCode);
      setStep("password");
    } catch (err) {
      handleError(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitPassword(event: FormEvent) {
    event.preventDefault();
    if (!registration) return;
    if (password !== passwordConfirmation) {
      setError("Passwords do not match");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await completeRegistration({
        registration_id: registration.registration_id,
        password,
        password_confirmation: passwordConfirmation
      });
      navigate("/account/login");
    } catch (err) {
      handleError(err);
    } finally {
      setSubmitting(false);
    }
  }

  const steps: { key: Step; label: string }[] = [
    { key: "details", label: "1. Details" },
    { key: "verify-email", label: "2. Email" },
    { key: "verify-phone", label: "3. Phone" },
    { key: "password", label: "4. Password" }
  ];

  return (
    <div className="acc-container">
      <h2 className="acc-heading">Create account</h2>
      <p className="acc-subheading">Registration takes just a few steps.</p>

      <div className="acc-stepper">
        {steps.map((s) => (
          <span key={s.key} className={`acc-step${step === s.key ? " active" : ""}`}>
            {s.label}
          </span>
        ))}
      </div>

      <div className="acc-card">
        {error && <p className="acc-error" style={{ marginBottom: 16 }}>{error}</p>}

        {step === "details" && (
          <form className="acc-form" onSubmit={submitDetails}>
            <div className="acc-field-row">
              <div className="acc-field">
                <label htmlFor="reg-first">First name</label>
                <input
                  id="reg-first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="acc-field">
                <label htmlFor="reg-last">Last name</label>
                <input
                  id="reg-last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="acc-field">
              <label htmlFor="reg-birth">Birth date</label>
              <input
                id="reg-birth"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
              />
            </div>
            <div className="acc-field">
              <label htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="acc-field">
              <label htmlFor="reg-phone">Phone (optional)</label>
              <input
                id="reg-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>
            <button className="acc-btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Continue"}
            </button>
          </form>
        )}

        {step === "verify-email" && (
          <form className="acc-form" onSubmit={submitEmailCode}>
            <p className="acc-muted">We sent a verification code to {email}.</p>
            <div className="acc-field">
              <label htmlFor="reg-email-code">Email code</label>
              <input
                id="reg-email-code"
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value)}
                required
              />
            </div>
            <button className="acc-btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Verifying…" : "Verify email"}
            </button>
          </form>
        )}

        {step === "verify-phone" && (
          <form className="acc-form" onSubmit={submitPhoneCode}>
            <p className="acc-muted">Enter the code sent to your phone.</p>
            <div className="acc-field">
              <label htmlFor="reg-phone-code">Phone code</label>
              <input
                id="reg-phone-code"
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value)}
                required
              />
            </div>
            <button className="acc-btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Verifying…" : "Verify phone"}
            </button>
          </form>
        )}

        {step === "password" && (
          <form className="acc-form" onSubmit={submitPassword}>
            <div className="acc-field">
              <label htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="acc-field">
              <label htmlFor="reg-password-confirm">Confirm password</label>
              <input
                id="reg-password-confirm"
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <button className="acc-btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
