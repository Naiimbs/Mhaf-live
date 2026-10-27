# Documentation MHAF Live

Cette documentation distingue le comportement actuellement implémenté des références historiques et des travaux futurs. Pour l’architecture et les données, le code sous `src/` et les fichiers suivants priment sur les anciens schémas de conception :

- [`architecture.md`](architecture.md) — routes, frontières de confiance, persistance active et limites opérationnelles.
- [`data-model.md`](data-model.md) — entités réellement utilisées par le magasin JSON et compatibilité avec les réservations existantes.
- [`landing-page-spec.md`](landing-page-spec.md) — comportement public de la landing page sur la branche calendrier.
- [`implementation-roadmap.md`](implementation-roadmap.md) — état vérifié, contrôles locaux et actions recommandées avant release.
- [`deploy-vps.md`](deploy-vps.md) et [`backup-restore.md`](backup-restore.md) — procédures d’exploitation; vérifier les variables et les sauvegardes avant toute release.
- [`product-direction-draft.md`](product-direction-draft.md) et [`landing-page-content-draft.md`](landing-page-content-draft.md) — documents de direction/copie conservés pour la revue de contenu.
- [`reference-audit.md`](reference-audit.md) — audit historique des projets de référence, pas une description de l’état actuel du produit.

## Limite importante du stockage

Les réservations et réunions actives sont persistées dans `data/mhaf_live_db.json`. Le verrou de concurrence est en mémoire et ne coordonne que les mutations du même processus Node.js. Ne pas traiter le schéma Prisma comme une preuve que ces opérations utilisent PostgreSQL ni déployer plusieurs écrivains sans migration transactionnelle.
