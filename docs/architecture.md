# MHAF Live — architecture actuelle

**État :** fonctionnalité calendrier/rencontres implémentée sur `feat/calendar-workspace-flow`; revue PR et décision de mise en production restantes.
**Source de vérité :** le code exécuté dans `src/`, pas le schéma Prisma ni les anciens diagrammes d’architecture.

## Vue d’ensemble

MHAF Live est une application Next.js App Router. Le parcours public, la réservation, l’espace hôte et le client LiveKit passent par l’application Next.js. La connexion média est fournie par LiveKit; le serveur signe les jetons d’accès et ne transmet pas la clé secrète au navigateur.

Les réservations et réunions de l’application utilisent actuellement le magasin JSON de `src/lib/db/`, persisté dans `data/mhaf_live_db.json`. Prisma/PostgreSQL est présent dans le dépôt pour d’autres usages et comme voie d’évolution, mais il n’est pas le magasin transactionnel faisant autorité pour ces flux.

## Parcours et routes

| Parcours | Route principale | Contrôle |
|---|---|---|
| Présenter le produit | `/` | Page publique informative; aucun widget de création de réunion ou de réservation. |
| Créer un compte / ouvrir une session | `/register`, `/login` | L’authentification hôte protège les actions de gestion. |
| Gérer le calendrier | `/dashboard` | Semaine affichée dans le fuseau IANA de l’hôte; événements issus des réservations et réunions. |
| Gérer le lien public | `/book/[hostSlug]/[eventSlug]` | Le serveur vérifie l’hôte, le type de rendez-vous, la disponibilité, la durée, l’avance requise et les conflits. |
| Créer une réunion sans réservation | `POST /api/meetings` | Hôte authentifié; heure locale convertie dans son fuseau, durée et chevauchements validés. |
| Démarrer une réunion instantanée | `POST /api/rooms/instant` | Hôte authentifié; crée une réunion à durée bornée, sans réservation fictive. |
| Charger les événements | `GET /api/calendar` | Hôte authentifié; renvoie uniquement les événements de son compte. |
| Rejoindre une salle | `/rooms/[slug]` et `/api/connection-details` | L’UID doit correspondre à une réservation ou réunion persistée; un UID inconnu ne crée pas de salle. |

Une réservation publique acceptée produit un `Booking` et un `Meeting` lié de source `BOOKING`. Une réunion manuelle ou instantanée produit un `Meeting` sans `Booking`. Ces ressources ne sont pas interchangeables.

## Persistance et garanties de concurrence

Le magasin JSON garde les dates en ISO sur disque et les reconstitue en `Date` en mémoire. Les mutations critiques passent par un verrou asynchrone en mémoire; création d’une réservation et de sa réunion liée, création de réunion, annulation et persistance sont regroupées dans ce chemin protégé.

**Limite importante :** ce verrou ne coordonne que les requêtes d’un même processus Node.js. Il ne garantit pas l’unicité face à plusieurs processus ou réplicas et ne remplace pas une transaction PostgreSQL. Ne pas annoncer une garantie ACID inter-réplicas ni déployer plusieurs écrivains avec ce magasin.

## Sécurité des salles et des créneaux

- Les API de calendrier et de création exigent une session hôte; les identifiants reçus du navigateur ne suffisent pas à établir la propriété.
- Les jetons LiveKit sont émis par le serveur après résolution de la réservation/réunion, de son état et du rôle du demandeur.
- Une réunion programmée ne peut être rejointe avant la fenêtre définie par la configuration serveur `ENFORCE_MEETING_TIME_WINDOW`; les paramètres de requête ou de corps envoyés par le navigateur ne peuvent pas désactiver cette règle.
- Les créneaux sont calculés avec le fuseau IANA de l’hôte et affichés dans le fuseau du visiteur; les heures inexistantes lors du passage à l’heure d’été sont rejetées.
- Les pages n’affirment « connecté » qu’après la connexion LiveKit; les états d’échec et de reconnexion restent visibles.

## Portée implémentée et non implémentée

Le calendrier, les réservations, les réunions manuelles et instantanées, l’autorisation d’accès aux salles et le client LiveKit sont présents dans le code. Les webhooks d’assiduité, les tableaux de présence, l’enregistrement/archivage, les transcriptions et les résumés IA décrits dans certains documents historiques ne sont pas livrés par cette fonctionnalité et ne doivent pas être présentés comme disponibles.

## Vérification locale

La branche a été vérifiée avec `npm run build`, cinq tests unitaires de fuseau horaire et 23 tests Playwright ciblant la landing page, le calendrier, les réservations, l’authentification et les salles. Les tests utilisent des données locales; ils ne prouvent pas une garantie de concurrence multi-processus ni la disponibilité de l’infrastructure LiveKit en production.
