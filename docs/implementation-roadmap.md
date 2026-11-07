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

## Roadmap proposée avant lancement public

Les éléments ci-dessous sont des propositions, pas des fonctionnalités déjà livrées. Les priorités P0 sont des prérequis si des utilisateurs externes peuvent créer des comptes, réserver ou tenir de vraies réunions. Les critères indiquent comment vérifier chaque élément avant de le déclarer terminé.

### P0 — Fiabilité, sécurité et confiance

- **Persistance transactionnelle des réservations et réunions.** Migrer le magasin JSON actif vers PostgreSQL avec contraintes d’unicité et transactions; préserver les identifiants et liens existants via un import idempotent. *Acceptation :* deux demandes concurrentes pour le même créneau ne peuvent pas toutes deux réussir, y compris avec plusieurs instances; migration, sauvegarde et restauration sont testées.
- **Limites d’abus et durcissement des parcours publics.** Vérifier les limites de débit et les réponses d’erreur pour l’inscription, la connexion, les liens magiques, les demandes de démo et la réservation; ajouter une protection anti-robot adaptée si les abus le justifient. *Acceptation :* tests automatisés couvrant les limites, l’expiration des jetons et l’absence de fuite d’informations sensibles dans les réponses et journaux.
- **Cycle de vie des données personnelles.** Documenter les données collectées, leur durée de conservation et les fournisseurs qui les traitent; fournir une procédure de suppression du compte et des données associées, ainsi qu’un moyen de traiter une demande de suppression. *Acceptation :* parcours et politique de confidentialité cohérents avec le comportement réel; tests de suppression couvrant les données liées et les exceptions de conservation.
- **Accessibilité des parcours essentiels.** Auditer l’inscription, le calendrier, la réservation, le pré-join et la salle au clavier et avec un lecteur d’écran; corriger le contraste, les libellés, le focus visible et le respect de `prefers-reduced-motion`. *Acceptation :* les parcours principaux sont réalisables sans souris et les problèmes bloquants de WCAG 2.2 AA sont corrigés ou consignés avec une justification.
- **Préparation opérationnelle.** Ajouter des vérifications de santé utiles, une journalisation sans secrets ni données personnelles superflues, une alerte sur les erreurs critiques et des procédures de sauvegarde/restauration et de rollback. *Acceptation :* restauration réalisée sur un environnement de test et procédure de release répétée sur staging avant production.
- **Vérification de production de bout en bout.** Valider les domaines, HTTPS, cookies de session, secrets, SMTP, LiveKit, créneaux, invitations et contrôles d’accès dans un staging proche de la production. *Acceptation :* checklist signée, tests smoke réussis et aucune clé de démonstration ou donnée de test exposée.

### P1 — Parcours plus complets pour les hôtes et invités

- **Invitations de calendrier.** Générer des invitations `.ics` pour les confirmations et changements de rendez-vous, avec fuseau horaire explicite et lien de réunion correct. *Acceptation :* événements vérifiés dans au moins deux clients de calendrier et tests autour des transitions d’heure d’été.
- **Annulation et replanification en libre-service.** Permettre à un invité de confirmer ou d’annuler une demande de modification sans exposer les réservations d’autres personnes; aligner les statuts, courriels et disponibilités après chaque changement. *Acceptation :* jetons de gestion à usage limité ou révocables, tests d’expiration et aucun créneau fantôme après annulation.
- **Récupération après incident réseau.** Rendre les états de connexion, permission caméra/micro, reconnexion et échec LiveKit compréhensibles; proposer une reprise sans créer une seconde réunion involontaire. *Acceptation :* tests manuels et automatisés des permissions refusées, coupure réseau et reconnexion.
- **Aperçu public fidèle aux capacités.** Séparer nettement les fonctions disponibles, les prototypes et les éléments planifiés; proposer une démo sans données réelles si elle peut être isolée en sécurité. *Acceptation :* aucun créneau d’exemple n’est présenté comme disponibilité réelle et les actions de la démo n’écrivent pas dans les données de production.
- **Préférences et paramètres du compte.** Ajouter la gestion du fuseau horaire, de la langue et des notifications depuis l’espace hôte. *Acceptation :* préférences conservées entre sessions et affichage cohérent dans le calendrier, les courriels et les invitations.

### P2 — Évolutions après stabilisation

- **Historique et présence des réunions.** Construire ces fonctions uniquement à partir d’événements LiveKit signés et persistés, avec règles de rétention explicites.
- **Enregistrement, transcription et résumés.** Ne lancer qu’après choix du fournisseur, consentement clair de tous les participants, indicateur visible d’enregistrement, contrôle d’accès, suppression et politique de conservation testés.
- **Intégrations calendaires et indicateurs d’usage.** Évaluer la synchronisation externe et les analytics après stabilisation de la persistance, du modèle de consentement et des besoins des utilisateurs.

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
