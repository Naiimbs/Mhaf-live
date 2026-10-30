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
import { useLanguage } from "@/lib/i18n/language-context";

interface RequestDemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SubmittedData {
  id: string;
  fullName: string;
  email: string;
  organization: string;
  useCase: string;
  hours: string;
  createdAt: string;
}

export function RequestDemoModal({ open, onOpenChange }: RequestDemoModalProps) {
  const { isFr } = useLanguage();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [organization, setOrganization] = React.useState("");
  const [useCase, setUseCase] = React.useState("Independent professional / client consultations");
  const [hours, setHours] = React.useState("50-200 hours");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [submittedData, setSubmittedData] = React.useState<SubmittedData | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) {
      errs.fullName = isFr ? "Le nom complet est requis." : "Full name is required.";
    } else if (fullName.trim().length < 2) {
      errs.fullName = isFr ? "Le nom doit contenir au moins 2 caractères." : "Full name must be at least 2 characters.";
    }

    if (!email.trim()) {
      errs.email = isFr ? "L’adresse e-mail est requise." : "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = isFr ? "Veuillez saisir une adresse e-mail valide." : "Please enter a valid work email address.";
    }

    if (!organization.trim()) {
      errs.organization = isFr ? "Le nom de l’entreprise, du cabinet ou de l’équipe est requis." : "Organization or company name is required.";
    } else if (organization.trim().length < 2) {
      errs.organization = isFr ? "Le nom doit contenir au moins 2 caractères." : "Organization name must be at least 2 characters.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          organization: organization.trim(),
          useCase,
          hours,
        }),
      });

      const data = await res.json();

      if (res.status === 201 && data.success) {
        setSubmittedData(data.data);
        setSubmitted(true);
      } else if (res.status === 400 && data.details) {
        setErrors(data.details);
      } else {
        setServerError(data.error || "Failed to submit demo request. Please try again.");
      }
    } catch {
      setServerError("A network connection error occurred. Please verify your internet and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFullName("");
    setEmail("");
    setOrganization("");
    setUseCase("Independent professional / client consultations");
    setHours("50-200 hours");
    setErrors({});
    setServerError(null);
    setSubmitted(false);
    setSubmittedData(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {submitted ? (isFr ? "Demande reçue" : "Request received") : (isFr ? "Parlons de MHAF Live" : "Talk to us about MHAF Live")}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {submitted
              ? (isFr ? "Votre demande a été enregistrée avec une référence." : "Your inquiry has been recorded and assigned a persistent reference ID.")
              : (isFr ? "Décrivez vos réunions avec vos clients ou votre équipe afin que nous puissions évaluer si MHAF Live correspond à vos besoins." : "Tell us how you meet with clients or collaborate with your team. We’ll use this to understand whether MHAF Live is a good fit.")}
          </DialogDescription>
        </DialogHeader>

        {!submitted ? (
          <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-2">
            {serverError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Full Name */}
            <div>
              <label
                htmlFor="demo-fullname"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                {isFr ? "Nom complet" : "Full Name"} <span className="text-destructive">*</span>
              </label>
              <input
                id="demo-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
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
                {isFr ? "Adresse e-mail" : "Email address"} <span className="text-destructive">*</span>
              </label>
              <input
                id="demo-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
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
                {isFr ? "Entreprise, cabinet, équipe ou indépendant" : "Business, practice, team, or independent"} <span className="text-destructive">*</span>
              </label>
              <input
                id="demo-org"
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="Your organization or “Independent”"
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
                {isFr ? "Quel est votre principal besoin ?" : "What best describes your use case?"}
              </label>
              <select
                id="demo-usecase"
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Independent professional / client consultations">{isFr ? "Indépendant / consultations clients" : "Independent professional / client consultations"}</option>
                <option value="Team meetings / project collaboration">{isFr ? "Réunions d’équipe / collaboration projet" : "Team meetings / project collaboration"}</option>
                <option value="Agency / client services">{isFr ? "Agence / services clients" : "Agency / client services"}</option>
                <option value="Client booking and scheduling">{isFr ? "Réservation client et planification" : "Client booking and scheduling"}</option>
                <option value="Self-hosted / deployment evaluation">{isFr ? "Auto-hébergement / évaluation du déploiement" : "Self-hosted / deployment evaluation"}</option>
              </select>
            </div>

            {/* Expected Hours */}
            <div>
              <label
                htmlFor="demo-hours"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                {isFr ? "Volume mensuel approximatif de réunions" : "Approximate monthly meeting volume"}
              </label>
              <select
                id="demo-hours"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Under 50 hours">{isFr ? "Moins de 50 heures" : "Under 50 hours"}</option>
                <option value="50-200 hours">{isFr ? "50 à 200 heures" : "50–200 hours"}</option>
                <option value="200-1,000 hours">{isFr ? "200 à 1 000 heures" : "200–1,000 hours"}</option>
                <option value="1,000+ hours (High Concurrency)">{isFr ? "Plus de 1 000 heures (forte simultanéité)" : "1,000+ hours (High Concurrency)"}</option>
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
                    <Loader2 className="h-4 w-4 animate-spin" /> {isFr ? "Envoi en cours..." : "Submitting request..."}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> {isFr ? "Envoyer la demande" : "Send request"}
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
              {isFr ? "Merci, " : "Thank you, "}<strong>{fullName}</strong>. {isFr ? "Votre demande pour" : "Your request for"} <strong>{organization}</strong> {isFr ? "a été enregistrée. Nous pourrons vous contacter à l’adresse e-mail fournie." : "has been recorded. Our team can follow up using the work email you provided."}
            </p>
            <div className="rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs text-muted-foreground text-left space-y-1">
              {submittedData?.id && (
                <div className="text-[11px] text-primary/80 font-semibold truncate">
                  Ref: {submittedData.id}
                </div>
              )}
              <div>{isFr ? "E-mail" : "Email"}: {email}</div>
              <div>{isFr ? "Besoin" : "Focus"}: {useCase}</div>
              <div>{isFr ? "Volume estimé" : "Estimated Scale"}: {hours}</div>
            </div>
            <Button onClick={handleReset} className="w-full min-h-[44px]">
              {isFr ? "Fermer et retourner à la page" : "Close & Return to Page"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
