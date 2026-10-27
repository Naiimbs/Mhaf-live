# MHAF Live — modèle de données actif

**État :** décrit le magasin JSON utilisé par les parcours de réservation et de réunion.
**Important :** `prisma/schema.prisma` n’est pas le magasin faisant autorité pour ces opérations dans l’application actuelle.

## Stockage et compatibilité

`src/lib/db/` charge et persiste `data/mhaf_live_db.json`. Les champs Date sont sérialisés sous forme de chaînes ISO et reconstitués en objets `Date` au chargement. Les anciennes données sans clé `meetings` sont chargées avec une collection de réunions vide afin de préserver la compatibilité.

Le magasin garde les collections `users`, `sessions`, `eventTypes`, `availabilities`, `bookings`, `meetings` et `auditLogs`.

## Entités actives

### Booking

Une réservation représente le créneau confirmé d’un invité pour un type de rendez-vous. Elle comprend `id`, `uid`, `eventTypeId`, `hostId`, `attendeeName`, `attendeeEmail`, `attendeeNotes`, `startTime`, `endTime`, `status`, `createdAt` et `updatedAt`.

États de réservation : `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`. Une réservation publique acceptée conserve son identifiant de salle historique (`uid`) pour maintenir la compatibilité des liens existants.

### Meeting

Une réunion est l’événement qui apparaît dans le calendrier et qui résout un lien de salle. Elle comprend `id`, `uid`, `hostId`, `title`, `source`, `bookingId`, `attendeeName`, `attendeeEmail`, `startTime`, `endTime`, `status`, `createdAt` et `updatedAt`.

- `source`: `BOOKING`, `MANUAL` ou `INSTANT`.
- `status`: `SCHEDULED`, `LIVE`, `CANCELLED` ou `COMPLETED`.
- `bookingId`: identifiant de la réservation associée, ou `null` pour une réunion sans réservation.
- Pour une réservation publique, le `Meeting` lié partage l’UID de la réservation; les identifiants `Booking` historiques continuent donc à fonctionner.
- Les réunions manuelles et instantanées possèdent leur propre UID et n’ajoutent pas de ligne artificielle dans `bookings`.

### Autres collections

`User` porte notamment le rôle et le fuseau horaire IANA de l’hôte. `EventType` définit la durée et les marges avant/après. `Availability` stocke les plages hebdomadaires et leur fuseau. `Session` et `AuditLog` sont conservés dans le magasin existant.

## Relations et conflits

Un `Booking` peut être représenté par un `Meeting` de source `BOOKING`; `bookingId` est la relation explicite. Le calendrier agrège les réunions puis ajoute les réservations historiques qui n’ont pas de réunion liée, ce qui évite les doublons tout en conservant les anciens enregistrements.

La création de réservation vérifie de nouveau côté serveur l’hôte, le type actif, la durée, le fuseau, l’avance et la disponibilité. Le chemin de mutation sous verrou vérifie les conflits avec les autres réservations et réunions puis sauvegarde les enregistrements liés. La création manuelle vérifie aussi les chevauchements; les réunions instantanées ont une durée bornée.

**Limite opérationnelle :** le verrou est en mémoire et partagé uniquement à l’intérieur d’un processus. Le fichier JSON et ce verrou ne procurent pas de transactions ACID distribuées, de coordination entre réplicas ou de garantie de concurrence multi-processus. Une évolution vers PostgreSQL doit ajouter des contraintes/transactions et migrer les données avant toute architecture multi-écrivain.

## Prisma/PostgreSQL

Le schéma Prisma présent dans le dépôt est une référence séparée; il ne faut pas déduire de son existence que les bookings et meetings actifs sont écrits en PostgreSQL. Toute migration du modèle actif doit documenter la source de vérité, la compatibilité des UIDs de salle, les relations `Booking`–`Meeting`, la stratégie de migration des dates et les contraintes d’unicité/conflit.
