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
2. Retirer les secrets codés en dur du chemin SMTP, les remplacer par des secrets de déploiement, puis faire tourner tout credential exposé dans l’historique/dépôt avant la mise en production.
3. Confirmer les variables LiveKit, SMTP, URL publique et politique de fenêtre d’accès dans l’environnement cible sans publier leurs valeurs.
4. Décider si le déploiement reste strictement mono-processus ou migrer réservations/réunions vers une base avec transactions/contraintes adaptées avant d’ajouter des réplicas.
5. Exécuter les tests smoke de staging sur des données non sensibles, puis suivre la procédure de release et de rollback documentée dans `deploy-vps.md`.

## Travaux ultérieurs

- Migrer le magasin JSON vers PostgreSQL avec import idempotent, stratégie de compatibilité des liens d’invitation et transactions de réservation.
- Ajouter des webhooks LiveKit signés et un modèle de session/participant avant de construire des analytics d’assiduité.
- N’ajouter l’archivage, la transcription ou les résumés IA qu’après choix d’un fournisseur, configuration du stockage, consentement, rétention et tests de bout en bout.
- Maintenir les tests couvrant les erreurs de fuseau, annulations, conflits, permissions d’hôte et compatibilité des anciens UIDs.
