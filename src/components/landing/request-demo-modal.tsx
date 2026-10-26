"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, Send, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface RequestDemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestDemoModal({ open, onOpenChange }: RequestDemoModalProps) {
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [organization, setOrganization] = React.useState("");
  const [useCase, setUseCase] = React.useState("Enterprise Video Meetings");
  const [hours, setHours] = React.useState("50-200 hours");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) {
      errs.fullName = "Full name is required.";
    }
    if (!email.trim()) {
      errs.email = "Work email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Please enter a valid email address.";
    }
    if (!organization.trim()) {
      errs.organization = "Organization or company name is required.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    // Simulate honest submission processing
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  const handleReset = () => {
    setFullName("");
    setEmail("");
    setOrganization("");
    setUseCase("Enterprise Video Meetings");
    setHours("50-200 hours");
    setErrors({});
    setSubmitted(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {submitted ? "Demo Request Received" : "Request Enterprise Demo"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {submitted
              ? "Your inquiry has been recorded successfully in this preview environment."
              : "Connect with our architecture team to evaluate MHAF Live deployment models."}
          </DialogDescription>
        </DialogHeader>

        {!submitted ? (
          <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-2">
            {/* Full Name */}
            <div>
              <label
                htmlFor="demo-fullname"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Full Name <span className="text-destructive">*</span>
              </label>
              <input
                id="demo-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Sarah Connor"
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 ${
                  errors.fullName
                    ? "border-destructive focus:ring-destructive"
                    : "border-border focus:ring-ring"
                }`}
              />
              {errors.fullName && (
                <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.fullName}
                </p>
              )}
            </div>

            {/* Work Email */}
            <div>
              <label
                htmlFor="demo-email"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Work Email <span className="text-destructive">*</span>
              </label>
              <input
                id="demo-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@organization.com"
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 ${
                  errors.email
                    ? "border-destructive focus:ring-destructive"
                    : "border-border focus:ring-ring"
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.email}
                </p>
              )}
            </div>

            {/* Organization */}
            <div>
              <label
                htmlFor="demo-org"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Organization / Company <span className="text-destructive">*</span>
              </label>
              <input
                id="demo-org"
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="Acme Health or Tech Corp"
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 ${
                  errors.organization
                    ? "border-destructive focus:ring-destructive"
                    : "border-border focus:ring-ring"
                }`}
              />
              {errors.organization && (
                <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.organization}
                </p>
              )}
            </div>

            {/* Primary Use Case */}
            <div>
              <label
                htmlFor="demo-usecase"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Primary Architectural Focus
              </label>
              <select
                id="demo-usecase"
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Enterprise Video Meetings">Enterprise Video Meetings</option>
                <option value="Confidential Telehealth / Medical">Confidential Telehealth / Medical</option>
                <option value="Legal & Executive Consultations">Legal & Executive Consultations</option>
                <option value="Self-Hosted LiveKit SFU Architecture">Self-Hosted LiveKit SFU Architecture</option>
              </select>
            </div>

            {/* Expected Hours */}
            <div>
              <label
                htmlFor="demo-hours"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Estimated Monthly Meeting Hours
              </label>
              <select
                id="demo-hours"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Under 50 hours">Under 50 hours</option>
                <option value="50-200 hours">50–200 hours</option>
                <option value="200-1,000 hours">200–1,000 hours</option>
                <option value="1,000+ hours (High Concurrency)">1,000+ hours (High Concurrency)</option>
              </select>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[44px] gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Submitting Request...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Submit Demo Request
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Thank you, <strong>{fullName}</strong>. In this development preview, your
              inquiry for <strong>{organization}</strong> is staged locally without external email dispatch.
            </p>
            <div className="rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs text-muted-foreground text-left">
              <div>Email: {email}</div>
              <div>Focus: {useCase}</div>
              <div>Estimated Scale: {hours}</div>
            </div>
            <Button onClick={handleReset} className="w-full min-h-[44px]">
              Close & Return to Page
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
