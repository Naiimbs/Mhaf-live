export type Locale = "en" | "fr";

export interface TranslationDictionary {
  common: {
    loading: string;
    cancel: string;
    confirm: string;
    save: string;
    saved: string;
    delete: string;
    copy: string;
    copied: string;
    today: string;
    tomorrow: string;
    yesterday: string;
    close: string;
    back: string;
    or: string;
    min: string;
    minutes: string;
    hours: string;
    host: string;
    guest: string;
    you: string;
    cameraOff: string;
    speaking: string;
  };
  nav: {
    calendar: string;
    bookings: string;
    availability: string;
    settings: string;
    signIn: string;
    getStarted: string;
    signOut: string;
    newMeeting: string;
    schedule: string;
    instantMeet: string;
    home: string;
  };
  landing: {
    heroBadge: string;
    heroTitle1: string;
    heroTitle2: string;
    heroSubtitle: string;
    startInstant: string;
    viewBooking: string;
    instantTitle: string;
    instantDesc: string;
    bookingTitle: string;
    bookingDesc: string;
    securityTitle: string;
    securityDesc: string;
    whyTitle: string;
    whySubtitle: string;
    feature1Title: string;
    feature1Desc: string;
    feature2Title: string;
    feature2Desc: string;
    feature3Title: string;
    feature3Desc: string;
    ctaTitle: string;
    ctaSubtitle: string;
    ctaButton: string;
    footerDesc: string;
    allRightsReserved: string;
  };
  dashboard: {
    meetingsInOneWeek: string;
    meetingsSubtitle: string;
    newBookingLink: string;
    scheduleMeeting: string;
    instantMeeting: string;
    startingInstant: string;
    today: string;
    timeline: string;
    calendar: string;
    previousWeek: string;
    nextWeek: string;
    noMeetingsForDay: string;
    copyLink: string;
    enterRoom: string;
    cancelMeeting: string;
    confirmed: string;
    scheduled: string;
    live: string;
    completed: string;
    cancelled: string;
    bookingSource: string;
    scheduledSource: string;
    instantSource: string;
    copySuccess: string;
  };
  bookings: {
    title: string;
    subtitle: string;
    upcoming: string;
    past: string;
    client: string;
    meeting: string;
    date: string;
    time: string;
    status: string;
    actions: string;
    noBookings: string;
    cancelBooking: string;
    resendEmail: string;
    joinCall: string;
  };
  availability: {
    title: string;
    subtitle: string;
    weeklyHours: string;
    bufferTime: string;
    bufferDesc: string;
    timezone: string;
    saveChanges: string;
    saving: string;
  };
  settings: {
    title: string;
    subtitle: string;
    profile: string;
    language: string;
    languageDesc: string;
    timezone: string;
    security: string;
    securityDesc: string;
  };
  room: {
    mute: string;
    unmute: string;
    cameraOn: string;
    cameraOff: string;
    shareScreen: string;
    stopSharing: string;
    leaveCall: string;
    chat: string;
    participants: string;
    lockRoom: string;
    unlockRoom: string;
    copyInvite: string;
    inviteCopied: string;
    fitFrame: string;
    fillFrame: string;
    record: string;
    recording: string;
    waitingParticipants: string;
    waitingForName: string;
    waitingDesc: string;
    chatPlaceholder: string;
    send: string;
    sessionLive: string;
    screensharePaused: string;
    screensharePausedDesc: string;
  };
  bookingPublic: {
    selectDateTime: string;
    selectDate: string;
    selectTime: string;
    enterDetails: string;
    fullName: string;
    email: string;
    notes: string;
    notesPlaceholder: string;
    confirmBooking: string;
    bookingConfirmed: string;
    confirmationSent: string;
    enterMeetingRoom: string;
    durationMinutes: string;
    hostName: string;
  };
  auth: {
    signInTitle: string;
    signInSubtitle: string;
    emailLabel: string;
    emailPlaceholder: string;
    sendLink: string;
    sending: string;
    linkSentTitle: string;
    linkSentDesc: string;
    registerTitle: string;
    registerSubtitle: string;
    nameLabel: string;
    passwordLabel: string;
    createAccount: string;
    verifyTitle: string;
    verifySubtitle: string;
    continueToDashboard: string;
    verifying: string;
    linkExpiryNotice: string;
  };
}

