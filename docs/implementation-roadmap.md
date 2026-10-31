# MHAF Live — état d’implémentation et prochaines étapes

**État documentaire :** mis à jour pour `feat/calendar-workspace-flow`.
**Déploiement de production :** non effectué dans le cadre de cette branche; toute mise en production reste une étape de release séparée après revue et vérification des secrets/configurations.

## État vérifié dans le dépôt

| Domaine | État dans cette branche | Vérification / limite |
|---|---|---|
| Application Next.js, pages d’authentification | Implémenté | Build de production réussi. |
| Landing page publique | Page de présentation, sans création de salle/réservation | Tests Playwright ciblés. |
| Réservations publiques | Flux avec validation serveur et conversion IANA | Tests ciblés; persistance JSON, pas de transaction distribuée. |
| Calendrier hôte hebdomadaire | Implémenté sur `/dashboard`; agrège réservations et réunions | Test de workspace; affiche le fuseau de l’hôte et les événements hors plage par défaut. |
| Réunions manuelles et instantanées | Implémentées comme enregistrements `Meeting` distincts | Routes authentifiées et conflits protégés au niveau du processus. |
| Salle vidéo LiveKit | Client et émission serveur de jeton présents | Tests de route/unitaires E2E ciblés; dépendent des credentials et du service LiveKit à l’exécution. |
| Contrôle d’accès à une réunion programmée | Fenêtre gérée côté serveur | Tests GET et POST vérifiant qu’un paramètre client ne la désactive pas. |
| Fuseaux horaires | Conversion basée sur l’IANA et gestion des transitions DST | Cinq tests unitaires passent. |
| Persistance des réservations/réunions | Fichier JSON actif (`data/mhaf_live_db.json`) | Limité à un processus; le schéma Prisma n’est pas la source de vérité de ces flux. |
| Webhooks, analytics d’assiduité, enregistrements, transcriptions et résumés IA | Non implémentés par cette branche | Ne pas annoncer comme fonctionnalités disponibles. |

## Vérifications locales réalisées

- `npm run build` — réussi.
- `node --experimental-strip-types --test tests/unit/timezone.test.ts` — 5 tests réussis.
- Playwright ciblé — 23 tests réussis sur les parcours landing page, workspace calendrier, authentification, réservations, concurrence dans un processus et salles.
- Les E2E ont utilisé une base de données locale fraîche et un transport SMTP redirigé vers localhost. Aucun test n’a visé une base de production.

Ces vérifications ne démontrent ni l’unicité des créneaux entre plusieurs processus/réplicas ni la disponibilité du service LiveKit sur l’environnement de production.

## Étapes recommandées avant release

1. Revue de la PR et validation des décisions de contenu encore ouvertes, notamment la présence éventuelle d’un CTA « Request a demo ».
2. Le repli SMTP codé en dur a été retiré et l’ancien mot de passe de boîte exposé dans l’historique a été réinitialisé auprès du fournisseur le 28 octobre 2026. Installer le nouveau `SMTP_PASS` dans l’environnement du VPS, vérifier les paramètres SMTP, puis tester l’envoi avant la mise en production.
3. Confirmer les variables LiveKit, SMTP, URL publique et politique de fenêtre d’accès dans l’environnement cible sans publier leurs valeurs.
4. Décider si le déploiement reste strictement mono-processus ou migrer réservations/réunions vers une base avec transactions/contraintes adaptées avant d’ajouter des réplicas.
5. Exécuter les tests smoke de staging sur des données non sensibles, puis suivre la procédure de release et de rollback documentée dans `deploy-vps.md`.

## Travaux ultérieurs

- Migrer le magasin JSON vers PostgreSQL avec import idempotent, stratégie de compatibilité des liens d’invitation et transactions de réservation.
- Ajouter des webhooks LiveKit signés et un modèle de session/participant avant de construire des analytics d’assiduité.
- N’ajouter l’archivage, la transcription ou les résumés IA qu’après choix d’un fournisseur, configuration du stockage, consentement, rétention et tests de bout en bout.
- Maintenir les tests couvrant les erreurs de fuseau, annulations, conflits, permissions d’hôte et compatibilité des anciens UIDs.


## Product decisions — launch polish and future capabilities

### Authentication and homepage

- Host registration is passwordless: collect name, email, and timezone, then send a one-time email verification/sign-in link. The login page remains email-only and uses the same magic-link mechanism.
- Make existing-user access easy to discover from the homepage: a visible Sign in action in the desktop navigation and mobile menu, plus an “Already have an account? Sign in” link in the hero. Keep Sign in in the footer.
- Keep the pricing section hidden until plans, prices, commercial availability, and included scope are approved. Do not show placeholder prices or draft deployment tiers on the public homepage.

### Post-meeting roadmap (not available yet)

1. **Meeting history:** searchable past meetings with date, duration, host, status, and links to permitted artifacts.
2. **Participant history and participation map:** participant timeline showing join/leave events, time present, and a visual participation map/heatmap. Requires signed LiveKit webhooks and a durable participant/session data model; do not infer attendance from static UI state.
3. **Post-meeting intelligence:** consent-based transcription and speaker attribution, meeting summary, key topics, decisions, and action items. Requires an explicit provider decision, recording/transcription consent, secure storage, retention/deletion controls, and end-to-end tests.

These capabilities are roadmap items only. Do not represent meeting history analytics, a participant heatmap, recording, transcription, or AI summaries as currently available until their backend, privacy controls, and tests are implemented.
