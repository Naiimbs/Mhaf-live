"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Calendar,
  LogIn,
  Copy,
  Check,
  ArrowRight,
  Loader2,
  Users,
  Clock,
  Mail,
  Shield,
  Video,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function RoomLauncher() {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<"instant" | "schedule" | "join">("instant");

  // Instant Room Form State
  const [instantName, setInstantName] = React.useState("");
  const [instantTitle, setInstantTitle] = React.useState("");
  const [instantLoading, setInstantLoading] = React.useState(false);
  const [createdInstantRoom, setCreatedInstantRoom] = React.useState<{ uid: string; url: string } | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);

  // Scheduled Room Form State
  const [schedHostName, setSchedHostName] = React.useState("");
  const [schedAttendeeName, setSchedAttendeeName] = React.useState("");
  const [schedAttendeeEmail, setSchedAttendeeEmail] = React.useState("");
  const [schedTitle, setSchedTitle] = React.useState("");
  const [schedDateTime, setSchedDateTime] = React.useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    d.setMinutes(0, 0, 0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [schedDuration, setSchedDuration] = React.useState<number>(30);
  const [schedLoading, setSchedLoading] = React.useState(false);
  const [schedSuccess, setSchedSuccess] = React.useState<{
    uid: string;
    fullRoomUrl: string;
    emailSent: boolean;
    emailError?: string;
  } | null>(null);
  const [schedError, setSchedError] = React.useState<string | null>(null);

  // Join Existing Room State
  const [joinInput, setJoinInput] = React.useState("");
  const [joinName, setJoinName] = React.useState("");
  const [joinError, setJoinError] = React.useState<string | null>(null);

  // Handle Instant Room Creation
  const handleCreateInstant = async (andEnter: boolean) => {
    setInstantLoading(true);
    setCreatedInstantRoom(null);
    try {
      if (instantName.trim()) {
        try {
          localStorage.setItem("mhaf_display_name", instantName.trim());
        } catch (_) {}
      }

      const res = await fetch("/api/rooms/instant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: instantTitle.trim() || "Réunion Instantanée",
          userName: instantName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible de créer la réunion.");

      const fullUrl = `${window.location.origin}/rooms/${data.roomUid}`;
      setCreatedInstantRoom({ uid: data.roomUid, url: fullUrl });

      if (andEnter) {
        router.push(`/rooms/${data.roomUid}`);
      }
    } catch (err: any) {
      alert(err.message || "Erreur lors de la création de la salle.");
    } finally {
      setInstantLoading(false);
    }
  };

  // Handle Schedule Room Creation
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSchedLoading(true);
    setSchedError(null);
    setSchedSuccess(null);

    try {
      if (!schedAttendeeName.trim() || !schedAttendeeEmail.trim()) {
        throw new Error("Veuillez renseigner le nom et l'email du participant.");
      }

      const res = await fetch("/api/schedule/quick-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostName: schedHostName.trim() || undefined,
          attendeeName: schedAttendeeName.trim(),
          attendeeEmail: schedAttendeeEmail.trim(),
          title: schedTitle.trim() || "Réunion MHAF Live",
          startTime: new Date(schedDateTime).toISOString(),
          durationMinutes: schedDuration,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la programmation.");

      setSchedSuccess({
        uid: data.roomUid,
        fullRoomUrl: data.fullRoomUrl || `${window.location.origin}/rooms/${data.roomUid}`,
        emailSent: data.emailSent,
        emailError: data.emailError,
      });
    } catch (err: any) {
      setSchedError(err.message || "Erreur lors de la programmation.");
    } finally {
      setSchedLoading(false);
    }
  };

  // Handle Join Existing
  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);

    const raw = joinInput.trim();
    if (!raw) {
      setJoinError("Veuillez saisir un identifiant de salle ou un lien.");
      return;
    }

    // Extract slug if full URL was pasted
    let slug = raw;
    if (raw.includes("/rooms/")) {
      const parts = raw.split("/rooms/");
      slug = parts[parts.length - 1].split("?")[0].replace(/\/$/, "");
    }

    if (joinName.trim()) {
      try {
        localStorage.setItem("mhaf_display_name", joinName.trim());
      } catch (_) {}
    }

    router.push(`/rooms/${slug}`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl border border-border/80 bg-card/90 backdrop-blur-xl shadow-2xl p-4 sm:p-8 transition-all">
      {/* Mode Selector Tabs */}
      <div className="flex p-1.5 rounded-2xl bg-muted/60 border border-border/60 max-w-xl mx-auto mb-8">
        <button
          type="button"
          onClick={() => {
            setActiveTab("instant");
            setCreatedInstantRoom(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === "instant"
              ? "bg-background text-foreground shadow-sm border border-border/80 text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Zap className="h-4 w-4 text-amber-500" />
          <span>Instantanée</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("schedule");
            setSchedSuccess(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === "schedule"
              ? "bg-background text-foreground shadow-sm border border-border/80 text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="h-4 w-4 text-emerald-500" />
          <span>Programmer</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("join");
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === "join"
              ? "bg-background text-foreground shadow-sm border border-border/80 text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LogIn className="h-4 w-4 text-blue-500" />
          <span>Rejoindre</span>
        </button>
      </div>

      {/* ---------------- TAB 1: INSTANT ROOM ---------------- */}
      {activeTab === "instant" && (
        <div className="space-y-6">
          <div className="text-center max-w-lg mx-auto space-y-1">
            <h3 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Lancer une réunion instantanée
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Créez une salle LiveKit ultra-sécurisée en 1 seconde. Aucun compte obligatoire.
            </p>
          </div>

          {!createdInstantRoom ? (
            <div className="max-w-md mx-auto space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/90">
                  Votre nom d&apos;affichage
                </label>
                <Input
                  placeholder="Ex: Naïm B."
                  value={instantName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInstantName(e.target.value)}
                  className="h-11 rounded-xl bg-background/50 border-border"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/90">
                  Sujet ou titre (optionnel)
                </label>
                <Input
                  placeholder="Ex: Point Rapide, Démo Client, Standup"
                  value={instantTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInstantTitle(e.target.value)}
                  className="h-11 rounded-xl bg-background/50 border-border"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => handleCreateInstant(true)}
                  disabled={instantLoading}
                  className="flex-1 h-12 rounded-xl text-sm font-bold shadow-md gap-2"
                >
                  {instantLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Video className="h-4 w-4" />
                  )}
                  Entrer dans la salle
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleCreateInstant(false)}
                  disabled={instantLoading}
                  className="h-12 rounded-xl text-sm font-medium border-border hover:bg-muted"
                >
                  Créer le lien
                </Button>
              </div>

              <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-emerald-500" /> Chiffré & Éphémère
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-primary" /> Audio & Vidéo HD
                </span>
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mx-auto border border-emerald-500/20">
                <Check className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-foreground">Votre salle est prête !</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Partagez ce lien avec vos participants pour qu&apos;ils rejoignent immédiatement.
                </p>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-xl bg-background/80 border border-border text-xs font-mono">
                <span className="truncate flex-1 text-left px-2 text-foreground">
                  {createdInstantRoom.url}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(createdInstantRoom.url)}
                  className="h-8 px-2.5 text-xs gap-1 text-primary hover:text-primary"
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedLink ? "Copié !" : "Copier"}
                </Button>
              </div>

              <div className="pt-2 flex gap-3">
                <Button
                  onClick={() => router.push(`/rooms/${createdInstantRoom.uid}`)}
                  className="flex-1 h-11 rounded-xl text-xs font-bold gap-1.5"
                >
                  <Video className="h-3.5 w-3.5" /> Rejoindre la salle
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCreatedInstantRoom(null)}
                  className="h-11 rounded-xl text-xs"
                >
                  Créer une autre
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------- TAB 2: SCHEDULE MEETING ---------------- */}
      {activeTab === "schedule" && (
        <div className="space-y-6">
          <div className="text-center max-w-lg mx-auto space-y-1">
            <h3 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-500" />
              Programmer une réunion
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Fixez une date et envoyez automatiquement l&apos;invitation et le lien par email.
            </p>
          </div>

          {!schedSuccess ? (
            <form onSubmit={handleScheduleSubmit} className="max-w-xl mx-auto space-y-4">
              {schedError && (
                <div className="p-3 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 text-xs">
                  {schedError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/90">
                    Votre nom (Hôte)
                  </label>
                  <Input
                    placeholder="Ex: Naïm B."
                    value={schedHostName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSchedHostName(e.target.value)}
                    className="h-11 rounded-xl bg-background/50 border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/90">
                    Titre de la réunion
                  </label>
                  <Input
                    placeholder="Ex: Entretien technique"
                    value={schedTitle}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSchedTitle(e.target.value)}
                    className="h-11 rounded-xl bg-background/50 border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/90">
                    Nom du participant *
                  </label>
                  <Input
                    required
                    placeholder="Ex: Sophie Martin"
                    value={schedAttendeeName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSchedAttendeeName(e.target.value)}
                    className="h-11 rounded-xl bg-background/50 border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/90">
                    Email du participant *
                  </label>
                  <Input
                    required
                    type="email"
                    placeholder="sophie@exemple.com"
                    value={schedAttendeeEmail}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSchedAttendeeEmail(e.target.value)}
                    className="h-11 rounded-xl bg-background/50 border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/90">
                    Date & Heure de début
                  </label>
                  <Input
                    required
                    type="datetime-local"
                    value={schedDateTime}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSchedDateTime(e.target.value)}
                    className="h-11 rounded-xl bg-background/50 border-border font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/90">
                    Durée estimée
                  </label>
                  <div className="flex items-center gap-2 h-11">
                    {[15, 30, 45, 60].map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setSchedDuration(dur)}
                        className={`flex-1 h-full rounded-xl text-xs font-semibold transition-all border ${
                          schedDuration === dur
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {dur}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={schedLoading}
                className="w-full h-12 rounded-xl text-sm font-bold shadow-md gap-2 mt-2"
              >
                {schedLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Programmer & Envoyer l&apos;invitation par email
              </Button>
            </form>
          ) : (
            <div className="max-w-md mx-auto rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mx-auto border border-emerald-500/20">
                <Check className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-foreground">Réunion programmée avec succès !</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {schedSuccess.emailSent ? (
                    <span className="text-emerald-400 font-medium">
                      ✓ Email de confirmation envoyé avec succès à {schedAttendeeEmail}.
                    </span>
                  ) : (
                    <span className="text-amber-400">
                      (Note: l&apos;email n&apos;a pas pu être délivré: {schedSuccess.emailError || "vérifiez la configuration"})
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-xl bg-background/80 border border-border text-xs font-mono">
                <span className="truncate flex-1 text-left px-2 text-foreground">
                  {schedSuccess.fullRoomUrl}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(schedSuccess.fullRoomUrl)}
                  className="h-8 px-2.5 text-xs gap-1 text-primary hover:text-primary"
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedLink ? "Copié !" : "Copier"}
                </Button>
              </div>

              <div className="pt-2 flex gap-3">
                <Button
                  onClick={() => router.push(`/rooms/${schedSuccess.uid}`)}
                  className="flex-1 h-11 rounded-xl text-xs font-bold gap-1.5"
                >
                  <Video className="h-3.5 w-3.5" /> Ouvrir la salle
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSchedSuccess(null)}
                  className="h-11 rounded-xl text-xs"
                >
                  Nouvelle réunion
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------- TAB 3: JOIN EXISTING ROOM ---------------- */}
      {activeTab === "join" && (
        <div className="space-y-6">
          <div className="text-center max-w-lg mx-auto space-y-1">
            <h3 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
              <LogIn className="h-5 w-5 text-blue-500" />
              Rejoindre une réunion existante
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Collez l&apos;identifiant de la salle ou le lien d&apos;invitation reçu.
            </p>
          </div>

          <form onSubmit={handleJoinSubmit} className="max-w-md mx-auto space-y-4">
            {joinError && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 text-xs">
                {joinError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/90">
                Identifiant ou lien de la salle *
              </label>
              <Input
                required
                placeholder="Ex: instant-demo ou mhaf-mvqrtr6k-aktt"
                value={joinInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJoinInput(e.target.value)}
                className="h-11 rounded-xl bg-background/50 border-border font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/90">
                Votre nom d&apos;affichage
              </label>
              <Input
                placeholder="Ex: Naïm B."
                value={joinName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJoinName(e.target.value)}
                className="h-11 rounded-xl bg-background/50 border-border"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-sm font-bold shadow-md gap-2"
            >
              <ArrowRight className="h-4 w-4" /> Entrer dans la salle
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