export const translations: Record<Locale, TranslationDictionary> = {
  en: {
    common: {
      loading: "Loading...",
      cancel: "Cancel",
      confirm: "Confirm",
      save: "Save",
      saved: "Saved successfully",
      delete: "Delete",
      copy: "Copy",
      copied: "Copied!",
      today: "Today",
      tomorrow: "Tomorrow",
      yesterday: "Yesterday",
      close: "Close",
      back: "Back",
      or: "or",
      min: "min",
      minutes: "minutes",
      hours: "hours",
      host: "Host",
      guest: "Guest",
      you: "You",
      cameraOff: "Camera Off",
      speaking: "Speaking",
    },
    nav: {
      calendar: "Calendar",
      bookings: "Bookings",
      availability: "Availability",
      settings: "Settings",
      signIn: "Sign In",
      getStarted: "Get Started",
      signOut: "Sign Out",
      newMeeting: "New Meeting",
      schedule: "Schedule",
      instantMeet: "Instant Meet",
      home: "Home",
    },
    landing: {
      heroBadge: "Scheduling + video meetings for professionals",
      heroTitle1: "From booking",
      heroTitle2: "to conversation.",
      heroSubtitle:
        "MHAF Live brings scheduling and real-time video meetings into one clear workflow for independent professionals and teams. Guests can join through a shared link.",
      startInstant: "Start Instant Meeting",
      viewBooking: "View Booking Flow",
      instantTitle: "Instant Video Rooms",
      instantDesc: "Launch isolated, encrypted peer-to-peer rooms in seconds with zero configuration.",
      bookingTitle: "Autonomous Scheduling",
      bookingDesc: "Share custom booking links with automatic calendar buffer protection and time zone detection.",
      securityTitle: "Enterprise Privacy",
      securityDesc: "Meetings self-destruct after use with strict access tokens and host controls.",
      whyTitle: "Designed for seamless communication",
      whySubtitle: "Everything you need for client consultations, team standups, and high-trust discussions.",
      feature1Title: "Zero-Friction Client Access",
      feature1Desc: "Invite clients without accounts, downloads, or sign-up hurdles. One direct link opens high-definition WebRTC video.",
      feature2Title: "Integrated Scheduling & Booking",
      feature2Desc: "Autonomous host booking links, buffer times, and conflict protection tied directly to your calendar.",
      feature3Title: "High-Assurance Privacy",
      feature3Desc: "End-to-end encrypted rooms, automatic ephemeral session expiry, and strict host controls.",
      ctaTitle: "Experience effortless client meetings.",
      ctaSubtitle: "Start your instant meeting now or establish your dedicated scheduling dashboard.",
      ctaButton: "Get Started Free",
      footerDesc: "Autonomous WebRTC meeting platform with integrated client booking and scheduling.",
      allRightsReserved: "All rights reserved.",
    },
    dashboard: {
      meetingsInOneWeek: "Your meetings, in one week.",
      meetingsSubtitle: "Bookings and meetings shown in your host time zone.",
      newBookingLink: "New booking link",
      scheduleMeeting: "Schedule meeting",
      instantMeeting: "Instant meeting",
      startingInstant: "Starting...",
      today: "Today",
      timeline: "Timeline",
      calendar: "Calendar",
      previousWeek: "Previous week",
      nextWeek: "Next week",
      noMeetingsForDay: "No meetings scheduled for this day.",
      copyLink: "Copy link",
      enterRoom: "Enter room",
      cancelMeeting: "Cancel",
      confirmed: "CONFIRMED",
      scheduled: "SCHEDULED",
      live: "LIVE",
      completed: "COMPLETED",
      cancelled: "CANCELLED",
      bookingSource: "BOOKING",
      scheduledSource: "SCHEDULED",
      instantSource: "INSTANT",
      copySuccess: "Link copied to clipboard",
    },
    bookings: {
      title: "Your Bookings",
      subtitle: "Manage client bookings, confirmations, and meeting rooms.",
      upcoming: "Upcoming",
      past: "Past",
      client: "Client",
      meeting: "Meeting",
      date: "Date",
      time: "Time",
      status: "Status",
      actions: "Actions",
      noBookings: "No bookings found.",
      cancelBooking: "Cancel booking",
      resendEmail: "Resend confirmation email",
      joinCall: "Enter room",
    },
    availability: {
      title: "Availability & Hours",
      subtitle: "Set your weekly booking availability and timezone.",
      weeklyHours: "Weekly Working Hours",
      bufferTime: "Buffer Between Meetings",
      bufferDesc: "Ensure breathing room between client appointments.",
      timezone: "Host Time Zone",
      saveChanges: "Save Changes",
      saving: "Saving...",
    },
    settings: {
      title: "Account & Preferences",
      subtitle: "Manage your profile, language, and security settings.",
      profile: "Host Profile",
      language: "Language / Langue",
      languageDesc: "Choose your preferred interface and notification language.",
      timezone: "Time Zone",
      security: "Security & Sessions",
      securityDesc: "mhaf meet sessions use isolated peer rooms with encrypted audio/video channels.",
    },
    room: {
      mute: "Mute",
      unmute: "Unmute",
      cameraOn: "Turn Camera On",
      cameraOff: "Turn Camera Off",
      shareScreen: "Share Screen",
      stopSharing: "Stop Sharing",
      leaveCall: "Leave Call",
      chat: "Chat",
      participants: "Participants",
      lockRoom: "Lock Room",
      unlockRoom: "Unlock Room",
      copyInvite: "Copy invite link",
      inviteCopied: "Invite link copied!",
      fitFrame: "Fit to frame",
      fillFrame: "Fill frame",
      record: "Record",
      recording: "Recording",
      waitingParticipants: "Waiting for other participants",
      waitingForName: "Waiting for {name} to join",
      waitingDesc: "Share the invite link using the button above. Connected participants will appear in Microsoft Teams-style Gallery view.",
      chatPlaceholder: "Type a message...",
      send: "Send",
      sessionLive: "SESSION LIVE",
      screensharePaused: "Mobile screen share paused",
      screensharePausedDesc: "The presenter is navigating on their device. Broadcast will resume once they return.",
    },
    bookingPublic: {
      selectDateTime: "Select Date & Time",
      selectDate: "Select a date",
      selectTime: "Select a time slot",
      enterDetails: "Your Details",
      fullName: "Your full name",
      email: "Email address",
      notes: "Additional notes (optional)",
      notesPlaceholder: "Share any details or questions for our call...",
      confirmBooking: "Confirm Booking",
      bookingConfirmed: "Meeting Confirmed!",
      confirmationSent: "A confirmation email with the meeting room link has been sent to your inbox.",
      enterMeetingRoom: "Enter Meeting Room",
      durationMinutes: "Duration",
      hostName: "Host",
    },
    auth: {
      signInTitle: "Sign in to mhaf meet",
      signInSubtitle: "Enter your host email and we’ll send you a secure sign-in link.",
      emailLabel: "Host Email Address",
      emailPlaceholder: "name@example.com",
      sendLink: "Send sign-in link",
      sending: "Sending link...",
      linkSentTitle: "Check your inbox",
      linkSentDesc: "If an account exists for that email, a sign-in link will arrive shortly.",
      registerTitle: "Create Host Account",
      registerSubtitle: "Establish your booking calendar, custom event types, and scheduling engine.",
      nameLabel: "Your Name",
      passwordLabel: "Password",
      createAccount: "Create Host Account",
      verifyTitle: "Confirm your sign-in",
      verifySubtitle: "Continue to securely sign in to your mhaf meet host dashboard.",
      continueToDashboard: "Continue to dashboard",
      verifying: "Verifying token...",
      linkExpiryNotice: "For your security, the link can only be used once and expires after 15 minutes.",
    },
  },
  fr: {
    common: {
      loading: "Chargement...",
      cancel: "Annuler",
      confirm: "Confirmer",
      save: "Enregistrer",
      saved: "Enregistré avec succès",
      delete: "Supprimer",
      copy: "Copier",
      copied: "Copié !",
      today: "Aujourd'hui",
      tomorrow: "Demain",
      yesterday: "Hier",
      close: "Fermer",
      back: "Retour",
      or: "ou",
      min: "min",
      minutes: "minutes",
      hours: "heures",
      host: "Hôte",
      guest: "Invité",
      you: "Vous",
      cameraOff: "Caméra coupée",
      speaking: "En train de parler",
    },
    nav: {
      calendar: "Calendrier",
      bookings: "Réservations",
      availability: "Disponibilités",
      settings: "Paramètres",
      signIn: "Connexion",
      getStarted: "Commencer",
      signOut: "Déconnexion",
      newMeeting: "Nouvelle réunion",
      schedule: "Planifier",
      instantMeet: "Réunion directe",
      home: "Accueil",
    },
    landing: {
      heroBadge: "Planification et visioconférence pour les professionnels",
      heroTitle1: "De la réservation",
      heroTitle2: "à la conversation.",
      heroSubtitle:
        "MHAF Live réunit la planification et les réunions vidéo en temps réel dans un parcours clair, pour les indépendants et les équipes. Les invités rejoignent la réunion via un lien partagé.",
      startInstant: "Démarrer une réunion",
      viewBooking: "Voir la réservation",
      instantTitle: "Salons vidéo instantanés",
      instantDesc: "Lancez des salons chiffrés de pair-à-pair en quelques secondes, sans configuration.",
      bookingTitle: "Planification autonome",
      bookingDesc: "Partagez des liens de réservation personnalisés avec détection automatique du fuseau horaire.",
      securityTitle: "Confidentialité & Sécurité",
      securityDesc: "Salons éphémères qui s'auto-détruisent après usage avec jetons sécurisés et contrôle de l'hôte.",
      whyTitle: "Conçu pour une communication fluide",
      whySubtitle: "Tout ce dont vous avez besoin pour vos consultations clients et réunions d'équipe.",
      feature1Title: "Accès client sans friction",
      feature1Desc: "Invitez des clients sans compte, sans téléchargement. Un lien direct ouvre la vidéo HD WebRTC.",
      feature2Title: "Planification & Réservations intégrées",
      feature2Desc: "Liens de réservation autonomes, temps de battement et protection contre les conflits directement liés à votre calendrier.",
      feature3Title: "Confidentialité & Sécurité maximale",
      feature3Desc: "Salons chiffrés de bout en bout, expiration automatique des sessions et contrôles stricts pour l'hôte.",
      ctaTitle: "Simplifiez vos réunions clients dès aujourd'hui.",
      ctaSubtitle: "Démarrez une réunion instantanée ou configurez votre calendrier de réservation dédié.",
      ctaButton: "Commencer gratuitement",
      footerDesc: "Plateforme autonome de réunions WebRTC avec réservation et planification intégrées.",
      allRightsReserved: "Tous droits réservés.",
    },
    dashboard: {
      meetingsInOneWeek: "Vos réunions de la semaine.",
      meetingsSubtitle: "Réservations et réunions affichées selon votre fuseau horaire.",
      newBookingLink: "Nouveau lien",
      scheduleMeeting: "Planifier réunion",
      instantMeeting: "Réunion instantanée",
      startingInstant: "Démarrage...",
      today: "Aujourd'hui",
      timeline: "Chronologie",
      calendar: "Calendrier",
      previousWeek: "Semaine précédente",
      nextWeek: "Semaine suivante",
      noMeetingsForDay: "Aucune réunion planifiée pour ce jour.",
      copyLink: "Copier le lien",
      enterRoom: "Entrer dans la salle",
      cancelMeeting: "Annuler",
      confirmed: "CONFIRMÉE",
      scheduled: "PLANIFIÉE",
      live: "EN DIRECT",
      completed: "TERMINÉE",
      cancelled: "ANNULÉE",
      bookingSource: "RÉSERVATION",
      scheduledSource: "PLANIFIÉE",
      instantSource: "INSTANTANÉE",
      copySuccess: "Lien copié dans le presse-papiers",
    },
    bookings: {
      title: "Vos Réservations",
      subtitle: "Gérez les réservations clients, les confirmations et les salons de réunion.",
      upcoming: "À venir",
      past: "Passées",
      client: "Client",
      meeting: "Réunion",
      date: "Date",
      time: "Horaire",
      status: "Statut",
      actions: "Actions",
      noBookings: "Aucune réservation trouvée.",
      cancelBooking: "Annuler la réservation",
      resendEmail: "Renvoyer l'email de confirmation",
      joinCall: "Entrer dans la salle",
    },
    availability: {
      title: "Disponibilités & Horaires",
      subtitle: "Définissez vos créneaux horaires hebdomadaires et votre fuseau.",
      weeklyHours: "Horaires de travail hebdomadaires",
      bufferTime: "Temps de battement entre réunions",
      bufferDesc: "Assurez un temps de repos entre vos rendez-vous clients.",
      timezone: "Fuseau horaire de l'hôte",
      saveChanges: "Enregistrer les modifications",
      saving: "Enregistrement...",
    },
    settings: {
      title: "Compte & Préférences",
      subtitle: "Gérez votre profil, langue et paramètres de sécurité.",
      profile: "Profil de l'hôte",
      language: "Langue / Language",
      languageDesc: "Choisissez votre langue d'interface et d'email préférée.",
      timezone: "Fuseau horaire",
      security: "Sécurité & Sessions",
      securityDesc: "Les sessions mhaf meet utilisent des salons de pairs isolés avec des canaux audio/vidéo chiffrés.",
    },
    room: {
      mute: "Couper le micro",
      unmute: "Activer le micro",
      cameraOn: "Activer la caméra",
      cameraOff: "Désactiver la caméra",
      shareScreen: "Partager l'écran",
      stopSharing: "Arrêter le partage",
      leaveCall: "Quitter l'appel",
      chat: "Discussion",
      participants: "Participants",
      lockRoom: "Verrouiller la salle",
      unlockRoom: "Déverrouiller la salle",
      copyInvite: "Copier le lien d'invitation",
      inviteCopied: "Lien d'invitation copié !",
      fitFrame: "Ajuster au cadre",
      fillFrame: "Remplir le cadre",
      record: "Enregistrer",
      recording: "Enregistrement en cours",
      waitingParticipants: "En attente des autres participants",
      waitingForName: "En attente de {name}",
      waitingDesc: "Partagez le lien d'invitation avec le bouton ci-dessus. Les participants apparaîtront dans la galerie de style Microsoft Teams.",
      chatPlaceholder: "Écrivez un message...",
      send: "Envoyer",
      sessionLive: "SESSION EN DIRECT",
      screensharePaused: "Partage d'écran mobile en pause",
      screensharePausedDesc: "Le présentateur navigue sur son téléphone. La diffusion reprendra dès son retour dans la salle.",
    },
    bookingPublic: {
      selectDateTime: "Sélectionnez Date & Heure",
      selectDate: "Choisissez une date",
      selectTime: "Choisissez un créneau horaire",
      enterDetails: "Vos coordonnées",
      fullName: "Votre nom complet",
      email: "Adresse email",
      notes: "Notes ou message (optionnel)",
      notesPlaceholder: "Partagez vos questions ou précisions pour l'appel...",
      confirmBooking: "Confirmer la réservation",
      bookingConfirmed: "Réservation Confirmée !",
      confirmationSent: "Un email de confirmation avec le lien d'accès à la réunion vous a été envoyé.",
      enterMeetingRoom: "Accéder à la réunion",
      durationMinutes: "Durée",
      hostName: "Hôte",
    },
    auth: {
      signInTitle: "Connexion à mhaf meet",
      signInSubtitle: "Entrez votre email d'hôte pour recevoir un lien de connexion sécurisé.",
      emailLabel: "Adresse email de l'hôte",
      emailPlaceholder: "nom@example.com",
      sendLink: "Envoyer le lien de connexion",
      sending: "Envoi en cours...",
      linkSentTitle: "Vérifiez votre boîte de réception",
      linkSentDesc: "Si un compte existe pour cet email, un lien de connexion vous parviendra d'ici quelques instants.",
      registerTitle: "Créer un compte hôte",
      registerSubtitle: "Configurez votre calendrier de réservation et votre moteur de planification.",
      nameLabel: "Votre nom",
      passwordLabel: "Mot de passe",
      createAccount: "Créer un compte hôte",
      verifyTitle: "Confirmez votre connexion",
      verifySubtitle: "Continuez pour accéder à votre tableau de bord mhaf meet.",
      continueToDashboard: "Accéder au tableau de bord",
      verifying: "Vérification en cours...",
      linkExpiryNotice: "Pour votre sécurité, le lien ne peut être utilisé qu'une seule fois et expire après 15 minutes.",
    },
  },
};
